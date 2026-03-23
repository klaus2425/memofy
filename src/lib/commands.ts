import { invoke } from "@tauri-apps/api/core";

export interface OllamaStatus {
  status: "running" | "not_running" | "error";
  models?: { name: string; size: number }[];
  message?: string;
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  return invoke("check_ollama_status");
}

export async function sendToSidecar(command: Record<string, unknown>): Promise<void> {
  return invoke("send_to_sidecar", { command });
}

export interface ExportData {
  title: string;
  date: string;
  summary: string;
  transcript: string | null;
  include_transcript: boolean;
}

export async function exportToMarkdown(data: ExportData): Promise<string> {
  return invoke("export_to_markdown", { data });
}
