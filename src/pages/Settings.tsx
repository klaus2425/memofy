import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { checkOllamaStatus, type OllamaStatus } from "../lib/commands";

export function Settings() {
  const { settings, setSetting, loading } = useSettings();
  const { theme, setTheme } = useTheme();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => { handleTestConnection(); }, []);

  const handleTestConnection = async () => {
    const status = await checkOllamaStatus();
    setOllamaStatus(status);
    if (status.status === "running" && status.models) {
      setOllamaModels(status.models.map((m) => m.name));
    }
  };

  if (loading) return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading settings...</div>;

  const section = (title: string, children: React.ReactNode) => (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const field = (label: string, description: string, input: React.ReactNode) => (
    <div className="flex items-start justify-between gap-8">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</div>
      </div>
      <div className="flex-shrink-0">{input}</div>
    </div>
  );

  const selectInput = (value: string, options: { value: string; label: string }[], onChange: (v: string) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }}>
      {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {section("AI Models", <>
        {field("Whisper Model", "Larger models are more accurate but slower",
          selectInput(settings.whisper_model, [
            { value: "tiny", label: "Fast (tiny) — ~75 MB" },
            { value: "base", label: "Balanced (base) — ~150 MB" },
            { value: "small", label: "Accurate (small) — ~500 MB" },
            { value: "medium", label: "High Quality (medium) — ~1.5 GB" },
            { value: "large", label: "Best (large) — ~3 GB" },
          ], (v) => setSetting("whisper_model", v))
        )}
        {field("Ollama Model", "Select from detected models or enter a custom name",
          ollamaModels.length > 0
            ? selectInput(settings.ollama_model, ollamaModels.map((m) => ({ value: m, label: m })), (v) => setSetting("ollama_model", v))
            : (<input type="text" value={settings.ollama_model} onChange={(e) => setSetting("ollama_model", e.target.value)} className="px-3 py-2 rounded-lg border text-sm w-48" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} />)
        )}
      </>)}

      {section("Ollama Connection", <>
        {field("Status",
          ollamaStatus ? (ollamaStatus.status === "running" ? `Connected — ${ollamaModels.length} model(s) available` : "Not connected") : "Checking...",
          <button onClick={handleTestConnection} className="px-3 py-2 rounded-lg border text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Test Connection</button>
        )}
        {field("Endpoint", "URL where Ollama is running",
          <input type="text" value={settings.ollama_endpoint} onChange={(e) => setSetting("ollama_endpoint", e.target.value)} className="px-3 py-2 rounded-lg border text-sm w-64" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text)" }} />
        )}
      </>)}

      {section("Output Preferences", <>
        {field("Summary Length", "How detailed should meeting summaries be?",
          selectInput(settings.summary_length, [
            { value: "brief", label: "Brief" },
            { value: "standard", label: "Standard" },
            { value: "detailed", label: "Detailed" },
          ], (v) => setSetting("summary_length", v as "brief" | "standard" | "detailed"))
        )}
        {field("Include Transcript in Export", "Add full transcript when exporting to Markdown",
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.include_transcript_in_export} onChange={(e) => setSetting("include_transcript_in_export", e.target.checked)} className="sr-only" />
            <div className="w-10 h-5 rounded-full transition-colors" style={{ background: settings.include_transcript_in_export ? "var(--accent)" : "var(--border)" }}>
              <div className="w-4 h-4 rounded-full bg-white transition-transform mt-0.5" style={{ transform: settings.include_transcript_in_export ? "translateX(22px)" : "translateX(2px)" }} />
            </div>
          </label>
        )}
      </>)}

      {section("Appearance", <>
        {field("Theme", "Choose your preferred color scheme",
          selectInput(theme, [
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ], (v) => { setTheme(v as "light" | "dark" | "system"); setSetting("theme", v as "light" | "dark" | "system"); })
        )}
      </>)}
    </div>
  );
}
