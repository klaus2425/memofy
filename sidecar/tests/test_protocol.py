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
