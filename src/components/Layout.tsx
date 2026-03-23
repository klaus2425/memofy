import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useFolders } from "../hooks/useFolders";
import { useTags } from "../hooks/useTags";
import { useJobs } from "../hooks/useJobs";
import { useTheme } from "../hooks/useTheme";

export function Layout() {
  const { folders, createFolder } = useFolders();
  const { tags } = useTags();
  const { activeCount, queuedCount } = useJobs();
  useTheme();

  const handleCreateFolder = async () => {
    const name = prompt("Folder name:");
    if (name?.trim()) { await createFolder(name.trim()); }
  };

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Sidebar folders={folders} tags={tags} onCreateFolder={handleCreateFolder} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
