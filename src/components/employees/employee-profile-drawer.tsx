import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  Check,
  Copy,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
  Video,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserAvatar } from "@/components/chat/user-avatar";
import { useCurrentUser } from "@/lib/chat/use-current-user";
import { getOrCreateConversation, fetchMyProfile } from "@/lib/chat/queries";
import type { Employee } from "@/lib/employees/types";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "hr_admin":
      return "HR Admin";
    case "department_head":
      return "Department Head";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "hr_admin":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "department_head":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-secondary text-secondary-foreground border-transparent";
  }
}

export function EmployeeProfileDrawer({
  employee,
  open,
  onOpenChange,
}: EmployeeProfileDrawerProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [startingCall, setStartingCall] = useState(false);

  // Lazy-load detailed profile info (e.g. manager, join date / created_at) when drawer is open
  const { data: fullProfile } = useQuery({
    queryKey: ["employee-full-profile", employee?.id],
    queryFn: () => (employee?.id ? fetchMyProfile(employee.id) : null),
    enabled: open && !!employee?.id,
  });

  // Lazy-load manager profile if manager_id exists
  const { data: managerProfile } = useQuery({
    queryKey: ["manager-profile", fullProfile?.manager_id],
    queryFn: () => (fullProfile?.manager_id ? fetchMyProfile(fullProfile.manager_id) : null),
    enabled: open && !!fullProfile?.manager_id,
  });

  if (!employee) return null;

  const displayName = employee.fullName || employee.full_name || "Unnamed Employee";
  const displayTitle = employee.jobTitle || employee.designation || "Not specified";
  const displayDepartment = employee.department || "Not specified";

  const profileAdapter = {
    id: employee.id,
    email: employee.email,
    full_name: employee.fullName ?? employee.full_name ?? null,
    avatar_url: employee.avatar ?? employee.avatar_url ?? null,
    is_online: employee.onlineStatus ?? employee.is_online ?? false,
  };

  // Quick Action: Copy Email
  const handleCopyEmail = async () => {
    if (!employee.email) return;
    try {
      await navigator.clipboard.writeText(employee.email);
      setCopiedEmail(true);
      toast.success("Email address copied to clipboard");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error("Failed to copy email");
    }
  };

  // Quick Action: Start Chat using existing chat logic
  const handleStartChat = async () => {
    if (!currentUser || !employee.id) return;
    if (currentUser.id === employee.id) {
      toast.info("This is your own profile");
      return;
    }

    setStartingChat(true);
    try {
      const conversationId = await getOrCreateConversation(currentUser.id, employee.id);
      onOpenChange(false);
      navigate({ to: "/chat/$conversationId", params: { conversationId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start chat");
    } finally {
      setStartingChat(false);
    }
  };

  // Quick Action: Start Video Call using existing chat/call setup
  const handleStartVideoCall = async () => {
    if (!currentUser || !employee.id) return;
    if (currentUser.id === employee.id) {
      toast.info("Cannot start a call with yourself");
      return;
    }

    setStartingCall(true);
    try {
      const conversationId = await getOrCreateConversation(currentUser.id, employee.id);
      onOpenChange(false);
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId },
        search: { call: "video" },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate call");
    } finally {
      setStartingCall(false);
    }
  };

  // Quick Action: View Documents
  const handleViewDocuments = () => {
    onOpenChange(false);
    navigate({ to: "/documents" });
  };

  // Formatted Join Date if created_at is available
  const joinDateFormatted = fullProfile?.created_at
    ? `${format(new Date(fullProfile.created_at), "MMM d, yyyy")} (${formatDistanceToNow(new Date(fullProfile.created_at), { addSuffix: true })})`
    : "Not available";

  const managerName = managerProfile?.full_name || managerProfile?.email || "Not available";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-background border-l border-border shadow-xl overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{displayName} Profile</SheetTitle>
          <SheetDescription>Employee details and quick actions</SheetDescription>
        </SheetHeader>

        {/* Top Banner / Avatar Header */}
        <div className="relative bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-6 border-b border-border">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with Status */}
            <UserAvatar
              profile={profileAdapter}
              size="xl"
              showStatus={employee.onlineStatus !== null && employee.onlineStatus !== undefined}
              className="mb-4 shadow-md"
            />

            {/* Name */}
            <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">{displayName}</h2>

            {/* Job Title */}
            <p className="text-sm font-medium text-muted-foreground mb-3">{displayTitle}</p>

            {/* Badges: Department, Role & Status */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Department Badge */}
              <Badge variant="secondary" className="text-xs font-normal">
                <Building2 className="mr-1 size-3 text-muted-foreground" />
                {displayDepartment}
              </Badge>

              {/* Role Badge */}
              <Badge
                variant="outline"
                className={cn("text-xs font-medium border", getRoleBadgeVariant(employee.role))}
              >
                <ShieldCheck className="mr-1 size-3" />
                {formatRoleLabel(employee.role)}
              </Badge>

              {/* Status Badge */}
              {employee.onlineStatus === null || employee.onlineStatus === undefined ? (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  Unknown Status
                </Badge>
              ) : employee.onlineStatus ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium">
                  <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  <span className="mr-1.5 size-1.5 rounded-full bg-muted-foreground/40" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {/* Quick Actions Panel */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Start Chat */}
              <Button
                variant="default"
                size="sm"
                onClick={handleStartChat}
                disabled={startingChat}
                className="w-full gap-2 text-xs font-medium justify-center h-9"
              >
                {startingChat ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="size-3.5" />
                )}
                <span>Start Chat</span>
              </Button>

              {/* Start Video Call */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartVideoCall}
                disabled={startingCall}
                className="w-full gap-2 text-xs font-medium justify-center h-9"
              >
                {startingCall ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Video className="size-3.5 text-primary" />
                )}
                <span>Video Call</span>
              </Button>

              {/* Copy Email */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEmail}
                className="w-full gap-2 text-xs font-medium justify-center h-9"
              >
                {copiedEmail ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5 text-muted-foreground" />
                )}
                <span>{copiedEmail ? "Copied!" : "Copy Email"}</span>
              </Button>

              {/* View Documents */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDocuments}
                className="w-full gap-2 text-xs font-medium justify-center h-9"
              >
                <FolderOpen className="size-3.5 text-muted-foreground" />
                <span>Documents</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Detailed Employee Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Employee Information
            </h3>

            <div className="space-y-3.5 text-sm">
              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Email Address
                  </span>
                  <span className="text-foreground font-mono text-xs break-all">
                    {employee.email || "Not available"}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Phone Number
                  </span>
                  <span className="text-foreground text-xs">Not available</span>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3">
                <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Department
                  </span>
                  <span className="text-foreground text-xs">{displayDepartment}</span>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start gap-3">
                <ShieldCheck className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">Role</span>
                  <span className="text-foreground text-xs">{formatRoleLabel(employee.role)}</span>
                </div>
              </div>

              {/* Manager */}
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">Manager</span>
                  <span className="text-foreground text-xs">{managerName}</span>
                </div>
              </div>

              {/* Office Location */}
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Office Location
                  </span>
                  <span className="text-foreground text-xs">Not available</span>
                </div>
              </div>

              {/* Join Date */}
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block font-medium">Join Date</span>
                  <span className="text-foreground text-xs">{joinDateFormatted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
