# Memofy — Design Specification

**Date:** 2026-03-23
**Status:** Draft

## Overview

Memofy is a fully local, privacy-first AI meeting notetaker desktop app. It transcribes audio using Whisper and produces flowing narrative summaries using Ollama — no cloud services, no API keys, everything on the user's machine.

**Target audience:** General users. The app must "just work" with guided setup, friendly onboarding, and minimal configuration. Users should never need to touch a terminal.

**Name:** Memofy

## Architecture

### Approach: Thin Python Sidecar

The Python sidecar is a minimal worker that receives commands, runs Whisper, calls Ollama's REST API, and returns results. All state management, UI logic, job queuing, and history storage live in the Tauri/React layer.

```
┌─────────────────────────────────────────────┐
│  Tauri Shell (single binary + bundled deps) │
│  ┌───────────────────────────────────────┐  │
│  │  React + Tailwind Frontend            │  │
│  │  (UI, state, routing, job management) │  │
│  └──────────────┬────────────────────────┘  │
│                 │ Tauri Commands (IPC)       │
│  ┌──────────────▼────────────────────────┐  │
│  │  Rust Backend Layer                   │  │
│  │  - SQLite (history, settings, tags)   │  │
│  │  - File management (audio, exports)   │  │
│  │  - Sidecar process management         │  │
│  │  - Ollama health checks               │  │
│  └──────────────┬────────────────────────┘  │
│                 │ stdin/stdout JSON          │
│  ┌──────────────▼────────────────────────┐  │
│  │  Python Sidecar (worker)              │  │
│  │  - Whisper transcription              │  │
│  │  - Ollama API calls                   │  │
│  │  - Streaming results back             │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Bundled: FFmpeg, Python runtime            │
└─────────────────────────────────────────────┘
         │
         ▼
  Ollama (user-installed, localhost:11434)
```

### Data Flow

1. User uploads audio, records system audio, or pastes a transcript in the React UI.
2. React calls a Tauri command. Rust saves the job to SQLite and spawns the sidecar if not already running.
3. Sidecar receives the audio path, runs Whisper, and streams transcript lines back via stdout.
4. Rust forwards streamed lines to React via Tauri events for live display.
5. Once transcription completes, sidecar sends the transcript to Ollama and streams the narrative summary back.
6. Rust saves the final transcript and summary to SQLite and emits a completion event.
7. React updates the UI. The note lands in the user's library.

### Sidecar Protocol

Communication between Rust and the Python sidecar uses newline-delimited JSON over stdin/stdout. Each message has a `type` field.

**Rust → Sidecar (stdin):**

```json
{"type": "transcribe", "audio_path": "/path/to/audio.wav", "model": "base", "job_id": "abc123"}
{"type": "summarize", "transcript": "...", "prompt_style": "standard", "job_id": "abc123"}
{"type": "health_check"}
```

**Sidecar → Rust (stdout):**

```json
{"type": "transcript_chunk", "text": "And then we discussed...", "progress": 0.45, "job_id": "abc123"}
{"type": "transcript_complete", "full_text": "...", "job_id": "abc123"}
{"type": "summary_chunk", "text": "The team ", "job_id": "abc123"}
{"type": "summary_complete", "full_text": "...", "job_id": "abc123"}
{"type": "error", "message": "Whisper model not found", "job_id": "abc123"}
{"type": "health", "status": "ok", "whisper_ready": true}
```

Streaming messages (`transcript_chunk`, `summary_chunk`) are emitted as processing progresses. The `progress` field on transcript chunks is a 0–1 float representing audio duration processed vs. total.

### Data Model

SQLite schema (managed via Tauri SQL plugin with versioned migrations):

- **notes** — id, title, created_at, updated_at, duration_seconds, source_type (upload/record/paste), folder_id (nullable FK), is_favorite, transcript, summary, audio_path (nullable), status (pending/transcribing/summarizing/complete/failed)
- **folders** — id, name, created_at, sort_order
- **tags** — id, name
- **note_tags** — note_id (FK), tag_id (FK) — many-to-many join
- **jobs** — id, note_id (FK), status, started_at, completed_at, error_message (nullable), progress (0–1 float)
- **settings** — key, value (JSON string)

Full-text search uses SQLite FTS5 virtual table indexing title, transcript, and summary columns. Search is token-based (not substring). FTS index is updated on note insert/update.

### Technology Stack

- **Framework:** Tauri (lightweight, uses system webview)
- **Frontend:** React + Tailwind CSS
- **Backend:** Rust (Tauri core) + Python sidecar
- **Transcription:** OpenAI Whisper (local)
- **Summarization:** Ollama (local LLM, user-installed)
- **Database:** SQLite via Tauri plugin (with FTS5 for search)
- **Audio processing:** FFmpeg (bundled)
- **Default LLM models:** llama3 or mistral (user-selectable)

## Onboarding & Setup

### First-Run Wizard (3 steps)

**Step 1 — Welcome:**
Brief, warm introduction to what Memofy does.

**Step 2 — Ollama Check:**
App pings `localhost:11434`. Three possible states:
- **Running:** Green checkmark. Auto-detect available models. Let user pick one or use default.
- **Installed but not running:** Prompt to start it with a "Start Ollama" button.
- **Not installed:** Friendly explanation of what Ollama is with a download link. Option to proceed without it (transcription still works, summarization unavailable).

**Step 3 — Whisper Model Selection:**
Plain-language labels explaining tradeoffs with download sizes shown:
- "Fast (tiny)" — ~75 MB
- "Balanced (base)" — ~150 MB (default)
- "Accurate (small)" — ~500 MB
- "High Quality (medium)" — ~1.5 GB
- "Best (large)" — ~3 GB

Download happens inline with a progress bar. For models over 1 GB, show a confirmation: "This will download X GB. Continue?"

### Post-Setup
- Drop user into empty library with a prominent "New Note" button and quick-start hint.
- Settings accessible anytime to change models and re-run checks.

### Ongoing Health
- On each app launch, silently check Ollama status. If offline, show a gentle banner (not a modal) with a "How to fix this" link.
- Never block the app entirely. Transcription works without Ollama; summarization shows as unavailable.

## Input Modes

All three modes ship in v1.

### Upload Audio/Video
- Drag-and-drop zone + file picker button on the "New Note" page.
- Accepted formats: mp3, wav, m4a, mp4, webm, ogg, flac (FFmpeg handles conversion).
- Large file support with file size display and estimated processing time.
- Optional title input (defaults to filename + date).

### Record System Audio
- "Record" button captures system audio output (e.g., Zoom/Teams calls).
- Platform-specific implementation:
  - **Windows:** WASAPI loopback capture (well-supported, no extra drivers)
  - **macOS:** Deferred to post-v1. macOS system audio capture requires a virtual audio driver (e.g., BlackHole), which involves installing a kernel extension — too high a barrier for general users. v1 on macOS offers microphone recording as a fallback, with a note that system audio capture is coming.
  - **Linux:** PulseAudio/PipeWire monitor source
- Live waveform visualization during recording.
- Pause/resume and stop controls.
- Audio saved as WAV to the app's data directory (not temp), then processed like an upload.

### Paste Transcript
- Simple text area for pasting from Zoom, Otter.ai, Google Meet, or any raw text.
- "Process" button sends directly to Ollama (skips Whisper).
- Useful for users who already have transcripts and just want the narrative summary.

### Convergence
All three modes converge at the same processing point — once Memofy has a transcript (from Whisper or pasted), it goes to Ollama for summarization, then saves to the library.

## Processing & Live Feedback

### Active Processing View

Two-phase progress display:

1. **Transcribing:** Progress bar based on audio duration processed vs. total. Below it, a live text area where transcript lines appear as Whisper produces them.
2. **Summarizing:** Streaming text area where the narrative summary builds word-by-word as Ollama responds. Subtle "thinking" animation while waiting for first tokens.

Users can scroll through the live transcript while summarization happens. Cancel button available at any stage.

### Background Processing

- Jobs stored in SQLite with status tracking: pending → transcribing → summarizing → complete/failed.
- Sidecar processes one job at a time. Additional jobs remain queued (pending).
- Small indicator in the header: "Processing 1 note (1 queued)..." reflecting active + waiting jobs.
- Desktop notification on completion (Tauri notification API).
- **Interrupted jobs:** If the app is closed mid-processing, the job status is preserved in SQLite. On next launch, interrupted transcription jobs restart from the beginning (Whisper does not support checkpointing). Interrupted summarization jobs re-send the saved transcript to Ollama. Audio files are stored in the app's data directory (not temp) to survive restarts.

### Error Handling

- **Whisper failure:** Clear message with option to retry using a different model size.
- **Ollama unreachable:** Save the transcript anyway. Offer to summarize later when Ollama is back ("Summarize now" button on the note).
- **Partial failure is never total failure:** The user always keeps whatever was produced.

## Notes Output & Viewing

### Narrative Format

Rather than rigid sections, Ollama produces a flowing conversational summary. The tone is like a thoughtful colleague summarizing the meeting for someone who missed it — readable, concise, not robotic.

**System prompt template:**

```
You are a meeting note assistant. Read the following transcript and write a natural,
flowing summary as if you were a thoughtful colleague explaining what happened to someone
who missed the meeting.

Weave in key decisions, action items (with owners if mentioned), notable discussion points,
and anything left unresolved. Do not use rigid section headers or bullet lists — write in
clear, connected prose paragraphs.

Length: {length_preference}

Transcript:
{transcript}
```

The `{length_preference}` placeholder maps to the user's setting:
- **Brief:** "Keep it to 2-3 short paragraphs, focusing only on the most important points."
- **Standard:** "Aim for a thorough but concise summary, typically 3-5 paragraphs."
- **Detailed:** "Be comprehensive. Cover all significant discussion points, decisions, and context."

### Transcript Cleaning

The "cleaned transcript" shown in the Transcript tab is the raw Whisper output with light post-processing applied by the Python sidecar:
- Punctuation and capitalization correction
- Filler word removal ("um", "uh", "like", "you know")
- Paragraph breaks inserted at natural pauses (>2 seconds)

Speaker diarization is not included in v1 (Whisper does not natively support it). Timestamps are preserved from Whisper's segment output.

### Note View Layout

- **Top:** Title, date, duration, tags, favorite toggle.
- **Main area:** Two tabs:
  - **Summary** — narrative output rendered as formatted prose.
  - **Transcript** — full cleaned transcript, scrollable, with timestamps if available.
- **Actions bar:** Export to Markdown, re-summarize (different model or prompt), delete.
- **Re-summarize:** Option to retry with a different model or tweaked prompt.

### Export

- Markdown file with title, date, summary, and optionally the full transcript.
- Native save dialog for choosing export directory.

## Library & Workspace

### Library View (Main Screen)

- **Default view:** All notes in reverse chronological order showing title, date, duration, tags, and a one-line summary preview.
- **Sidebar navigation:**
  - All Notes
  - Favorites
  - Folders (user-created)
  - Tags (auto-listed from all used tags)
- **Search:** Full-text search across titles, summaries, and transcripts. Results highlight matching terms.
- **Sorting:** By date (default), title, or duration.

### Organization

- **Folders:** User-created groups (e.g., "Project Alpha", "Weekly Standups"). A note lives in one folder at a time. Drag-and-drop to move.
- **Tags:** Lightweight labels. Multiple tags per note. Click a tag in sidebar to filter. Free-form creation.
- **Favorites:** Star toggle on any note for quick access.

### Bulk Actions
Multi-select notes to move to folder, tag, export, or delete.

### Empty States
- Empty library: warm welcome with "Create your first note" call to action.
- Empty folder/tag: hint about how to add notes.

## Settings

Single scrollable settings page. No hidden advanced menus.

### AI Models
- **Whisper model selector:** Dropdown with plain-language labels — "Fast (tiny)", "Balanced (base)", "Accurate (small)", "High Quality (medium)", "Best (large)". Shows download status and size.
- **Ollama model selector:** Auto-populated from detected models. Dropdown with "Refresh" button. Manual model name input as fallback.
- **Download button** for Whisper models not yet on disk.

### Ollama Connection
- Status indicator (connected/disconnected).
- Custom endpoint field (defaults to `localhost:11434`).
- "Test Connection" button.

### Output Preferences
- Summary length preference: "Brief", "Standard", "Detailed".
- Include/exclude full transcript in exports.
- Default export directory.

### Appearance
- Dark / Light / System toggle.
- Warm aesthetic applies to both themes.

### Storage
- Disk usage display (audio files, database size).
- Option to delete source audio after processing (keep only transcript + summary).
- Data directory location display.

## Visual Identity

### Design Language
- **Palette:** Warm amber/honey primary accent, muted earth tones for secondary elements. No cold blue/gray tech aesthetic.
- **Typography:** Rounded, friendly sans-serif (e.g., Nunito). Comfortable reading sizes for narrative summaries.
- **Shapes:** Rounded corners throughout (12px radius). Subtle shadows for depth, no hard borders.
- **Spacing:** Generous padding and whitespace. Nothing cramped.
- **Animations:** Gentle transitions — soft fades, smooth progress bars, subtle hover states. Nothing flashy.

### Dark Mode
Warm dark — dark browns/charcoals, not pure black. The amber accent carries through. Cozy rather than stark.

### Light Mode
Warm cream/off-white backgrounds rather than sterile white. Soft contrast.

### Iconography
Rounded, friendly line icons. Consistent stroke weight. Simple and recognizable.

### Overall Feel
Like a well-made notebook app. Calm, inviting, trustworthy. Users should feel comfortable spending time here, not overwhelmed by complexity.

## Key Design Decisions

1. **Thin sidecar, smart shell:** Python does AI work only. Tauri manages state, persistence, and UI.
2. **Narrative over templates:** Summaries read like a colleague's recap, not a form with fields.
3. **Graceful degradation:** Every failure mode preserves user data. No Ollama? Transcription still works. Whisper fails? Retry with a different model. Partial results are always saved.
4. **No cloud, no keys:** Everything runs locally. Zero external dependencies beyond Ollama.
5. **General audience UX:** Guided setup, friendly language, no terminal required, warm visual design.
