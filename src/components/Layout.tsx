import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ProcessingBadge } from "./ProcessingBadge";
import { useFolders } from "../hooks/useFolders";
import { useTags } from "../hooks/useTags";
import { useJobs } from "../hooks/useJobs";
import { useTheme } from "../hooks/useTheme";
import { checkOllamaStatus } from "../lib/commands";

export function Layout() {
  const { folders, createFolder } = useFolders();
  const { tags } = useTags();
  const { activeCount, queuedCount } = useJobs();
  useTheme();

  const [ollamaOnline, setOllamaOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      const status = await checkOllamaStatus();
      setOllamaOnline(status.status === "running");
    };
    check();
  }, []);

  const handleCreateFolder = async () => {
    const name = prompt("Folder name:");
    if (name?.trim()) { await createFolder(name.trim()); }
  };

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Sidebar folders={folders} tags={tags} onCreateFolder={handleCreateFolder} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!ollamaOnline && (
          <div className="px-7 py-2.5 text-sm flex items-center justify-between" style={{ background: "var(--accent-light)", color: "var(--accent-hover)" }}>
            <span>Ollama is not running — summaries are unavailable. Transcription still works.</span>
            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">How to fix</a>
          </div>
        )}
        {(activeCount > 0 || queuedCount > 0) && (
          <div className="px-7 py-2 flex justify-end" style={{ borderBottom: `1px solid var(--border)` }}>
            <ProcessingBadge activeCount={activeCount} queuedCount={queuedCount} />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
