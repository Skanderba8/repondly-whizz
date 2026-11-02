# Account access setup

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

4. Choose the screenshot byte limit, update `tracker_settings.screenshot_max_bytes`, and set the private bucket's `file_size_limit` to the same value. It starts unset, so review uploads are blocked with a setup message. One PNG/JPEG/WebP is supported. Agree retention/redaction and capacity management before live evidence use; no automatic cleanup or deletion is enabled.
5. Deploy the `save-review` Edge Function with its `deno.json` import map and access to `shared/bonus-schema.ts`. Keep JWT verification enabled and confirm the function's own Auth/membership checks. The function uses Supabase's server-only environment configuration; no service key belongs in the Next.js build. Its browser-safe response includes only a saved reference or safe error. Requests validate file bytes and type; rejected uploads do not create a bonus entry. A request interrupted after upload may leave a private unassociated object; retrying the same entry/hash resumes it. Orphan cleanup is an owner operation until retention rules are decided.
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
