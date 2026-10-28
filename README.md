# ProofMatch AI

> **A transaction screenshot-to-CSV reconciliation tool for small sellers.** It checks whether details extracted from a payment screenshot match a transaction record supplied by the user. It does **not** independently verify that money reached a bank account.

## 1. Project goal

Build a working, demo-ready MVP for the PromptWars × KickToTech 2026 hackathon. A seller uploads **one payment screenshot** and a **CSV export of their own transaction records**. The app reads the screenshot, compares its extracted details against the CSV using explicit rules, explains the result, and lets the seller download a reconciliation report.

**Source of truth:** this README. Do not add features outside the scope below unless the project owner explicitly approves a change.

## 2. Users and problem

**Primary users:** small shopkeepers, local sellers, and people selling through Instagram or WhatsApp who need to compare a payment screenshot with their own transaction records.

**Problem:** screenshots can be mistaken, edited, incomplete, or unrelated to the seller's records. Manually comparing a screenshot with a CSV is tedious and duplicate references can be overlooked.

**Value:** reduce manual comparison effort and show evidence for each result, without pretending that a screenshot or CSV match proves settlement.

## 3. Required MVP features — and only these

1. **Upload a screenshot:** accept one PNG, JPG, or JPEG image at a time; show the selected filename and a preview; provide a clear remove/replace action.
2. **Upload a transaction CSV:** parse the file in the browser, show a small preview and row count, and validate that a reference column and amount column can be identified. A date column is optional. Show a helpful error for invalid files or missing required columns.
3. **Extract screenshot text locally:** use Tesseract.js in the browser. Try to identify a transaction reference/UTR-like identifier, amount, and date where visible. Keep extracted values editable so the user can correct OCR mistakes before matching. Do not send uploaded files to a third-party service.
4. **Run transparent matching rules:** compare the confirmed extracted values against the CSV; never let an AI model invent or decide a match.
5. **Show one clear result:** display the status, matched CSV row(s) if any, values compared, and a plain-English reason. Handle ambiguous cases without guessing.
6. **Download a report:** export the screenshot's extracted/corrected fields, status, reason, and relevant CSV row details as a CSV file.
7. **Provide a small sample CSV and run instructions:** make it possible for judges to try the app without private financial data.
8. **Responsive, accessible UI:** clear labels, keyboard-usable controls, readable status text (not colour alone), loading/progress state, and errors that explain how to recover.

## 4. Strictly out of scope

Do **not** build user accounts, a database, payment gateway or bank integrations, live UPI verification, payment sending, automatic WhatsApp/Instagram access, a transaction history service, a mobile app, multi-user roles, subscriptions, admin dashboards, AI chat, fraud scoring, or batch processing of multiple screenshots. Do not make claims such as “payment verified,” “money received,” or “fraud confirmed.” These are not part of this MVP.

## 5. Required technology

- **Next.js App Router + React + TypeScript** — application framework and UI.
- **Tailwind CSS** — styling.
- **Tesseract.js** — local, in-browser OCR.
- **Papa Parse** — CSV parsing.
- **Lucide React** — optional icons, only where useful.
- **Browser Blob/download APIs** — report export.
- **Git and GitHub** — version history and public/private repository as required by the organizer.
- **No database and no dedicated backend for this MVP.** Keep screenshot OCR, CSV parsing, matching, and export in the browser. Do not add an API route unless the owner approves a clearly necessary change.

Use the installed/current stable dependencies created by the project setup. Do not add libraries for features outside this scope. Never commit `.env.local`, tokens, API keys, personal data, real transaction records, or real payment screenshots.

## 6. CSV input contract

The CSV must contain:

- **Transaction reference** — required; accept common headers such as `transaction_reference`, `reference`, `utr`, `upi_ref`, `transaction_id`, or `ref`.
- **Amount** — required; accept common headers such as `amount`, `transaction_amount`, or `paid_amount`.
- **Date** — optional; accept common headers such as `date`, `transaction_date`, or `payment_date`.
- **Status** — optional; include it in the result if present, but do not treat a status value from the CSV as independent bank confirmation.

If headers cannot be identified confidently, show an error with the expected columns. Do not silently guess a mapping. Include a sample CSV in the repository, using fictional records only.

Example:

```csv
transaction_reference,amount,date,status
ABC123456789,499.00,2026-10-28,Completed
XYZ987654321,250.00,2026-10-28,Completed
DEF555666777,499.00,2026-10-27,Pending
```

## 7. Matching and status rules

Normalize references conservatively: trim whitespace, uppercase letters, and remove presentation-only spaces or hyphens. Do not use fuzzy matching to silently choose a transaction. Preserve original values for display.

- **MATCHED TO CSV:** one unique CSV row has the same normalized reference and the same amount. If a usable date exists in both places, display both dates and flag a date difference for review rather than hiding it.
- **AMOUNT MISMATCH:** the reference matches one CSV row, but the amount differs.
- **DUPLICATE REFERENCE:** more than one CSV row contains the same normalized reference. Show all candidates and ask the user to review; do not select one as the definitive match.
- **REFERENCE NOT FOUND:** a usable reference was extracted, but it does not exist in the CSV.
- **AMBIGUOUS — REVIEW REQUIRED:** the screenshot reference is missing/uncertain or evidence does not identify one unique row. Show possible amount/date candidates only as suggestions, never as a confirmed match.
- **OCR NEEDS REVIEW:** essential fields could not be extracted reliably. Let the user correct them and run the check again.

Amount comparisons must use a reliable decimal-to-paise or equivalent integer representation, not floating-point equality. Do not automatically mark amount-only matches as verified. A reference match with an amount mismatch must never be labelled as a successful match.

## 8. Safety, privacy, and honest wording

- Show a visible notice: **“This tool compares a screenshot with the CSV you provide. A match is not proof that money reached your account. Confirm the credit in your trusted bank or payment app.”**
- Process files locally in the browser. Do not upload or persist them, and do not log OCR text or transaction data to the console.
- Clear the selected image, parsed records, extracted fields, and result when the user resets the check or leaves the page; do not claim that browser memory is secure storage.
- Use fictional sample data only. Do not ask users to provide passwords, OTPs, full account details, or other secrets.
- Be explicit that OCR can make mistakes and that users must review extracted fields.
- Never claim to detect fraud or independently verify a payment.

## 9. Minimum UI

One responsive page with these sections, in order:

1. Product title and one-sentence explanation.
2. Visible safety/privacy notice.
3. Screenshot upload and preview.
4. CSV upload, validation message, row count, and small preview.
5. OCR progress and editable extracted reference, amount, and optional date.
6. **Check against CSV** action (disabled until valid inputs exist).
7. Result status, explanation, compared values, and candidate row(s).
8. **Download CSV report** action when a result exists, and **Reset** action.

Keep the design clean and professional. Use a light background, dark readable text, and one restrained teal accent. Prioritize clarity and working behavior over animation or decorative elements.

## 10. Acceptance criteria (definition of done)

- The app starts locally using the instructions in this file.
- A user can upload a supported screenshot and a valid CSV, review/edit OCR output, run a comparison, read an explained status, and download a report.
- Invalid file types, unreadable screenshots, malformed CSV, missing required columns, zero-row CSVs, duplicate references, missing references, and amount mismatches are handled without crashing.
- Matching is deterministic and testable; it does not depend on an LLM.
- The app states the limitation that CSV matching does not prove money was credited.
- No database, secrets, real user data, or unapproved features are introduced.
- `npm run lint` and `npm run build` pass before final submission, where available in the generated project setup.
- README setup steps and a fictional sample CSV are present.
- All feature milestones are committed and pushed to GitHub; final `git status` is checked.

## 11. Four-hour build schedule (deadline: 5:30 PM)

The schedule is a hard scope guard. If time gets tight, preserve the end-to-end working flow and skip polish—not core correctness.

| Time | Deliverable |
|---|---|
| 1:30–1:45 PM | Inspect existing folder, check Node/npm/Git, create/verify Next.js project, initialize/inspect GitHub remote safely. |
| 1:45–2:05 PM | App shell, responsive layout, safety notice, upload controls. Commit. |
| 2:05–2:35 PM | CSV parsing, header validation, preview, fictional sample CSV. Test and commit. |
| 2:35–3:15 PM | Local screenshot OCR and editable extracted fields, progress and error states. Test and commit. |
| 3:15–4:00 PM | Pure, deterministic matching function and required statuses. Add representative tests or a manual test checklist. Commit. |
| 4:00–4:35 PM | Results panel, evidence/reason display, report export, reset behavior. Test and commit. |
| 4:35–5:00 PM | Run through acceptance cases; fix critical bugs only. Commit fixes separately. |
| 5:00–5:15 PM | Finish README/demo steps, screenshot the working app if needed, run lint/build. Commit. |
| 5:15–5:30 PM | Push all commits to GitHub, confirm repository files and latest commit are visible, submit. |

Do not spend the entire session on styling. If OCR integration takes too long, still ship a working manual-correction path and clearly disclose the OCR limitation—never fake a successful result.

## 12. GitHub and commit discipline

- Before editing, inspect the current folder and `git status`; do not overwrite existing work.
- Create a baseline commit after the project skeleton works.
- **Every distinct feature or meaningful bug fix gets its own commit**, after testing that change. Do not combine unrelated features into one commit.
- Suggested commit sequence:
  1. `chore: initialize ProofMatch AI app`
  2. `feat: add screenshot and CSV upload interface`
  3. `feat: parse and validate transaction CSV`
  4. `feat: extract screenshot text locally`
  5. `feat: add deterministic transaction matching`
  6. `feat: show evidence-backed results and export report`
  7. `test: cover reconciliation edge cases`
  8. `docs: finalize setup and demo instructions`
- Stage only the files for the current feature. Review `git diff` before committing.
- Push after each completed feature if the remote is configured and network access is available; otherwise push the queued commits as soon as possible and before submission.
- Do not force-push, rewrite history, commit secrets, or use `git add .` without reviewing what it stages.
- If GitHub authentication or the remote is missing, stop and show the exact command/action needed; never claim that a push succeeded unless the command confirms it.

## 13. Local setup and run

Use the project folder requested by the owner: `/Users/vish/Desktop/Hackathon`.

Before creating or changing files, inspect the folder so existing work is not lost. If it is empty and Node.js/npm are installed, create a Next.js App Router project in that folder using the official interactive project creator, selecting TypeScript, ESLint, Tailwind CSS, App Router, and the `src/` directory. If the folder already contains a project, inspect it and adapt instead of reinitializing it.

Typical commands after project creation:

```bash
cd /Users/vish/Desktop/Hackathon
npm install
npm run dev
```

Open the local URL printed by Next.js (usually `http://localhost:3000`). Before submission, run:

```bash
npm run lint
npm run build
```

Do not assume these commands succeed; check their output and fix blocking issues.

## 14. Demo script (3–4 minutes)

1. Explain the problem: comparing a claimed payment screenshot with the seller's records takes time, and the screenshot alone is not proof of credit.
2. Upload the fictional sample CSV and a demo screenshot prepared with fictional details.
3. Review the OCR fields and correct any misread value.
4. Run the check and explain exactly which reference and amount matched—or why the tool returned mismatch, not found, duplicate, or review required.
5. Download and open the report.
6. Close with the limitation: the app reconciles against user-supplied records; the seller must confirm an actual credit in their trusted payment/banking app.

## 15. Skills needed

The coding agent should handle most implementation, but the owner should be able to explain these basics to judges:

- **React/Next.js:** components, state, event handlers, file inputs, and the app page structure.
- **TypeScript:** types for extracted fields, CSV rows, statuses, and match results.
- **CSV handling:** headers, rows, validation, and malformed input.
- **OCR basics:** OCR extracts text and may misread characters; human review is necessary.
- **Deterministic matching:** exact reference/amount comparison, duplicate handling, ambiguity, and why amount-only matches are not proof.
- **File handling and privacy:** local file processing, object URLs, cleanup, and browser CSV downloads.
- **Testing and debugging:** validate normal and edge cases; read lint/build errors.
- **Git/GitHub:** inspect diffs, commit one feature at a time, push, and verify the remote repository.
- **Product explanation:** clearly communicate the user problem, demo, limitations, and what is original about the workflow.

You do not need to learn or build machine-learning model training, SQL, database administration, bank APIs, or authentication for this MVP.
