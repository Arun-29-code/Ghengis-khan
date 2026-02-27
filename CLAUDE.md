# CLAUDE.md — AI Assistant Guide for Ghengis-khan

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository. Update this file as the project evolves.

---

## Repository Overview

- **Repository**: Ghengis-khan (`Arun-29-code/Ghengis-khan`)
- **State**: Initial — no source files have been committed yet
- **Primary branch**: `main` (or as established by the team)
- **Development branches**: `claude/<description>-<session-id>` for AI-assisted work

---

## Repository Status

This repository was initialized but contains no source code as of 2026-02-27. When files are added, update this document with:

- Project purpose and description
- Technology stack
- Directory structure
- Build and test commands
- Key architectural decisions

---

## Git Workflow

### Branching Convention

- `main` — stable, production-ready code
- `claude/<description>-<id>` — AI-assisted feature branches
- Feature branches should be short-lived and merged via pull request

### Commit Messages

Write clear, imperative commit messages:

```
Add user authentication module
Fix null pointer in payment handler
Update CLAUDE.md with build instructions
```

- First line: 50 characters or fewer, imperative mood
- Body (if needed): wrap at 72 characters, explain *why* not *what*
- Reference issues where relevant: `Fixes #42`

### Push Workflow

Always push with tracking set:

```bash
git push -u origin <branch-name>
```

For AI assistant branches, the branch name must start with `claude/`.

### Pull Requests

- Keep PRs focused on a single concern
- Include a summary of changes and a test plan
- Link to the relevant issue

---

## Development Conventions (to be filled in)

Once source files exist, document the following here:

### Code Style

- Language(s): TBD
- Formatter: TBD (e.g., Prettier, Black, gofmt)
- Linter: TBD (e.g., ESLint, Ruff, golangci-lint)
- Run linting before committing

### Testing

- Test framework: TBD
- Run tests with: TBD
- Tests must pass before merging

### Build

- Build command: TBD
- Output directory: TBD

### Environment

- Copy `.env.example` to `.env` and fill in values (do not commit `.env`)
- Required environment variables: TBD

---

## For AI Assistants

### General Rules

1. **Read before editing** — always read a file before modifying it
2. **Minimal changes** — make only what the task requires; do not refactor unrelated code
3. **No secrets** — never commit `.env` files, credentials, API keys, or tokens
4. **Security first** — avoid introducing OWASP Top 10 vulnerabilities (SQLi, XSS, command injection, etc.)
5. **Ask when uncertain** — if requirements are ambiguous, ask rather than guess

### Branch Discipline

- Develop on the designated `claude/` branch specified in your task
- Never push to `main` directly
- Push with: `git push -u origin <branch-name>`

### Common Pitfalls to Avoid

- Do not use `git push --force` unless explicitly instructed
- Do not skip hooks with `--no-verify`
- Do not commit lock files if they conflict without resolving the conflict
- Do not delete files or branches without user confirmation

### Updating This File

Keep CLAUDE.md current as the project grows. When you add:
- A new dependency — document it
- A new service or module — describe its purpose
- A new required environment variable — add it to the Environment section
- A new script — add the command and its purpose

---

## Quick Reference (update as project grows)

| Task | Command |
|------|---------|
| Install dependencies | TBD |
| Run tests | TBD |
| Run linter | TBD |
| Build project | TBD |
| Start dev server | TBD |
