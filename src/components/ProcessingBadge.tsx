interface ProcessingBadgeProps { activeCount: number; queuedCount: number; }

export function ProcessingBadge({ activeCount, queuedCount }: ProcessingBadgeProps) {
  if (activeCount === 0 && queuedCount === 0) return null;
  const label = queuedCount > 0
    ? `Processing ${activeCount} note${activeCount !== 1 ? "s" : ""} (${queuedCount} queued)`
    : `Processing ${activeCount} note${activeCount !== 1 ? "s" : ""}...`;
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: "var(--accent-light)", color: "var(--accent-hover)" }}>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
      {label}
    </div>
  );
}
