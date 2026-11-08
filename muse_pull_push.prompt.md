# Pull, resolve, push

You are running headless inside the IronFlight game repository (your current
working directory — verify with `git rev-parse --show-toplevel` and do all
work there). There is no user to ask: decide yourself, and if you cannot
proceed safely, report failure (see below) instead of guessing.

## Goal

1. If the tree already has an in-progress merge (`git ls-files --unmerged`
   shows entries), skip straight to step 2 — the caller already tried a
   plain pull. Otherwise `git pull --no-rebase --no-edit origin main`.
2. If the pull reports merge conflicts, resolve every conflicted file
   SEMANTICALLY (see below), verify, and complete the merge.
3. Stage and commit any remaining changes exactly like push.cmd does:
   `git add --all`, and only if `git diff --cached --quiet` reports
   differences, `git commit -m "Update game files"`.
4. `git push origin HEAD:main`.

## Semantic conflict resolution

- List conflicted files with `git ls-files --unmerged` (dedupe paths).
- For each file, inspect all three stages (`git show :1:path`, `:2:path`,
  `:3:path`) plus the working tree, and understand what each side
  intended. Combine non-overlapping changes; for overlapping logic,
  reason about which behavior (or union of behaviors) is correct for
  this game. Never just pick one side or delete markers blindly.
- After resolving, verify: `git ls-files --unmerged` is empty AND
  `git grep -n "^<<<<<<< "` finds nothing. Then run `npm run check`
  (full unit suite + typecheck + build) and fix any failure your
  resolution introduced. Do NOT weaken or delete tests. Known
  pre-existing failure, do not chase it: the dungeon five-minute
  timing test fails on main (272s vs 225s feasibility).
- If any conflict is genuinely ambiguous (you cannot determine the
  correct behavior with high confidence), STOP: do not commit the
  resolution, do not push, leave the tree in place for the user, and
  report FAIL listing the ambiguous files.
- On success, `git add --all` and complete the merge with
  `git commit --no-edit`.

## Progress output

The caller shows your console output live, but long quiet stretches
look like a stall. After every stage, print a progress line with a
shell echo so it streams to the console: pull done (or skipped),
conflicts found with the file list, each file as you resolve it,
verification results, commit done, push done. Prefix every marker
with `MUSE-PROGRESS:`, e.g.
`echo MUSE-PROGRESS: resolved src/view.ts (2 of 5)`.

## Status report (REQUIRED, always the last step)

Write `%TEMP%\muse-pull-push.status` (expand %TEMP% in your shell) whose
FIRST line is exactly `OK` or `FAIL`, followed by a short summary: what
was pulled, which files you resolved (if any), and the push result.
Write this file even when you fail: a missing status file is treated
as failure by the caller.

## Dry-run mode

Before doing anything, check whether `%TEMP%\muse-pull-push.dryrun`
exists (expand %TEMP% in your shell). If it does, you are in DRY-RUN
mode and MUST NOT write anything: no pull, push, commit, add, merge,
checkout, or file edits anywhere in the repository (scratch files
under %TEMP% are fine). `git fetch origin main` is allowed so you can
inspect remote objects; use `git status`, `git log`, and
`git merge-tree` to predict exactly what the pull would bring in and
which files would conflict. Draft every conflict resolution in your
report (and temp files if useful) but apply none of them, and skip
`npm run check` (read-only analysis only). Still finish by writing
the status file: first line `OK` with a summary of what a real run
would do, or `FAIL` with blockers.
