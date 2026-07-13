import { useMemo, useState } from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Reaction } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";

export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🙏", "🔥"];

export function ReactionBar({
  reactions, currentUserId, isMine, onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string;
  isMine: boolean;
  onToggle: (emoji: string) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const cur = m.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === currentUserId) cur.mine = true;
      m.set(r.emoji, cur);
    }
    return Array.from(m.entries());
  }, [reactions, currentUserId]);

  if (grouped.length === 0) return null;

  return (
    <div className={cn("mt-1 flex flex-wrap gap-1", isMine ? "justify-end" : "justify-start")}>
      {grouped.map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
            mine
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <span className="text-sm leading-none">{emoji}</span>
          <span className="tabular-nums">{count}</span>
        </button>
      ))}
    </div>
  );
}

export function ReactionPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <SmilePlus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-auto p-1">
        <div className="flex gap-0.5">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onPick(e); setOpen(false); }}
              className="rounded-md p-1.5 text-lg leading-none hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
