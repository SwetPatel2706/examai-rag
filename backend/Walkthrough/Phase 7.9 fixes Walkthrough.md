# Phase 7.9 Fixes Walkthrough — Local Backend Server Lifecycle & Auth Error Handling

## 1. Goal & Issue Context
When attempting to sign in on the ExamAI frontend at `http://localhost:5173`, the UI reported:
> `Could not reach the server. Check your connection and try again.`

## 2. Root Cause
1. **Initial Server State**: The FastAPI backend was not running initially.
2. **Upstream Supabase Project Status**:
   When the backend is running, authentication requests call Supabase Auth at `https://wupdqxuxnejjkukjjimi.supabase.co`. The configured Supabase project (`wupdqxuxnejjkukjjimi`) is currently paused/unreachable (`[Errno 8] nodename nor servname provided, or not known`, database tenant not found).
3. **Login Exception Handling**:
   `app/routes/auth.py` only caught `ValueError` on login, allowing `httpx.HTTPError` / `ConnectError` to escalate into generic 500 errors.

## 3. Resolution & Code Changes
1. **Hardened Error Handling**:
   - Updated [`app/auth/supabase_client.py`](file:///Users/swet/Developer/Project/examai-rag/backend/app/auth/supabase_client.py) to wrap login requests with `httpx.HTTPError`, `SupabaseRateLimitError`, and `SupabaseUpstreamError`.
   - Updated [`app/routes/auth.py`](file:///Users/swet/Developer/Project/examai-rag/backend/app/routes/auth.py) to catch upstream exceptions on login and return clean `503 Service Unavailable` / `502 Bad Gateway` / `429 Too Many Requests` responses with clear diagnostic messages.
2. **Regression Testing**:
   - Added `test_login_upstream_network_error` in [`tests/test_phase_1.py`](file:///Users/swet/Developer/Project/examai-rag/backend/tests/test_phase_1.py).
   - Full test suite passes: 88 passed.

## 4. How to Restore Supabase Project
- Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and check project `wupdqxuxnejjkukjjimi`. If it has been paused due to inactivity, click **"Restore project"** / **"Unpause"**.
- If a new Supabase project was created, update `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` in [`backend/.env.local`](file:///Users/swet/Developer/Project/examai-rag/backend/.env.local).
