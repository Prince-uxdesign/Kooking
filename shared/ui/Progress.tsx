/** Linear cooking progress. Text accompanies the bar. */
export function Progress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = total <= 0 ? 0 : Math.round((current / total) * 100);
  const text = label ?? `Step ${current} of ${total}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink-900">{text}</p>
        <p className="tnum text-[13px] text-ink-500">{pct}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={text}
        className="h-2 overflow-hidden rounded-full bg-surface-200"
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
