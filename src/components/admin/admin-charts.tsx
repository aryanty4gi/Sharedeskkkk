import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AdminChartsProps {
  docsByDepartment: { department: string; count: number }[];
  employeesByDepartment: { department: string; count: number }[];
}

const COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
];

export const AdminCharts = memo(function AdminCharts({
  docsByDepartment,
  employeesByDepartment,
}: AdminChartsProps) {
  const hasDocsData = docsByDepartment.length > 0;
  const hasEmpData = employeesByDepartment.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Documents by Department (BarChart) */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            Documents by Department
          </h3>
          <p className="text-xs text-muted-foreground">
            Total files stored across organization departments.
          </p>
        </div>

        <div className="h-64 w-full">
          {!hasDocsData ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No document data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={docsByDepartment}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                  cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                />
                <Bar dataKey="count" name="Documents" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Employee Distribution (Donut PieChart) */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            Employee Distribution
          </h3>
          <p className="text-xs text-muted-foreground">Headcount allocation by department.</p>
        </div>

        <div className="h-64 w-full">
          {!hasEmpData ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No employee distribution data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeesByDepartment}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  label={({ department, count }) => `${department}: ${count}`}
                  labelLine={false}
                >
                  {employeesByDepartment.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
});
