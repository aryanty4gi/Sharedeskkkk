-- ShareDesk Workplace secure admin management

create or replace function public.is_company_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role in ('super_admin', 'hr_admin')
  );
$$;

create or replace function public.admin_update_employee(
  target_user_id uuid,
  new_department text,
  new_designation text,
  new_manager_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  old_profile jsonb;
  updated_profile jsonb;
begin
  select role into actor_role
  from public.user_roles
  where user_id = auth.uid();

  if actor_role not in ('super_admin', 'hr_admin') then
    raise exception 'Unauthorized: administrator access required';
  end if;

  select to_jsonb(p) into old_profile
  from public.profiles p
  where p.id = target_user_id;

  if old_profile is null then
    raise exception 'Employee not found';
  end if;

  update public.profiles
  set
    department = nullif(trim(new_department), ''),
    designation = nullif(trim(new_designation), ''),
    manager_id = new_manager_id,
    updated_at = now()
  where id = target_user_id;

  select to_jsonb(p) into updated_profile
  from public.profiles p
  where p.id = target_user_id;

  insert into public.audit_logs (
    actor_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  values (
    auth.uid(),
    target_user_id,
    'employee_profile_updated',
    'profile',
    target_user_id::text,
    old_profile,
    updated_profile
  );
end;
$$;

create or replace function public.admin_update_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  old_role text;
begin
  select role into actor_role
  from public.user_roles
  where user_id = auth.uid();

  if actor_role <> 'super_admin' then
    raise exception 'Unauthorized: super admin access required';
  end if;

  if new_role not in (
    'super_admin',
    'hr_admin',
    'department_head',
    'manager',
    'employee'
  ) then
    raise exception 'Invalid role';
  end if;

  select role into old_role
  from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (user_id, role, updated_at)
  values (target_user_id, new_role, now())
  on conflict (user_id)
  do update set
    role = excluded.role,
    updated_at = now();

  insert into public.audit_logs (
    actor_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  values (
    auth.uid(),
    target_user_id,
    'user_role_updated',
    'user_role',
    target_user_id::text,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role)
  );
end;
$$;

grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.admin_update_employee(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_update_user_role(uuid, text) to authenticated;