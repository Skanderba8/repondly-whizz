# Roadmap and progress

Status: **Complete**, **In progress**, **Blocked**, **Upcoming**. Completion means criteria are met and verification evidence is recorded; documenting a plan does not complete implementation.

| ID | Milestone | Status | Completion criteria / dependency |
| --- | --- | --- | --- |
| P0 | Inspect repository and write planning baseline | Complete | Empty repository inspected; seven planning documents created; unresolved rules recorded. Owner approval pending. |
| M1 | Scaffold and tooling | In progress | Foundation implemented on `feat/app-foundation`: Next.js static export, TypeScript, Tailwind/shadcn, lazy Supabase client, npm lockfile, Vitest/Playwright coverage, manual CI, and responsive preview shell. Owner verification pending; no checks or server run by the agent. |
| M2 | Access policy specification | In progress | D17-D19 approve pre-created accounts, employee/manager roles, team-wide manager access, employee pending edits, and optional accept/deny notes. Offboarding, deletion, self-approval, and correction details remain unresolved. |
| M3 | Authentication and authorization foundation | In progress | Login/logout slice delivered on `feat/account-auth`: verified session gate, employee/manager role lookup, owner-assigned membership migration with self-read RLS, failure states, and setup instructions. Migration and hosted Auth settings are unapplied. Owner checks and database policy verification pending; business-data policies are deferred. |
| M4 | Manual record and evidence contract | Upcoming | Owner resolves required fields, evidence, timestamps, duplicates, review states, corrections, and deletion rules; sample valid/invalid records approved. Can be planned alongside M2. |
| M5 | Manual submission vertical slice | Upcoming | Depends on M3/M4: subscription and review submissions, private uploads, personal record list, validation and failure states; integration/e2e coverage and owner checks satisfy the agreed contract. |
| M6 | Scoring and reporting specification | Upcoming | Owner approves formulas, timezone, period cutoffs, rounding, reversals, rule changes, and worked sample totals. Can be planned before M5 finishes. |
| M7 | Personal performance and history | Upcoming | Depends on M5/M6: versioned scoring approach, daily/weekly/monthly totals, source traceability, approved history behavior; boundary and correction examples reconcile; owner approves employee screen. |
| M8 | Management insights | Upcoming | Depends on M7 and approved management metrics: team summaries and permitted drill-down reconcile with employee views; role checks and responsive flows verified; owner approves management screen. |
| M9 | Release readiness | Upcoming | Core acceptance criteria verified; accessibility and mobile review; retention, backup/restore, logging, production configuration, and rollback documented and exercised as agreed; explicit deployment approval before release. |
| M10 | Telegram import discovery | Upcoming | Later phase: authorized sample report format, source access, matching, duplicate, conflict, retry, and reconciliation rules approved; separate implementation milestones drafted. |

## Current work queues
- **Design refresh, 2026-11-02:** Owner authorized redesigning existing screens and establishing reusable UI patterns before further workflows. Scope: shared tokens/primitives, responsive shell, Overview, Activity, login, access/loading/error states, and appearance. Both existing roles retain the same access boundaries. Acceptance: DESIGN.md palette and geometry, consistent keyboard/focus behavior, no invented data or workflow controls, and documented future-edit conventions. Owner verification covers desktop/mobile navigation, appearance persistence, login/logout, loading, denial, and failure states. No checks will be run by the agent.
- **Design refresh delivery:** UI changes implemented on `codex/whizz-ui-redesign`; owner verification pending. Added shared headings/panels/access frame/brand, lime light/dark tokens, Geist, consistent controls and unavailable states, account appearance menu, collapsible sidebar, and mobile modal navigation. Future-edit rules are recorded in AGENTS.md and DESIGN.md section 12. Self-review considered retained auth boundaries, truthful unavailable data, shared component ownership, responsive layout, and keyboard semantics. No automated checks, servers, browser runs, diff checks, inline checks, or performance measurements were executed. M1/M3 and design acceptance remain unverified.
- **Completed:** repository inspection and planning document creation (P0).
- **In progress:** account login/logout implementation delivered under D17-D19; M1 remains awaiting owner verification, M2 is partially resolved, and M3 remains unverified. No checks or server were run.
- **Blocked:** business features await remaining data rules. Cloudflare deployment/domain setup is unfinished.
- **Upcoming:** owner applies the membership migration, disables public signup, creates synthetic accounts and assigns roles, then verifies auth using `supabase/README.md`. M1 verification and remaining M2 decisions are still required. GitHub Actions remains manual-only.

## Authentication slice acceptance and delivery: 2026-11-02

The active implementation slice is login/logout for pre-created accounts, not the complete M3 milestone. Accepted behavior: signed-out routes show login; verified accounts with an explicitly assigned employee/manager role enter the shell; missing roles deny entry; loading and failures hide content; logout clears the current browser session. No signup, reset, submissions, or approval controls are introduced. The membership migration permits only self-read from authenticated browsers and denies role writes.

Prepared coverage: signed-out entry and refresh on both existing routes. Manual role isolation, privilege escalation, login/logout, session failure, and dashboard setup cases are documented in `supabase/README.md`. No automated checks, browser runs, migration execution, or hosted configuration were performed. Self-review addressed role assignment boundaries, stale auth results, privacy, semantic form labels, and recoverable failures; owner review and verification remain required. No milestone is declared complete.

## Exact first implementation task
After owner approval, execute **M1 only**: initialize a single Next.js App Router project with strict TypeScript, Tailwind, and shadcn/ui; choose and lock compatible dependencies; configure lint, Vitest, Playwright, and baseline CI; add non-secret environment examples and a minimal neutral application shell. Do not implement authentication, dashboards, scoring, uploads, Telegram integration, or provision services in that task.

M1 completion requires an owner-verified clean install, type/lint/build checks, a meaningful test of the shell's accessible navigation, and a browser smoke test. Agents do not run those checks under the current execution preference. Record pending checks rather than claiming success.

## Updating this tracker
At each feature start, record its status, acceptance criteria, and any owner question. At delivery, record changed scope, verification evidence or skipped checks, and remaining work. Keep one active implementation milestone at a time; split a milestone if it cannot be reviewed independently.
