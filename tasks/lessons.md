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
