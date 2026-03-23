# Memofy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Memofy, a fully local AI meeting notetaker desktop app using Tauri + React + Python sidecar.

**Architecture:** Thin Python sidecar handles Whisper transcription and Ollama summarization via newline-delimited JSON over stdin/stdout. Tauri/Rust manages state (SQLite), sidecar lifecycle, and IPC. React + Tailwind frontend handles UI, routing, and job management.

**Tech Stack:** Tauri v2, React 18, Tailwind CSS, Vite, SQLite (via tauri-plugin-sql with FTS5), Python 3.11+, OpenAI Whisper, Ollama REST API, FFmpeg

**Spec:** `docs/superpowers/specs/2026-03-23-memofy-design.md`

---

## File Structure

```
memofy/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              — Tauri app builder, plugin registration, command registration
│   │   ├── commands/
│   │   │   ├── mod.rs          — Re-exports all command modules
│   │   │   ├── notes.rs        — CRUD commands for notes (create, get, list, update, delete)
│   │   │   ├── folders.rs      — CRUD commands for folders
│   │   │   ├── tags.rs         — CRUD commands for tags + note_tags join
│   │   │   ├── settings.rs     — Get/set settings key-value pairs
│   │   │   ├── jobs.rs         — Job queue commands (create, list, update status)
│   │   │   └── export.rs       — Markdown export with native save dialog
│   │   └── sidecar.rs          — Sidecar process lifecycle, stdin/stdout JSON protocol, event forwarding
│   ├── Cargo.toml              — Dependencies: tauri, tauri-plugin-sql, tauri-plugin-shell, tauri-plugin-notification, tauri-plugin-dialog, serde, serde_json
│   ├── tauri.conf.json         — App config, window settings, sidecar binary reference, plugin config
│   ├── capabilities/
│   │   └── default.json        — Permissions for shell (sidecar), sql, notification, dialog, fs
│   └── migrations/
│       └── 001_initial.sql     — Initial schema: notes, folders, tags, note_tags, jobs, settings, FTS5
├── src/
│   ├── main.tsx                — React entry point, renders App
│   ├── App.tsx                 — Router setup (react-router-dom), Layout wrapper, onboarding gate
│   ├── index.css               — Tailwind directives + custom CSS variables for warm theme
│   ├── lib/
│   │   ├── db.ts               — Thin wrapper around @tauri-apps/plugin-sql for typed queries
│   │   ├── commands.ts         — Typed wrappers around Tauri invoke() calls
│   │   ├── types.ts            — TypeScript interfaces: Note, Folder, Tag, Job, Settings
│   │   └── theme.ts            — Theme CSS variables (light/dark/system), apply/read logic
│   ├── hooks/
│   │   ├── useNotes.ts         — Fetch, create, update, delete notes; search; filter by folder/tag
│   │   ├── useFolders.ts       — Fetch, create, rename, delete, reorder folders
│   │   ├── useTags.ts          — Fetch, create, delete tags; attach/detach from notes
│   │   ├── useSettings.ts      — Get/set settings with defaults
│   │   ├── useJobs.ts          — Job queue state, listen for sidecar events, progress tracking
│   │   └── useTheme.ts         — Dark/light/system toggle, persist preference
│   ├── components/
│   │   ├── Layout.tsx          — App shell: sidebar + header + main content area
│   │   ├── Sidebar.tsx         — Navigation: All Notes, Favorites, Folders, Tags, Settings link
│   │   ├── NoteCard.tsx        — Note list item: title, date, preview, tags, favorite star
│   │   ├── SearchBar.tsx       — Full-text search input with debounced query
│   │   ├── ProcessingBadge.tsx — Header badge showing active/queued job counts
│   │   ├── EmptyState.tsx      — Configurable empty state with icon, message, CTA button
│   │   ├── ProgressBar.tsx     — Animated progress bar for transcription/download
│   │   ├── WaveformVisualizer.tsx — Live audio waveform during recording (canvas-based)
│   │   ├── StreamingText.tsx   — Text area that renders streaming content (transcript/summary)
│   │   └── TagPicker.tsx       — Tag selector/creator for note editing
│   ├── pages/
│   │   ├── Library.tsx         — Main library view: note list, sorting, bulk actions
│   │   ├── NoteView.tsx        — Note detail: Summary/Transcript tabs, actions bar, metadata
│   │   ├── NewNote.tsx         — New note page: upload zone, record button, paste area (tabbed)
│   │   ├── Processing.tsx      — Active processing view: live transcript + summary streaming
│   │   ├── Settings.tsx        — Settings page: models, connection, output, appearance, storage
│   │   └── Onboarding.tsx      — First-run wizard: Welcome → Ollama check → Whisper model
│   └── test/
│       ├── setup.ts            — Test setup: mock Tauri APIs
│       ├── hooks/              — Hook unit tests
│       └── components/         — Component unit tests
├── sidecar/
│   ├── main.py                 — Entry point: reads stdin JSON lines, dispatches to handlers, writes stdout
│   ├── protocol.py             — Message parsing/serialization, type validation
│   ├── transcriber.py          — Whisper loading, transcription with progress callbacks, model management
│   ├── summarizer.py           — Ollama API client, streaming generation, prompt templates
│   ├── cleaner.py              — Transcript cleaning: filler removal, punctuation, paragraph breaks
│   ├── requirements.txt        — openai-whisper, requests
│   └── tests/
│       ├── test_protocol.py    — Protocol message parsing tests
│       ├── test_transcriber.py — Transcription tests (mocked Whisper)
│       ├── test_summarizer.py  — Summarizer tests (mocked HTTP)
│       └── test_cleaner.py     — Transcript cleaning tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── index.html
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: all root config files, `src-tauri/` skeleton, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `sidecar/` skeleton
- Reference: Tauri v2 docs for `create-project`, SQL plugin setup, shell plugin setup

- [ ] **Step 1: Create Tauri + React project**

```bash
cd C:/Users/Jaycie/Documents/Projects/Notetaker
npm create tauri-app@latest . -- --template react-ts --manager npm
```

Accept defaults. This creates the Tauri + React + Vite + TypeScript scaffold.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Add Nunito font**

Add Google Fonts link to `index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Configure Tailwind**

Replace `src/index.css` with:

```css
@import "tailwindcss";

:root {
  --bg: #FBF7F0;
  --sidebar-bg: #F5EDE0;
  --card-bg: #FFFFFF;
  --text: #3D3329;
  --text-muted: #8C7B6B;
  --accent: #D4913B;
  --accent-light: #F5DFC1;
  --accent-hover: #C07E2F;
  --border: #E8DDD0;
  --success: #6BAF7A;
  --tag-bg: #EDE4D6;
  --favorite: #E8A84C;
  --shadow: 0 2px 8px rgba(61, 51, 41, 0.08);
  --radius: 12px;
}

[data-theme="dark"] {
  --bg: #1E1A15;
  --sidebar-bg: #262019;
  --card-bg: #2E2820;
  --text: #E8DDD0;
  --text-muted: #9C8E7E;
  --accent: #D4913B;
  --accent-light: #3D3020;
  --accent-hover: #E8A84C;
  --border: #3A3228;
  --tag-bg: #3A3228;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

body {
  font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  margin: 0;
}

* {
  box-sizing: border-box;
}
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 4: Add Tauri plugins**

```bash
cd src-tauri
cargo tauri add sql
cargo tauri add shell
cargo tauri add notification
cargo tauri add dialog
cd ..
```

- [ ] **Step 5: Configure Tauri plugins in Rust**

Edit `src-tauri/src/lib.rs`:

```rust
mod commands;
mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod notes;
pub mod folders;
pub mod tags;
pub mod settings;
pub mod jobs;
pub mod export;
```

Create empty files for each command module (`notes.rs`, `folders.rs`, `tags.rs`, `settings.rs`, `jobs.rs`, `export.rs`) and `sidecar.rs` with placeholder content:

```rust
// Placeholder — implemented in later tasks
```

- [ ] **Step 6: Configure SQL plugin for SQLite**

Add to `src-tauri/tauri.conf.json` under `"plugins"`:

```json
{
  "plugins": {
    "sql": {
      "preload": ["sqlite:memofy.db"]
    }
  }
}
```

- [ ] **Step 7: Set up capabilities/permissions**

Edit `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "shell:default",
    "shell:allow-execute",
    "shell:allow-spawn",
    "shell:allow-stdin-write",
    "notification:default",
    "notification:allow-notify",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission",
    "dialog:default",
    "dialog:allow-save",
    "dialog:allow-open"
  ]
}
```

- [ ] **Step 8: Create Python sidecar skeleton**

Create `sidecar/requirements.txt`:

```
openai-whisper
requests
```

Create `sidecar/main.py`:

```python
"""Memofy Python sidecar — thin worker for Whisper + Ollama."""
import sys
import json

from protocol import parse_message, serialize_message


def main():
    """Read JSON commands from stdin, dispatch to handlers, write results to stdout."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = parse_message(line)
        except (json.JSONDecodeError, ValueError) as e:
            response = {"type": "error", "message": str(e)}
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
            continue

        msg_type = msg["type"]

        if msg_type == "health_check":
            from transcriber import check_whisper_health
            health = check_whisper_health()
            sys.stdout.write(serialize_message(health) + "\n")
            sys.stdout.flush()

        elif msg_type == "transcribe":
            from transcriber import transcribe
            transcribe(msg, sys.stdout)

        elif msg_type == "summarize":
            from summarizer import summarize
            summarize(msg, sys.stdout)

        else:
            response = {"type": "error", "message": f"Unknown command: {msg_type}"}
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
```

Create `sidecar/protocol.py` (placeholder — full implementation in Task 3):

```python
"""Message protocol for sidecar communication. Placeholder — implemented in Task 3."""
```

Create placeholder files `sidecar/transcriber.py`, `sidecar/summarizer.py`, `sidecar/cleaner.py`:

```python
"""Placeholder — implemented in later tasks."""
```

- [ ] **Step 9: Create minimal React app with router**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Library />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

Create `src/components/Layout.tsx`:

```tsx
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
```

Create `src/pages/Library.tsx`:

```tsx
export function Library() {
  return (
    <div className="p-7">
      <h1 className="text-xl font-bold">All Notes</h1>
      <p className="mt-4" style={{ color: "var(--text-muted)" }}>
        Your notes will appear here.
      </p>
    </div>
  );
}
```

- [ ] **Step 10: Verify the app builds and runs**

```bash
npm run tauri dev
```

Expected: Tauri window opens showing the Memofy shell with sidebar and "All Notes" placeholder.

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Tauri + React + Tailwind project with plugins and sidecar skeleton"
```

---

## Task 2: Database Schema & Migrations

**Files:**
- Create: `src-tauri/migrations/001_initial.sql`
- Create: `src/lib/db.ts`, `src/lib/types.ts`

- [ ] **Step 1: Write the initial migration SQL**

Create `src-tauri/migrations/001_initial.sql`:

```sql
CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  duration_seconds INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'record', 'paste')),
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  summary TEXT,
  audio_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transcribing', 'summarizing', 'complete', 'failed'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transcribing', 'summarizing', 'complete', 'failed')),
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  progress REAL NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  transcript,
  summary,
  content='notes',
  content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, transcript, summary)
  VALUES (new.id, new.title, new.transcript, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, transcript, summary)
  VALUES ('delete', old.id, old.title, old.transcript, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, transcript, summary)
  VALUES ('delete', old.id, old.title, old.transcript, old.summary);
  INSERT INTO notes_fts(rowid, title, transcript, summary)
  VALUES (new.id, new.title, new.transcript, new.summary);
END;

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('whisper_model', '"base"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ollama_model', '"llama3"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ollama_endpoint', '"http://localhost:11434"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('summary_length', '"standard"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '"system"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('include_transcript_in_export', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('default_export_dir', '""');
INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
```

- [ ] **Step 2: Configure migration in Rust**

Update `src-tauri/src/lib.rs` to load migrations:

```rust
mod commands;
mod sidecar;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:memofy.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Create TypeScript types**

Create `src/lib/types.ts`:

```typescript
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
```

- [ ] **Step 4: Create database helper**

Create `src/lib/db.ts`:

```typescript
import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:memofy.db");
  }
  return db;
}
```

- [ ] **Step 5: Verify migration runs on app start**

```bash
npm run tauri dev
```

Expected: App starts without errors. The SQLite database is created with all tables. Check the Tauri dev console for any migration errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add SQLite schema with FTS5 search, migrations, and TypeScript types"
```

---

## Task 3: Python Sidecar — Protocol & Health Check

**Files:**
- Modify: `sidecar/protocol.py`, `sidecar/main.py`
- Create: `sidecar/transcriber.py` (health check function)
- Create: `sidecar/tests/test_protocol.py`

- [ ] **Step 1: Write protocol tests**

Create `sidecar/tests/__init__.py` (empty file).

Create `sidecar/tests/test_protocol.py`:

```python
import pytest
from protocol import parse_message, serialize_message


def test_parse_valid_health_check():
    msg = parse_message('{"type": "health_check"}')
    assert msg["type"] == "health_check"


def test_parse_valid_transcribe():
    raw = '{"type": "transcribe", "audio_path": "/tmp/audio.wav", "model": "base", "job_id": "abc"}'
    msg = parse_message(raw)
    assert msg["type"] == "transcribe"
    assert msg["audio_path"] == "/tmp/audio.wav"
    assert msg["model"] == "base"
    assert msg["job_id"] == "abc"


def test_parse_valid_summarize():
    raw = '{"type": "summarize", "transcript": "hello world", "prompt_style": "standard", "job_id": "abc"}'
    msg = parse_message(raw)
    assert msg["type"] == "summarize"


def test_parse_missing_type():
    with pytest.raises(ValueError, match="missing 'type'"):
        parse_message('{"foo": "bar"}')


def test_parse_unknown_type():
    with pytest.raises(ValueError, match="Unknown message type"):
        parse_message('{"type": "unknown"}')


def test_parse_invalid_json():
    import json
    with pytest.raises(json.JSONDecodeError):
        parse_message("not json")


def test_serialize_message():
    msg = {"type": "health", "status": "ok", "whisper_ready": True}
    result = serialize_message(msg)
    assert '"type": "health"' in result or '"type":"health"' in result
    assert "\n" not in result
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd sidecar
pip install pytest
pytest tests/test_protocol.py -v
```

Expected: FAIL — `parse_message` and `serialize_message` not implemented (protocol.py is a placeholder).

- [ ] **Step 3: Implement protocol module**

Update `sidecar/protocol.py`:

```python
"""Message protocol for sidecar communication."""
import json
from typing import Any

VALID_INBOUND_TYPES = {"health_check", "transcribe", "summarize"}


def parse_message(raw: str) -> dict[str, Any]:
    """Parse a JSON message from stdin and validate it has a type field."""
    msg = json.loads(raw)
    if "type" not in msg:
        raise ValueError("Message missing 'type' field")
    if msg["type"] not in VALID_INBOUND_TYPES:
        raise ValueError(f"Unknown message type: {msg['type']}")
    return msg


def serialize_message(msg: dict[str, Any]) -> str:
    """Serialize a message dict to a JSON string (no newline)."""
    return json.dumps(msg, ensure_ascii=False)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd sidecar
pytest tests/test_protocol.py -v
```

Expected: All 7 tests pass.

- [ ] **Step 5: Add health check to transcriber**

Update `sidecar/transcriber.py`:

```python
"""Whisper transcription handler."""
import sys
import json


def check_whisper_health() -> dict:
    """Check if Whisper is available and return health status."""
    try:
        import whisper
        return {"type": "health", "status": "ok", "whisper_ready": True}
    except ImportError:
        return {"type": "health", "status": "ok", "whisper_ready": False}


def transcribe(msg: dict, stdout) -> None:
    """Transcribe audio file using Whisper. Streams progress chunks to stdout."""
    # Implemented in Task 4
    job_id = msg.get("job_id", "")
    error = {"type": "error", "message": "Transcription not yet implemented", "job_id": job_id}
    stdout.write(json.dumps(error) + "\n")
    stdout.flush()
```

- [ ] **Step 6: Test sidecar end-to-end via stdin/stdout**

```bash
cd sidecar
echo '{"type": "health_check"}' | python main.py
```

Expected output: `{"type": "health", "status": "ok", "whisper_ready": false}` (or true if Whisper is installed)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement sidecar protocol parsing and health check"
```

---

## Task 4: Python Sidecar — Whisper Transcription

**Files:**
- Modify: `sidecar/transcriber.py`
- Create: `sidecar/cleaner.py`
- Create: `sidecar/tests/test_cleaner.py`

- [ ] **Step 1: Write transcript cleaner tests**

Create `sidecar/tests/test_cleaner.py`:

```python
from cleaner import clean_transcript, clean_transcript_segments


def test_removes_filler_words():
    text = "So um I think uh we should like proceed"
    result = clean_transcript(text)
    assert "um" not in result.lower().split()
    assert "uh" not in result.lower().split()
    assert "I think" in result
    assert "proceed" in result


def test_preserves_meaningful_content():
    text = "The quarterly report shows a 15% increase in revenue"
    result = clean_transcript(text)
    assert "quarterly report" in result
    assert "15%" in result


def test_handles_empty_input():
    assert clean_transcript("") == ""


def test_adds_paragraph_breaks():
    # Segments with >2s gaps should get paragraph breaks
    segments = [
        {"text": "First point.", "end": 10.0},
        {"text": "Second point.", "start": 13.0},  # 3s gap
    ]
    result = clean_transcript_segments(segments)
    assert "\n\n" in result


def test_capitalizes_sentence_starts():
    text = "hello world. this is a test. another sentence"
    result = clean_transcript(text)
    assert result.startswith("Hello")
    assert "This is" in result
```

Update import in test to also test `clean_transcript_segments`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd sidecar
pytest tests/test_cleaner.py -v
```

Expected: FAIL — `clean_transcript` and `clean_transcript_segments` not implemented.

- [ ] **Step 3: Implement transcript cleaner**

Update `sidecar/cleaner.py`:

```python
"""Transcript cleaning: filler removal, punctuation, paragraph breaks."""
import re

FILLER_WORDS = {
    "um", "uh", "uhh", "umm", "hmm", "hm",
    "you know", "i mean",
}

# Single-word fillers as regex pattern
FILLER_SINGLE = re.compile(
    r'\b(' + '|'.join(w for w in FILLER_WORDS if ' ' not in w) + r')\b',
    re.IGNORECASE
)

# Multi-word fillers
FILLER_MULTI = re.compile(
    r'\b(' + '|'.join(w for w in FILLER_WORDS if ' ' in w) + r')\b',
    re.IGNORECASE
)


def clean_transcript(text: str) -> str:
    """Clean a plain text transcript: remove fillers, fix capitalization."""
    if not text:
        return ""

    # Remove multi-word fillers first
    text = FILLER_MULTI.sub("", text)
    # Remove single-word fillers
    text = FILLER_SINGLE.sub("", text)
    # Collapse multiple spaces
    text = re.sub(r'  +', ' ', text)
    # Fix sentence capitalization
    text = re.sub(r'(?:^|[.!?]\s+)([a-z])', lambda m: m.group(0).upper(), text)
    # Ensure first character is capitalized
    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    return text.strip()


def clean_transcript_segments(segments: list[dict]) -> str:
    """Clean transcript from Whisper segments, inserting paragraph breaks at pauses >2s."""
    if not segments:
        return ""

    paragraphs = []
    current_paragraph = []

    for i, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        if not text:
            continue

        # Check for gap > 2 seconds between segments
        if i > 0 and "start" in seg and "end" in segments[i - 1]:
            gap = seg["start"] - segments[i - 1]["end"]
            if gap > 2.0 and current_paragraph:
                paragraphs.append(" ".join(current_paragraph))
                current_paragraph = []

        current_paragraph.append(text)

    if current_paragraph:
        paragraphs.append(" ".join(current_paragraph))

    # Clean each paragraph
    cleaned = [clean_transcript(p) for p in paragraphs]
    return "\n\n".join(p for p in cleaned if p)
```

- [ ] **Step 4: Run cleaner tests**

```bash
cd sidecar
pytest tests/test_cleaner.py -v
```

Expected: All pass.

- [ ] **Step 5: Implement Whisper transcription with streaming**

Update `sidecar/transcriber.py`:

```python
"""Whisper transcription handler."""
import json
import os


def check_whisper_health() -> dict:
    """Check if Whisper is available and return health status."""
    try:
        import whisper
        return {"type": "health", "status": "ok", "whisper_ready": True}
    except ImportError:
        return {"type": "health", "status": "ok", "whisper_ready": False}


def transcribe(msg: dict, stdout) -> None:
    """Transcribe audio file using Whisper. Streams progress chunks to stdout."""
    import whisper
    from cleaner import clean_transcript_segments

    job_id = msg.get("job_id", "")
    audio_path = msg.get("audio_path", "")
    model_name = msg.get("model", "base")

    if not os.path.exists(audio_path):
        error = {"type": "error", "message": f"Audio file not found: {audio_path}", "job_id": job_id}
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
        return

    try:
        # Load model
        model = whisper.load_model(model_name)

        # Transcribe with segment-level output
        result = model.transcribe(audio_path, verbose=False)

        segments = result.get("segments", [])
        total_duration = segments[-1]["end"] if segments else 1.0

        # Stream segments as chunks
        accumulated_text = []
        for seg in segments:
            accumulated_text.append(seg["text"])
            progress = seg["end"] / total_duration

            chunk = {
                "type": "transcript_chunk",
                "text": seg["text"].strip(),
                "progress": round(progress, 3),
                "job_id": job_id,
            }
            stdout.write(json.dumps(chunk) + "\n")
            stdout.flush()

        # Clean and send complete transcript
        cleaned = clean_transcript_segments(segments)

        complete = {
            "type": "transcript_complete",
            "full_text": cleaned,
            "job_id": job_id,
        }
        stdout.write(json.dumps(complete) + "\n")
        stdout.flush()

    except Exception as e:
        error = {"type": "error", "message": str(e), "job_id": job_id}
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement Whisper transcription with streaming progress and transcript cleaning"
```

---

## Task 5: Python Sidecar — Ollama Summarization

**Files:**
- Modify: `sidecar/summarizer.py`
- Create: `sidecar/tests/test_summarizer.py`

- [ ] **Step 1: Write summarizer tests (mocked HTTP)**

Create `sidecar/tests/test_summarizer.py`:

```python
import json
from unittest.mock import patch, MagicMock
from io import StringIO
from summarizer import summarize, build_prompt


def test_build_prompt_standard():
    prompt = build_prompt("Hello world transcript", "standard")
    assert "Hello world transcript" in prompt
    assert "thorough but concise" in prompt


def test_build_prompt_brief():
    prompt = build_prompt("Test", "brief")
    assert "2-3 short paragraphs" in prompt


def test_build_prompt_detailed():
    prompt = build_prompt("Test", "detailed")
    assert "comprehensive" in prompt.lower()


@patch("summarizer.requests.post")
def test_summarize_streams_chunks(mock_post):
    """Test that streaming Ollama response is forwarded as summary_chunk messages."""
    # Simulate streaming response lines
    response_lines = [
        json.dumps({"response": "The ", "done": False}),
        json.dumps({"response": "team ", "done": False}),
        json.dumps({"response": "discussed.", "done": True}),
    ]
    mock_response = MagicMock()
    mock_response.iter_lines.return_value = [line.encode() for line in response_lines]
    mock_response.__enter__ = MagicMock(return_value=mock_response)
    mock_response.__exit__ = MagicMock(return_value=False)
    mock_post.return_value = mock_response

    output = StringIO()
    msg = {
        "type": "summarize",
        "transcript": "Test transcript",
        "prompt_style": "standard",
        "job_id": "test123",
    }

    summarize(msg, output)

    output.seek(0)
    lines = [json.loads(line) for line in output.readlines()]

    # Should have chunks + complete
    chunks = [l for l in lines if l["type"] == "summary_chunk"]
    complete = [l for l in lines if l["type"] == "summary_complete"]

    assert len(chunks) >= 1
    assert len(complete) == 1
    assert complete[0]["full_text"] == "The team discussed."
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd sidecar
pip install requests
pytest tests/test_summarizer.py -v
```

Expected: FAIL — `summarize` and `build_prompt` not implemented.

- [ ] **Step 3: Implement summarizer**

Update `sidecar/summarizer.py`:

```python
"""Ollama summarization handler with streaming."""
import json
import requests

SYSTEM_PROMPT = """You are a meeting note assistant. Read the following transcript and write a natural, flowing summary as if you were a thoughtful colleague explaining what happened to someone who missed the meeting.

Weave in key decisions, action items (with owners if mentioned), notable discussion points, and anything left unresolved. Do not use rigid section headers or bullet lists — write in clear, connected prose paragraphs.

Length: {length_preference}

Transcript:
{transcript}"""

LENGTH_PREFERENCES = {
    "brief": "Keep it to 2-3 short paragraphs, focusing only on the most important points.",
    "standard": "Aim for a thorough but concise summary, typically 3-5 paragraphs.",
    "detailed": "Be comprehensive. Cover all significant discussion points, decisions, and context.",
}


def build_prompt(transcript: str, prompt_style: str) -> str:
    """Build the full prompt for Ollama."""
    length_pref = LENGTH_PREFERENCES.get(prompt_style, LENGTH_PREFERENCES["standard"])
    return SYSTEM_PROMPT.format(
        length_preference=length_pref,
        transcript=transcript,
    )


def summarize(msg: dict, stdout, endpoint: str = "http://localhost:11434") -> None:
    """Send transcript to Ollama and stream the summary back."""
    job_id = msg.get("job_id", "")
    transcript = msg.get("transcript", "")
    prompt_style = msg.get("prompt_style", "standard")
    model = msg.get("model", "llama3")

    prompt = build_prompt(transcript, prompt_style)

    try:
        response = requests.post(
            f"{endpoint}/api/generate",
            json={"model": model, "prompt": prompt, "stream": True},
            stream=True,
            timeout=300,
        )

        full_text = []

        with response:
            for line in response.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                token = data.get("response", "")
                if token:
                    full_text.append(token)
                    chunk = {
                        "type": "summary_chunk",
                        "text": token,
                        "job_id": job_id,
                    }
                    stdout.write(json.dumps(chunk) + "\n")
                    stdout.flush()

                if data.get("done", False):
                    break

        complete = {
            "type": "summary_complete",
            "full_text": "".join(full_text),
            "job_id": job_id,
        }
        stdout.write(json.dumps(complete) + "\n")
        stdout.flush()

    except requests.ConnectionError:
        error = {
            "type": "error",
            "message": "Cannot connect to Ollama. Is it running?",
            "job_id": job_id,
        }
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
    except Exception as e:
        error = {"type": "error", "message": str(e), "job_id": job_id}
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
```

- [ ] **Step 4: Run summarizer tests**

```bash
cd sidecar
pytest tests/test_summarizer.py -v
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement Ollama summarization with streaming and prompt templates"
```

---

## Task 6: Rust Backend — Sidecar Management

**Files:**
- Modify: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Implement sidecar manager**

Update `src-tauri/src/sidecar.rs`:

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Manages the Python sidecar process lifecycle.
pub struct SidecarManager {
    child: Mutex<Option<CommandChild>>,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }

    /// Spawn the sidecar if not already running, and send a command.
    pub fn send_command(&self, app: &AppHandle, command: Value) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;

        // Spawn sidecar if not running
        if child_lock.is_none() {
            let sidecar = app
                .shell()
                .sidecar("memofy-sidecar")
                .map_err(|e| format!("Failed to create sidecar command: {e}"))?;

            let (mut rx, child) = sidecar
                .spawn()
                .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

            // Forward stdout events to frontend
            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            if let Ok(msg) = serde_json::from_str::<Value>(&line_str) {
                                let _ = app_handle.emit("sidecar-message", msg);
                            }
                        }
                        CommandEvent::Stderr(line) => {
                            let line_str = String::from_utf8_lossy(&line);
                            eprintln!("Sidecar stderr: {}", line_str);
                        }
                        CommandEvent::Terminated(_) => {
                            let _ = app_handle.emit("sidecar-terminated", ());
                            break;
                        }
                        _ => {}
                    }
                }
            });

            *child_lock = Some(child);
        }

        // Write command to stdin
        if let Some(ref child) = *child_lock {
            let json_str = serde_json::to_string(&command)
                .map_err(|e| format!("Failed to serialize command: {e}"))?;
            child
                .write((json_str + "\n").as_bytes())
                .map_err(|e| format!("Failed to write to sidecar stdin: {e}"))?;
        }

        Ok(())
    }

    /// Kill the sidecar process if running.
    pub fn kill(&self) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;
        if let Some(child) = child_lock.take() {
            child.kill().map_err(|e| format!("Failed to kill sidecar: {e}"))?;
        }
        Ok(())
    }
}
```

- [ ] **Step 2: Add sidecar Tauri commands**

Add to bottom of `src-tauri/src/sidecar.rs`:

```rust
#[tauri::command]
pub fn send_to_sidecar(
    app: AppHandle,
    command: Value,
) -> Result<(), String> {
    let manager = app.state::<SidecarManager>();
    manager.send_command(&app, command)
}

#[tauri::command]
pub fn check_ollama_status() -> Result<Value, String> {
    let client = reqwest::blocking::Client::new();
    match client.get("http://localhost:11434/api/tags").send() {
        Ok(resp) => {
            if resp.status().is_success() {
                let body: Value = resp.json().map_err(|e| e.to_string())?;
                Ok(serde_json::json!({
                    "status": "running",
                    "models": body.get("models").cloned().unwrap_or(Value::Array(vec![]))
                }))
            } else {
                Ok(serde_json::json!({"status": "error", "message": "Unexpected response"}))
            }
        }
        Err(_) => Ok(serde_json::json!({"status": "not_running"})),
    }
}
```

- [ ] **Step 3: Register sidecar manager and commands in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod commands;
mod sidecar;

use sidecar::SidecarManager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:memofy.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarManager::new())
        .invoke_handler(tauri::generate_handler![
            sidecar::send_to_sidecar,
            sidecar::check_ollama_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Add reqwest dependency**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
reqwest = { version = "0.12", features = ["blocking", "json"] }
```

- [ ] **Step 5: Configure sidecar in tauri.conf.json**

Add the sidecar binary reference to `src-tauri/tauri.conf.json` under `"bundle"`:

```json
{
  "bundle": {
    "externalBin": ["sidecar/memofy-sidecar"]
  }
}
```

Create a development wrapper script so Tauri can invoke the Python sidecar.

On Windows, create `sidecar/memofy-sidecar-x86_64-pc-windows-msvc.cmd`:

```cmd
@echo off
python "%~dp0main.py"
```

On macOS/Linux, create `sidecar/memofy-sidecar-x86_64-unknown-linux-gnu` (or appropriate target triple):

```bash
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$DIR/main.py"
```

Make it executable: `chmod +x sidecar/memofy-sidecar-*`

For production builds, replace these wrappers with PyInstaller-compiled binaries. The Tauri sidecar system expects a binary named with the target triple suffix.

- [ ] **Step 6: Build and verify**

```bash
npm run tauri dev
```

Expected: Compiles without errors. Sidecar commands are registered.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement Rust sidecar manager with stdin/stdout JSON protocol and Ollama status check"
```

---

## Task 7: Rust Backend — Note & Folder & Tag Commands

**Files:**
- Modify: `src-tauri/src/commands/notes.rs`, `folders.rs`, `tags.rs`, `settings.rs`, `jobs.rs`
- Modify: `src-tauri/src/lib.rs`

Note: Since we're using the `@tauri-apps/plugin-sql` directly from the frontend for most CRUD operations, the Rust commands here are primarily for operations that need backend logic (e.g., export, complex queries). Most database reads/writes happen via the SQL plugin's JavaScript API in the frontend hooks.

- [ ] **Step 1: Implement export command**

Update `src-tauri/src/commands/export.rs`:

```rust
use serde::Deserialize;
use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Deserialize)]
pub struct ExportData {
    pub title: String,
    pub date: String,
    pub summary: String,
    pub transcript: Option<String>,
    pub include_transcript: bool,
}

#[tauri::command]
pub async fn export_to_markdown(app: AppHandle, data: ExportData) -> Result<String, String> {
    let mut content = format!("# {}\n\n**Date:** {}\n\n", data.title, data.date);
    content.push_str("## Summary\n\n");
    content.push_str(&data.summary);
    content.push_str("\n\n");

    if data.include_transcript {
        if let Some(transcript) = &data.transcript {
            content.push_str("## Transcript\n\n");
            content.push_str(transcript);
            content.push_str("\n");
        }
    }

    // Open native save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&format!("{}.md", data.title))
        .add_filter("Markdown", &["md"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            fs::write(&path, content).map_err(|e| format!("Failed to write file: {e}"))?;
            Ok(path.to_string())
        }
        None => Err("Export cancelled".to_string()),
    }
}
```

- [ ] **Step 2: Register export command in lib.rs**

Add `commands::export::export_to_markdown` to the `invoke_handler` macro in `lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    sidecar::send_to_sidecar,
    sidecar::check_ollama_status,
    commands::export::export_to_markdown,
])
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Markdown export command with native save dialog"
```

---

## Task 8: Frontend — Typed Command Wrappers & Hooks

**Files:**
- Create: `src/lib/commands.ts`
- Create: `src/hooks/useNotes.ts`, `useFolders.ts`, `useTags.ts`, `useSettings.ts`, `useJobs.ts`, `useTheme.ts`

- [ ] **Step 1: Create typed Tauri command wrappers**

Create `src/lib/commands.ts`:

```typescript
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
```

- [ ] **Step 2: Create useNotes hook**

Create `src/hooks/useNotes.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Note } from "../lib/types";

export function useNotes(options?: {
  folderId?: number | null;
  tagName?: string | null;
  favoritesOnly?: boolean;
  searchQuery?: string;
  sortBy?: "date" | "title" | "duration";
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const db = await getDb();

    let query: string;
    const params: unknown[] = [];

    if (options?.searchQuery) {
      // FTS5 search
      query = `
        SELECT notes.* FROM notes
        JOIN notes_fts ON notes.id = notes_fts.rowid
        WHERE notes_fts MATCH $1
        ORDER BY rank
      `;
      params.push(options.searchQuery);
    } else if (options?.tagName) {
      query = `
        SELECT notes.* FROM notes
        JOIN note_tags ON notes.id = note_tags.note_id
        JOIN tags ON note_tags.tag_id = tags.id
        WHERE tags.name = $1
        ORDER BY notes.created_at DESC
      `;
      params.push(options.tagName);
    } else {
      const conditions: string[] = [];

      if (options?.folderId !== undefined && options.folderId !== null) {
        conditions.push(`folder_id = $${params.length + 1}`);
        params.push(options.folderId);
      }

      if (options?.favoritesOnly) {
        conditions.push("is_favorite = 1");
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const orderBy =
        options?.sortBy === "title"
          ? "title ASC"
          : options?.sortBy === "duration"
          ? "duration_seconds DESC"
          : "created_at DESC";

      query = `SELECT * FROM notes ${where} ORDER BY ${orderBy}`;
    }

    const result = await db.select<Note[]>(query, params);
    setNotes(result);
    setLoading(false);
  }, [options?.folderId, options?.tagName, options?.favoritesOnly, options?.searchQuery, options?.sortBy]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (note: Partial<Note> & { title: string; source_type: Note["source_type"] }) => {
      const db = await getDb();
      const result = await db.execute(
        `INSERT INTO notes (title, source_type, status, folder_id) VALUES ($1, $2, $3, $4)`,
        [note.title, note.source_type, note.status || "pending", note.folder_id || null]
      );
      await fetchNotes();
      return result.lastInsertId;
    },
    [fetchNotes]
  );

  const updateNote = useCallback(
    async (id: number, updates: Partial<Note>) => {
      const db = await getDb();
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }

      fields.push(`updated_at = datetime('now')`);
      values.push(id);

      await db.execute(
        `UPDATE notes SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
        values
      );
      await fetchNotes();
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (id: number) => {
      const db = await getDb();
      await db.execute("DELETE FROM notes WHERE id = $1", [id]);
      await fetchNotes();
    },
    [fetchNotes]
  );

  const toggleFavorite = useCallback(
    async (id: number, currentValue: number) => {
      await updateNote(id, { is_favorite: currentValue ? 0 : 1 } as Partial<Note>);
    },
    [updateNote]
  );

  return { notes, loading, fetchNotes, createNote, updateNote, deleteNote, toggleFavorite };
}
```

- [ ] **Step 3: Create useFolders hook**

Create `src/hooks/useFolders.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Folder } from "../lib/types";

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const fetchFolders = useCallback(async () => {
    const db = await getDb();
    const result = await db.select<Folder[]>("SELECT * FROM folders ORDER BY sort_order, name");
    setFolders(result);
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(
    async (name: string) => {
      const db = await getDb();
      await db.execute("INSERT INTO folders (name) VALUES ($1)", [name]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  const renameFolder = useCallback(
    async (id: number, name: string) => {
      const db = await getDb();
      await db.execute("UPDATE folders SET name = $1 WHERE id = $2", [name, id]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  const deleteFolder = useCallback(
    async (id: number) => {
      const db = await getDb();
      await db.execute("UPDATE notes SET folder_id = NULL WHERE folder_id = $1", [id]);
      await db.execute("DELETE FROM folders WHERE id = $1", [id]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  return { folders, fetchFolders, createFolder, renameFolder, deleteFolder };
}
```

- [ ] **Step 4: Create useTags hook**

Create `src/hooks/useTags.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Tag } from "../lib/types";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  const fetchTags = useCallback(async () => {
    const db = await getDb();
    const result = await db.select<Tag[]>("SELECT * FROM tags ORDER BY name");
    setTags(result);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (name: string) => {
      const db = await getDb();
      await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [name]);
      await fetchTags();
    },
    [fetchTags]
  );

  const addTagToNote = useCallback(
    async (noteId: number, tagName: string) => {
      const db = await getDb();
      await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [tagName]);
      const tag = await db.select<Tag[]>("SELECT id FROM tags WHERE name = $1", [tagName]);
      if (tag.length > 0) {
        await db.execute(
          "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
          [noteId, tag[0].id]
        );
      }
      await fetchTags();
    },
    [fetchTags]
  );

  const removeTagFromNote = useCallback(
    async (noteId: number, tagId: number) => {
      const db = await getDb();
      await db.execute("DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2", [noteId, tagId]);
    },
    []
  );

  const getNoteTags = useCallback(async (noteId: number): Promise<Tag[]> => {
    const db = await getDb();
    return db.select<Tag[]>(
      "SELECT tags.* FROM tags JOIN note_tags ON tags.id = note_tags.tag_id WHERE note_tags.note_id = $1",
      [noteId]
    );
  }, []);

  return { tags, fetchTags, createTag, addTagToNote, removeTagFromNote, getNoteTags };
}
```

- [ ] **Step 5: Create useSettings hook**

Create `src/hooks/useSettings.ts`:

```typescript
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

    setSettings(parsed as Settings);
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
```

- [ ] **Step 6: Create useJobs hook**

Create `src/hooks/useJobs.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
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
          // Save transcript to note in DB
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
```

- [ ] **Step 7: Create useTheme hook**

Create `src/hooks/useTheme.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("memofy-theme");
    return (saved as Theme) || "system";
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("memofy-theme", newTheme);
    applyTheme(newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add frontend hooks for notes, folders, tags, settings, jobs, and theming"
```

---

## Task 9: Frontend — Shared Components

**Files:**
- Create: `src/components/Sidebar.tsx`, `NoteCard.tsx`, `SearchBar.tsx`, `ProcessingBadge.tsx`, `EmptyState.tsx`, `ProgressBar.tsx`, `StreamingText.tsx`, `TagPicker.tsx`

- [ ] **Step 1: Build Sidebar component**

Create `src/components/Sidebar.tsx`:

```tsx
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

  const navItem = (
    label: string,
    icon: string,
    path: string,
    count?: number
  ) => {
    const isActive = location.pathname === path || location.search.includes(path);
    return (
      <button
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive ? "font-semibold" : ""
        }`}
        style={{
          background: isActive ? "var(--accent-light)" : "transparent",
          color: isActive ? "var(--accent-hover)" : "var(--text-muted)",
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
        {count !== undefined && (
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--border)", color: "var(--text-muted)" }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col py-5 border-r"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2.5 px-5 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
          style={{ background: "var(--accent)" }}
        >
          M
        </div>
        <span className="text-xl font-bold">Memofy</span>
      </div>

      <button
        onClick={() => navigate("/new")}
        className="mx-4 mb-5 px-4 py-3 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-colors"
        style={{ background: "var(--accent)" }}
      >
        + New Note
      </button>

      <div className="px-3 space-y-0.5">
        {navItem("All Notes", "\u{1F4C4}", "/")}
        {navItem("Favorites", "\u2B50", "/?filter=favorites")}
      </div>

      <div className="px-3 mt-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Folders
          </span>
          <button
            onClick={onCreateFolder}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            +
          </button>
        </div>
        {folders.map((f) => (
          <div key={f.id}>
            {navItem(f.name, "\u{1F4C1}", `/?folder=${f.id}`)}
          </div>
        ))}
      </div>

      <div className="px-3 mt-6">
        <div className="px-2 mb-2">
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Tags
          </span>
        </div>
        {tags.map((t) => (
          <div key={t.id}>
            {navItem(t.name, "\u25CF", `/?tag=${t.name}`)}
          </div>
        ))}
      </div>

      <div className="mt-auto px-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        {navItem("Settings", "\u2699", "/settings")}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Build NoteCard component**

Create `src/components/NoteCard.tsx`:

```tsx
import type { Note, Tag } from "../lib/types";

interface NoteCardProps {
  note: Note;
  tags: Tag[];
  onToggleFavorite: (id: number, current: number) => void;
  onClick: () => void;
}

const SOURCE_ICONS: Record<Note["source_type"], string> = {
  upload: "\u{1F3A5}",
  record: "\u{1F3A4}",
  paste: "\u{1F4C4}",
};

const SOURCE_LABELS: Record<Note["source_type"], string> = {
  upload: "Uploaded",
  record: "Recorded",
  paste: "Pasted transcript",
};

export function NoteCard({ note, tags, onToggleFavorite, onClick }: NoteCardProps) {
  const isProcessing = note.status !== "complete" && note.status !== "failed";

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 mb-3 cursor-pointer transition-all border ${
        isProcessing ? "border-l-4" : ""
      }`}
      style={{
        background: "var(--card-bg)",
        borderColor: isProcessing ? "var(--accent)" : "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-bold">{note.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(note.id, note.is_favorite);
          }}
          className="text-lg"
          style={{ color: note.is_favorite ? "var(--favorite)" : "var(--border)" }}
        >
          {note.is_favorite ? "\u2605" : "\u2606"}
        </button>
      </div>

      <div
        className="flex items-center gap-3 text-xs mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        <span>
          {SOURCE_ICONS[note.source_type]} {SOURCE_LABELS[note.source_type]}
        </span>
        <span>&bull;</span>
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
        {note.duration_seconds && (
          <>
            <span>&bull;</span>
            <span>{Math.round(note.duration_seconds / 60)} min</span>
          </>
        )}
      </div>

      {note.summary && (
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {note.summary}
        </p>
      )}

      {isProcessing && (
        <div
          className="text-xs font-semibold mt-3"
          style={{ color: "var(--accent)" }}
        >
          {note.status === "pending" && "Queued..."}
          {note.status === "transcribing" && "Transcribing..."}
          {note.status === "summarizing" && "Summarizing..."}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex gap-1.5 mt-2.5">
          {tags.map((t) => (
            <span
              key={t.id}
              className="px-2.5 py-0.5 rounded-md text-xs font-semibold"
              style={{ background: "var(--tag-bg)", color: "var(--text-muted)" }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build remaining shared components**

Create `src/components/SearchBar.tsx`:

```tsx
import { useEffect, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative flex-1 max-w-md">
      <span
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        &#128269;
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search notes, transcripts, summaries..."
        className="w-full py-2.5 pl-10 pr-4 rounded-xl border text-sm outline-none transition-colors"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
    </div>
  );
}
```

Create `src/components/ProcessingBadge.tsx`:

```tsx
interface ProcessingBadgeProps {
  activeCount: number;
  queuedCount: number;
}

export function ProcessingBadge({ activeCount, queuedCount }: ProcessingBadgeProps) {
  if (activeCount === 0 && queuedCount === 0) return null;

  const label =
    queuedCount > 0
      ? `Processing ${activeCount} note${activeCount !== 1 ? "s" : ""} (${queuedCount} queued)`
      : `Processing ${activeCount} note${activeCount !== 1 ? "s" : ""}...`;

  return (
    <div
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: "var(--accent-light)", color: "var(--accent-hover)" }}
    >
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: "var(--accent)" }}
      />
      {label}
    </div>
  );
}
```

Create `src/components/EmptyState.tsx`:

```tsx
interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
          style={{ background: "var(--accent)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

Create `src/components/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  progress: number; // 0–1
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div>
      {label && (
        <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
          {label}
        </div>
      )}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--accent-light)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ background: "var(--accent)", width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
```

Create `src/components/StreamingText.tsx`:

```tsx
import { useEffect, useRef } from "react";

interface StreamingTextProps {
  text: string;
  placeholder?: string;
}

export function StreamingText({ text, placeholder }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto p-4 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
        maxHeight: "400px",
        minHeight: "200px",
      }}
    >
      {text || (
        <span style={{ color: "var(--text-muted)" }}>
          {placeholder || "Waiting..."}
        </span>
      )}
    </div>
  );
}
```

Create `src/components/TagPicker.tsx`:

```tsx
import { useState } from "react";
import type { Tag } from "../lib/types";

interface TagPickerProps {
  allTags: Tag[];
  selectedTags: Tag[];
  onAdd: (tagName: string) => void;
  onRemove: (tagId: number) => void;
}

export function TagPicker({ allTags, selectedTags, onAdd, onRemove }: TagPickerProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      onAdd(input.trim().toLowerCase());
      setInput("");
    }
  };

  const availableTags = allTags.filter(
    (t) => !selectedTags.some((s) => s.id === t.id)
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selectedTags.map((t) => (
          <span
            key={t.id}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ background: "var(--tag-bg)", color: "var(--text-muted)" }}
          >
            {t.name}
            <button onClick={() => onRemove(t.id)} className="ml-0.5">
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type tag name and press Enter..."
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        list="available-tags"
      />
      <datalist id="available-tags">
        {availableTags.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shared UI components — Sidebar, NoteCard, SearchBar, ProcessingBadge, EmptyState, ProgressBar, StreamingText, TagPicker"
```

---

## Task 10: Frontend — Library Page

**Files:**
- Modify: `src/pages/Library.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Library page**

Update `src/pages/Library.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotes } from "../hooks/useNotes";
import { useTags } from "../hooks/useTags";
import { NoteCard } from "../components/NoteCard";
import { SearchBar } from "../components/SearchBar";
import { EmptyState } from "../components/EmptyState";

export function Library() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "duration">("date");

  const folderId = searchParams.get("folder")
    ? parseInt(searchParams.get("folder")!)
    : undefined;
  const tagName = searchParams.get("tag") || undefined;
  const favoritesOnly = searchParams.get("filter") === "favorites";

  const { notes, loading, toggleFavorite } = useNotes({
    folderId,
    tagName,
    favoritesOnly,
    searchQuery: searchQuery || undefined,
    sortBy,
  });

  const { getNoteTags } = useTags();
  const [noteTags, setNoteTags] = useState<Record<number, { id: number; name: string }[]>>({});

  useEffect(() => {
    const loadTags = async () => {
      const tagsMap: Record<number, { id: number; name: string }[]> = {};
      for (const note of notes) {
        tagsMap[note.id] = await getNoteTags(note.id);
      }
      setNoteTags(tagsMap);
    };
    if (notes.length > 0) loadTags();
  }, [notes, getNoteTags]);

  const title = favoritesOnly
    ? "Favorites"
    : tagName
    ? `Tag: ${tagName}`
    : searchQuery
    ? "Search Results"
    : "All Notes";

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center gap-4 px-7 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">{title}</h1>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "title" | "duration")}
            className="text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <option value="date">Newest first</option>
            <option value="title">By title</option>
            <option value="duration">By duration</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : notes.length === 0 ? (
          <EmptyState
            icon="\u{1F4DD}"
            title="No notes yet"
            message="Create your first note by uploading audio, recording, or pasting a transcript."
            actionLabel="New Note"
            onAction={() => navigate("/new")}
          />
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              tags={noteTags[note.id] || []}
              onToggleFavorite={toggleFavorite}
              onClick={() => navigate(`/note/${note.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update Layout to use Sidebar with hooks**

Update `src/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ProcessingBadge } from "./ProcessingBadge";
import { useFolders } from "../hooks/useFolders";
import { useTags } from "../hooks/useTags";
import { useJobs } from "../hooks/useJobs";
import { useTheme } from "../hooks/useTheme";

export function Layout() {
  const { folders, createFolder } = useFolders();
  const { tags } = useTags();
  const { activeCount, queuedCount } = useJobs();

  // Initialize theme
  useTheme();

  const handleCreateFolder = async () => {
    const name = prompt("Folder name:");
    if (name?.trim()) {
      await createFolder(name.trim());
    }
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
```

- [ ] **Step 3: Add routes in App.tsx**

Update `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Library />} />
          {/* Additional routes added in later tasks */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 4: Build and verify**

```bash
npm run tauri dev
```

Expected: Library page renders with sidebar, search bar, empty state. Sidebar shows folders and tags from DB.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement Library page with sidebar navigation, search, and note cards"
```

---

## Task 11: Frontend — Note View Page

**Files:**
- Create: `src/pages/NoteView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement NoteView page**

Create `src/pages/NoteView.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb } from "../lib/db";
import { useTags } from "../hooks/useTags";
import { exportToMarkdown, sendToSidecar } from "../lib/commands";
import { useSettings } from "../hooks/useSettings";
import { TagPicker } from "../components/TagPicker";
import type { Note, Tag } from "../lib/types";

export function NoteView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [noteTags, setNoteTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");
  const { tags, addTagToNote, removeTagFromNote, getNoteTags } = useTags();
  const { settings } = useSettings();

  const fetchNote = useCallback(async () => {
    if (!id) return;
    const db = await getDb();
    const result = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [parseInt(id)]);
    if (result.length > 0) setNote(result[0]);
    const tagResult = await getNoteTags(parseInt(id));
    setNoteTags(tagResult);
  }, [id, getNoteTags]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  if (!note) {
    return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  const handleExport = async () => {
    await exportToMarkdown({
      title: note.title,
      date: note.created_at,
      summary: note.summary || "",
      transcript: note.transcript,
      include_transcript: settings.include_transcript_in_export,
    });
  };

  const handleResummarize = async () => {
    if (!note.transcript) return;
    const db = await getDb();
    await db.execute("UPDATE notes SET status = 'summarizing', summary = NULL WHERE id = $1", [note.id]);
    await sendToSidecar({
      type: "summarize",
      transcript: note.transcript,
      prompt_style: settings.summary_length,
      model: settings.ollama_model,
      job_id: String(note.id),
    });
    await fetchNote();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id = $1", [note.id]);
    navigate("/");
  };

  const handleAddTag = async (tagName: string) => {
    await addTagToNote(note.id, tagName);
    const updated = await getNoteTags(note.id);
    setNoteTags(updated);
  };

  const handleRemoveTag = async (tagId: number) => {
    await removeTagFromNote(note.id, tagId);
    const updated = await getNoteTags(note.id);
    setNoteTags(updated);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-7 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => navigate("/")}
          className="text-sm mb-3 inline-block"
          style={{ color: "var(--text-muted)" }}
        >
          &larr; Back to Library
        </button>
        <h1 className="text-xl font-bold mb-1">{note.title}</h1>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{new Date(note.created_at).toLocaleDateString()}</span>
          {note.duration_seconds && (
            <>
              <span>&bull;</span>
              <span>{Math.round(note.duration_seconds / 60)} min</span>
            </>
          )}
          <span>&bull;</span>
          <span className="capitalize">{note.source_type}</span>
        </div>
        <div className="mt-3">
          <TagPicker
            allTags={tags}
            selectedTags={noteTags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-7 pt-4" style={{ borderBottom: `1px solid var(--border)` }}>
        {(["summary", "transcript"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-semibold rounded-t-lg capitalize"
            style={{
              background: activeTab === tab ? "var(--card-bg)" : "transparent",
              color: activeTab === tab ? "var(--text)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? `2px solid var(--accent)` : "2px solid transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        {activeTab === "summary" ? (
          <div
            className="prose max-w-none text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text)" }}
          >
            {note.summary || (
              <p style={{ color: "var(--text-muted)" }}>
                {note.status === "failed"
                  ? "Summarization failed. Try re-summarizing with a different model."
                  : "Summary not available yet."}
              </p>
            )}
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
            style={{ color: "var(--text)" }}
          >
            {note.transcript || (
              <p style={{ color: "var(--text-muted)" }}>No transcript available.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-3 px-7 py-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-semibold border"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Export Markdown
        </button>
        {note.transcript && (
          <button
            onClick={handleResummarize}
            className="px-4 py-2 rounded-lg text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Re-summarize
          </button>
        )}
        <button
          onClick={handleDelete}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-red-500 border border-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

Add to the routes in `src/App.tsx`:

```tsx
import { NoteView } from "./pages/NoteView";

// Inside <Routes>:
<Route path="/note/:id" element={<NoteView />} />
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: Clicking a note card in the library navigates to the note view with summary/transcript tabs, tag picker, and action buttons.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement NoteView page with summary/transcript tabs, tags, export, and re-summarize"
```

---

## Task 12: Frontend — New Note Page

**Files:**
- Create: `src/pages/NewNote.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement NewNote page with upload, record, and paste tabs**

Create `src/pages/NewNote.tsx`:

```tsx
import { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { useNotes } from "../hooks/useNotes";
import { useJobs } from "../hooks/useJobs";
import { useSettings } from "../hooks/useSettings";
import { sendToSidecar } from "../lib/commands";

type InputMode = "upload" | "record" | "paste";

export function NewNote() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<InputMode>("upload");
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { createNote } = useNotes();
  const { createJob, resetStreaming } = useJobs();
  const { settings } = useSettings();

  const handleFileSelect = async () => {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "Audio/Video",
          extensions: ["mp3", "wav", "m4a", "mp4", "webm", "ogg", "flac"],
        },
      ],
    });
    if (file) {
      setSelectedFile(file);
      if (!title) {
        const name = file.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "";
        setTitle(name);
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    const noteTitle = title || `Note — ${new Date().toLocaleDateString()}`;

    const noteId = await createNote({
      title: noteTitle,
      source_type: "upload",
      status: "pending",
    });

    if (noteId) {
      await createJob(noteId);
      resetStreaming();
      await sendToSidecar({
        type: "transcribe",
        audio_path: selectedFile,
        model: settings.whisper_model,
        job_id: String(noteId),
      });
      navigate(`/processing/${noteId}`);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    const noteTitle = title || `Note — ${new Date().toLocaleDateString()}`;

    const noteId = await createNote({
      title: noteTitle,
      source_type: "paste",
      status: "summarizing",
    });

    if (noteId) {
      // Save transcript directly
      const { getDb } = await import("../lib/db");
      const db = await getDb();
      await db.execute("UPDATE notes SET transcript = $1 WHERE id = $2", [pastedText, noteId]);

      await createJob(noteId);
      resetStreaming();
      await sendToSidecar({
        type: "summarize",
        transcript: pastedText,
        prompt_style: settings.summary_length,
        model: settings.ollama_model,
        job_id: String(noteId),
      });
      navigate(`/processing/${noteId}`);
    }
  };

  const tabButton = (tabMode: InputMode, icon: string, label: string) => (
    <button
      onClick={() => setMode(tabMode)}
      className="flex-1 py-3 text-sm font-semibold rounded-xl transition-all"
      style={{
        background: mode === tabMode ? "var(--accent-light)" : "transparent",
        color: mode === tabMode ? "var(--accent-hover)" : "var(--text-muted)",
      }}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <button
        onClick={() => navigate("/")}
        className="text-sm mb-4 inline-block"
        style={{ color: "var(--text-muted)" }}
      >
        &larr; Back
      </button>
      <h1 className="text-xl font-bold mb-6">New Note</h1>

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title (optional)"
        className="w-full max-w-lg px-4 py-3 rounded-xl border text-sm outline-none mb-6"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />

      {/* Mode tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 max-w-lg"
        style={{ background: "var(--sidebar-bg)" }}
      >
        {tabButton("upload", "\u{1F4C1}", "Upload")}
        {tabButton("record", "\u{1F3A4}", "Record")}
        {tabButton("paste", "\u{1F4CB}", "Paste")}
      </div>

      {/* Upload mode */}
      {mode === "upload" && (
        <div className="max-w-lg">
          <div
            onClick={handleFileSelect}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              // File drop handling would be done via Tauri's drag-and-drop API
            }}
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
            style={{
              borderColor: isDragging ? "var(--accent)" : "var(--border)",
              background: isDragging ? "var(--accent-light)" : "transparent",
            }}
          >
            <div className="text-4xl mb-3">{"\u{1F4C2}"}</div>
            <p className="text-sm font-semibold">
              {selectedFile
                ? selectedFile.split(/[/\\]/).pop()
                : "Click to select or drag & drop"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              mp3, wav, m4a, mp4, webm, ogg, flac
            </p>
          </div>
          <button
            onClick={handleUploadSubmit}
            disabled={!selectedFile}
            className="mt-4 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Transcribe & Summarize
          </button>
        </div>
      )}

      {/* Record mode */}
      {mode === "record" && (
        <div className="max-w-lg">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Recording will be implemented in a later task. For now, use Upload or Paste.
          </p>
        </div>
      )}

      {/* Paste mode */}
      {mode === "paste" && (
        <div className="max-w-lg">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your meeting transcript here..."
            className="w-full h-64 px-4 py-3 rounded-xl border text-sm outline-none resize-none"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            onClick={handlePasteSubmit}
            disabled={!pastedText.trim()}
            className="mt-4 px-6 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            Summarize
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

```tsx
import { NewNote } from "./pages/NewNote";

// Inside <Routes>:
<Route path="/new" element={<NewNote />} />
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: New Note page has three tabs (Upload, Record, Paste). Upload opens file dialog. Paste shows text area.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement NewNote page with upload, record, and paste input modes"
```

---

## Task 13: Frontend — Processing View

**Files:**
- Create: `src/pages/Processing.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Processing page**

Create `src/pages/Processing.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDb } from "../lib/db";
import { useJobs } from "../hooks/useJobs";
import { ProgressBar } from "../components/ProgressBar";
import { StreamingText } from "../components/StreamingText";
import type { Note } from "../lib/types";

export function Processing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const { streamingTranscript, streamingSummary, transcriptProgress } = useJobs();

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      const db = await getDb();
      const result = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [parseInt(id)]);
      if (result.length > 0) {
        setNote(result[0]);
        if (result[0].status === "complete" || result[0].status === "failed") {
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id]);

  if (!note) {
    return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (note.status === "complete") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-7 text-center">
        <div className="text-5xl mb-4">{"\u2705"}</div>
        <h2 className="text-lg font-bold mb-2">Note Complete!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Your meeting notes are ready.
        </p>
        <button
          onClick={() => navigate(`/note/${note.id}`)}
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ background: "var(--accent)" }}
        >
          View Note
        </button>
      </div>
    );
  }

  if (note.status === "failed") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-7 text-center">
        <div className="text-5xl mb-4">{"\u274C"}</div>
        <h2 className="text-lg font-bold mb-2">Processing Failed</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Something went wrong. You can try again from the note view.
        </p>
        <button
          onClick={() => navigate(`/note/${note.id}`)}
          className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ background: "var(--accent)" }}
        >
          View Note
        </button>
      </div>
    );
  }

  const isTranscribing = note.status === "transcribing" || note.status === "pending";
  const isSummarizing = note.status === "summarizing";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <h1 className="text-xl font-bold mb-1">{note.title}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Processing your meeting notes...
      </p>

      {/* Phase 1: Transcription */}
      <div className="mb-8">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          {isTranscribing && (
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
          )}
          {isTranscribing ? "Transcribing..." : "\u2705 Transcription Complete"}
        </h2>
        {isTranscribing && (
          <ProgressBar
            progress={transcriptProgress}
            label={`${Math.round(transcriptProgress * 100)}%`}
          />
        )}
        <div className="mt-3">
          <StreamingText
            text={streamingTranscript || note.transcript || ""}
            placeholder="Waiting for transcription to begin..."
          />
        </div>
      </div>

      {/* Phase 2: Summarization */}
      {(isSummarizing || streamingSummary) && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            Summarizing...
          </h2>
          <StreamingText
            text={streamingSummary}
            placeholder="Waiting for summary generation..."
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route**

```tsx
import { Processing } from "./pages/Processing";

// Inside <Routes>:
<Route path="/processing/:id" element={<Processing />} />
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: Processing page shows live transcript and summary streaming with progress bar. Navigates to note view on completion.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement Processing page with live transcript/summary streaming and progress bar"
```

---

## Task 14: Frontend — Settings Page

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Settings page**

Create `src/pages/Settings.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useTheme } from "../hooks/useTheme";
import { checkOllamaStatus, type OllamaStatus } from "../lib/commands";

export function Settings() {
  const { settings, setSetting, loading } = useSettings();
  const { theme, setTheme } = useTheme();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    const status = await checkOllamaStatus();
    setOllamaStatus(status);
    if (status.status === "running" && status.models) {
      setOllamaModels(status.models.map((m) => m.name));
    }
  };

  if (loading) {
    return <div className="p-7" style={{ color: "var(--text-muted)" }}>Loading settings...</div>;
  }

  const section = (title: string, children: React.ReactNode) => (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const field = (label: string, description: string, input: React.ReactNode) => (
    <div className="flex items-start justify-between gap-8">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
      <div className="flex-shrink-0">{input}</div>
    </div>
  );

  const selectInput = (
    value: string,
    options: { value: string; label: string }[],
    onChange: (v: string) => void
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border text-sm"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {section("AI Models", <>
        {field(
          "Whisper Model",
          "Larger models are more accurate but slower",
          selectInput(settings.whisper_model, [
            { value: "tiny", label: "Fast (tiny) — ~75 MB" },
            { value: "base", label: "Balanced (base) — ~150 MB" },
            { value: "small", label: "Accurate (small) — ~500 MB" },
            { value: "medium", label: "High Quality (medium) — ~1.5 GB" },
            { value: "large", label: "Best (large) — ~3 GB" },
          ], (v) => setSetting("whisper_model", v))
        )}
        {field(
          "Ollama Model",
          "Select from detected models or enter a custom name",
          ollamaModels.length > 0
            ? selectInput(
                settings.ollama_model,
                ollamaModels.map((m) => ({ value: m, label: m })),
                (v) => setSetting("ollama_model", v)
              )
            : (
              <input
                type="text"
                value={settings.ollama_model}
                onChange={(e) => setSetting("ollama_model", e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm w-48"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            )
        )}
      </>)}

      {section("Ollama Connection", <>
        {field(
          "Status",
          ollamaStatus
            ? ollamaStatus.status === "running"
              ? `Connected — ${ollamaModels.length} model(s) available`
              : "Not connected"
            : "Checking...",
          <button
            onClick={handleTestConnection}
            className="px-3 py-2 rounded-lg border text-sm font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Test Connection
          </button>
        )}
        {field(
          "Endpoint",
          "URL where Ollama is running",
          <input
            type="text"
            value={settings.ollama_endpoint}
            onChange={(e) => setSetting("ollama_endpoint", e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm w-64"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        )}
      </>)}

      {section("Output Preferences", <>
        {field(
          "Summary Length",
          "How detailed should meeting summaries be?",
          selectInput(settings.summary_length, [
            { value: "brief", label: "Brief" },
            { value: "standard", label: "Standard" },
            { value: "detailed", label: "Detailed" },
          ], (v) => setSetting("summary_length", v as "brief" | "standard" | "detailed"))
        )}
        {field(
          "Include Transcript in Export",
          "Add full transcript when exporting to Markdown",
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.include_transcript_in_export}
              onChange={(e) => setSetting("include_transcript_in_export", e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-10 h-5 rounded-full transition-colors"
              style={{
                background: settings.include_transcript_in_export
                  ? "var(--accent)"
                  : "var(--border)",
              }}
            >
              <div
                className="w-4 h-4 rounded-full bg-white transition-transform mt-0.5"
                style={{
                  transform: settings.include_transcript_in_export
                    ? "translateX(22px)"
                    : "translateX(2px)",
                }}
              />
            </div>
          </label>
        )}
      </>)}

      {section("Appearance", <>
        {field(
          "Theme",
          "Choose your preferred color scheme",
          selectInput(theme, [
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ], (v) => {
            setTheme(v as "light" | "dark" | "system");
            setSetting("theme", v as "light" | "dark" | "system");
          })
        )}
      </>)}
    </div>
  );
}
```

- [ ] **Step 2: Add route**

```tsx
import { Settings } from "./pages/Settings";

// Inside <Routes>:
<Route path="/settings" element={<Settings />} />
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: Settings page shows all sections. Theme toggle works. Ollama connection test shows status.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement Settings page with model selection, Ollama connection, output, and theme"
```

---

## Task 15: Frontend — Onboarding Wizard

**Files:**
- Create: `src/pages/Onboarding.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Onboarding wizard**

Create `src/pages/Onboarding.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";
import { checkOllamaStatus, type OllamaStatus } from "../lib/commands";

type Step = "welcome" | "ollama" | "whisper";

export function Onboarding() {
  const navigate = useNavigate();
  const { setSetting } = useSettings();
  const [step, setStep] = useState<Step>("welcome");
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState("llama3");
  const [selectedWhisperModel, setSelectedWhisperModel] = useState("base");

  useEffect(() => {
    if (step === "ollama") {
      checkOllama();
    }
  }, [step]);

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
    navigate("/");
  };

  const card = (children: React.ReactNode) => (
    <div className="flex-1 flex items-center justify-center p-7">
      <div
        className="w-full max-w-md rounded-2xl p-8 border"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (step === "welcome") {
    return card(
      <>
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white mx-auto mb-4"
            style={{ background: "var(--accent)" }}
          >
            M
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Memofy</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your private AI meeting notetaker. Memofy transcribes your meetings and creates
            beautiful narrative summaries — all running locally on your machine. No cloud, no subscriptions.
          </p>
        </div>
        <button
          onClick={() => setStep("ollama")}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold"
          style={{ background: "var(--accent)" }}
        >
          Get Started
        </button>
      </>
    );
  }

  if (step === "ollama") {
    return card(
      <>
        <h2 className="text-lg font-bold mb-1">Ollama Setup</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Memofy uses Ollama to generate meeting summaries locally. It's a free, open-source tool
          that runs AI models on your computer.
        </p>

        {ollamaStatus === null ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Checking...</p>
        ) : ollamaStatus.status === "running" ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{"\u2705"}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                Ollama is running!
              </span>
            </div>
            {ollamaModels.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-semibold block mb-1.5">Select a model:</label>
                <select
                  value={selectedOllamaModel}
                  onChange={(e) => setSelectedOllamaModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {ollamaModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{"\u26A0\uFE0F"}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                Ollama not detected
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              You can still use Memofy for transcription without Ollama. To enable AI summaries,
              install Ollama from:
            </p>
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold underline"
              style={{ color: "var(--accent)" }}
            >
              ollama.com
            </a>
            <button
              onClick={checkOllama}
              className="block mt-3 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Re-check
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep("welcome")}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Back
          </button>
          <button
            onClick={() => setStep("whisper")}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: "var(--accent)" }}
          >
            Next
          </button>
        </div>
      </>
    );
  }

  if (step === "whisper") {
    const models = [
      { value: "tiny", label: "Fast (tiny)", size: "~75 MB" },
      { value: "base", label: "Balanced (base)", size: "~150 MB" },
      { value: "small", label: "Accurate (small)", size: "~500 MB" },
      { value: "medium", label: "High Quality (medium)", size: "~1.5 GB" },
      { value: "large", label: "Best (large)", size: "~3 GB" },
    ];

    return card(
      <>
        <h2 className="text-lg font-bold mb-1">Transcription Model</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Choose a Whisper model for transcribing audio. Larger models are more accurate but use more
          disk space and run slower.
        </p>

        <div className="space-y-2 mb-6">
          {models.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedWhisperModel(m.value)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors"
              style={{
                borderColor: selectedWhisperModel === m.value ? "var(--accent)" : "var(--border)",
                background: selectedWhisperModel === m.value ? "var(--accent-light)" : "var(--card-bg)",
              }}
            >
              <span className="font-semibold">{m.label}</span>
              <span style={{ color: "var(--text-muted)" }}>{m.size}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("ollama")}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Back
          </button>
          <button
            onClick={finish}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ background: "var(--accent)" }}
          >
            Finish Setup
          </button>
        </div>
      </>
    );
  }

  return null;
}
```

- [ ] **Step 2: Add onboarding gate to App.tsx**

Update `src/App.tsx` to check onboarding status:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";
import { NoteView } from "./pages/NoteView";
import { NewNote } from "./pages/NewNote";
import { Processing } from "./pages/Processing";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";
import { getDb } from "./lib/db";

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const db = await getDb();
        const result = await db.select<{ value: string }[]>(
          "SELECT value FROM settings WHERE key = 'onboarding_complete'"
        );
        setOnboardingComplete(result.length > 0 && JSON.parse(result[0].value) === true);
      } catch {
        setOnboardingComplete(false);
      }
    };
    check();
  }, []);

  if (onboardingComplete === null) return null; // Loading

  return (
    <BrowserRouter>
      <Routes>
        {!onboardingComplete && (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        )}
        {onboardingComplete && (
          <Route element={<Layout />}>
            <Route path="/" element={<Library />} />
            <Route path="/note/:id" element={<NoteView />} />
            <Route path="/new" element={<NewNote />} />
            <Route path="/processing/:id" element={<Processing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: On first run, onboarding wizard shows. After completing, redirects to library. Subsequent launches skip onboarding.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement onboarding wizard with Ollama check and Whisper model selection"
```

---

## Task 16: Frontend — Audio Recording

**Files:**
- Modify: `src/pages/NewNote.tsx`
- Create: `src/components/WaveformVisualizer.tsx`

- [ ] **Step 1: Implement WaveformVisualizer component**

Create `src/components/WaveformVisualizer.tsx`:

```tsx
import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

export function WaveformVisualizer({ analyser, isRecording }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current || !isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--card-bg").trim();
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent").trim();
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={100}
      className="w-full rounded-xl border"
      style={{ borderColor: "var(--border)" }}
    />
  );
}
```

- [ ] **Step 2: Add recording functionality to NewNote**

Update the record mode section in `src/pages/NewNote.tsx`. Replace the placeholder content inside `{mode === "record" && (...)}`:

```tsx
{mode === "record" && (
  <RecordMode
    title={title}
    onTitleFallback={(t) => { if (!title) setTitle(t); }}
    createNote={createNote}
    createJob={createJob}
    resetStreaming={resetStreaming}
    settings={settings}
  />
)}
```

Add a `RecordMode` component in the same file (above the `NewNote` function or as a separate component):

```tsx
import { WaveformVisualizer } from "../components/WaveformVisualizer";

function RecordMode({
  title,
  onTitleFallback,
  createNote,
  createJob,
  resetStreaming,
  settings,
}: {
  title: string;
  onTitleFallback: (t: string) => void;
  createNote: (note: { title: string; source_type: "record"; status: string }) => Promise<number | undefined>;
  createJob: (noteId: number) => Promise<void>;
  resetStreaming: () => void;
  settings: { whisper_model: string };
}) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();

  const startRecording = async () => {
    try {
      // Note: This captures microphone audio.
      // System audio capture (WASAPI loopback) requires native integration
      // which will be added via the Rust backend in a future task.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 2048;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      onTitleFallback(`Recording — ${new Date().toLocaleDateString()}`);
    } catch (err) {
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        clearInterval(timerRef.current);
        setIsRecording(false);
        setIsPaused(false);

        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        // Save blob to file via Tauri FS API
        // For now, create an object URL (will be replaced with Tauri file save)
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Save via Tauri — this will be refined with proper file path handling
        const { appDataDir } = await import("@tauri-apps/api/path");
        const dataDir = await appDataDir();
        const fileName = `recording-${Date.now()}.wav`;
        const filePath = `${dataDir}recordings/${fileName}`;

        // For MVP: use the blob URL approach and save path
        const noteTitle = title || `Recording — ${new Date().toLocaleDateString()}`;
        const noteId = await createNote({
          title: noteTitle,
          source_type: "record",
          status: "pending",
        });

        if (noteId) {
          await createJob(noteId);
          resetStreaming();
          await sendToSidecar({
            type: "transcribe",
            audio_path: filePath,
            model: settings.whisper_model,
            job_id: String(noteId),
          });
          navigate(`/processing/${noteId}`);
        }

        resolve();
      };

      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach((t) => t.stop());
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-lg">
      {!isRecording ? (
        <div className="text-center py-10">
          <button
            onClick={startRecording}
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white mx-auto mb-4 transition-transform hover:scale-105"
            style={{ background: "var(--accent)" }}
          >
            {"\u{1F3A4}"}
          </button>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Click to start recording
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Currently captures microphone audio
          </p>
        </div>
      ) : (
        <div>
          <WaveformVisualizer analyser={analyser} isRecording={isRecording && !isPaused} />

          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-2xl font-mono font-bold">{formatDuration(duration)}</span>
            {!isPaused && (
              <span
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: "#EF4444" }}
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Pause
              </button>
            )}
            <button
              onClick={stopRecording}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "var(--accent)" }}
            >
              Stop & Process
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run tauri dev
```

Expected: Record tab shows mic button, starts recording with waveform, pause/resume works, stop triggers processing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement audio recording with waveform visualization and pause/resume"
```

---

## Task 17: Integration & Polish

**Files:**
- Various touch-ups across the codebase

- [ ] **Step 1: Add Ollama health banner to Layout**

Update `src/components/Layout.tsx` to add the health check banner:

```tsx
// Add inside Layout component, above the main content area:
const [ollamaOnline, setOllamaOnline] = useState(true);

useEffect(() => {
  const check = async () => {
    const status = await checkOllamaStatus();
    setOllamaOnline(status.status === "running");
  };
  check();
}, []);

// In JSX, add banner above <Outlet />:
{!ollamaOnline && (
  <div
    className="px-7 py-2.5 text-sm flex items-center justify-between"
    style={{ background: "var(--accent-light)", color: "var(--accent-hover)" }}
  >
    <span>Ollama is not running — summaries are unavailable. Transcription still works.</span>
    <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
      How to fix
    </a>
  </div>
)}
```

- [ ] **Step 2: Add ProcessingBadge to Layout header**

Add the ProcessingBadge component to the Layout, visible in the header area:

```tsx
// Add to Layout, in the header area above the Outlet:
{(activeCount > 0 || queuedCount > 0) && (
  <div className="px-7 py-2 flex justify-end" style={{ borderBottom: `1px solid var(--border)` }}>
    <ProcessingBadge activeCount={activeCount} queuedCount={queuedCount} />
  </div>
)}
```

- [ ] **Step 3: Add desktop notifications on job completion**

Update `src/hooks/useJobs.ts` to send a notification when a job completes:

```typescript
// At top of file:
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

// Inside the summary_complete case:
case "summary_complete":
  setStreamingSummary(msg.full_text || "");
  if (msg.job_id) {
    saveSummary(parseInt(msg.job_id), msg.full_text || "");
    // Send desktop notification
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
```

- [ ] **Step 4: Add .gitignore for Tauri artifacts**

Create `.gitignore`:

```
node_modules/
dist/
src-tauri/target/
.superpowers/
*.db
*.db-journal
```

- [ ] **Step 5: Final build and smoke test**

```bash
npm run tauri dev
```

Smoke test checklist:
1. Onboarding wizard completes successfully
2. Library shows empty state with "New Note" CTA
3. Create a note via paste → summarization works
4. Note appears in library with summary preview
5. Note view shows summary/transcript tabs
6. Export to Markdown opens save dialog
7. Settings page loads, theme toggle works
8. Sidebar navigation works (folders, tags, favorites)
9. Search filters notes

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Ollama health banner, processing badge, desktop notifications, and integration polish"
```

---

## Summary

This plan implements Memofy across 17 tasks:

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Scaffolding | Tauri + React + Tailwind + Python sidecar structure |
| 2 | Database | SQLite schema, migrations, FTS5, TypeScript types |
| 3 | Sidecar: Protocol | JSON protocol, health check |
| 4 | Sidecar: Whisper | Transcription with streaming + transcript cleaning |
| 5 | Sidecar: Ollama | Summarization with streaming + prompt templates |
| 6 | Rust: Sidecar | Sidecar process management, event forwarding |
| 7 | Rust: Commands | Export to Markdown with native dialog |
| 8 | Frontend: Hooks | Data layer hooks for notes, folders, tags, settings, jobs, theme |
| 9 | Frontend: Components | Shared UI components (Sidebar, NoteCard, SearchBar, etc.) |
| 10 | Frontend: Library | Main library page with search, sort, and note list |
| 11 | Frontend: NoteView | Note detail with summary/transcript tabs and actions |
| 12 | Frontend: NewNote | Upload, record, and paste input modes |
| 13 | Frontend: Processing | Live transcript/summary streaming view |
| 14 | Frontend: Settings | Model selection, connection, output, appearance |
| 15 | Frontend: Onboarding | First-run wizard (Welcome → Ollama → Whisper) |
| 16 | Frontend: Recording | Audio recording with waveform visualization |
| 17 | Integration | Health banners, notifications, polish |

---

## Known Issues & Deferred Items

The following items from the spec are not covered in this plan and should be addressed in follow-up work:

1. **Sidecar race condition on termination:** When the sidecar process terminates, the `SidecarManager` does not clear the `child` field. Implementers must set `child` to `None` on `CommandEvent::Terminated` using `app.state::<SidecarManager>()` from within the async event loop.

2. **Recording file write:** Task 16's `stopRecording()` creates a `Blob` but does not write it to disk via Tauri's filesystem API. Add `tauri-plugin-fs` to the project and use `writeBinaryFile()` to save the WAV before sending the path to the sidecar.

3. **Ollama endpoint propagation:** The sidecar's `summarize` function defaults to `localhost:11434`. The custom endpoint from settings is never sent to the sidecar. Include `endpoint` in the summarize message from the frontend.

4. **Bulk actions:** Multi-select notes for move, tag, export, or delete (spec line 263). Not yet implemented.

5. **Interrupted job recovery on app startup:** The spec says interrupted jobs restart on launch. Add startup logic in the Tauri app to query jobs with status `transcribing`/`summarizing` and re-dispatch them to the sidecar.

6. **Whisper model download with progress:** The onboarding wizard lets users select a model but does not trigger the actual download. The sidecar should support a `download_model` command that reports progress.

7. **Storage settings section:** Disk usage display, audio cleanup option, and data directory location (spec lines 293-296).

8. **Search result highlighting:** The library search returns matching notes but does not highlight matching terms in the preview.

9. **Folder drag-and-drop reordering:** Moving notes between folders via drag-and-drop.

10. **N+1 query optimization:** Task 10's Library page fetches tags per-note in a loop. Replace with a bulk query: `SELECT tags.*, note_tags.note_id FROM tags JOIN note_tags ON tags.id = note_tags.tag_id WHERE note_tags.note_id IN (...)`

11. **`job_id` vs `note_id` naming:** The sidecar protocol uses `job_id` but the value passed is actually the note's ID. Consider renaming to `note_id` for clarity.
