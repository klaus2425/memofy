from cleaner import clean_transcript, clean_transcript_segments


def test_removes_filler_words():
    text = "So um I think uh we should like proceed"
    result = clean_transcript(text)
    assert "um" not in result.lower().split()
    assert "uh" not in result.lower().split()
    assert "I think" in result
    assert "proceed" in result


def test_preserves_meaningful_content():
    text = "The quarterly report shows a 15% increase in revenue"
    result = clean_transcript(text)
    assert "quarterly report" in result
    assert "15%" in result


def test_handles_empty_input():
    assert clean_transcript("") == ""


def test_adds_paragraph_breaks():
    # Segments with >2s gaps should get paragraph breaks
    segments = [
        {"text": "First point.", "end": 10.0},
        {"text": "Second point.", "start": 13.0},  # 3s gap
    ]
    result = clean_transcript_segments(segments)
    assert "\n\n" in result


def test_capitalizes_sentence_starts():
    text = "hello world. this is a test. another sentence"
    result = clean_transcript(text)
    assert result.startswith("Hello")
    assert "This is" in result
