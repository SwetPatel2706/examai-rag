from typing import Any, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, model_validator


class ErrorDetail(BaseModel):
    code: str
    message: str
    # request_id is required on error responses so clients can correlate
    # server logs.  Use an empty string when a request_id cannot be derived
    # (e.g. very early middleware failures) rather than omitting the field.
    request_id: str
    details: Optional[Any] = None


class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None

    @model_validator(mode="after")
    def enforce_envelope_contract(self) -> "StandardResponse":
        """
        Enforce the response envelope invariants:
        - success=True  → error must be None
        - success=False → error must be present (ErrorDetail)
        - data and error are mutually exclusive
        """
        if self.success and self.error is not None:
            raise ValueError(
                "A successful StandardResponse must not include an error field."
            )
        if not self.success and self.error is None:
            raise ValueError(
                "A failed StandardResponse must include an ErrorDetail."
            )
        if self.data is not None and self.error is not None:
            raise ValueError(
                "StandardResponse data and error are mutually exclusive."
            )
        return self

    # ── Convenience factories ─────────────────────────────────────────────

    @classmethod
    def ok(cls, data: Any = None) -> "StandardResponse":
        """Create a successful response."""
        return cls(success=True, data=data)

    @classmethod
    def error_response(
        cls,
        code: str,
        message: str,
        request_id: str,
        details: Optional[Any] = None,
    ) -> "StandardResponse":
        """Create a failed response with a fully-formed ErrorDetail."""
        return cls(
            success=False,
            error=ErrorDetail(
                code=code,
                message=message,
                request_id=request_id,
                details=details,
            ),
        )
