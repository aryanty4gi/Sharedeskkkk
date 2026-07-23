import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboardKPIs } from "./admin-dashboard-kpis";
import { AdminCharts } from "./admin-charts";
import { AdminRecentActivity } from "./admin-recent-activity";
import { AdminQuickActions } from "./admin-quick-actions";
import { fetchAdminDashboardMetrics } from "@/lib/admin/queries";
import { getDepartments } from "@/lib/employees/queries";

interface AdminDashboardViewProps {
  onManageRolesClick: () => void;
}

export function AdminDashboardView({ onManageRolesClick }: AdminDashboardViewProps) {
  const {
    data: metrics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-dashboard-metrics"],
    queryFn: fetchAdminDashboardMetrics,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center my-6">
        <AlertCircle className="size-10 text-destructive mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Failed to load Admin Dashboard
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mb-4">
          {error instanceof Error
            ? error.message
            : "An error occurred while fetching dashboard metrics."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-xs">
          <RefreshCw className="size-3.5" />
          <span>Try again</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Header Banner */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Enterprise Overview</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5 text-muted-foreground" />
          <span>Refresh metrics</span>
        </Button>
      </div>

      {/* Quick Actions Bar */}
      <AdminQuickActions
        departments={departments}
        onManageRolesClick={onManageRolesClick}
        onRefresh={refetch}
      />

      {/* 6 KPI Cards */}
      <AdminDashboardKPIs
        totalEmployees={metrics.totalEmployees}
        activeUsers={metrics.activeUsers}
        totalDepartments={metrics.totalDepartments}
        totalDocuments={metrics.totalDocuments}
        storageUsedBytes={metrics.storageUsedBytes}
        aiQueriesCount={metrics.aiQueriesCount}
      />

      {/* Recharts Analytics Charts */}
      <AdminCharts
        docsByDepartment={metrics.docsByDepartment}
        employeesByDepartment={metrics.employeesByDepartment}
      />

      {/* Recent Activity Logs */}
      <AdminRecentActivity
        newEmployees={metrics.newEmployees}
        recentDocuments={metrics.recentDocuments}
        recentChats={metrics.recentChats}
      />
    </div>
  );
}
