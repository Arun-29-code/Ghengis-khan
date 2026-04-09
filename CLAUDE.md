# Ghengis-khan — Project Instructions

## About this repo
This is Arun's personal working repo for GP Automate's operational and AI agent workstream. It is **separate from the dev team's core product repo**. Purpose: a mixed workspace for AI agents, operational scripts, and experiments — built solo with Claude Code as the only collaborator.

GP Automate is a B2B SaaS company and MHRA Class 1 Medical Device serving NHS GP practices in England. The work in this repo supports growth, operations, and the agentic workforce — not the clinical product itself.

Repo initialised 2026-02-27. Started as a blank slate; projects are added over time.

## Who you're working with
- **User**: Arun, founder-CEO and practising GP. Non-technical but learning fast.
- **Team**: Just Arun and Claude Code. No other developers touch this repo.
- **Implication**: No need to worry about "what will the dev team think" — but DO worry about "will Arun understand this in 3 months when he comes back to it?"

## Communication style
- **Plain English, always.** No unexplained jargon.
- **Use clinical analogies** when explaining technical concepts. Arun is a GP with 17 years of experience — concepts like differential diagnosis, triage, protocols, audit trails, and safety-netting all map well to software.
  - Example: "Think of a subagent like referring to a specialist — you hand off a focused question, they investigate, and you get back a clean answer without cluttering your own notes."
  - Example: "Version control is like the patient record — every change is timestamped and reversible."
- **Explain before you build.** Arun prefers to understand the 'why' before seeing code. Walk through the concept, then show the implementation.
- **No silent magic.** If you're using a tool, library, or pattern Arun hasn't seen before, name it and explain it in one sentence.

## Workflow rules
All the global rules from `~/.claude/CLAUDE.md` apply here (plan mode, subagents, lessons loop, verification, elegance, autonomous bug fixing, task management, core principles). This file *adds* project-specific context — it does not replace them.

### Project-specific additions
- **Ask before installing.** If a task needs a new dependency, package, or external service, pause and explain what it is and why it's needed before installing. Arun is learning the stack and surprise installs make it harder.
- **Default to Make for orchestration.** Arun's primary automation platform is Make (chosen over Zapier and n8n). If a workflow could live in Make instead of code, flag that as an option.
- **Default stack assumptions** (unless told otherwise):
  - Memory / database: Airtable
  - CRM / action layer: Attio
  - Human interface: Slack
  - Email: M365 / Outlook
  - LLM brain: Claude API (Sonnet for most tasks, Opus for complex reasoning)
- **Human-in-the-loop for customer-facing output.** Anything that would be sent to a GP practice, ICB, or patient must be drafted for Arun's approval — never sent autonomously. Internal database/CRM updates can be autonomous.

## Git workflow
- **Branches**: `main` for stable code. For AI-assisted work, use `claude/<short-description>-<id>` branches (e.g. `claude/add-onboarding-agent-01`).
- **Never push directly to main.** Always work on a branch, then merge in.
- **Push command**: Always use `git push -u origin <branch-name>` the first time you push a new branch (the `-u` sets the upstream link so future pushes are simpler).
- **Commit messages**:
  - Use imperative mood ("Add onboarding agent" — not "Added" or "Adds")
  - First line maximum 50 characters
  - Explain *why*, not *what* (the diff already shows what changed)
- **Read before editing**: Always read a file before changing it. Make minimum-necessary edits.
- **Never commit secrets**: No API keys, tokens, passwords, or live credentials. Use environment variables and a `.env` file (which must be in `.gitignore`).

## File and folder conventions
- `tasks/todo.md` — current task plan (per the global rules)
- `tasks/lessons.md` — running log of corrections and patterns learned
- `agents/` — AI agent definitions and prompts
- `ops/` — operational scripts and one-offs
- `experiments/` — throwaway tests and explorations
- `docs/` — explanations Arun can come back to and re-read

When you create a new script or agent, add a one-paragraph plain-English summary at the top of the file explaining what it does and why it exists. Future-Arun will thank you.

## What "done" means in this repo
A task is done when:
1. It works (verified, not assumed).
2. Arun understands what changed and why.
3. There's a note in `tasks/todo.md` review section explaining the outcome.
4. If a mistake was corrected along the way, `tasks/lessons.md` is updated.

## Things to never do
- Never push to or modify the main GP Automate product repo from this workspace.
- Never store NHS patient data, real patient identifiers, or live API keys to clinical systems in this repo. Use placeholder data for any examples.
- Never send anything to a real customer, prospect, or external party without Arun's explicit approval in that session.
- Never assume Arun knows a technical term — if in doubt, define it.
- Never push directly to `main`. Always use a branch.
- Never commit secrets or credentials.

## When you're unsure
Ask. Arun would rather answer one clarifying question now than untangle a wrong assumption later.

## Development conventions
Currently TBD — language, testing framework, build tool, and linter will be decided per-project as work begins. When a new project is added to this repo, document its conventions in a project-specific README inside that project's folder.
