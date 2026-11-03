# Account access setup

For team onboarding, run the read-only `audit-team-mappings.sql` in the trusted SQL Editor to identify missing Auth accounts, unconfirmed email addresses, missing membership/profile rows, and report-name conflicts. It includes stored report counts/date ranges, not proof of source completeness. After creating missing accounts, `configure-team.sql` connects the 11 confirmed work emails to their report names. Re-run the collector from the approved historical start date to backfill previously skipped colleagues. The collector now defaults to the approved team roster; `--configured-roster` explicitly restores a restricted local roster. Chams still requires a confirmed email. No hosted audit or backfill was performed for this change.

Prepared 2026-11-02. These steps have not been applied to the hosted project. No account, password, private data, or privileged key is included in this repository.

## Configure Supabase

1. In the existing project's Authentication settings, keep the Email provider enabled and disable **Allow new users to sign up**. Leave anonymous sign-in disabled. There are no signup, invitation-email, or password-reset flows in the app.
2. Apply `migrations/202611020001_workspace_members.sql` using the Supabase SQL Editor or your migration workflow. This creates the role table with RLS. It does not create users or assign access.
3. In Authentication > Users, use **Add user > Create new user** to create each account with its work email and an individual password. Confirm the account when creating it so employees can log in without an email workflow. Give credentials to the employee outside this app. Do not commit credentials or paste them into chat.
4. Copy the account's user UUID and run the following in the trusted SQL Editor. Replace the synthetic UUID. Choose `employee` or `manager` explicitly for each account.

```sql
insert into public.workspace_members (user_id, role)
values ('00000000-0000-0000-0000-000000000001', 'employee');
```

To change an assignment, use the SQL Editor:

```sql
update public.workspace_members
set role = 'manager'
where user_id = '00000000-0000-0000-0000-000000000001';
```

5. Supply `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the existing ignored `.env.local` and in the eventual static build environment. Never add a service-role key to the frontend. These values are already read by the existing environment module; this task does not change or print them.

No automatic enrollment or default role exists. A valid Auth account without a role sees an access-needed screen. Account provisioning and role assignment remain owner operations in Supabase, including for managers. Manager record permissions do not grant permission to assign roles.

## Delivered behavior and boundaries

- Existing workspace routes display a login form until a session and an assigned role are verified. Logging in keeps the originally requested route.
- Sessions persist through the Supabase browser client. Auth changes and window focus revalidate identity and membership. Loading and failures hide workspace content. Stale requests are ignored after identity changes or logout.
- Logout signs out the current browser session. It does not sign out other devices. Failed logout hides the workspace and offers retry.
- Employees and managers can read only their own role row. Neither can insert, edit, or delete roles through the public API, including by changing browser metadata.
- Both roles currently enter the same foundation shell. Role-specific records, evidence policies, manager editing, and accept/deny controls belong to subsequent submission features. No performance or customer data is fetched here.
- The static export contains public shell markup. Client gating improves navigation; database RLS remains the security boundary for every future private table and bucket.
- Signup is blocked by hosted Auth configuration, not by hiding UI. This must be configured before the auth feature is ready for use.
- Password assistance is handled by the owner outside the app. Offboarding, deletion, history retention, review eligibility for points, and self-approval rules remain unresolved. The role foreign key restricts account deletion until explicitly handled; this is not an approved history-deletion policy.

## Owner verification pending

No checks, server, build, migration, or connectivity request were run by the agent. The Playwright signed-out route cases are prepared, not executed.

Verify using synthetic accounts before real employee access:

1. Signed-out visits to `/` and `/activity/`, including refresh, show only login; keyboard navigation and password-manager filling work on mobile and desktop.
2. Correct credentials enter the workspace with the assigned employee or manager label. Wrong credentials, rate limits, and network failures show a safe error without losing form input.
3. A valid account without membership is denied. A missing migration or network outage shows retry rather than workspace content.
4. Reload restores access. Expired sessions, logout in another tab, and account changes remove the previous workspace. Logout succeeds and a later reload stays signed out. Failed logout offers retry.
5. With each account's authenticated API client, reading `workspace_members` exposes only its own row. Reading another user's row returns none. Inserts, updates, and deletes fail for both roles; anonymous reads fail. Editing user metadata cannot change the database role.
6. Direct public signup requests are rejected by Supabase after signup is disabled. Owner-created confirmed accounts still log in.
7. Change a database role and refocus the app to see the updated label. Verify TypeScript, lint, production static export, and prepared browser coverage when requested.

References: [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration), [password authentication](https://supabase.com/docs/guides/auth/passwords), [auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [logout scope](https://supabase.com/docs/reference/javascript/auth-signout), and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Core bonus tracker setup

The D24-D25 tracker supersedes the earlier foundation-only behavior above. The following files are prepared, not applied. The owner must review and authorize hosted migration/function deployment separately.

1. After the membership migration, apply `migrations/202611020002_bonus_tracker.sql`. It adds stores, report-name profiles, upload settings, reported productivity, self-reported bonuses, read policies, fixed-amount calculations, narrowly scoped RPCs, and a private `review-evidence` bucket. Browser users cannot edit/delete records, write imported points, upload objects directly, or alter configuration.
2. Apply `configure-tracker.sql` to configure the eight supplied stores and their IANA timezones. Union is Manhattan. This creates no users or fabricated results.
3. Once the owner identifies email/account mappings, add each account's exact supplied report name. Until then, names remain in collector configuration only and the app truthfully asks for setup. Example with synthetic identity values, to replace in the trusted SQL Editor:

```sql
insert into public.tracker_people(user_id, display_name, report_name, home_store_id)
select '00000000-0000-0000-0000-000000000001', 'Morgan Example', 'Morgan Example', id
from public.tracker_stores where name = 'Brooklyn';
```

`user_id` must already have owner-assigned membership. `report_name` must match the assistant's full name. `home_store_id` is optional; it is a calendar convenience, not an access restriction. Do not guess a name/account association. Managers need their own profile and may select any mapped team member for reads. Submissions always belong to the authenticated author.

4. Apply `migrations/202611030005_review_evidence_limits.sql` after migrations 001-004. D38 sets `tracker_settings.screenshot_max_bytes` and the private bucket's `file_size_limit` to 10,485,760 bytes (10 MiB). The migration preserves private access and PNG/JPEG/WebP restrictions. Until applied, an unset limit blocks uploads with a setup message. One PNG/JPEG/WebP is supported. Agree retention/redaction and capacity management before live evidence use; no automatic cleanup or deletion is enabled.
5. Deploy the `save-review` Edge Function with its `deno.json` import map and access to `shared/bonus-schema.ts` and `shared/screenshot-policy.ts`. Keep JWT verification enabled and confirm the function's own Auth/membership checks. The function uses Supabase's server-only environment configuration; no service key belongs in the Next.js build. Its browser-safe response includes only a saved reference or safe error. Requests validate file bytes and type; rejected uploads do not create a bonus entry. A request interrupted after upload may leave a private unassociated object; retrying the same entry/hash resumes it. Orphan cleanup is an owner operation until retention rules are decided.
6. Configure and run the personal account collector using `../collector/README.md`. Group/sender IDs, credentials, sign-in, and process hosting remain owner setup. No bot is needed. No collector credentials or live messages are in the frontend.

### Owner verification for the core

Prepared, not executed: synthetic parser cases and Sunday/Saturday/calendar-month unit coverage. Also verify with synthetic employee and manager accounts:

- Role isolation for every table/RPC and private screenshot, including direct API access, forged owner IDs, missing/revoked membership, and attempted browser writes to points/configuration/storage. Managers can read team records but cannot assign access or submit for someone else.
- Review note/image save, file size/type rejection, upload interruption, same-reference retry, concurrent retry, unavailable settings/function, expired signed URL, dialog keyboard/zoom/close, and screenshot selection without losing the draft on window-focus revalidation.
- DoorDash save with checked/unchecked proof, no approval step, preserved subscription text, fixed $5 value, UUID retry, and strict separation from productivity points. Business deduplication across newly created entries is still undefined; do not claim it is enforced.
- Reported zero versus missing reports, RTF missing versus zero revenue, decimal commission precision, multiple stores on one work date, exact-name matching, unknown staff exclusion, differing store timezones/DST, Sunday report for Saturday, Monday report for Sunday, leap February, and month/year boundaries.
- Database totals versus source samples, type-filtered 25-row pagination, mobile lists, chart/data-table agreement, loading/failure/cache behavior, account switching, and manager/employee visibility. No category point estimates or payout rounding should appear.
- Personal collector sender/group filtering, no Telegram writes, identical repeat imports, edited/conflicting daily reports, interrupted scans, and reported partial coverage. Reports more than one day late may require explicit owner reconciliation.

No migration, function deployment, install, type/lint/build/unit/integration/browser check, dev server, diff check, or inline check was executed by the agent. Do not treat this delivery as production-ready or a completed milestone until owner verification and unresolved release rules are satisfied.

## Personal and manager dashboard setup

The dashboard delivery adds `migrations/202611020003_tracker_dashboard.sql`. Apply it in the trusted SQL Editor after the existing membership and bonus-tracker migrations. It adds only a read-only aggregate function, using the caller's existing RLS permissions. It does not change roles, data, storage policies, or collection settings.

For the owner's separate manager account (`baskander5@gmail.com`), run `configure-owner.sql` in the trusted SQL Editor. It assigns manager access and creates an independent profile labeled `Skander Abdallah Ben (Manager)`. The employee account (`virtual-agent7@rentwhizz.com`) keeps its original `Skander Abdallah Ben` report name and all existing reports. These accounts are treated as separate people: no ownership, points, bonus entries, or profile settings are transferred or combined as one person. Both remain separate rows in team aggregates. New reviews and DoorDash entries belong to whichever account is signed in. Existing profiles are preserved on rerun. This script has not been executed by the agent. Use Reload setup, or log out and back in if the role needs refreshing.

Both managers and employees open their own weekly Overview automatically. Managers can switch to Team overview or choose an individual member. Managers are included in aggregates like any other mapped person; logging a review or DoorDash entry always uses the signed-in author. Weekly/monthly/all-time summary points are separate from the selected-period chart and dollar bonuses. All-time means all imported reports, not a claim that source collection covers the person's full employment.

Map every other team member and the actual manager using the existing explicit membership/profile process. Use each account's confirmed UUID and report name, assigning `manager` to the actual manager as well. A manager still needs a tracker profile even if they have no productivity reports. The team table contains only mapped profiles and cannot discover missing roster accounts. The current local collector's own-only restriction was not changed; expand collection only after the intended account/name mappings and team scope are configured. This UI change neither runs collection nor backfills history.

Owner verification, prepared but not executed:

- The confirmed owner account enters Overview after setup and appears once in Team overview with the same personal totals. A second mapped manager gets the same team visibility and retains their own submission identity.
- Employee RPC/API calls expose only their own aggregates, reports, bonuses, and evidence. Manager calls expose mapped team data. Signed-out and unassigned accounts cannot invoke dashboard reads. Role removal or downgrade protects prior manager data.
- Weekly Sunday/Saturday, month/year boundaries, home-store/calendar defaults, selected-period versus current-period summary labels, and all-imported-history totals reconcile with synthetic reports, including zero-point reports, no reports, missing revenue, and missing category fields.
- Team totals reconcile with member totals. Missing member reports and partial RTF totals remain labeled. Category counts never become points. Review/DoorDash estimates remain separate from point value.
- Day/week/month controls, previous/next/Today, member selection and View drill-down, keyboard/typeahead/focus behavior, chart data disclosure, narrow screens, horizontal scrolling, light/dark appearance, and 200% zoom work as intended.
- Focus refresh and saves update data quietly. Failed analytics/history reads preserve only the matching view's successful results with an inline retry. Missing dashboard migration shows the analytics setup failure while personal history remains usable. Logout/account changes clear private caches and drafts.

No checks, server, browser, migration, live-data access, deployment, or collector run was executed for this delivery.

## Accurate reporting delivery: 2026-11-02

This section supersedes the fixed weekly/monthly/all-time dashboard layout above. Apply `migrations/202611020004_accurate_reporting.sql` in the trusted Supabase SQL Editor after the existing migrations. This introduces `tracker_reporting(p_owner, p_start, p_end, p_bucket)` with invoker rights. A null owner means manager-only team scope. The existing snapshot RPC keeps its signature, supports the longer range and manager-only null-owner history, and adds author identity fields to history rows. No ownership, stored reports, profile mappings, rates, or storage permissions are changed.

1. Run `reconcile-employee-reporting.sql` read-only in the SQL Editor. Its first result separates the two accounts' all-imported and since-July totals. The next results show monthly counts/sums/RTF data and every employee source row with a running total. Compare the displayed 246 to the actual matching account and range; do not adjust totals or merge identities to force a different number. A 246 total in a synthetic test is not verification of the live employee total.
2. Apply migration 004. The UI defaults to month-to-date and all reporting sections use the visible inclusive range. Weekly presets are Sunday through today; prior months use full calendar boundaries. Custom changes require Apply. Daily/weekly/monthly chart buckets are chosen at 31/180-day inclusive thresholds and boundary buckets are clipped. Custom ranges are bounded to a 3,660-day difference as a technical resource guard.
3. Confirm other team account mappings before collection. From the repository root, in the existing collector environment with credentials already configured, run:

```text
python collector/collect.py --config collector/config.local.json --since 2026-07-01 --mapped-team
```

This command uses the approved example roster in memory and preserves the local source IDs, topic filters, aliases, and own-only saved settings. Only exact mapped roster names receive imports. Inspect startup mapping diagnostics, per-store observed date ranges, and the final imported/unchanged/unmapped/issue counts. Fix missing mappings or source conflicts through the established owner process, then rerun the same command safely. No conflicting source totals are overwritten. The separate manager identity remains independent and receives no employee reports through name similarity.
4. For ongoing collection, add `--watch` to that command. The owner-run collector scans every 120 seconds; the visible app refreshes data every 60 seconds. An app refresh cannot fetch Telegram history or prove that collection is complete. Keep the trusted collector running on the authorized machine for continuing imports.
5. Return to the app and select Since July 2026 or View available history. Reconcile selected-period points, point value, RTF commission, reviews, DoorDash, total estimated earnings, category values, and source records against the SQL results. Month-to-date may legitimately have no reports when no source work dates fall in it; available-history dates make that distinction visible.

Estimated earnings combine dollar components, not points and dollars in one points total. Missing RTF revenue produces partial known amounts; no reports do not establish zero productivity. Existing fractional-cent commission precision is preserved, with display precision up to four dollar decimal places. Historical rates are fixed for July 2026 onward under D29; no payout confirmation is implied.

Prepared coverage, not executed: `tests/unit/reporting.test.ts` covers preset boundaries, invalid/custom ranges, adaptive buckets, availability fallback, comparative rescaling, and crown ties/zeroes. `collector/test_roster.py` covers approved-team selection, unchanged own-only mode, and ambiguous names. `test-accurate-reporting.sql` is an owner-run staging integration fixture that rolls back synthetic Auth/profile/report/bonus rows and checks numeric reconciliation, RTF missingness, long-range history, clipped buckets, independent manager data, employee denial, and manager visibility.

Owner manual verification also covers reversed custom dates and Apply behavior, chart sliders/data tables/mobile scroll, dark mode and keyboard focus, source author labels in team history, data migration failures, correct partial/unavailable states, save-triggered updates, retained file-picker drafts, hidden-tab polling, failed refresh recovery, and role removal/account switching. No server, tests/checks, browser, hosted SQL, live data access, collection, or deployment were run by the agent.


## Executed verification: 2026-11-02

Owner explicitly authorized running verification. Fixed the auth callback's nullable session capture, request-state/pagination effect updates, persistent appearance subscription, screenshot preview URL lifecycle, and evidence retry cleanup. Updated stale signed-out heading assertions and added synthetic authenticated dashboard browser coverage. The Windows launcher selects the existing project `.venv`, where Telethon and timezone data are installed; `--help` passed without a live connection.

Executed results: 15 frontend unit tests passed; 11 Python parser/roster/topic tests passed; production static build passed with font-download network access; desktop/mobile Playwright passed all 6 tests on the production preview at http://127.0.0.1:4173. The dashboard browser fixture intercepts provider traffic and verifies chart rendering, explicit date application, reversed-date validation, weekly grouping requests, comparison selection/crowns, retained dates on refresh, page identity, and no JavaScript page errors. Desktop/mobile screenshots were inspected; long category tables intentionally scroll horizontally on mobile. Browser plugin was unavailable, so regular Playwright was used.

Migrations 001-004 and test-accurate-reporting.sql were executed successfully in a temporary in-memory PGlite PostgreSQL engine outside the repository, with minimal Auth/storage platform stubs. Numeric earnings, report sums, clipped long-range buckets, source history, employee denial, separate manager identity, manager visibility, and signed-out denial passed. This exercises database policies and SQL in a local PostgreSQL engine; it is not verification of the hosted Supabase Auth/storage services or live records. The fixture's 246 points are synthetic.

The existing reconcile-employee.sql contained pasted Overview text rather than SQL and was preserved. Use reconcile-employee-reporting.sql for executable read-only diagnostics; it also executed successfully locally. The pasted Overview states that available work dates were October 26-30, explaining an empty November selection, but the actual live source rows and July backfill remain unverified. No hosted migration/query, credential entry, real Telegram import, account linking, or deployment was performed.

## Confirmed team onboarding

The owner supplied 11 exact report-name/account-number pairs under D33. Run `configure-team.sql` in the trusted Supabase SQL Editor after the membership/tracker migrations. Auth accounts must already exist with the confirmed virtual-agent<number>@rentwhizz.com emails. The script resolves their UUIDs, stops on any missing/ambiguous account or conflicting existing profile, creates absent employee memberships, preserves existing roles and home stores, and returns the 11 mapped profiles. It does not create users, move records, merge identities, or touch the separate baskander5 manager account. Chams Eddine Amaima has no confirmed account number and is intentionally excluded.

After applying, use Reload setup or sign out/in if a new role was assigned, then rerun the Windows collector launcher with --since 2026-07-01 --mapped-team. Existing reports are skipped idempotently; newly mapped report identities can now import. Source/parsing conflicts from the prior scan remain separate reconciliation items. This setup script was prepared but not executed by the agent; no checks or collector run for this change.


## Review upload rollout and acceptance: 2026-11-03

Code and SQL are prepared only. In the trusted SQL Editor, apply migration `202611030005_review_evidence_limits.sql` after 001-004; it changes only the review size setting and existing private bucket restrictions. Redeploy `save-review` with both shared modules, keep JWT verification enabled, then publish the updated frontend through the existing authorized release flow. No hosted operation was performed by this change. Refresh tracker setup after applying the migration. The global Storage file limit must also permit at least 10 MiB; do not raise it beyond the project requirement.

The upload is a bounded multipart request through the trusted function, followed by a server-only storage upload. It does not use base64 or public upload URLs. Lossless PNG re-encoding in the browser is kept only if smaller, without reducing resolution; normal JPEG/WebP originals are retained if smaller. This is whole-request retry with a stable UUID and SHA-256, not byte-resumable transfer. Supabase recommends TUS resumable transfers above 6 MB: https://supabase.com/docs/guides/storage/uploads/standard-uploads. A future direct/TUS staging flow would need a separate validation-and-finalization design before granting any browser storage write access.

Owner checks, prepared and not executed:

- Open Reviews with and without a home store; verify today, change store/timezone and manually choose an earlier date. Save still requires a store. Test today around local midnight.
- Choose and drop a synthetic Google-style PC screenshot; verify readable preview, file size, replace/remove, same-file reselection, keyboard picker, mobile layout, compact note, and selection preservation on invalid replacement.
- Accept valid PNG/JPEG/WebP up to exactly 10,485,760 bytes. Reject empty files, one byte over, SVG/GIF, multiple files, mismatched MIME, malformed headers, excessive dimensions/pixels, and malformed multipart bodies through the endpoint as well as the browser. The normal browser also decodes the image.
- Confirm both tables and bucket stay private: signed-out and unrelated employee reads fail; authors and managers can access authorized record-scoped evidence. Test expired/revoked sessions, forged owners, direct browser storage writes, and signed URL expiry. Never include real customer screenshots in tests.
- Interrupt upload before and after storage persistence, retry the same locked payload, and verify one record and one matching object. Test concurrent retry, 409 conflicts, unavailable function/settings, malformed error responses, and save success refreshing history/totals. Network uncertainty must not invite a new entry.

Trusted validation checks image headers/containers and dimensions, not full decoding, malware, or the truth of a review. No total-storage quota, per-user rate limiter, automatic orphan cleanup, retention schedule, or business deduplication across new entry IDs is implemented. Do not claim those release controls are verified. Orphans remain private and the same-reference retry can recover them. Agree capacity monitoring, retention, and any scanning requirements before broader production evidence use.


### Missing save-review function: exact deployment steps

A frontend deployment does not deploy Supabase Edge Functions. If save-review is absent from the Supabase Edge Functions list, open PowerShell in this repository and run these commands one at a time:

```powershell
Set-Location "C:\Users\skand\Documents\apps\repondly_whizz"
npx supabase login
npx supabase functions deploy save-review --project-ref zffaxlprvnxuqqmczhyi --use-api
```

Accept the CLI installation prompt if shown and complete the browser login. The deploy command uses the committed function entrypoint/import map and bundles its imported shared modules. It does not run a development server or require a local Docker runtime. Leave JWT verification enabled. Do not paste only index.ts into the Dashboard editor, because it imports shared files. Supabase provisions the function runtime Supabase environment variables; never add the service-role key to frontend variables. Deployment reference: https://supabase.com/docs/guides/functions/deploy.

After successful deployment, confirm save-review appears under Edge Functions in project zffaxlprvnxuqqmczhyi. Return to the still-open review draft and use Retry same entry; preserve the existing request identity. If it remains unsuccessful, inspect that function's Invocations/Logs for the failed request and share only its HTTP status and safe error text, with credentials and customer data removed. If the limits migration 202611030005 was already applied, it does not need to be repeated. Otherwise open SQL Editor, paste the entire migration file, and Run after migrations 001-004.


## Review edit/delete rollout: 2026-11-03

Apply this backend change before publishing the new review actions. No hosted operations or checks were executed by the agent.

1. Open Supabase project zffaxlprvnxuqqmczhyi, SQL Editor, New query. Ensure migrations 001-005 are already applied. Copy the entire contents of migrations/202611030006_review_management.sql, paste, and click Run once. This adds a version column, extends the evidence path constraint to support replacements, creates private mutation receipts and a service-only RPC, and blocks delayed recreation of deleted IDs. It does not delete or edit existing reviews during migration.
2. Open PowerShell in the repository and run the commands below one at a time. Complete the browser login if requested. Deploy both functions because save-review now protects against deleted-reference retries. Keep JWT verification enabled.

```powershell
Set-Location "C:\Users\skand\Documents\apps\repondly_whizz"
npx supabase login
npx supabase functions deploy manage-review --project-ref zffaxlprvnxuqqmczhyi --use-api
npx supabase functions deploy save-review --project-ref zffaxlprvnxuqqmczhyi --use-api
```

3. Confirm both functions appear in Edge Functions. Publish the updated frontend via the existing release process. No additional browser grants, public bucket settings, service-key frontend variables, or direct storage write policies are needed.
4. Verify using synthetic accounts/images only: an employee edits/deletes their own review and is denied direct requests for another employee; a manager manages both. Edit note/store/date and confirm persisted values after reloading. Replace an image and check the old object is absent and the new image is accessible under the existing owner. Leaving replacement empty must keep the existing photo. Delete a review, confirm its bonus_entries row and screenshot object are absent in the Dashboard, then verify the affected history/count/$2 amount across the old/new periods.
5. Verify Cancel/Escape/focus behavior, mobile layout, missing backend setup, stale-version conflicts, concurrent attempts, expired membership, interrupted requests before/after database commit and during cleanup, repeated identical operation IDs, and delayed original-create retries after deletion. An uncertain dialog stays open with the same payload until retry completes. No success is shown for unfinished cleanup.

Recovery: review_mutations is accessible only to trusted service/SQL operations. Inspect unfinished cleanup without changing anything:

```sql
select id, record_id, action, cleanup_paths, created_at
from public.review_mutations
where completed_at is null
order by created_at;
```

Normally Retry same change completes these paths and updates completed_at. If the originating browser draft was lost, an owner must finish the listed paths using the Storage Dashboard or Storage API before marking that receipt completed in trusted SQL. Never delete rows from storage.objects to remove files; that does not remove actual stored objects. Keep receipt metadata for retry/tombstone correctness; do not purge deletion receipts without designing an equivalent permanent no-resurrection guard. No automatic cleanup worker or retention schedule is introduced. Failed pre-commit replacement uploads may remain private if a process is interrupted; owner cleanup must first confirm the path is not referenced by bonus_entries or an in-flight operation.

Storage behavior follows https://supabase.com/docs/guides/storage/management/delete-objects and https://supabase.com/docs/guides/storage/schema/design. The database change and actual file removal are separate operations: pending cleanup is durable and explicit, with no completion claim until Storage API success. General backups/retention, interrupted staging-orphan cleanup, and complete content-level correction history remain separate operational requirements.


## DoorDash edit/delete and compact records rollout: 2026-11-03

1. Open Supabase project zffaxlprvnxuqqmczhyi, SQL Editor, New query. After migrations 001-006, copy the entire contents of migrations/202611030007_doordash_management.sql, paste, and click Run once. This adds doordash_version, private retry receipts, the authenticated manage_doordash RPC, and a deleted-reference trigger. It does not edit/delete existing rows.
2. Publish the updated frontend from main using the existing release process. No additional Edge Function deployment is required for this DoorDash update. Existing review functions remain necessary for review operations. No changes to Storage, public access, or frontend secrets are needed.
3. With synthetic accounts, edit a DoorDash entry and reload to confirm store/date/subscription/proof persistence. Verify the $5 amount moves to the corrected period; deletion removes the actual bonus_entries row and its $5 from summaries/history. Employees must be denied other owners through direct RPC calls as well as UI; managers can manage team entries. Verify cancelled changes, stale concurrent edits, repeated operation IDs, interrupted network requests, and a delayed original save after deletion.
4. On both Reviews and DoorDash, verify the month input and arrows filter the adjacent list, This month resets to the current reporting-store month, manager scope retains permissions, count/bonus match database records, February/leap/year boundaries cover the full month, and deleting the last row on the last page returns to a valid page. Check keyboard/mobile layout, dialog focus and retry behavior. Overview/Activity keep their existing controls.

No checks, migration, RPC calls, hosted queries, deployment, push, or server run was performed by the agent. Mutation receipts are private operational metadata required for safe retry and deleted-ID protection; general retention is not decided here.

## Overview team-comparison rollout: 2026-11-03

Completed locally: overview layout, stable From/To trigger, two-decimal currency formatting, shared delivery border, green category meters, anonymous-maxima SQL migration, and concurrent API integration. No hosted steps have been executed.

1. After the existing migrations 001-007, copy migration 008 into the clipboard with PowerShell:

```powershell
Set-Location "C:\Users\skand\Documents\apps\repondly_whizz"
Get-Content -Raw -LiteralPath .\supabase\migrations\202611030008_category_benchmarks.sql | Set-Clipboard
```

2. Open Supabase project zffaxlprvnxuqqmczhyi, SQL Editor, New query. Paste the complete migration and click Run once. It adds the read-only tracker_category_benchmarks(date, date) RPC; it does not update stored reports. If prior migrations are unapplied, apply them in timestamp order first. Do not rerun already-applied migrations or repair migration history blindly.
If migration 008 fails with SQLSTATE 42723 because tracker_category_benchmarks already exists, use the updated migration with CREATE OR REPLACE FUNCTION and rerun the complete file through the same migration method that failed. For SQL Editor, start a fresh query; if the session reports an aborted transaction, run ROLLBACK first. The updated file replaces the compatible function definition and reapplies grants without dropping the function or modifying report data. Do not mark migrations applied or change migration history to bypass the error.

3. Publish the frontend through the existing release process after SQL succeeds. No Edge Function, Storage change, new environment variable, or service key is required. If the frontend is published first, totals still load while team comparisons show unavailable.
4. Owner verification with synthetic accounts/data: deny anonymous/nonmember/expired-member calls; allow current employee/manager aggregate calls with only fixed category keys/maxima in the response; retain employee isolation on raw reports and peer reporting. Reconcile maxima from per-person sums over the identical period, including multiple stores, zero, null, ties, no reports, and period boundaries. Confirm team aggregate view has no misleading individual-scale meters. Verify layout, Yesterday From/To stability, two-decimal presentation, unchanged stored precision, bonus sizing, and retry after missing-function/network failures.

No migration application, hosted query, function deployment, server, build, automated check, or browser run was performed by the agent.
