# Team release review, 2026-11-03

Status: source review and local fixes delivered. Release acceptance is pending. No automated checks, builds, servers, browser/device sessions, hosted queries, migration application, collector runs, function deployments, or publication were executed. This review does not certify that every feature works in production.

## Changes made

- Restored the missing definition and transaction opening in migration 011. Its former contents started at `end;`, so the file could not install the required manager roster. The repaired read-only security-definer function verifies manager membership, fixes its search path, returns mapped employees only, excludes the caller, returns an empty array for an empty roster, and denies anonymous access. Migration 010 remains necessary for raw records, legacy reporting, and evidence RLS.
- Added stable PWA identity, description, language, Apple standalone metadata, and a zoom-preserving safe-area viewport. Both roles use the same installed app and existing authenticated routes.
- Added shared Install app guidance to desktop/mobile navigation, with a browser install prompt when available and explicit Safari/Android instructions otherwise. Installation does not provision accounts or grant roles.
- Added offline status and connection-restoration revalidation to the shared workspace. Existing ambiguous-save retry identities remain unchanged; reconnect never automatically resubmits a write.
- Added safe-area padding, horizontally scrollable segmented controls, and viewport-bounded popovers. Fixed calendar opening after incomplete typed date entry.
- Used browser image decoding rather than requiring createImageBitmap, released temporary image/canvas resources, and made optional PNG compression failures preserve a valid decoded original. Byte/MIME/dimension guards and server validation remain in place. Upload copy now describes choosing a photo or file from a device.
- Added manager warnings for incomplete revenue/RTF/category source fields. Known totals must not imply complete source coverage. Corrected the role-specific footer and expanded deployment prerequisites through migration 012 and both review functions.

## Owner rollout, in order

Nothing below was executed by the agent. Confirm the target project and backup before hosted changes. Preserve existing accounts and records.

1. Confirm which migrations are actually applied in the existing project. Apply only missing migrations 001-010 in the exact order listed in [DEPLOYMENT.md](DEPLOYMENT.md). Existing setup, accounts, stores, screenshot limits, and private evidence are prerequisites. Do not mark absent migrations applied or rerun account-mapping scripts blindly.
2. Copy the repaired [migration 011](supabase/migrations/202611030011_verified_employee_roster.sql), paste it into the existing project's Supabase SQL Editor, and Run. If an earlier manually repaired definition already exists, this file safely replaces that function without changing records or membership. Keep the established CLI migration history consistent if using CLI-managed migrations.

```powershell
Set-Location "C:\Users\skand\Documents\apps\repondly_whizz"
Get-Content -Raw -LiteralPath .\supabase\migrations\202611030011_verified_employee_roster.sql | Set-Clipboard
```

3. If not already applied, copy [migration 012](supabase/migrations/202611030012_manager_bonus_history.sql), paste it into a new SQL Editor query, and Run. It adds the server-side combined bonus-history filter.

```powershell
Get-Content -Raw -LiteralPath .\supabase\migrations\202611030012_manager_bonus_history.sql | Set-Clipboard
```

4. Using the existing Supabase CLI login and confirmed project reference, deploy the reviewed review functions. Keep JWT verification enabled in [supabase/config.toml](supabase/config.toml). These are owner commands, not completed actions:

```powershell
supabase functions deploy save-review --project-ref zffaxlprvnxuqqmczhyi
supabase functions deploy manage-review --project-ref zffaxlprvnxuqqmczhyi
```

5. Publish the reviewed frontend through [DEPLOYMENT.md](DEPLOYMENT.md). Serve it over HTTPS. Sign out and back in after the backend rollout to discard old access/context caches. Do not share credentials across employees or merge the independent manager/employee accounts.
6. Complete the following acceptance with synthetic accounts and evidence, then obtain owner approval before team release. The owner may run the repository's typecheck, lint, unit tests, production build, and browser tests; none were run for this revision.

## Required Android/iOS and role acceptance

Repeat the applicable rows in Android Chrome and iPhone Safari, then in each installed home-screen app. Include a narrow phone, landscape, enlarged text, on-screen keyboard, light/dark appearance, and a short viewport.

| Area | Required result |
| --- | --- |
| Installation | Android browser installation and Safari Share > Add to Home Screen produce the correct icon/name and standalone workspace. On iOS keep Open as Web App enabled when shown. Existing credentials work inside the installed app; do not assume the browser session transfers. |
| Employee access | Overview, Reviews, DoorDash, and Activity work from navigation and direct URLs. Only own records/evidence are readable. Direct manager route/API calls deny employee access. |
| Manager access | Team overview, Employees, All reviews, All DoorDash, and Team activity work. Only mapped employees appear; manager-owned data is excluded. A manager does not require a visible tracker profile. Missing/failed roster setup hides manager reporting and offers retry. |
| Session lifecycle | Correct/wrong login, no membership, revoked role, expiry, app background/resume, sign-out and reopening behave correctly. A different account never inherits cached data or saved filters from the prior account. Owner-assisted password recovery remains outside the app. |
| Reporting parity | For one employee with identical dates/stores, manager and employee totals reconcile to source rows. Points, point value, RTF, review/DD counts and money remain distinct. Zero and missing fields retain approved meanings. Missing revenue/commission/category fields are identified as partial. |
| Dates and filters | Current month/week, yesterday/today where available, calendar selection, month/year boundaries, store-local dates/DST, explicit empty/multiple scopes, and Reset work. Navigation/reload preserves account-scoped exact dates. Profile drill-down retains selected dates/stores. |
| Employee review | Native photo/file picker, cancel, PNG/JPEG/WebP, invalid/oversized image, preview/remove/replace, optional note, save and monthly totals work. Confirm the new review in Activity and the manager's same-period history, with the same $2 amount. |
| DoorDash | Store/date/subscription/proof validation, $5 save, totals and employee/manager history agree. Existing editing can record missing proof; do not infer a new eligibility rule. |
| Record management | Both roles can perform their authorized edits/deletes. Screenshot replacement and cleanup, stale-version reload, expired evidence access renewal, focus return, filtered record counts, last-page deletion, search and 25-row pagination work. |
| Connection loss | Airplane mode shows offline status in an open workspace. A failed/ambiguous save retains details and UUID; retry after reconnect creates at most one record. Background/resume and restored connection refresh access/data. A cold offline launch and offline writes are not supported. |
| Navigation and touch | All controls, account/logout/appearance, popovers, evidence zoom/close, filters and submit buttons remain reachable above home indicator, cutout, and keyboard. Long filter rows scroll horizontally without whole-page overflow. |
| Collector and accuracy | Owner verifies team mappings, unresolved accounts, historical coverage, scheduled PC availability, incremental resume/retries, source duplicates/edits, store timezones, and source-to-database reconciliation. The phone app reads imported reports; it does not run Telegram collection. |
| Companion extension | The toolbar extension is a desktop Chrome companion. Android/iOS PWA users use the built-in Reviews/DoorDash pages. An unpublished store listing must show the existing unavailable page. Extension publication is a separate owner action. |
| Operations | Production public variables, disabled signup, private bucket/RLS, both Edge Functions, Auth URLs, HTTPS, backups/restore owner, retention, capacity, collector monitoring, privacy contact and rollback are reviewed. No secrets enter the static build. |

## Deliberate boundaries and remaining uncertainty

This is an online PWA. It shares all existing role-authorized website features; no offline data cache, service worker, background-save guarantee, push notifications, or new private-draft persistence is introduced. Keep uncertain entries open until confirmed. Mobile operating systems may discard a backgrounded page; persistent draft recovery is not implemented for the website. Installation alone cannot guarantee uninterrupted uploads.

Prepared checks and historical results do not verify this revision. Hosted migration/function state, real numeric accuracy, every device/browser interaction, complete accessibility/performance, evidence retention/backup operations, and owner release acceptance remain unverified. Business deduplication across newly created bonus entries and final payout rounding remain unresolved under the existing rules.

Installation references: [MDN installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [Apple home-screen web app guidance](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).
