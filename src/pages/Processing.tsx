import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb } from "../lib/db";
import { useJobs } from "../hooks/useJobs";
import { ProgressBar } from "../components/ProgressBar";
import { StreamingText } from "../components/StreamingText";
import type { Note } from "../lib/types";

export function Processing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const { streamingTranscript, streamingSummary, transcriptProgress } = useJobs();

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      const db = await getDb();
      const result = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [parseInt(id)]);
      if (result.length > 0) {
        setNote(result[0]);
        if (result[0].status === "complete" || result[0].status === "failed") clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id]);

  if (!note) return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading...</div>;

  if (note.status === "complete") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-7 text-center">
        <div className="text-5xl mb-4">{"\u2705"}</div>
        <h2 className="text-lg font-bold mb-2">Note Complete!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Your meeting notes are ready.</p>
        <button onClick={() => navigate(`/note/${note.id}`)} className="px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "var(--accent)" }}>View Note</button>
      </div>
    );
  }

  if (note.status === "failed") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-7 text-center">
        <div className="text-5xl mb-4">{"\u274C"}</div>
        <h2 className="text-lg font-bold mb-2">Processing Failed</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Something went wrong. You can try again from the note view.</p>
        <button onClick={() => navigate(`/note/${note.id}`)} className="px-6 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "var(--accent)" }}>View Note</button>
      </div>
    );
  }

  const isTranscribing = note.status === "transcribing" || note.status === "pending";
  const isSummarizing = note.status === "summarizing";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <h1 className="text-xl font-bold mb-1">{note.title}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Processing your meeting notes...</p>
      <div className="mb-8">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          {isTranscribing && (<span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />)}
          {isTranscribing ? "Transcribing..." : "\u2705 Transcription Complete"}
        </h2>
        {isTranscribing && (<ProgressBar progress={transcriptProgress} label={`${Math.round(transcriptProgress * 100)}%`} />)}
        <div className="mt-3"><StreamingText text={streamingTranscript || note.transcript || ""} placeholder="Waiting for transcription to begin..." /></div>
      </div>
      {(isSummarizing || streamingSummary) && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            Summarizing...
          </h2>
          <StreamingText text={streamingSummary} placeholder="Waiting for summary generation..." />
        </div>
      )}
    </div>
  );
}
