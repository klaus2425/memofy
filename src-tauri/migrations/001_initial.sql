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
