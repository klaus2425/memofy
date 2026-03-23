interface ProgressBarProps { progress: number; label?: string; }

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div>
      {label && (<div className="text-xs font-semibold mb-1.5" style={{ color: "var(--accent)" }}>{label}</div>)}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--accent-light)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ background: "var(--accent)", width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
