type Props = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
};

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "text-white/80",
  positive: "text-[#37c8bf]",
  negative: "text-[#ef4a68]",
};

export function StatBadge({ label, value, tone = "neutral" }: Props) {
  return (
    <div className="min-w-[96px]">
      <div className="text-[11px] uppercase tracking-wide text-white/45">{label}</div>
      <div className={`mt-0.5 text-xs font-medium ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

