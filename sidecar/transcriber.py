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
