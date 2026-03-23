import { useEffect, useRef } from "react";

interface StreamingTextProps { text: string; placeholder?: string; }

export function StreamingText({ text, placeholder }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-y-auto p-4 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "var(--card-bg)", borderColor: "var(--border)", maxHeight: "400px", minHeight: "200px" }}>
      {text || (<span style={{ color: "var(--text-muted)" }}>{placeholder || "Waiting..."}</span>)}
    </div>
  );
}
