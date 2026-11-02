# Roadmap and progress

Status: **Complete**, **In progress**, **Blocked**, **Upcoming**. Completion means criteria are met and verification evidence is recorded; documenting a plan does not complete implementation.

| ID | Milestone | Status | Completion criteria / dependency |
| --- | --- | --- | --- |
| P0 | Inspect repository and write planning baseline | Complete | Empty repository inspected; seven planning documents created; unresolved rules recorded. Owner approval pending. |
| M1 | Scaffold and tooling | In progress | Foundation implemented on `feat/app-foundation`: Next.js static export, TypeScript, Tailwind/shadcn, lazy Supabase client, npm lockfile, Vitest/Playwright coverage, manual CI, and responsive preview shell. Owner verification pending; no checks or server run by the agent. |
| M2 | Access policy specification | Upcoming | Owner approves invite lifecycle, role matrix, team scope, evidence visibility, and offboarding behavior; allow/deny examples documented. No scoring dependency. |
| M3 | Authentication and authorization foundation | Upcoming | Depends on M1/M2: migrations, invite-based auth, protected shell, RLS and role assignment; policy tests cover all roles and cross-user denial; owner verifies sign-in and access. |
| M4 | Manual record and evidence contract | Upcoming | Owner resolves required fields, evidence, timestamps, duplicates, review states, corrections, and deletion rules; sample valid/invalid records approved. Can be planned alongside M2. |
| M5 | Manual submission vertical slice | Upcoming | Depends on M3/M4: subscription and review submissions, private uploads, personal record list, validation and failure states; integration/e2e coverage and owner checks satisfy the agreed contract. |
| M6 | Scoring and reporting specification | Upcoming | Owner approves formulas, timezone, period cutoffs, rounding, reversals, rule changes, and worked sample totals. Can be planned before M5 finishes. |
| M7 | Personal performance and history | Upcoming | Depends on M5/M6: versioned scoring approach, daily/weekly/monthly totals, source traceability, approved history behavior; boundary and correction examples reconcile; owner approves employee screen. |
| M8 | Management insights | Upcoming | Depends on M7 and approved management metrics: team summaries and permitted drill-down reconcile with employee views; role checks and responsive flows verified; owner approves management screen. |
| M9 | Release readiness | Upcoming | Core acceptance criteria verified; accessibility and mobile review; retention, backup/restore, logging, production configuration, and rollback documented and exercised as agreed; explicit deployment approval before release. |
| M10 | Telegram import discovery | Upcoming | Later phase: authorized sample report format, source access, matching, duplicate, conflict, retry, and reconciliation rules approved; separate implementation milestones drafted. |

## Current work queues
- **Completed:** repository inspection and planning document creation (P0).
- **In progress:** M1 foundation, authorized by the owner; implementation delivered for owner checks.
- **Blocked:** authentication and business features await their permission and data-rule decisions. Cloudflare deployment/domain setup is unfinished.
- **Upcoming:** owner verification of M1; M2 access policy decisions, followed by authentication. GitHub Actions is manual-only until the owner enables automatic checks.

## Exact first implementation task
After owner approval, execute **M1 only**: initialize a single Next.js App Router project with strict TypeScript, Tailwind, and shadcn/ui; choose and lock compatible dependencies; configure lint, Vitest, Playwright, and baseline CI; add non-secret environment examples and a minimal neutral application shell. Do not implement authentication, dashboards, scoring, uploads, Telegram integration, or provision services in that task.

M1 completion requires an owner-verified clean install, type/lint/build checks, a meaningful test of the shell's accessible navigation, and a browser smoke test. Agents do not run those checks under the current execution preference. Record pending checks rather than claiming success.

## Updating this tracker
At each feature start, record its status, acceptance criteria, and any owner question. At delivery, record changed scope, verification evidence or skipped checks, and remaining work. Keep one active implementation milestone at a time; split a milestone if it cannot be reviewed independently.
