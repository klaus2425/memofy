import { useLocation, useNavigate } from "react-router-dom";
import type { Folder, Tag } from "../lib/types";

interface SidebarProps {
  folders: Folder[];
  tags: Tag[];
  onCreateFolder: () => void;
}

export function Sidebar({ folders, tags, onCreateFolder }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItem = (label: string, icon: string, path: string, count?: number) => {
    const isActive = location.pathname === path || location.search.includes(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? "font-semibold" : ""}`}
        style={{
          background: isActive ? "var(--accent-light)" : "transparent",
          color: isActive ? "var(--accent-hover)" : "var(--text-muted)",
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--border)", color: "var(--text-muted)" }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col py-5 border-r" style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2.5 px-5 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "var(--accent)" }}>M</div>
        <span className="text-xl font-bold">Memofy</span>
      </div>
      <button onClick={() => navigate("/new")} className="mx-4 mb-5 px-4 py-3 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-colors" style={{ background: "var(--accent)" }}>+ New Note</button>
      <div className="px-3 space-y-0.5">
        {navItem("All Notes", "\u{1F4C4}", "/")}
        {navItem("Favorites", "\u2B50", "/?filter=favorites")}
      </div>
      <div className="px-3 mt-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Folders</span>
          <button onClick={onCreateFolder} className="text-xs" style={{ color: "var(--text-muted)" }}>+</button>
        </div>
        {folders.map((f) => (<div key={f.id}>{navItem(f.name, "\u{1F4C1}", `/?folder=${f.id}`)}</div>))}
      </div>
      <div className="px-3 mt-6">
        <div className="px-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Tags</span>
        </div>
        {tags.map((t) => (<div key={t.id}>{navItem(t.name, "\u25CF", `/?tag=${t.name}`)}</div>))}
      </div>
      <div className="mt-auto px-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        {navItem("Settings", "\u2699", "/settings")}
      </div>
    </aside>
  );
}
