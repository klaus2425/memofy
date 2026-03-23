# AI Meeting Notetaker — Desktop App

## Stack
- Framework: Tauri (lightweight, uses system webview)
- Frontend: React + Tailwind
- Backend: Python sidecar
  - Whisper (local transcription)
  - Ollama (local LLM for summarization)
- Audio: FFmpeg bundled

## LLM Setup
- Ollama running locally (user installs separately or bundled check on startup)
- Default model: llama3 or mistral (user-selectable in settings)
- Fallback: allow custom Ollama model names
- API: Ollama exposes a local REST API at http://localhost:11434

## Core Features
- Three input modes: upload audio/video, record system audio, paste transcript
- Whisper transcription (model selectable: tiny → large)
- Ollama-powered analysis: summary, action items, key decisions, cleaned transcript
- Export to Markdown
- Local history of past notes (SQLite or JSON)
- Settings: Whisper model, Ollama model, output preferences
- Startup check: verify Ollama is running, prompt to install if missing

## Architecture
- Frontend → Tauri commands → Python sidecar
- Python sidecar:
  1. Receives audio path or raw transcript
  2. Runs Whisper → raw transcript
  3. Sends transcript to Ollama (localhost:11434/api/generate) → structured notes
  4. Returns JSON to frontend
- Zero cloud dependencies — everything local
- No API keys needed

## Ollama Integration
- POST to http://localhost:11434/api/generate
- System prompt instructs model to return structured JSON
- Parse response for: summary, action_items, key_decisions, cleaned_transcript
- Handle streaming responses (Ollama streams by default)

## Nice-to-haves
- Auto-detect available Ollama models on startup
- Show download progress if model needs pulling
- Dark/light theme toggle
- Drag-and-drop file upload