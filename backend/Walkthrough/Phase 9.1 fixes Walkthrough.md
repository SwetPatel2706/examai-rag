# Phase 9.1 fixes Walkthrough — At-Risk Reason Specificity in Student Progress Panel

## Task Goal and Outcome

The "At Risk" panel in the **Student Progress** teacher view was showing a generic, speculative message:

> *"This student's average is below 60% or completion is under 50%. Consider reaching out through your institution's channels."*

The word "or" implied the teacher should guess which condition applied. Since the frontend already has the student's actual `avgScore` and `completionPct` values at render time, the message can and should state the precise reason(s) that caused the flag. The fix changes the message to be factual and specific to each student.

## Design / Implementation Decisions

### Derive reasons at render time, not at data-fetch time

The at-risk classification logic (`avg_score < 60` or `completion_pct < 50`) lives in the backend. The frontend receives `at_risk: bool`, `avg_score`, and `completion_pct`. Rather than adding a new backend field (`at_risk_reasons: list[str]`), the fix computes reasons directly in JSX from the same values already present on `selectedStudent`. This avoids a backend change for a purely presentational improvement.

### Graceful fallback

If `atRisk` is true but neither condition resolves (e.g. future backend adds a third condition), the message falls back to `"This student has been flagged as at-risk."` so nothing breaks.

### Natural language construction

- 1 reason → `"This student's <reason>."`
- 2 reasons → `"This student's <reason1> and <reason2>."`

Both are appended with the existing call-to-action sentence.

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/StudentProgress.jsx` | Replaced the static at-risk message with an IIFE that builds `reasons[]` from `avgScore` and `completionPct`, then renders the computed natural-language sentence. |

No backend changes were needed.

## Example Outputs

| `avgScore` | `completionPct` | Message rendered |
|---|---|---|
| 50% | 100% | *"This student's average score is 50%, which is below 60%. Consider reaching out…"* |
| 65% | 40% | *"This student's quiz completion is 40%, which is under 50%. Consider reaching out…"* |
| 40% | 30% | *"This student's average score is 40%, which is below 60%, and quiz completion is 30%, which is under 50%. Consider reaching out…"* |

## Checks Run

- Visually verified the logic covers single-reason and dual-reason cases.
- No backend changes → existing 82-test backend suite unaffected.
- `avgScore` null guard added: `avgScore !== null && avgScore < 60` prevents `null < 60 → true` producing a misleading "average score is null%" message.

## Follow-up / Known Limitations

If the backend ever adds a third at-risk condition (e.g. days-since-last-active), the reason derivation in the frontend will need updating. A future improvement could move the reason list into the API response.
