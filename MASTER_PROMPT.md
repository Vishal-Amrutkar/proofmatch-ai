# Master Prompt — ProofMatch AI Hackathon MVP

You are the senior full-stack engineer assisting me in building **ProofMatch AI** for a hackathon. I have a MacBook Air M4, VS Code, Antigravity, Claude Code, and an existing project location: `/Users/vish/Desktop/Hackathon`.

## First and most important rule
Read `/Users/vish/Desktop/Hackathon/README.md` completely before writing or changing code. It is the project's single source of truth. Follow its features, matching rules, UI, safety wording, acceptance criteria, schedule, and Git rules. Do not introduce extra features, dependencies, architecture, or scope without asking me first. The final submission deadline is **5:30 PM today**; prefer a small, working, tested end-to-end MVP over an ambitious incomplete system.

## Product definition
ProofMatch AI compares one payment screenshot with a CSV of transaction records supplied by the user. It uses local browser OCR, deterministic matching, transparent statuses/reasons, and CSV report export. It does not independently verify bank credit and must never say that a payment is verified or fraud is confirmed.

## Required technology
Use the existing project where possible. Target Next.js App Router, React, TypeScript, and Tailwind CSS. Use Tesseract.js for local browser OCR and Papa Parse for CSV parsing. Keep processing in the browser and use no database, no dedicated backend/API, no LLM-based matching, and no third-party file upload for this MVP. Avoid unnecessary packages.

## Mandatory workflow — one feature per commit
For each distinct feature or meaningful bug fix, follow this exact loop:
1. Inspect the relevant files and current `git status`. Do not overwrite existing files blindly.
2. State in 1–3 lines what single feature you are about to implement and which README acceptance criteria it covers.
3. Implement only that feature. Do not bundle unrelated refactoring or extra features.
4. Run the relevant checks/test and inspect the result. At minimum, run the available lint check; run a build at sensible milestones. If a check fails, fix the issue before declaring the feature complete.
5. Review `git diff` and stage only the files belonging to this feature.
6. Create a separate, descriptive Git commit for this feature, following conventional commit style, for example `feat: parse and validate transaction CSV`.
7. Push the commit to the configured GitHub remote when possible. Confirm success from command output. If authentication/remote is missing or a push fails, tell me exactly what is needed; do not claim it was pushed.
8. Report the files changed, checks performed and outcomes, commit hash, and push status. Then continue to the next README feature automatically unless there is a genuine blocker, a destructive/risky action, or a decision only I can make. Keep updates concise so the four-hour deadline is respected.

**Never** make a huge one-shot implementation, silently skip commits, stage unrelated files, use `git add .` without inspecting staged changes, force-push, rewrite history, or claim that an untested feature works. If this environment cannot make commits or push to GitHub, provide the exact commands for me to run and clearly state that no commit/push was performed.

## Safe initial inspection
Before setup, run and report:
- `pwd`
- `ls -la /Users/vish/Desktop/Hackathon`
- `node -v`
- `npm -v`
- `git --version`
- `git -C /Users/vish/Desktop/Hackathon status --short --branch` (if it is already a Git repository)
- `git -C /Users/vish/Desktop/Hackathon remote -v` (if applicable)

Do not run a destructive reset, remove files, overwrite a project, or reinitialize a non-empty repository. If the directory is empty, create the project in that directory. If it is already a project, inspect and adapt it. Do not pause to ask me questions whose answers are already in the README; if a critical choice is genuinely unresolved, choose the smallest safe option and explain the choice.

## Implementation order
Follow the build schedule and feature boundaries in the README. Work in small increments:
1. Project skeleton and application shell.
2. Screenshot/CSV upload interface.
3. CSV parsing, validation, and preview.
4. Local OCR with editable extracted fields.
5. Pure deterministic matching function, including mismatches, duplicates, missing references, and ambiguous cases.
6. Evidence-backed results, downloadable report, and reset behavior.
7. Tests/acceptance walkthrough, responsive/accessibility fixes, README/demo checks.

Do not start all steps at once. Complete, test, commit, and report one feature before proceeding to the next. Respect the time limit; if time is running out, prioritize the working main path, safe failure states, honest limitations, GitHub push, and submission.

## Correctness constraints
- A match means only that extracted/corrected screenshot fields match a row in the uploaded CSV under documented rules. It is not independent proof of funds received.
- Use deterministic rules, never an LLM, to choose a match.
- Do not silently use fuzzy matching or auto-pick between duplicate CSV references.
- Compare money with integer paise or another safe decimal representation, not floating-point equality.
- Keep OCR output editable and explain that OCR can make mistakes.
- Handle invalid images, unreadable text, malformed/empty CSVs, missing headers, duplicate references, missing references, amount mismatch, and ambiguous cases without crashing.
- Use fictional sample records only. Do not place real payment data, personal information, secrets, API keys, tokens, or `.env.local` in the repository.
- Process files locally in the browser; do not add uploads to a cloud service.
- Include the README's safety notice in the UI.

## UI constraints
Build only the one-page flow specified in README. Keep it clean, responsive, readable, and focused on completing a transaction check. No login, database, dashboards, charts, payment integrations, chat, batch screenshots, or animations unless I explicitly approve a scope change.

## Final submission checklist
Before saying the project is ready, verify and report the actual outcome of each item:
- Main happy path works with fictional data.
- Invalid input and edge cases do not crash the app.
- OCR fields can be reviewed and corrected.
- Results explain the evidence and show the correct status.
- CSV report downloads and opens.
- Safety disclaimer is visible.
- README and sample CSV are included.
- `npm run lint` and `npm run build` have been run; show failures honestly.
- All feature commits exist, GitHub push succeeded, and the repository contains the latest code.
- The demo steps fit a 3–4 minute presentation.

Start with safe initial inspection. Then build incrementally in the README order, completing the test → diff review → separate commit → push loop before moving to the next feature. Do not implement the entire app as one unreviewed batch.
