# Lessons — Ghengis-khan

This file is Claude Code's running log of mistakes, corrections, and patterns learned while working in this repo. Think of it like a clinical audit log: every time something goes wrong, we capture the pattern so it doesn't happen again.

Claude Code reviews this file at the start of every session and updates it after any correction from Arun.

---

## Format
Each lesson follows this structure:

### [Date] — Short title of the lesson
- **What happened**: Brief description of the mistake or correction.
- **Why it happened**: Root cause — not just the symptom.
- **The rule going forward**: A clear, actionable rule to prevent it next time.
- **Tags**: `#category` (e.g. `#assumptions`, `#dependencies`, `#communication`, `#verification`)

---

## Lessons log

### 2026-04-22 — Next.js 16 renamed `middleware.ts` to `proxy.ts`
- **What happened**: Phase 3 of the NWL CRM build created `src/middleware.ts` using the `export { auth as middleware }` pattern straight from the spec. Worked, but Next 16's dev server warned the convention is deprecated. Had to rename the file *and* the export to `proxy`.
- **Why it happened**: The build spec was written against Next.js 14. I'd already flagged and reconciled the Next 14→16 mismatch upfront, but reconciled it at the *package* level, not at every *file convention* level. File-convention renames that happen between major versions easily slip through.
- **The rule going forward**: Before writing auth / routing / layout code for a new project, grep `node_modules/<framework>/dist/docs/` for any file-convention docs the AGENTS.md warning references. File conventions (middleware, not-found, layout groups, route segments) are where frameworks hide breaking renames. Treat every scaffolded convention name as potentially stale until verified.
- **Tags**: `#assumptions` `#nextjs` `#dependencies`

### 2026-04-09 — Always fetch before reporting repo state
- **What happened**: When asked to diagnose the repo's branch state, I reported that the PR merge hadn't landed on the default branch. This caused unnecessary alarm. After running `git fetch origin`, the merge was clearly there — my earlier check was working from stale local data.
- **Why it happened**: I queried local references without first refreshing them from GitHub. Local Git data can lag behind the remote, especially after web-based operations like PR merges.
- **The rule going forward**: Before reporting on the state of any branch or comparing local vs remote, always run `git fetch --all --prune` first. Treat any pre-fetch report as provisional.
- **Tags**: `#verification` `#assumptions` `#git`

---

## Meta-rules (always apply)
These are baseline rules that exist from day one, before any specific lessons are logged:

1. **No silent assumptions.** If you're guessing what Arun wants, ask instead.
2. **No surprise installs.** Name and explain any new dependency before installing it.
3. **No unexplained jargon.** If you use a technical term, define it in one sentence.
4. **No "it should work".** Verify before marking anything done.
5. **No customer-facing output without approval.** Drafts only — Arun sends.
