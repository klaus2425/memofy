import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { getDb } from "../lib/db";
import type { Job } from "../lib/types";

interface SidecarMessage {
  type: string;
  job_id?: string;
  text?: string;
  progress?: number;
  full_text?: string;
  message?: string;
  status?: string;
  whisper_ready?: boolean;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [streamingTranscript, setStreamingTranscript] = useState("");
  const [streamingSummary, setStreamingSummary] = useState("");
  const [transcriptProgress, setTranscriptProgress] = useState(0);

  const fetchJobs = useCallback(async () => {
    const db = await getDb();
    const result = await db.select<Job[]>(
      "SELECT * FROM jobs WHERE status != 'complete' ORDER BY id"
    );
    setJobs(result);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const saveTranscript = async (noteId: number, transcript: string) => {
    const db = await getDb();
    await db.execute(
      "UPDATE notes SET transcript = $1, status = 'summarizing', updated_at = datetime('now') WHERE id = $2",
      [transcript, noteId]
    );
    await db.execute(
      "UPDATE jobs SET status = 'summarizing' WHERE note_id = $1",
      [noteId]
    );
    await fetchJobs();
  };

  const saveSummary = async (noteId: number, summary: string) => {
    const db = await getDb();
    await db.execute(
      "UPDATE notes SET summary = $1, status = 'complete', updated_at = datetime('now') WHERE id = $2",
      [summary, noteId]
    );
    await db.execute(
      "UPDATE jobs SET status = 'complete', completed_at = datetime('now') WHERE note_id = $1",
      [noteId]
    );
    await fetchJobs();
  };

  const markJobFailed = async (noteId: number, errorMessage: string) => {
    const db = await getDb();
    await db.execute(
      "UPDATE notes SET status = 'failed', updated_at = datetime('now') WHERE id = $1",
      [noteId]
    );
    await db.execute(
      "UPDATE jobs SET status = 'failed', error_message = $1 WHERE note_id = $2",
      [errorMessage, noteId]
    );
    await fetchJobs();
  };

  // Listen for sidecar messages
  useEffect(() => {
    const unlisten = listen<SidecarMessage>("sidecar-message", (event) => {
      const msg = event.payload;

      switch (msg.type) {
        case "transcript_chunk":
          setStreamingTranscript((prev) => prev + msg.text + " ");
          setTranscriptProgress(msg.progress || 0);
          break;

        case "transcript_complete":
          setStreamingTranscript(msg.full_text || "");
          setTranscriptProgress(1);
          if (msg.job_id) {
            saveTranscript(parseInt(msg.job_id), msg.full_text || "");
          }
          break;

        case "summary_chunk":
          setStreamingSummary((prev) => prev + (msg.text || ""));
          break;

        case "summary_complete":
          setStreamingSummary(msg.full_text || "");
          if (msg.job_id) {
            saveSummary(parseInt(msg.job_id), msg.full_text || "");
            (async () => {
              let granted = await isPermissionGranted();
              if (!granted) {
                const permission = await requestPermission();
                granted = permission === "granted";
              }
              if (granted) {
                sendNotification({ title: "Memofy", body: "Your meeting notes are ready!" });
              }
            })();
          }
          break;

        case "error":
          if (msg.job_id) {
            markJobFailed(parseInt(msg.job_id), msg.message || "Unknown error");
          }
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const createJob = useCallback(
    async (noteId: number) => {
      const db = await getDb();
      await db.execute(
        "INSERT INTO jobs (note_id, status, started_at) VALUES ($1, 'pending', datetime('now'))",
        [noteId]
      );
      await fetchJobs();
    },
    [fetchJobs]
  );

  const resetStreaming = useCallback(() => {
    setStreamingTranscript("");
    setStreamingSummary("");
    setTranscriptProgress(0);
  }, []);

  const activeCount = jobs.filter((j) => j.status === "transcribing" || j.status === "summarizing").length;
  const queuedCount = jobs.filter((j) => j.status === "pending").length;

  return {
    jobs,
    activeJobId,
    setActiveJobId,
    streamingTranscript,
    streamingSummary,
    transcriptProgress,
    fetchJobs,
    createJob,
    resetStreaming,
    activeCount,
    queuedCount,
  };
}
