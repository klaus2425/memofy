# Memofy — AI Meeting Notetaker (Desktop App)

## Stack
- Framework: Tauri (lightweight, uses system webview)
- Frontend: React + Tailwind
- Backend: Rust (Tauri core) + Python sidecar (thin worker)
  - Whisper (local transcription)
  - Ollama (local LLM for summarization)
- Database: SQLite via Tauri plugin (with FTS5 for search)
- Audio: FFmpeg bundled

## LLM Setup
- Ollama running locally (user installs separately, guided check on startup)
- Default model: llama3 or mistral (user-selectable in settings)
- Fallback: allow custom Ollama model names
- API: Ollama exposes a local REST API at http://localhost:11434

## Core Features
- Three input modes: upload audio/video, record system audio, paste transcript
- Whisper transcription (model selectable: tiny → large)
- Ollama-powered narrative summary (flowing prose, not rigid sections)
- Export to Markdown
- Library with folders, tags, favorites, and full-text search (SQLite)
- Settings: Whisper model, Ollama model, summary length, appearance
- Startup check: verify Ollama is running, prompt to install if missing

## Architecture
- Frontend → Tauri commands → Python sidecar
- Sidecar communicates via newline-delimited JSON over stdin/stdout
- Python sidecar (thin worker):
  1. Receives audio path or raw transcript
  2. Runs Whisper → streams transcript chunks back
  3. Sends transcript to Ollama (localhost:11434/api/generate) → streams narrative summary
  4. Returns results to Rust layer which persists to SQLite
- All state management lives in Tauri/Rust, not in the sidecar
- Zero cloud dependencies — everything local
- No API keys needed

## Ollama Integration
- POST to http://localhost:11434/api/generate
- System prompt instructs model to write a flowing narrative summary
- Summary weaves in: key context, decisions, action items, discussion points
- Handle streaming responses (Ollama streams by default)

## Design Spec
- Full specification: docs/superpowers/specs/2026-03-23-memofy-design.md

## Nice-to-haves (promoted to v1)
- Auto-detect available Ollama models on startup
- Show download progress if model needs pulling
- Dark/light/system theme toggle
- Drag-and-drop file upload
- Background job queue with desktop notifications
