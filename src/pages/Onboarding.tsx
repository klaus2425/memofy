import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";
import { checkOllamaStatus, type OllamaStatus } from "../lib/commands";

type Step = "welcome" | "ollama" | "whisper";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { setSetting } = useSettings();
  const [step, setStep] = useState<Step>("welcome");
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState("llama3");
  const [selectedWhisperModel, setSelectedWhisperModel] = useState("base");

  useEffect(() => { if (step === "ollama") checkOllama(); }, [step]);

  const checkOllama = async () => {
    const status = await checkOllamaStatus();
    setOllamaStatus(status);
    if (status.status === "running" && status.models) {
      const models = status.models.map((m) => m.name);
      setOllamaModels(models);
      if (models.length > 0) setSelectedOllamaModel(models[0]);
    }
  };

  const finish = async () => {
    await setSetting("ollama_model", selectedOllamaModel);
    await setSetting("whisper_model", selectedWhisperModel);
    await setSetting("onboarding_complete", true);
    onComplete();
  };

  const card = (children: React.ReactNode) => (
    <div className="flex-1 flex items-center justify-center p-7">
      <div className="w-full max-w-md rounded-2xl p-8 border" style={{ background: "var(--card-bg)", borderColor: "var(--border)", boxShadow: "var(--shadow)" }}>{children}</div>
    </div>
  );

  if (step === "welcome") {
    return card(<>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white mx-auto mb-4" style={{ background: "var(--accent)" }}>M</div>
        <h1 className="text-2xl font-bold mb-2">Welcome to Memofy</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Your private AI meeting notetaker. Memofy transcribes your meetings and creates beautiful narrative summaries — all running locally on your machine. No cloud, no subscriptions.</p>
      </div>
      <button onClick={() => setStep("ollama")} className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "var(--accent)" }}>Get Started</button>
    </>);
  }

  if (step === "ollama") {
    return card(<>
      <h2 className="text-lg font-bold mb-1">Ollama Setup</h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Memofy uses Ollama to generate meeting summaries locally. It's a free, open-source tool that runs AI models on your computer.</p>
      {ollamaStatus === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Checking...</p>
      ) : ollamaStatus.status === "running" ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{"\u2705"}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>Ollama is running!</span>
          </div>
          {ollamaModels.length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-semibold block mb-1.5">Select a model:</label>
              <select value={selectedOllamaModel} onChange={(e) => setSelectedOllamaModel(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
                {ollamaModels.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{"\u26A0\uFE0F"}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Ollama not detected</span>
          </div>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>You can still use Memofy for transcription without Ollama. To enable AI summaries, install Ollama from:</p>
          <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline" style={{ color: "var(--accent)" }}>ollama.com</a>
          <button onClick={checkOllama} className="block mt-3 text-sm font-semibold" style={{ color: "var(--accent)" }}>Re-check</button>
        </div>
      )}
      <div className="flex gap-3 mt-6">
        <button onClick={() => setStep("welcome")} className="flex-1 py-3 rounded-xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Back</button>
        <button onClick={() => setStep("whisper")} className="flex-1 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "var(--accent)" }}>Next</button>
      </div>
    </>);
  }

  if (step === "whisper") {
    const models = [
      { value: "tiny", label: "Fast (tiny)", size: "~75 MB" },
      { value: "base", label: "Balanced (base)", size: "~150 MB" },
      { value: "small", label: "Accurate (small)", size: "~500 MB" },
      { value: "medium", label: "High Quality (medium)", size: "~1.5 GB" },
      { value: "large", label: "Best (large)", size: "~3 GB" },
    ];
    return card(<>
      <h2 className="text-lg font-bold mb-1">Transcription Model</h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Choose a Whisper model for transcribing audio. Larger models are more accurate but use more disk space and run slower.</p>
      <div className="space-y-2 mb-6">
        {models.map((m) => (
          <button key={m.value} onClick={() => setSelectedWhisperModel(m.value)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors" style={{ borderColor: selectedWhisperModel === m.value ? "var(--accent)" : "var(--border)", background: selectedWhisperModel === m.value ? "var(--accent-light)" : "var(--card-bg)" }}>
            <span className="font-semibold">{m.label}</span>
            <span style={{ color: "var(--text-muted)" }}>{m.size}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep("ollama")} className="flex-1 py-3 rounded-xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Back</button>
        <button onClick={finish} className="flex-1 py-3 rounded-xl text-white text-sm font-semibold" style={{ background: "var(--accent)" }}>Finish Setup</button>
      </div>
    </>);
  }

  return null;
}
