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
