# Pull, resolve, push

You are running headless inside the IronFlight game repository (your current
working directory — verify with `git rev-parse --show-toplevel` and do all
work there). There is no user to ask: decide yourself, and if you cannot
proceed safely, report failure (see below) instead of guessing.

## Goal

1. `git pull --no-rebase --no-edit origin main`
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

## Status report (REQUIRED, always the last step)

Write `%TEMP%\muse-pull-push.status` (expand %TEMP% in your shell) whose
FIRST line is exactly `OK` or `FAIL`, followed by a short summary: what
was pulled, which files you resolved (if any), and the push result.
Write this file even when you fail: a missing status file is treated
as failure by the caller.
