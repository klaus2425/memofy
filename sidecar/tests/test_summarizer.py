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
