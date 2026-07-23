import { useState } from "react";
import { UserPlus, Building2, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { CreateDepartmentDialog } from "./create-department-dialog";
import { useNavigate } from "@tanstack/react-router";

interface AdminQuickActionsProps {
  departments: { id: string; name: string }[];
  onManageRolesClick: () => void;
  onRefresh: () => void;
}

export function AdminQuickActions({
  departments,
  onManageRolesClick,
  onRefresh,
}: AdminQuickActionsProps) {
  const navigate = useNavigate();
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [createDeptOpen, setCreateDeptOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">Quick Actions</h3>
          <p className="text-xs text-muted-foreground">
            Administrative shortcuts for workspace provisioning and management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Employee */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setAddEmpOpen(true)}
            className="gap-2 text-xs font-medium"
          >
            <UserPlus className="size-4" />
            <span>Add Employee</span>
          </Button>

          {/* Create Department */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDeptOpen(true)}
            className="gap-2 text-xs font-medium"
          >
            <Building2 className="size-4 text-primary" />
            <span>Create Department</span>
          </Button>

          {/* Upload Document */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/documents" })}
            className="gap-2 text-xs font-medium"
          >
            <Upload className="size-4 text-muted-foreground" />
            <span>Upload Document</span>
          </Button>

          {/* Manage Roles */}
          <Button
            variant="outline"
            size="sm"
            onClick={onManageRolesClick}
            className="gap-2 text-xs font-medium"
          >
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span>Manage Roles</span>
          </Button>
        </div>
      </div>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        departments={departments}
        open={addEmpOpen}
        onOpenChange={setAddEmpOpen}
        onSuccess={onRefresh}
      />

      {/* Create Department Dialog */}
      <CreateDepartmentDialog
        open={createDeptOpen}
        onOpenChange={setCreateDeptOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}
