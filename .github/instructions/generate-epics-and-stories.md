# Generate Epics and Stories

Self-contained prompt. Runs fully headless — **never ask questions, never
wait for approval, never show menus**. Complete all steps in one run.

Invoke with:

```bash
qwen -p "Read and follow .github/instructions/generate-epics-and-stories.md exactly. Input file: <path-to-prose-epic-file>"
```

## Purpose

Hand it a prose description file. It produces:

1. One Epic breakdown document (format defined below).
2. One story file per implementation unit (format defined below), in the
   mandated triple ordering.

A human reviews the output. Dark Factory 2 (implementation) consumes the story
files separately.

## Inputs

| Input | Location |
|---|---|
| Prose Epic file (each `##` section = one Epic) | provided at invocation |
| Architecture spine | `_bmad-output/planning-artifacts/architecture/**/ARCHITECTURE-SPINE.md` |
| PRD | `_bmad-output/planning-artifacts/prds/**/prd.md` |
| UX design | `_bmad-output/planning-artifacts/ux-designs/**/DESIGN.md` and `EXPERIENCE.md` |

All four context documents are FINAL. Cite ADs and FRs from them in the
generated files. Do not modify them.

## Outputs

| Output | Location |
|---|---|
| Epic breakdown document | `_bmad-output/planning-artifacts/epics.md` (append new epics; do not destroy existing content) |
| Story files | `_bmad-output/implementation-artifacts/stories/epic-{N}/{N}.{M}-kebab-title.md` |

## Workflow

1. Read the input prose file. Each `##` section is one Epic. Preserve its
   section order as Epic numbering (existing epics in epics.md keep their
   numbers; new epics continue the sequence).
2. Read all four context documents. Extract the ADs and FRs relevant to each
   Epic.
3. For each Epic, derive implementation units. One unit = one coherent,
   independently completable change a single dev agent can finish.
4. Append the Epic breakdown (format below) to epics.md.
5. Write story files (format below) with the mandated triple ordering.
6. Print a final report: epic count, story count, all file paths written.

## Epic Breakdown Document Format

Append to `_bmad-output/planning-artifacts/epics.md`. Follow this structure
exactly. One block per Epic (N), one subsection per story (M).

```markdown
## Epic {N}: {epic_title}

{epic_goal — one paragraph: what users can accomplish after this Epic}

**ADs covered:** AD-x, AD-y
**FRs covered:** FR-x, FR-y

### Story {N}.{M}: {story_title}

As a {user_type},
I want {capability},
So that {value_benefit}.

**Acceptance Criteria:**

**Given** {precondition}
**When** {action}
**Then** {expected_outcome}
**And** {additional_criteria}
```

Rules:

- Number epics in the order they appear in the prose file (continuing after
  any existing epics already in epics.md).
- `epic_goal` states the user outcome, not the technical approach.
- AC uses Given/When/Then/And, each line independently testable.
- Preserve verbatim any pointer embedded in the prose section — commit URLs,
  file paths, code snippets, constraint statements. Do not paraphrase them.
- Do not create tables/entities "up front" — each story owns only what it
  needs.

## Story File Format

One file per implementation unit:
`_bmad-output/implementation-artifacts/stories/epic-{N}/{N}.{M}-kebab-title.md`

Follow this structure exactly:

```markdown
# Story {N}.{M}: {story_title}

Status: {status}

## Story

As a {role},
I want {action},
so that {benefit}.

## Acceptance Criteria

1. {specific, testable criterion}
2. {criterion}

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Dev Notes

- Architecture patterns and constraints that apply (cite ADs)
- Source tree components to touch (exact paths)
- Testing standards that apply
- Verbatim pointers preserved from the Epic prose (commit URLs, file paths,
  constraint statements)

### Project Structure Notes

- Alignment with the existing project structure (paths, modules, naming)
- Any conflicts or variances, with rationale

### References

- [Source: <path>#section] for every technical detail

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
```

Rules:

- The dev agent will have ONLY this file to implement from. It must be
  self-contained: every path, library, constraint, and pointer it needs.
- Preserve verbatim any pointer from the Epic prose (commit URLs, file paths,
  constraint statements). Never paraphrase a pointer.
- Cite ADs and FRs from the spines; cite exact source paths in References.
- Sized for a single dev agent session. No dependency on a future story.

## Story Ordering and Status (mandatory)

Every Epic's stories are emitted in a fixed triple ordering, numbered
consecutively within the Epic. This is non-negotiable.

| Order | Story kind | `Status` value |
|---|---|---|
| 1st | Unit tests for the change (red-phase TDD scaffold) | `skip` |
| 2nd | Implementation of the change | `ready-for-dev` |
| 3rd | e2e test for the change (only if the change is user-visible) | `ready-for-dev` |

Rules:

- The `skip` status is a placeholder: the unit-test story is written and
  committed, but its implementation is intentionally deferred. Dark Factory 2
  fills it in at implementation time. Do not leave it blank or as `TODO`.
- The e2e story is present ONLY when the Epic produces user-visible behavior.
  If a change is internal-only (e.g. pure data seeding with no UI), emit just
  the 1st and 2nd stories.
- A single Epic may contain several triples (multiple implementation units).
  Number them in order: `N.1` (unit), `N.2` (impl), `N.3` (e2e), then
  `N.4` (next unit's unit tests), `N.5`, `N.6`, …
- The unit-test story (status `skip`) references the exact test files and
  cases that the implementation story must make pass. The implementation
  story's acceptance criteria must be consistent with those tests.

## Headless Rules (non-negotiable)

- Never ask the user a question. Never present a menu. Never wait for
  approval. Never say "shall I proceed".
- Make every reasonable judgment call yourself using the four context
  documents. When ambiguous, pick the option that best matches existing
  project conventions and note the rationale in the relevant story's Dev
  Notes.
- If a context document is missing, report the missing path in the final
  report and continue with what is available. Do not halt.
- All file writes are small and incremental (one file per write). Do not
  attempt a single large multi-file write.

## Final Report

After all files are written, print:

- Epic count and their numbers/titles.
- Story count, grouped by Epic, with each story's number, title, and status.
- The exact absolute path of every file written or modified.
- Any context document that was missing, and any judgment call made under
  ambiguity (with the story it affects).
