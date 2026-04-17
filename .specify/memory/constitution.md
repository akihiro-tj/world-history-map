<!--
Sync Impact Report
- Version change: (uninitialized template) → 1.0.0
- Rationale: First ratified version. Principles express durable values and
  posture; concrete thresholds, tool names, and file conventions are
  deliberately delegated to spec/plan/ADR so the constitution stays stable
  across tooling and architectural evolution.
- Principles defined (initial set):
  1. Specification-Driven Change
  2. Automated Quality Gates
  3. Behavior-First Testing
  4. Consistent User Experience
  5. Performance as a Budget
- Added sections: Engineering Constraints; Development Workflow
- Removed sections: none (template slots renamed)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check + Complexity
    Tracking already accommodate the abstract principles below)
  - ✅ .specify/templates/spec-template.md (Success Criteria carries concrete
    measurable thresholds per-feature, as intended)
  - ✅ .specify/templates/tasks-template.md (Polish phase accommodates
    quality/a11y/performance cross-cutting work)
- Deferred TODOs: none
-->

# world-history-map Constitution

## Core Principles

### I. Specification-Driven Change

Any change with user-observable impact MUST originate from a written
specification and a plan that reference this constitution. The specification
captures *what* and *why*; the plan captures *how*. Significant design
decisions MUST be preserved as durable rationale at the moment of decision —
not reconstructed later.

**Rationale**: This project spans multiple loosely-coupled runtimes. Without
a spec-first discipline, decisions evaporate into commit history and
assumptions drift between components. Durable rationale is what lets a
future reader — including our future selves — trust the system.

### II. Automated Quality Gates

Code quality is enforced by automated gates, not by reviewer attention.
Formatting, linting, type-checking, and tests MUST all be runnable with a
single command locally and MUST be the same gates that block merge. Waivers
to any individual rule MUST be localized and accompanied by the reason for
the waiver.

Naming, file layout, and language discipline (which language is used for
code, documentation, specs, and UI copy respectively) MUST be codified in
project documentation and MUST be mechanically enforceable wherever
possible.

**Rationale**: A gate that depends on human vigilance fails silently under
fatigue or context-switching. Only gates that fail loudly and automatically
hold their shape over time.

### III. Behavior-First Testing

User-observable behavior MUST be expressed as a failing test before the
implementation that satisfies it is written. Tests describe the contract;
implementation satisfies the contract. Test granularity follows the shape
of the behavior being tested — not a uniform rule applied to every line.

Exempt from behavior-first authoring: dependency upgrades without behavior
change, formatting-only edits, and exploratory spikes that are discarded or
re-entered through the spec loop before merge.

**Rationale**: Tests written after the fact codify what the code happens to
do, not what it was meant to do. Writing the test first forces the intent
to be articulated while it is still negotiable.

### IV. Consistent User Experience

User experience is a shared asset, not a per-screen reinvention.
Cross-cutting UX properties — component vocabulary, interaction patterns,
accessibility baseline, localization posture — MUST be defined once and
reused everywhere. Deviation requires an explicit reason recorded against
the deviating feature, not a silent local override.

Accessibility is a floor, not a goal: features that regress accessibility
MUST NOT merge.

**Rationale**: The product's core value is reducing friction for learners.
Inconsistent controls, inaccessible widgets, or locale-leaking copy
directly undercut that value, and the damage compounds as surface area
grows.

### V. Performance as a Budget

Performance is declared up front as a budget, not rescued after the fact as
a polish task. Each feature plan MUST state the performance dimensions it
can plausibly affect and the budget it commits to. Regressions against a
committed budget MUST be quantified and either fixed before merge or
explicitly accepted with written justification.

Budgets are expressed in terms the user or operator experiences (perceived
latency, delivery SLO, cost envelope), not in terms of internal
implementation details.

**Rationale**: Without a pre-declared budget, performance degrades
silently one commit at a time. Making the budget a required input of the
plan ensures the trade-off is conscious.

## Engineering Constraints

The following constraints apply across every feature, independent of which
component is being modified.

- **Architectural decisions**: Choices that constrain future change — new
  runtime, new external dependency, new data-flow direction, new
  persistence boundary — MUST be recorded as durable rationale at the time
  of adoption. Such choices MUST NOT be smuggled in alongside unrelated
  feature work.
- **Data-flow integrity**: The direction and source-of-truth of each data
  pipeline are load-bearing. Alternate paths, shortcuts, or runtime
  fallbacks that bypass the documented flow MUST NOT be introduced.
- **Secret management**: Secrets MUST reside in mechanisms designed to hold
  them. They MUST NOT appear in source, in specs, in plans, or in commit
  messages.
- **Living documentation**: Reference documentation that describes *the
  current state* of the system MUST be re-synced before a branch merges if
  the branch invalidates it. Specification documents for shipped features
  are archival and are NOT retroactively edited.

## Development Workflow

Features move through a fixed progression: specification → clarification
(where needed) → plan → tasks → implementation → verification → review →
merge → documentation sync. Each stage produces a durable artifact, and
each stage MUST confirm alignment with this constitution before advancing.

- The plan MUST include a Constitution Check that names any principle the
  feature places under tension and the resolution (waiver under Complexity
  Tracking, or conformance approach).
- Verification is complete only when every automated gate passes locally
  on the final commit and again in CI.
- Commits are granular, atomically reviewable, and written in a form that
  preserves intent rather than narrating the authoring session.
- Review MUST check both correctness against the spec and conformance to
  this constitution. Accepted violations MUST be logged against the
  feature, not absorbed silently.

## Governance

This constitution supersedes any conflicting convention found elsewhere in
the repository. Where runtime-guidance documents (such as the repository's
agent instructions) and this constitution overlap, both MUST express the
same intent; if they drift, the constitution is authoritative and the
dependent document MUST be reconciled in the same change.

**Amendment procedure**: Changes to this file MUST be proposed in a
dedicated change that touches no feature code, MUST state the added /
removed / altered principles and the semver bump rationale, and MUST carry
through any dependent template or documentation update in the Sync Impact
Report above.

**Versioning policy**:

- **MAJOR**: a principle is removed, or its normative meaning is changed in
  a way that invalidates existing features' conformance claims.
- **MINOR**: a new principle is added, or an existing principle is
  materially expanded in scope.
- **PATCH**: clarifications, typo fixes, or wording refinements that do not
  change normative meaning.

**Compliance review**: Conformance is checked on every feature change as
part of the standard review flow. Accepted deviations live in the feature's
plan under Complexity Tracking, not in private knowledge.

**Version**: 1.0.0 | **Ratified**: 2026-04-17 | **Last Amended**: 2026-04-17
