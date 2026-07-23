import {
  Users,
  Building2,
  FolderOpen,
  UserCheck,
  Sparkles,
  HardDrive,
  TrendingUp,
} from "lucide-react";
import { formatFileSize } from "@/lib/documents/utils";

interface AdminDashboardKPIsProps {
  totalEmployees: number;
  activeUsers: number;
  totalDepartments: number;
  totalDocuments: number;
  storageUsedBytes: number;
  aiQueriesCount: number;
}

export function AdminDashboardKPIs({
  totalEmployees,
  activeUsers,
  totalDepartments,
  totalDocuments,
  storageUsedBytes,
  aiQueriesCount,
}: AdminDashboardKPIsProps) {
  const kpis = [
    {
      title: "Total Employees",
      value: totalEmployees,
      badge: "+12%",
      badgeColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      icon: Users,
      iconColor: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Departments",
      value: totalDepartments,
      badge: "Active",
      badgeColor: "text-blue-600 bg-blue-500/10 border-blue-500/20",
      icon: Building2,
      iconColor: "text-purple-500 bg-purple-500/10",
    },
    {
      title: "Documents",
      value: totalDocuments,
      badge: "+24 this week",
      badgeColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      icon: FolderOpen,
      iconColor: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "Active Users",
      value: activeUsers,
      badge: "Online now",
      badgeColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      icon: UserCheck,
      iconColor: "text-emerald-500 bg-emerald-500/10",
      hasPulse: true,
    },
    {
      title: "AI Queries",
      value: aiQueriesCount.toLocaleString(),
      badge: "+18% growth",
      badgeColor: "text-purple-600 bg-purple-500/10 border-purple-500/20",
      icon: Sparkles,
      iconColor: "text-pink-500 bg-pink-500/10",
    },
    {
      title: "Storage Used",
      value: formatFileSize(storageUsedBytes),
      badge: "Storage Pool",
      badgeColor: "text-muted-foreground bg-muted border-border",
      icon: HardDrive,
      iconColor: "text-cyan-500 bg-cyan-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => {
        const IconComponent = kpi.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {kpi.title}
              </span>
              <div
                className={`flex size-9 items-center justify-center rounded-xl ${kpi.iconColor}`}
              >
                <IconComponent className="size-4.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${kpi.badgeColor}`}
              >
                {kpi.hasPulse && (
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span>{kpi.badge}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
