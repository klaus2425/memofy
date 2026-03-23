interface EmptyStateProps { icon: string; title: string; message: string; actionLabel?: string; onAction?: () => void; }

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>{message}</p>
      {actionLabel && onAction && (<button onClick={onAction} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: "var(--accent)" }}>{actionLabel}</button>)}
    </div>
  );
}
