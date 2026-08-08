# Phase 7.1 fixes Walkthrough — Uncommitted Change Review

## Goal and outcome

Reviewed the current staged, unstaged, and untracked changes across the FastAPI
backend and React frontend. The implementation passes the available automated
gates, but the review found one actionable regression in persisted session
handling: session revalidation updates local storage without preserving the
access and refresh tokens.

## Important finding

`frontend/src/store/authStore.js` calls `persist({ user, role: user.role })` in
`setUser`. `SessionBootstrap` calls `setUser` after a successful `/auth/me`
request, so a normal page load replaces the persisted record with one that has
no tokens. The current tab still has the in-memory token, but the next reload
cannot restore the authenticated session. The fix should preserve the existing
tokens when persisting the refreshed user profile.

## Checks run

- Backend: `backend/venv/bin/pytest -q` — 83 passed.
- Frontend: `npm test -- --run` — 7 test files, 24 tests passed.
- Frontend: `npm run lint` — passed with existing warnings.
- Frontend: `npm run build` — passed; Vite emitted unresolved font-file warnings.

## Files reviewed

The review covered the new API wrappers, auth/session guards, material scope
state, student and teacher pages, quiz/flashcard flows, material attribution
serialization, the new attempt-list endpoint, and their tests.

## Follow-up

Fix token preservation in `setUser`, then add a regression test that simulates a
successful session bootstrap and verifies the persisted access and refresh
tokens remain available after the profile update.
