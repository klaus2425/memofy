"""Transcript cleaning: filler removal, punctuation, paragraph breaks."""
import re

FILLER_WORDS = {
    "um", "uh", "uhh", "umm", "hmm", "hm",
    "you know", "i mean",
}

# Single-word fillers as regex pattern
FILLER_SINGLE = re.compile(
    r'\b(' + '|'.join(w for w in FILLER_WORDS if ' ' not in w) + r')\b',
    re.IGNORECASE
)

# Multi-word fillers
FILLER_MULTI = re.compile(
    r'\b(' + '|'.join(w for w in FILLER_WORDS if ' ' in w) + r')\b',
    re.IGNORECASE
)


def clean_transcript(text: str) -> str:
    """Clean a plain text transcript: remove fillers, fix capitalization."""
    if not text:
        return ""

    # Remove multi-word fillers first
    text = FILLER_MULTI.sub("", text)
    # Remove single-word fillers
    text = FILLER_SINGLE.sub("", text)
    # Collapse multiple spaces
    text = re.sub(r'  +', ' ', text)
    # Fix sentence capitalization
    text = re.sub(r'(?:^|[.!?]\s+)([a-z])', lambda m: m.group(0).upper(), text)
    # Ensure first character is capitalized
    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    return text.strip()


def clean_transcript_segments(segments: list[dict]) -> str:
    """Clean transcript from Whisper segments, inserting paragraph breaks at pauses >2s."""
    if not segments:
        return ""

    paragraphs = []
    current_paragraph = []

    for i, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        if not text:
            continue

        # Check for gap > 2 seconds between segments
        if i > 0 and "start" in seg and "end" in segments[i - 1]:
            gap = seg["start"] - segments[i - 1]["end"]
            if gap > 2.0 and current_paragraph:
                paragraphs.append(" ".join(current_paragraph))
                current_paragraph = []

        current_paragraph.append(text)

    if current_paragraph:
        paragraphs.append(" ".join(current_paragraph))

    # Clean each paragraph
    cleaned = [clean_transcript(p) for p in paragraphs]
    return "\n\n".join(p for p in cleaned if p)
