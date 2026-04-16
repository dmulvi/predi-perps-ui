import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "positive" | "negative";
  /** Fixed width (e.g. `w-[7.5rem]`) so values don’t shift the layout when they update. */
  className?: string;
};

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "text-white/80",
  positive: "text-[#37c8bf]",
  negative: "text-[#ef4a68]",
};

export function StatBadge({ label, value, tone = "neutral", className }: Props) {
  return (
    <div className={`shrink-0 ${className ?? "min-w-[96px]"}`}>
      <div className="text-[11px] uppercase tracking-wide text-white/45">{label}</div>
      <div
        className={`mt-0.5 text-xs font-medium tabular-nums ${toneMap[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}

