"""Error-aware structured-output retry helper.

Wraps ``GeminiClient.generate_json`` so a structured-output failure retries
once with a prompt that includes the verbatim validation error and the full
bad response, then raises a 502 if the retry also fails. This is the single
implementation shared by chat, AI quiz generation, and flashcard generation
(see the LLM usage guidance in backend/agents.md).
"""
from typing import Callable, TypeVar

from fastapi import HTTPException
from pydantic import BaseModel

from app.utils.gemini_client import GeminiClient, StructuredOutputError

T = TypeVar("T", bound=BaseModel)


def error_aware_retry_prompt(
    prompt: str, error: Exception, *, instruction: str | None = None
) -> str:
    """Rebuild *prompt* for a retry, including the verbatim error and the bad
    response so the second attempt has the context it needs."""
    bad_response = getattr(error, "raw_response", "<response unavailable>")
    text = (
        prompt
        + "\n\nYour previous response failed validation. "
        + f"Verbatim validation error: {error}\nPrevious full response:\n{bad_response}\n"
        + "Return only valid JSON."
    )
    if instruction:
        text += " " + instruction
    return text


def generate_json_with_retry(
    llm: GeminiClient,
    prompt: str,
    schema: type[T],
    *,
    http_error_detail: str,
    validate: Callable[[T], None] | None = None,
    retry_instruction: str | None = None,
) -> T:
    """Call ``llm.generate_json`` with one error-aware retry.

    On ``StructuredOutputError`` (or any generation error, which is wrapped as
    one) the prompt is rebuilt with the verbatim error and the previous full
    response. *validate* runs on the parsed output and may raise
    ``StructuredOutputError`` to trigger a retry (e.g. marker or count checks).
    If both attempts fail, raises 502 with *http_error_detail*.
    """
    last_error: Exception | None = None
    for _ in range(2):
        try:
            try:
                output = llm.generate_json(prompt, schema)
            except Exception as exc:
                if isinstance(exc, StructuredOutputError):
                    raise
                raise StructuredOutputError(f"API Error: {exc}", "") from exc
            if validate is not None:
                validate(output)
            return output
        except StructuredOutputError as exc:
            last_error = exc
            prompt = error_aware_retry_prompt(prompt, exc, instruction=retry_instruction)
    raise HTTPException(status_code=502, detail=http_error_detail) from last_error
