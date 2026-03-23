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
