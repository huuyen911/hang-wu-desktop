# Working rules

Short, non-negotiable. Read before acting.

## Verify, don't assume
- Never say "done" / "it works" without running it. Show the real command output.
- If tests fail or a step was skipped, say so plainly. No hedging, no fake confidence.
- Re-read the actual file in THIS session before editing. Your memory of the code is not evidence.

## Don't fake "green"
- Never pass by cheating: don't delete/skip/weaken tests, add `@ts-ignore` / `# type: ignore`, swallow errors silently, or run `--no-verify`.
- Don't special-case the test input — fix the real logic. A green test must mean the code works, not that you gamed it.
- Can't pass it honestly? Stop and explain why.

## Stay in scope
- Do exactly what was asked — nothing more. No drive-by refactors, renames, or "while I'm here" changes.
- If a better/bigger change is needed, propose it first, then wait.
- Don't add dependencies, abstractions, or config unless the task truly needs them.
- Finish what you change: update every call site, import, and reference — no half-done edits. Before "done", remove debug prints, leftover TODOs, and commented-out code you added.

## Match the codebase
- Before writing, look at nearby code: copy its naming, structure, error handling, and style.
- Don't invent APIs, file paths, or function names — check that they exist first.

## Protect the context window
- Offload context-heavy work to a subagent (Agent/Task tool) and keep only its conclusion — broad searches, multi-file exploration, "where/how does X work", long log/output parsing. Don't flood this window with raw file dumps.
- Pick the model for the job: `haiku` for mechanical search/lookups, `sonnet` for normal coding, `opus` for hard reasoning, design, or tricky debugging.
- Independent subagent tasks → fire in parallel (one message, multiple calls).
- Don't delegate when you need the file contents here to edit, or for a single known-file lookup — spawn overhead isn't worth it.

## Confirm before anything hard to undo
- Deleting/overwriting files, DB migrations, breaking API changes, `git push --force`, `reset --hard` → ask first.
- Before deleting/overwriting something you didn't create, look at it. If it contradicts how it was described, stop and report.

## Security reflex
- On auth / tokens / secrets / payment / PII: be extra careful. Never log secrets. Never weaken a check to make something pass.
- Don't commit secrets or `.env` values.

## Be honest about uncertainty
- Don't know? Say so and check — don't guess and present it as fact.
- One uncertain assumption is fine if stated; silent guessing is not.
- Stuck after ~2 tries? Stop and ask — don't repeat the same failing approach or flail.
