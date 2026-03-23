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
