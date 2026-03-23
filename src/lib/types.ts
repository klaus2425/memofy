export interface Note {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  duration_seconds: number | null;
  source_type: "upload" | "record" | "paste";
  folder_id: number | null;
  is_favorite: number; // SQLite boolean: 0 or 1
  transcript: string | null;
  summary: string | null;
  audio_path: string | null;
  status: "pending" | "transcribing" | "summarizing" | "complete" | "failed";
}

export interface Folder {
  id: number;
  name: string;
  created_at: string;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Job {
  id: number;
  note_id: number;
  status: "pending" | "transcribing" | "summarizing" | "complete" | "failed";
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  progress: number;
}

export interface Settings {
  whisper_model: string;
  ollama_model: string;
  ollama_endpoint: string;
  summary_length: "brief" | "standard" | "detailed";
  theme: "light" | "dark" | "system";
  include_transcript_in_export: boolean;
  default_export_dir: string;
  onboarding_complete: boolean;
}
