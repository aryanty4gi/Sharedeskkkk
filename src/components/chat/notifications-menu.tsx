import { Bell, Check, MessageSquare, Smile, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearNotification, markAllNotificationsRead, type Notification } from "@/lib/chat/queries";
import { useNotifications, requestBrowserNotifications } from "@/lib/chat/use-notifications";

export function NotificationsMenu({ userId }: { userId: string }) {
  const { data: notifs = [], unread } = useNotifications(userId);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const openConv = async (n: Notification) => {
    if (n.conversation_id) {
      await navigate({
        to: "/chat/$conversationId",
        params: { conversationId: n.conversation_id },
      });
    }
  };

  const markAll = async () => {
    await markAllNotificationsRead(userId);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  const remove = async (id: string) => {
    await clearNotification(id);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  return (
    <Popover
      onOpenChange={(o) => {
        if (o) void requestBrowserNotifications();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-xs">
              <Check className="mr-1 size-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifs.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            <ul>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group flex cursor-pointer items-start gap-2.5 border-b border-border px-3 py-2.5 hover:bg-muted",
                    !n.read_at && "bg-primary/5",
                  )}
                  onClick={() => openConv(n)}
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    {n.kind === "reaction" ? (
                      <Smile className="size-3.5 text-muted-foreground" />
                    ) : (
                      <MessageSquare className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs">
                      {n.kind === "reaction" ? "Reacted " : ""}
                      <span className="font-medium">{n.preview}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(n.id);
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    title="Dismiss"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
