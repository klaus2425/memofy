import type { Note, Tag } from "../lib/types";

interface NoteCardProps {
  note: Note;
  tags: Tag[];
  onToggleFavorite: (id: number, current: number) => void;
  onClick: () => void;
}

const SOURCE_ICONS: Record<Note["source_type"], string> = { upload: "\u{1F3A5}", record: "\u{1F3A4}", paste: "\u{1F4C4}" };
const SOURCE_LABELS: Record<Note["source_type"], string> = { upload: "Uploaded", record: "Recorded", paste: "Pasted transcript" };

export function NoteCard({ note, tags, onToggleFavorite, onClick }: NoteCardProps) {
  const isProcessing = note.status !== "complete" && note.status !== "failed";
  return (
    <div onClick={onClick} className={`rounded-xl p-5 mb-3 cursor-pointer transition-all border ${isProcessing ? "border-l-4" : ""}`} style={{ background: "var(--card-bg)", borderColor: isProcessing ? "var(--accent)" : "var(--border)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-bold">{note.title}</h3>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id, note.is_favorite); }} className="text-lg" style={{ color: note.is_favorite ? "var(--favorite)" : "var(--border)" }}>{note.is_favorite ? "\u2605" : "\u2606"}</button>
      </div>
      <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        <span>{SOURCE_ICONS[note.source_type]} {SOURCE_LABELS[note.source_type]}</span>
        <span>&bull;</span>
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
        {note.duration_seconds && (<><span>&bull;</span><span>{Math.round(note.duration_seconds / 60)} min</span></>)}
      </div>
      {note.summary && (<p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>{note.summary}</p>)}
      {isProcessing && (<div className="text-xs font-semibold mt-3" style={{ color: "var(--accent)" }}>
        {note.status === "pending" && "Queued..."}{note.status === "transcribing" && "Transcribing..."}{note.status === "summarizing" && "Summarizing..."}
      </div>)}
      {tags.length > 0 && (<div className="flex gap-1.5 mt-2.5">{tags.map((t) => (<span key={t.id} className="px-2.5 py-0.5 rounded-md text-xs font-semibold" style={{ background: "var(--tag-bg)", color: "var(--text-muted)" }}>{t.name}</span>))}</div>)}
    </div>
  );
}
