--- Cursor Command: fast-forward-merge.md ---
Fast-forward merge current branch into target branch (default: main).
Checks if fast-forward is possible, then merges.
If not possible, suggests rebase first.
--- End Command ---

## Workflow

1. **Check current branch status**
   - Verify working tree is clean
   - Fetch latest from origin

2. **Validate fast-forward possibility**
   - Check if target branch (default: main) is ancestor of current branch
   - If target has commits not in current branch, fast-forward is NOT possible

3. **Execute merge**
   - If fast-forward possible: `git checkout <target>` then `git merge --ff-only <current-branch>`
   - If not possible: Suggest rebase first: `git rebase <target>`

4. **Push merged branch**
   - Push target branch to origin

## Safety Checks
- Working tree must be clean
- Current branch must be pushed to origin
- Target branch must exist
- Fast-forward only (no merge commits)
