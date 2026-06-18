# Repository State Correction

Date: 2026-06-18
Repository: `joelhjert-tech/helpers`

## Correction

The first cutscene-maker analysis report said the repository was empty. That statement should not be treated as confirmed truth.

What happened:

- GitHub connector metadata reported repo size `0` and default branch `main`.
- The connector could not enumerate the root directory tree.
- The saved report file can now be read at `reports/cutscene-maker-analysis-report.md`.
- A direct probe confirms `reports/` is a directory on `main`.
- Direct probes for `apps`, `docs`, `.github`, and `package.json` returned not found on `main` through the connector.

Because the user sees several folders in the GitHub browser, Codex must not rely on the earlier "empty repo" claim.

## Correct working assumption

Treat the repository tree as **not fully verified** until Codex runs a local clone and lists the root folders directly.

Codex should run:

```bash
git clone https://github.com/joelhjert-tech/helpers.git
cd helpers
git status
git branch --show-current
find . -maxdepth 2 -type d | sort
find . -maxdepth 2 -type f | sort
```

Then Codex should update the implementation plan based on the real folder tree.

## Updated instruction for Codex

Before creating or moving files, inspect the existing repository structure. Do not assume the repo is empty. Preserve any existing helper apps, folders, schemas, scripts, docs, and reports.

Build the cutscene maker around the existing structure if folders already exist. Only create new folders when they are missing.

Priority remains the same:

1. Make a structured cutscene project save format.
2. Build a typed timeline model.
3. Add validation before export.
4. Compile to Stardew event strings.
5. Export Content Patcher JSON.
6. Save separate test reports.

## Practical repo rule

From now on, any repo analysis report must include the exact command output used to identify folders. No report should say "empty" unless a real tree listing proves it.
