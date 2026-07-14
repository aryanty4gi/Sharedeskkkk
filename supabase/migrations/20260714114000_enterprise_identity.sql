-- ShareDesk Workplace enterprise identity foundation

create extension if not exists pgcrypto;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'employee'
    check (role in ('super_admin', 'hr_admin', 'department_head', 'manager', 'employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists employee_id text,
  add column if not exists manager_id uuid references public.profiles(id) on delete set null,
  add column if not exists last_login timestamptz;

create unique index if not exists profiles_employee_id_key
  on public.profiles(employee_id)
  where employee_id is not null;

create index if not exists profiles_manager_id_idx
  on public.profiles(manager_id);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs(actor_id);

create index if not exists audit_logs_target_user_id_idx
  on public.audit_logs(target_user_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs(created_at desc);

insert into public.departments (name, code)
values
  ('Human Resources', 'HR'),
  ('Information Technology', 'IT'),
  ('Finance', 'FIN'),
  ('Engineering', 'ENG'),
  ('Operations', 'OPS')
on conflict do nothing;

insert into public.user_roles (user_id, role)
select id, 'employee'
from public.profiles
on conflict (user_id) do nothing;

update public.profiles p
set employee_id =
  'NBL-' ||
  coalesce(
    (
      select d.code
      from public.departments d
      where lower(d.name) = lower(p.department)
         or lower(d.code) = lower(p.department)
      limit 1
    ),
    'EMP'
  ) ||
  '-' ||
  upper(substr(replace(p.id::text, '-', ''), 1, 6))
where p.employee_id is null;

alter table public.departments enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Authenticated users can view departments" on public.departments;
create policy "Authenticated users can view departments"
on public.departments
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can view roles" on public.user_roles;
create policy "Authenticated users can view roles"
on public.user_roles
for select
to authenticated
using (true);

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin', 'hr_admin')
  )
);
