import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb } from "../lib/db";
import { useTags } from "../hooks/useTags";
import { exportToMarkdown, sendToSidecar } from "../lib/commands";
import { useSettings } from "../hooks/useSettings";
import { TagPicker } from "../components/TagPicker";
import type { Note, Tag } from "../lib/types";

export function NoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [noteTags, setNoteTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");
  const { tags, addTagToNote, removeTagFromNote, getNoteTags } = useTags();
  const { settings } = useSettings();

  const fetchNote = useCallback(async () => {
    if (!id) return;
    const db = await getDb();
    const result = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [parseInt(id)]);
    if (result.length > 0) setNote(result[0]);
    const tagResult = await getNoteTags(parseInt(id));
    setNoteTags(tagResult);
  }, [id, getNoteTags]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  if (!note) return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading...</div>;

  const handleExport = async () => {
    await exportToMarkdown({ title: note.title, date: note.created_at, summary: note.summary || "", transcript: note.transcript, include_transcript: settings.include_transcript_in_export });
  };

  const handleResummarize = async () => {
    if (!note.transcript) return;
    const db = await getDb();
    await db.execute("UPDATE notes SET status = 'summarizing', summary = NULL WHERE id = $1", [note.id]);
    await sendToSidecar({ type: "summarize", transcript: note.transcript, prompt_style: settings.summary_length, model: settings.ollama_model, job_id: String(note.id) });
    await fetchNote();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id = $1", [note.id]);
    navigate("/");
  };

  const handleAddTag = async (tagName: string) => {
    await addTagToNote(note.id, tagName);
    const updated = await getNoteTags(note.id);
    setNoteTags(updated);
  };

  const handleRemoveTag = async (tagId: number) => {
    await removeTagFromNote(note.id, tagId);
    const updated = await getNoteTags(note.id);
    setNoteTags(updated);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-7 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <button onClick={() => navigate("/")} className="text-sm mb-3 inline-block" style={{ color: "var(--text-muted)" }}>&larr; Back to Library</button>
        <h1 className="text-xl font-bold mb-1">{note.title}</h1>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{new Date(note.created_at).toLocaleDateString()}</span>
          {note.duration_seconds && (<><span>&bull;</span><span>{Math.round(note.duration_seconds / 60)} min</span></>)}
          <span>&bull;</span>
          <span className="capitalize">{note.source_type}</span>
        </div>
        <div className="mt-3"><TagPicker allTags={tags} selectedTags={noteTags} onAdd={handleAddTag} onRemove={handleRemoveTag} /></div>
      </div>
      <div className="flex gap-1 px-7 pt-4" style={{ borderBottom: `1px solid var(--border)` }}>
        {(["summary", "transcript"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 text-sm font-semibold rounded-t-lg capitalize" style={{ background: activeTab === tab ? "var(--card-bg)" : "transparent", color: activeTab === tab ? "var(--text)" : "var(--text-muted)", borderBottom: activeTab === tab ? `2px solid var(--accent)` : "2px solid transparent" }}>{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-7 py-5">
        {activeTab === "summary" ? (
          <div className="prose max-w-none text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
            {note.summary || (<p style={{ color: "var(--text-muted)" }}>{note.status === "failed" ? "Summarization failed. Try re-summarizing with a different model." : "Summary not available yet."}</p>)}
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--text)" }}>
            {note.transcript || (<p style={{ color: "var(--text-muted)" }}>No transcript available.</p>)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 px-7 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={handleExport} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Export Markdown</button>
        {note.transcript && (<button onClick={handleResummarize} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Re-summarize</button>)}
        <button onClick={handleDelete} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-red-500 border border-red-200">Delete</button>
      </div>
    </div>
  );
}
