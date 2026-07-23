import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, FolderOpen, MessageSquare, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/chat/user-avatar";
import { getFileTypeInfo, formatFileSize } from "@/lib/documents/utils";
import { Link } from "@tanstack/react-router";

export interface RecentEmployeeActivity {
  id: string;
  full_name: string | null;
  email: string;
  department?: string | null;
  designation?: string | null;
  avatar_url: string | null;
  created_at?: string;
  is_online: boolean;
}

export interface RecentDocumentActivity {
  id: string;
  file_name: string;
  department: string;
  file_size?: number | null;
  file_mime: string | null;
  created_at: string;
}

export interface RecentChatActivity {
  id: string;
  conversation_id: string;
  content?: string | null;
  sender?: {
    full_name?: string | null;
    email?: string | null;
  };
}

interface AdminRecentActivityProps {
  newEmployees: RecentEmployeeActivity[];
  recentDocuments: RecentDocumentActivity[];
  recentChats: RecentChatActivity[];
}

export function AdminRecentActivity({
  newEmployees,
  recentDocuments,
  recentChats,
}: AdminRecentActivityProps) {
  const [activeTab, setActiveTab] = useState<"employees" | "documents" | "chats">("employees");

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      {/* Header & Activity Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">
            Realtime audit log of company updates across workspace modules.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "employees"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New Employees
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "documents"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "chats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recent Chats
          </button>
        </div>
      </div>

      {/* Activity List Content */}
      <div className="min-h-[220px]">
        {/* Tab 1: New Employees */}
        {activeTab === "employees" && (
          <div className="space-y-2.5">
            {newEmployees.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No new employees found.
              </p>
            ) : (
              newEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar profile={emp} size="md" showStatus />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {emp.full_name || emp.email}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {emp.designation || "Employee"} • {emp.department || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">
                      {emp.created_at
                        ? formatDistanceToNow(new Date(emp.created_at), { addSuffix: true })
                        : "Recently"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Uploaded Documents */}
        {activeTab === "documents" && (
          <div className="space-y-2.5">
            {recentDocuments.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No recent documents uploaded.
              </p>
            ) : (
              recentDocuments.map((doc) => {
                const typeInfo = getFileTypeInfo(doc.file_name, doc.file_mime);
                const IconComponent = typeInfo.icon;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${typeInfo.color}`}
                      >
                        <IconComponent className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {doc.file_name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {doc.department} • {formatFileSize(doc.file_size)}
                        </span>
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Recent Chats */}
        {activeTab === "chats" && (
          <div className="space-y-2.5">
            {recentChats.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No recent message activity.
              </p>
            ) : (
              recentChats.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquare className="size-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {msg.sender?.full_name || msg.sender?.email || "Team member"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {msg.content || "Sent an attachment"}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: msg.conversation_id }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                  >
                    <span>View</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
