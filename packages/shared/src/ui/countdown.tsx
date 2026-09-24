import * as React from "react";
import { cn } from "../lib/utils";

function parts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Ticking countdown to a deadline. Renders nothing once the time is up, so a
 *  promotion card can hide itself the moment it expires. */
export function Countdown({
  endsAt,
  onExpire,
  className,
  compact = false,
}: {
  /** ISO timestamp the countdown runs to. */
  endsAt: string;
  onExpire?: () => void;
  className?: string;
  /** Inline "2d 04:11:09" instead of the boxed digit groups. */
  compact?: boolean;
}) {
  const target = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [msLeft, setMsLeft] = React.useState(() => target - Date.now());

  React.useEffect(() => {
    setMsLeft(target - Date.now());
    const id = setInterval(() => setMsLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const expired = msLeft <= 0;

  React.useEffect(() => {
    if (expired) onExpire?.();
    // Fire once per expiry, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  if (expired) return null;

  const { days, hours, minutes, seconds } = parts(msLeft);

  if (compact) {
    return (
      <span className={cn("font-mono text-[12px] font-bold tabular-nums", className)}>
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  const groups: { value: number; label: string }[] = [
    ...(days > 0 ? [{ value: days, label: "days" }] : []),
    { value: hours, label: "hrs" },
    { value: minutes, label: "min" },
    { value: seconds, label: "sec" },
  ];

  return (
    <div className={cn("flex items-center gap-1.5", className)} role="timer">
      {groups.map((g) => (
        <div
          key={g.label}
          className="flex min-w-[38px] flex-col items-center rounded-md bg-black/25 px-1.5 py-1 backdrop-blur-sm"
        >
          <span className="font-mono text-[15px] font-extrabold leading-none tabular-nums text-white">
            {pad(g.value)}
          </span>
          <span className="mt-0.5 text-[8.5px] uppercase tracking-[0.1em] text-white/70">
            {g.label}
          </span>
        </div>
      ))}
    </div>
  );
}
