# Phase 8.2 Fixes Walkthrough — Supabase MCP Configuration & Agent Skills Installation

## Task goal and outcome
Configure the Supabase Model Context Protocol (MCP) server for Antigravity and install Supabase Agent Skills in the workspace.

Outcome:
- Configured Supabase MCP server in `~/.gemini/antigravity/mcp_config.json` (symlinked to `~/.gemini/config/mcp_config.json`) and `~/.gemini/antigravity-ide/mcp_config.json` with the project reference `wupdqxuxnejjkukjjimi` and requested feature flags (`docs`, `account`, `database`, `debugging`, `development`, `functions`, `branching`).
- Preserved existing MCP server definitions (`stitch`).
- Successfully installed Supabase agent skills into `.agents/skills/`:
  - `supabase-postgres-best-practices`
  - `supabase`
- Updated [skills-lock.json](file:///Users/swet/Developer/Project/examai-rag/skills-lock.json) with package integrity and version metadata.
- Verified backend test suite continues to pass (88 passed).

## Design / implementation decisions
- `~/.gemini/antigravity/mcp_config.json` is a symlink pointing to `/Users/swet/.gemini/config/mcp_config.json`. Both that target and `/Users/swet/.gemini/antigravity-ide/mcp_config.json` were updated to ensure consistent MCP server discovery across CLI and IDE runtime environments.
- Kept the existing `stitch` server configuration untouched rather than overwriting the entire file, avoiding loss of existing tool integrations.
- Installed skills locally to `.agents/skills/` using `npx -y skills add supabase/agent-skills -y` so the skills are version-controlled alongside repository customizations.

## Files changed and why
- `~/.gemini/config/mcp_config.json` & `~/.gemini/antigravity-ide/mcp_config.json`: Added `supabase` MCP server URL definition.
- [.agents/skills/supabase/SKILL.md](file:///Users/swet/Developer/Project/examai-rag/.agents/skills/supabase/SKILL.md): Installed official Supabase agent skill covering database, auth, realtime, storage, and edge functions.
- [.agents/skills/supabase-postgres-best-practices/SKILL.md](file:///Users/swet/Developer/Project/examai-rag/.agents/skills/supabase-postgres-best-practices/SKILL.md): Installed Postgres best practices skill for schema design, migrations, and query tuning.
- [skills-lock.json](file:///Users/swet/Developer/Project/examai-rag/skills-lock.json): Updated lockfile recording installed skill sources and hashes.

## Tests / checks run
- Validated JSON parsing of both `~/.gemini/config/mcp_config.json` and `~/.gemini/antigravity-ide/mcp_config.json` via Node.js: both valid.
- Ran `./venv/bin/pytest -q` in [backend](file:///Users/swet/Developer/Project/examai-rag/backend): 88 passed, 3 warnings in 1.40s.

## Pitfalls / lessons
- Running interactive CLI commands like `npx skills ...` without `-y` can hang on confirmation prompts ("Ok to proceed? (y)"). Passing `-y` allows non-interactive setup without blocking.

## Follow-up / next steps
- Antigravity IDE requires a restart to pick up new MCP server entries.
- After restarting, complete the OAuth flow to authenticate with Supabase (or navigate to Agent Settings via `Cmd+,` > Customizations > Authenticate next to Supabase if prompted).
