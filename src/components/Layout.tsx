import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <aside
        className="w-60 flex-shrink-0 flex flex-col p-5 border-r"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: "var(--accent)" }}
          >
            M
          </div>
          <span className="text-xl font-bold">Memofy</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sidebar coming soon
        </p>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
