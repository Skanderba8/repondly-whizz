# Architecture proposal

## Shape
One Next.js application using TypeScript, Tailwind CSS, and shadcn/ui. Supabase supplies Auth, Postgres, and private object storage. Vitest covers domain logic; Playwright covers browser workflows. Avoid microservices, a separate API service, queues, or a client state framework until a concrete requirement justifies them.

No framework versions are pinned during planning. Choose compatible stable versions and commit one package-manager lockfile during the approved scaffold task.

## Proposed structure (not created yet)
Hosting refinement proposed on 2026-11-02: use Cloudflare Pages Free for a statically exported Next.js interface and Supabase Free for Auth, Postgres, and private screenshots. This replaces the earlier request-time Next.js server approach if approved. Static files contain only the public shell; private data loads after authentication under database/storage RLS.

There are no request-time Server Actions, private server-rendered reads, or Next.js API routes in this mode. Server Components can generate public markup at build time. Use predefined routes with query parameters for runtime record IDs. Add narrowly scoped Supabase Edge Functions only for trusted operations that need them, such as invitations, media validation, or later Telegram ingestion. Never put privileged credentials in the static build.

Cloudflare supports this deployment, although it recommends Workers for full Next.js applications. Reconsider Workers if a concrete feature needs a Next.js server; do not introduce it preemptively.

```text
src/
  app/
    (auth)/                 # Sign-in and invitation flows
    (workspace)/            # Protected employee and management routes
  features/
    performance/            # Period queries, scoring rules, history
    submissions/            # Subscriptions, reviews, evidence
    team/                   # Management insights
    access/                 # Membership and role authorization
  components/ui/            # Shared shadcn/ui primitives
  lib/                      # Small shared utilities, environment validation
    supabase/               # Browser client and typed query helpers
supabase/
  migrations/               # Schema, policies, functions, indexes
  seed.sql                  # Synthetic fixtures only
tests/
  unit/                     # Pure domain behavior, Vitest
  integration/              # Database constraints and authorization
  e2e/                      # Critical user flows, Playwright
```
The seven root Markdown documents remain the planning source of truth. Add feature notes only when a change needs more detail than its PR and tracker entry.

## Data and request boundaries
- Core implementation refinement, 2026-11-02 (D24-D25): `src/features/tracker` supplies the authenticated client UI, runtime Zod response validation, and a bounded in-memory promise cache. Postgres computes monetary aggregates, returns complete selected-period totals and 25-row history pages, and enforces own/manager reads. `shared/bonus-schema.ts` supplies browser and trusted screenshot-endpoint input validation. `supabase/functions/save-review` is a separate Deno target excluded from Next.js TypeScript compilation; its import map pins the same Zod/Supabase versions. Database constraints independently validate DoorDash mutations. Browser clients have no direct business-table writes, imported-report writes, or storage uploads.
- The screenshot endpoint verifies Auth identity and membership, validates fields, limits body/file bytes according to owner configuration, checks supported image signatures/containers, derives ownership and storage paths, and uses a server-only service credential. Retries reconcile a stable request UUID and file hash. An interrupted upload can leave a private unassociated object; retry can resume that exact file, but no automatic orphan deletion/retention policy is invented. Full decoding, metadata stripping, and malware scanning are not implemented. Private signed URLs are fetched on demand and expire after 60 seconds.
- `collector/` is a separate trusted Python process using Telethon, not a request-time Next.js feature or a browser integration. It reads configured assistant messages using the owner's Telegram session and writes only parsed allowlisted CSR rows. Source IDs and work dates are retained; group message bodies are not stored. Identical imports are idempotent; conflicting edits/daily records stop the affected import and require reconciliation. Continuous operation requires an owner-run process; no worker hosting or scheduling has been provisioned.

- For the proposed static deployment, reads and mutations use authenticated Supabase requests. Enforce business validation through database constraints and narrow transactional functions. Browser validation improves UX but is never authoritative. Trusted non-database work uses an authorized Edge Function as needed.
- Supabase RLS is the database authorization boundary. UI visibility and route guards supplement it; they cannot replace it.
- Use the signed-in user's database context for normal operations. Privileged operations require a dedicated server-only path and explicit authorization.
- Do not cache private results across users. Make cache scope and invalidation explicit when introducing caching.
- Start with indexed queries and computed aggregates. Add precomputed totals only after a demonstrated need and a reconciliation strategy.

## Provisional domain model
Auth identities link to profiles and explicitly assigned access roles. Performance records link an employee, type, occurrence time, source, and workflow state. Evidence metadata links records to private object paths. Correction/audit events preserve actor, time, reason, and affected record. Point rule versions or point events may be needed after scoring rules are approved.

This is conceptual, not an approved schema. Approval states, role cardinality, team membership, evidence cardinality, and point accounting depend on DATA_RULES.md. Future Telegram ingestion maps validated input into the same domain boundary, with source IDs and duplicate protection.

## Initial navigation proposal
- Overview: personal performance with one daily/weekly/monthly period selector and quick submission access.
- Activity: own subscription/review records and history with filters. Use an accessible add form adapted to mobile and desktop.
- Team: permitted management summaries and employee drill-down.
- Administration: authorized account/access management; introduce configuration screens only when needed.

Use one shared responsive shell with role-appropriate navigation. Overview and Activity form the initial employee experience. Supabase enforces access regardless of which links are visible. Rankings, targets, approval queues, and peer visibility remain undecided.

## Speed and feedback contract
- Keep navigation mounted across routes. Fetch independent queries concurrently; avoid request chains and whole-page reloads after saves.
- Add one server-data cache layer when authenticated reads begin. Scope keys by identity, permissions, period, and filters; clear on sign-out/account changes. Choose its library then, without a separate global state framework.
- Reuse cached data on revisits, refresh in the background, and refresh affected queries after writes. Refresh other users' changes on focus initially; add realtime only for a concrete need.
- Show pending feedback immediately, prevent duplicate sends, and preserve form input on failure. Show “Saved” only after Supabase confirms persistence. Optimistic entries must be marked pending and rolled back on failure. Authoritative points are calculated in Postgres.
- Return updated records/totals from the same transactional operation where practical. Define safe retries and duplicate constraints after business rules are approved.
- Index employee/date filters, paginate history, select required fields, and lazy-load charts/screenshots. Compress evidence to an agreed readable size before upload; enforce trusted checks separately.
- Proposed measurement targets on an agreed representative device/network: visible interaction feedback within 100 ms, cached navigation within 200 ms, useful initial dashboard within 2 seconds, and ordinary non-upload saves confirmed within 1 second at p95. These are targets requiring verification, not guarantees. Uploads depend on connection and file size.
- Confirm where the team works before selecting the Supabase region, balancing latency and data-residency needs.

## Free-tier operating envelope
Owner constraint: $0 recurring service costs beyond the existing domain renewal. Do not enable paid plans or add-ons without approval. Free quotas and availability do not guarantee indefinite zero-cost operation.

Supabase currently includes a 500 MB database, 1 GB file storage, and 5 GB uncached egress; projects can pause after one week of inactivity. Screenshot storage is the likely capacity constraint for this team. Illustrative calculation only: 12 users x 5 screenshots/day x 200 KB is about 360 MB per 30 days before overhead. Agree volume, compression, and retention before shipping uploads; never silently delete evidence to meet quota.

Supabase's default SMTP only sends to project team addresses. Select a suitable free SMTP provider or an approved controlled onboarding/recovery approach before auth ships. Do not make employees project administrators to bypass this restriction. Free automatic database backups are not included; agree secure exports and restore procedures before release.

Sources checked 2026-11-02: [Cloudflare static Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Next.js exports](https://nextjs.org/docs/app/guides/static-exports), [Supabase pricing](https://supabase.com/pricing), [SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp). Exclude Vercel Hobby because its [plan](https://vercel.com/docs/plans/hobby) is limited to personal, non-commercial use.

## Security and operations
- Invite-only onboarding; no public signup. Role assignment cannot be changed by employees.
- Enable least-privilege RLS on every exposed table, plus storage policies. Exercise allow and deny cases for each agreed role.
- Keep evidence in private buckets. Authorize short-lived signed URLs; avoid exposing screenshots in logs, analytics, or fixtures.
- Validate upload ownership, size, and allowed media types. Verify content server-side; define failed-upload cleanup and sensitive-content handling before enabling uploads.
- Keep secrets in environment configuration; commit only placeholder names. Never expose service credentials in browser code.
- Validate environment configuration; use separate development and production data. Production provisioning and deployment are separate approvals.
- Redact logs and errors. Record critical access/configuration changes and performance corrections without copying sensitive evidence.
- Before production, define backup/restore ownership, retention, recovery procedure, and deployment rollback. Prefer backward-compatible migrations; review destructive migrations explicitly.

## Verification requirements
- Vitest: approved scoring examples, period boundaries, validation, rounding, duplicate handling, and corrections when those rules exist. Avoid tests that merely mirror component markup.
- Database integration: constraints and RLS/storage permissions with signed-out, employee, manager, and admin identities; include cross-employee denial and privilege-escalation attempts.
- Playwright: invitation/sign-in, manual submission with evidence, personal history, management access, and denied access. Include a representative mobile viewport, keyboard navigation, and meaningful failure states.
- Planned CI baseline: lint, TypeScript, unit tests, database policy integration tests, production build, and focused Playwright tests as the relevant capabilities are introduced. Choose the CI provider during scaffold setup.
- This phase runs no checks. Under the current owner preference, agents prepare relevant coverage but do not execute checks unless requested. Owner verification or an agreed automated gate is required before calling a milestone verified.
