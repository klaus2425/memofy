import { useEffect, useState } from "react";

interface SearchBarProps { onSearch: (query: string) => void; }

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative flex-1 max-w-md">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>&#128269;</span>
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search notes, transcripts, summaries..." className="w-full py-2.5 pl-10 pr-4 rounded-xl border text-sm outline-none transition-colors" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} />
    </div>
  );
}
