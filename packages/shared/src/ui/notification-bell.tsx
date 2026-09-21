import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "../lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({
  items,
  unreadCount,
  onItemClick,
  onMarkAllRead,
}: {
  items: NotificationItem[];
  unreadCount: number;
  onItemClick: (item: NotificationItem) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-ink-dark hover:bg-surface-alt"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-96 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-bold text-ink">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[11px] font-semibold text-accent"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="p-5 text-center text-[12.5px] text-muted">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onItemClick(n);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-[#F5F0EE] px-4 py-3 text-left last:border-b-0 hover:bg-surface-alt",
                  !n.read_at && "bg-accent-tint/40",
                )}
              >
                <span className="text-[12.5px] font-bold text-ink-dark">{n.title}</span>
                {n.body ? (
                  <span className="line-clamp-2 text-[11.5px] text-muted">{n.body}</span>
                ) : null}
                <span className="text-[10px] text-muted-table">{timeAgo(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
