import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { useNotes } from "../hooks/useNotes";
import { useJobs } from "../hooks/useJobs";
import { useSettings } from "../hooks/useSettings";
import { sendToSidecar } from "../lib/commands";

type InputMode = "upload" | "record" | "paste";

export function NewNote() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<InputMode>("upload");
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { createNote } = useNotes();
  const { createJob, resetStreaming } = useJobs();
  const { settings } = useSettings();

  const handleFileSelect = async () => {
    const file = await open({ multiple: false, filters: [{ name: "Audio/Video", extensions: ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "flac"] }] });
    if (file) {
      setSelectedFile(file as string);
      if (!title) {
        const name = (file as string).split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "";
        setTitle(name);
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    const noteTitle = title || `Note \u2014 ${new Date().toLocaleDateString()}`;
    const noteId = await createNote({ title: noteTitle, source_type: "upload", status: "pending" });
    if (noteId) {
      await createJob(noteId);
      resetStreaming();
      await sendToSidecar({ type: "transcribe", audio_path: selectedFile, model: settings.whisper_model, job_id: String(noteId) });
      navigate(`/processing/${noteId}`);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    const noteTitle = title || `Note \u2014 ${new Date().toLocaleDateString()}`;
    const noteId = await createNote({ title: noteTitle, source_type: "paste", status: "summarizing" });
    if (noteId) {
      const { getDb } = await import("../lib/db");
      const db = await getDb();
      await db.execute("UPDATE notes SET transcript = $1 WHERE id = $2", [pastedText, noteId]);
      await createJob(noteId);
      resetStreaming();
      await sendToSidecar({ type: "summarize", transcript: pastedText, prompt_style: settings.summary_length, model: settings.ollama_model, job_id: String(noteId) });
      navigate(`/processing/${noteId}`);
    }
  };

  const tabButton = (tabMode: InputMode, icon: string, label: string) => (
    <button onClick={() => setMode(tabMode)} className="flex-1 py-3 text-sm font-semibold rounded-xl transition-all" style={{ background: mode === tabMode ? "var(--accent-light)" : "transparent", color: mode === tabMode ? "var(--accent-hover)" : "var(--text-muted)" }}>
      <span className="mr-1.5">{icon}</span>{label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <button onClick={() => navigate("/")} className="text-sm mb-4 inline-block" style={{ color: "var(--text-muted)" }}>&larr; Back</button>
      <h1 className="text-xl font-bold mb-6">New Note</h1>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title (optional)" className="w-full max-w-lg px-4 py-3 rounded-xl border text-sm outline-none mb-6" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} />
      <div className="flex gap-1 p-1 rounded-xl mb-6 max-w-lg" style={{ background: "var(--sidebar-bg)" }}>
        {tabButton("upload", "\u{1F4C1}", "Upload")}
        {tabButton("record", "\u{1F3A4}", "Record")}
        {tabButton("paste", "\u{1F4CB}", "Paste")}
      </div>
      {mode === "upload" && (
        <div className="max-w-lg">
          <div onClick={handleFileSelect} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); }} className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors" style={{ borderColor: isDragging ? "var(--accent)" : "var(--border)", background: isDragging ? "var(--accent-light)" : "transparent" }}>
            <div className="text-4xl mb-3">{"\u{1F4C2}"}</div>
            <p className="text-sm font-semibold">{selectedFile ? selectedFile.split(/[/\\]/).pop() : "Click to select or drag & drop"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>mp3, wav, m4a, mp4, webm, ogg, flac</p>
          </div>
          <button onClick={handleUploadSubmit} disabled={!selectedFile} className="mt-4 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40" style={{ background: "var(--accent)" }}>Transcribe & Summarize</button>
        </div>
      )}
      {mode === "record" && (
        <div className="max-w-lg">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Recording will be implemented in a later task. For now, use Upload or Paste.</p>
        </div>
      )}
      {mode === "paste" && (
        <div className="max-w-lg">
          <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste your meeting transcript here..." className="w-full h-64 px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} />
          <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="mt-4 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40" style={{ background: "var(--accent)" }}>Summarize</button>
        </div>
      )}
    </div>
  );
}
