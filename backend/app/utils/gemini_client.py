import json
from typing import TypeVar

from pydantic import BaseModel

from app.config import settings

T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(ValueError):
    """Validation failure retaining the bad response for an error-aware retry."""

    def __init__(self, message: str, raw_response: str):
        super().__init__(message)
        self.raw_response = raw_response


class GeminiClient:
    """Small adapter kept separate so RAG services are easy to test."""

    def __init__(self, client=None, model: str | None = None):
        self.model = model or settings.GEMINI_MODEL
        if client is None:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.client = client

    def generate_json(self, prompt: str, schema: type[T]) -> T:
        from google.genai import types

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=0.2,
            ),
        )
        text = getattr(response, "text", None)
        if not text:
            raise ValueError("Gemini returned an empty response")
        try:
            return schema.model_validate(json.loads(text))
        except Exception as exc:
            # Keep the raw response available to the retry prompt, but never
            # include it in logs or the public HTTP error.
            raise StructuredOutputError(str(exc), text) from exc
