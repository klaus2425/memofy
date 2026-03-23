import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Settings } from "../lib/types";

const DEFAULTS: Settings = {
  whisper_model: "base",
  ollama_model: "llama3",
  ollama_endpoint: "http://localhost:11434",
  summary_length: "standard",
  theme: "system",
  include_transcript_in_export: true,
  default_export_dir: "",
  onboarding_complete: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM settings"
    );

    const parsed: Record<string, unknown> = { ...DEFAULTS };
    for (const row of rows) {
      try {
        parsed[row.key] = JSON.parse(row.value);
      } catch {
        parsed[row.key] = row.value;
      }
    }

    setSettings(parsed as unknown as Settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const setSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const db = await getDb();
      const jsonValue = JSON.stringify(value);
      await db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)",
        [key, jsonValue]
      );
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return { settings, loading, setSetting, fetchSettings };
}
