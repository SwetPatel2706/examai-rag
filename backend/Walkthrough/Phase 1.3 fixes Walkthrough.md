# Phase 1.3 Fixes Walkthrough

## Summary

Updated the root agent guidance to make end-of-task walkthroughs a required
deliverable and documented the phase-based naming convention for storing them in
`backend/Walkthrough/`.

## Changes Made

- **`agents.md`**: Added a required walkthrough workflow for implementation,
  refactoring, bug-fix, review-response, and configuration tasks.
- Standardized new phase implementation walkthroughs to use `.0`, such as
  `Phase 1.0 Walkthrough — <scope>.md`.
- Standardized follow-up fixes and review responses to use the next available
  sequence, such as `Phase 1.1 fixes Walkthrough.md` and
  `Phase 1.2 fixes Walkthrough.md`.
- Required each walkthrough to capture the goal, outcome, decisions, changed
  files, verification results, lessons, and follow-up items without claiming
  work that was not performed.
- Preserved existing walkthrough filenames as historical records and instructed
  future tasks not to overwrite them.

## Verification

- Inspected the existing `backend/Walkthrough/` files and confirmed the next
  available Phase 1 fix sequence was `1.3`.
- Reviewed the resulting `git diff` for `agents.md`.

## Lesson

Walkthroughs are now treated as part of the implementation handoff, so each
future task should finish with both the code/configuration change and a clear,
teachable record of what changed and how it was verified.
