import { useState } from "react";
import type { Tag } from "../lib/types";

interface TagPickerProps { allTags: Tag[]; selectedTags: Tag[]; onAdd: (tagName: string) => void; onRemove: (tagId: number) => void; }

export function TagPicker({ allTags, selectedTags, onAdd, onRemove }: TagPickerProps) {
  const [input, setInput] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) { onAdd(input.trim().toLowerCase()); setInput(""); }
  };
  const availableTags = allTags.filter((t) => !selectedTags.some((s) => s.id === t.id));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedTags.map((t) => (
          <span key={t.id} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: "var(--tag-bg)", color: "var(--text-muted)" }}>
            {t.name}<button onClick={() => onRemove(t.id)} className="ml-0.5">&times;</button>
          </span>
        ))}
      </div>
      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type tag name and press Enter..." className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} list="available-tags" />
      <datalist id="available-tags">{availableTags.map((t) => (<option key={t.id} value={t.name} />))}</datalist>
    </div>
  );
}
