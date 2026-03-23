"""Ollama summarization handler with streaming."""
import json
import requests

SYSTEM_PROMPT = """You are a meeting note assistant. Read the following transcript and write a natural, flowing summary as if you were a thoughtful colleague explaining what happened to someone who missed the meeting.

Weave in key decisions, action items (with owners if mentioned), notable discussion points, and anything left unresolved. Do not use rigid section headers or bullet lists — write in clear, connected prose paragraphs.

Length: {length_preference}

Transcript:
{transcript}"""

LENGTH_PREFERENCES = {
    "brief": "Keep it to 2-3 short paragraphs, focusing only on the most important points.",
    "standard": "Aim for a thorough but concise summary, typically 3-5 paragraphs.",
    "detailed": "Be comprehensive. Cover all significant discussion points, decisions, and context.",
}


def build_prompt(transcript: str, prompt_style: str) -> str:
    """Build the full prompt for Ollama."""
    length_pref = LENGTH_PREFERENCES.get(prompt_style, LENGTH_PREFERENCES["standard"])
    return SYSTEM_PROMPT.format(
        length_preference=length_pref,
        transcript=transcript,
    )


def summarize(msg: dict, stdout, endpoint: str = "http://localhost:11434") -> None:
    """Send transcript to Ollama and stream the summary back."""
    job_id = msg.get("job_id", "")
    transcript = msg.get("transcript", "")
    prompt_style = msg.get("prompt_style", "standard")
    model = msg.get("model", "llama3")

    prompt = build_prompt(transcript, prompt_style)

    try:
        response = requests.post(
            f"{endpoint}/api/generate",
            json={"model": model, "prompt": prompt, "stream": True},
            stream=True,
            timeout=300,
        )

        full_text = []

        with response:
            for line in response.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                token = data.get("response", "")
                if token:
                    full_text.append(token)
                    chunk = {
                        "type": "summary_chunk",
                        "text": token,
                        "job_id": job_id,
                    }
                    stdout.write(json.dumps(chunk) + "\n")
                    stdout.flush()

                if data.get("done", False):
                    break

        complete = {
            "type": "summary_complete",
            "full_text": "".join(full_text),
            "job_id": job_id,
        }
        stdout.write(json.dumps(complete) + "\n")
        stdout.flush()

    except requests.ConnectionError:
        error = {
            "type": "error",
            "message": "Cannot connect to Ollama. Is it running?",
            "job_id": job_id,
        }
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
    except Exception as e:
        error = {"type": "error", "message": str(e), "job_id": job_id}
        stdout.write(json.dumps(error) + "\n")
        stdout.flush()
