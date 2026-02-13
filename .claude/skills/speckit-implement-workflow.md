---
name: speckit-implement-workflow
description: >
  Workflow rules for /speckit.implement execution, PR creation, branch naming conventions,
  and phase-based implementation. Use when executing speckit implement tasks, creating PRs,
  or discussing branch naming strategies for this project.
---

## /speckit.implement Workflow

Follow this workflow when executing tasks with the `/speckit.implement` command:

### Common Rules

#### Branch Naming

Use the format `phase/PX-phase-name` (e.g., `phase/P1-project-setup`)

#### Implementation

- Check the repository's issue list for the relevant phase before starting work, and use `Closes #<issue-number>` when creating the PR
- Follow test-first development (TDD)
- Split commits into appropriate granularity (e.g., per task)
- When fixes are needed, create fixup commits with `git commit --fixup <target-commit>` and squash them with `git rebase -i --autosquash` before creating the PR

#### PR Creation

After completing a phase, create a PR with the following settings:

- **Base branch**: `main`
- **Assignee**: `akihiro-tj`
- **Labels**: Select appropriate labels based on the phase content
  - `enhancement`: New features or improvements
  - `bug`: Bug fixes
  - `documentation`: Documentation-related
  - `refactor`: Refactoring
  - `test`: Test-related
- **Title**: Use conventional commit format (e.g., `feat(P1): setup project infrastructure`)
- **Body**: Write in Japanese, include `Closes #<issue-number>` for all issues in the phase to auto-close related issues on merge

```bash
gh pr create \
  --title "feat(PX): description" \
  --body "## Summary\n\n...\n\nCloses #1\nCloses #2\nCloses #3" \
  --assignee akihiro-tj \
  --label <appropriate-label>
```

### Phase Execution

```bash
git checkout main && git pull origin main
git checkout -b phase/P1-project-setup
# Implement all tasks in the phase → Create PR
```
