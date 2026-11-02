# Decision log

State labels: **Confirmed** means supplied by the owner; **Proposed** awaits approval; **Deferred** means intentionally undecided.

| ID | State | Decision and rationale |
| --- | --- | --- |
| D01 | Confirmed | Product working name: Whizz Repondly. Owner already holds `repondly.com` on Cloudflare. Audience is approximately 12 support employees and their manager. |
| D02 | Confirmed | This phase is repository inspection and planning only. Application coding awaits explicit approval. |
| D03 | Confirmed | Target stack: Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, Vitest, Playwright. |
| D04 | Proposed | One application and one Supabase backend, with feature-oriented modules. Keeps deployment and maintenance proportionate to team size. |
| D05 | Proposed | Invite-only access, database-enforced authorization, private evidence storage, and server-validated mutations. Fits a private employee workspace. |
| D06 | Confirmed | Use anonymized/sample data until real-data access is authorized. Synthetic fixtures are the default. |
| D07 | Confirmed | Manual records precede Telegram import. The integration belongs to a later phase. |
| D08 | Deferred | Scoring, reporting periods, detailed permissions, evidence rules, approvals, retention, and corrections await owner decisions in DATA_RULES.md. |
| D09 | Deferred | Hosting, region, package manager, stable dependency versions, CI provider, and domain connection are not selected. No provisioning or DNS changes in planning. |
| D10 | Confirmed | Agents do not run dev servers, server/diff/inline checks; owner checks changes. Other test execution requires a request. Report unexecuted verification explicitly. |

For new decisions, add an ID, state, date when resolved, rationale, and affected milestones. Preserve superseded choices with a replacement reference instead of silently rewriting business history.

## Structure discussion: 2026-11-02
- **D16, Confirmed:** Owner authorized starting the application foundation. M1 uses npm with a committed lockfile, Node 24, static Next.js export, and GitHub Actions with manual dispatch to respect the no-check-execution preference. Supabase client setup does not imply verified connectivity or approved database access.

Infrastructure details confirmed by the owner: GitHub repository `https://github.com/Skanderba8/repondly-whizz.git`; app hostname `whizz.repondly.com` (supersedes the earlier `app.repondly.com` preference); Supabase project `zffaxlprvnxuqqmczhyi`. Browser-safe Supabase configuration is stored in Git-ignored `.env.local`. Repository connection is authorized; Cloudflare deployment and DNS connection are pending.

- **D11, Confirmed:** Start simple and scale as needed. Prioritize polished responsive UI and fast navigation/write feedback. Recurring service budget is $0 beyond the existing domain.
- **D12, Proposed:** Cloudflare Pages Free plus Next.js static export and Supabase Free. Refines D04 and the hosting portion of D09; no services provisioned. Requires owner agreement before scaffolding.
- **D13, Proposed:** Browser data access protected by RLS, database validation, and transactional functions; Edge Functions only for trusted work requiring them. Refines D05's server boundary; static Next.js has no request-time server features.
- **D14, Proposed:** Initial navigation is Overview, Activity, Team, and Administration, with role-appropriate visibility. Period selection lives within Overview, not separate daily/weekly/monthly pages.
- **D15, Deferred:** Confirm team geography, screenshot volume/retention, and free auth-email/onboarding approach before the affected infrastructure/features. See ARCHITECTURE.md for quotas, performance targets, and sources.

## Authentication decisions: 2026-11-02

- **D17, Confirmed:** Owner authorized Supabase authentication for accounts created in advance. The owner creates confirmed work-email/password accounts and distributes credentials. App scope is login and logout only, with no signup or password-reset screens. This supersedes invitation-email onboarding for the initial auth flow in D05/D15. Existing public environment configuration may be read without displaying values. Hosted settings and migrations remain unapplied by this task; setup is documented in `supabase/README.md`.
- **D18, Confirmed:** Initial application roles are employee and manager. Employees view and submit their own records and edit their own pending records. Managers see all employees' performance, subscription/review records, and screenshots across the whole team; managers can edit those records and accept or deny submissions. Notes are optional for either decision. This resolves part of R01/R06/R09, supersedes the initial three-role proposal, and does not authorize user role assignment by managers. Deletion, self-approval, post-review employee edits, and scoring consequences remain unresolved.
- **D19, Implementation choice:** Explicit owner-assigned `workspace_members` rows are the source of access roles; there is no default enrollment or role sourced from user-editable metadata. Browser users may read only their own assignment and cannot mutate assignments. Accounts lacking an assignment are denied workspace entry. Business-data policies and review controls are deferred until their schemas and remaining rules are agreed. Logout affects the current browser session.

## Shared interface redesign: 2026-11-02

- **D20, Confirmed:** Owner authorized redesigning the existing application and its reusable patterns before further workflows, following the revised DESIGN.md and Whizz ERP visual references. Apply the electric lime palette, neutral surfaces, compact navigation, readable hierarchy, and consistent controls to the existing shell/access/preview routes. Preserve the same UI patterns in subsequent changes through the AGENTS.md contract and DESIGN.md section 12. This does not authorize additional business features, new data rules, deployment, or copying reference customer data.
- **D21, Implementation choice:** Keep the existing Next.js static architecture and installed dependencies. Use shared semantic light/dark tokens, Geist through Next's build-time font pipeline, small client islands, and installed Radix primitives for accessible menu/dialog structure. Persist non-sensitive appearance/sidebar preferences only; default appearance to Light. Reporting and submissions remain explicitly unavailable until their contracts are implemented. Owner verification is pending; no checks or server were run.
