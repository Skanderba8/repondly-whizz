# Whizz Chrome popup

For teammates to install without Developer mode, follow [PUBLISHING.md](PUBLISHING.md). The app sidebar now includes Add extension above the profile. It opens the approved Chrome Web Store URL when configured, and otherwise shows an honest availability page. Store publication, review and production configuration are still owner steps; no listing exists yet.

A separate Manifest V3 extension with a small toolbar popup. It reuses the existing Whizz design tokens, form controls, public Supabase configuration, login, schemas, and protected save paths. The main website remains the full workspace.

## Build and install

Implementation is prepared. No build, installation, hosted operation, or verification has been executed by the agent.

1. Use the project's existing Node 24 and installed npm dependencies. The extension adds no dependency.
2. Set the same browser-safe values used by the website in the root `.env.local`. Never add a secret or service-role key:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```

3. From the repository root, build the extension:

   ```powershell
   npm run build:extension
   ```

4. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select:

   ```text
   C:\Users\skand\Documents\apps\repondly_whizz\dist\extension
   ```

5. Pin **Whizz Repondly** using Chrome's Extensions menu. Click its icon and sign in with your existing employee work email/password. Website and extension sessions are independent; no password or website-session transfer is implemented.
6. Choose **Review** or **DoorDash**. Store/date are retained in each draft. Reviews support browse/drop, a preview, and an optional note. DoorDash requires the subscription number and checked **DD proof added**. Use **Open app** for full history and the complete dashboard. Manager logins link to the existing team workspace.

For subsequent updates, close the popup, run the same build command, and click **Reload** on the extension card. Do not reload/remove the extension while a save is pending. Rebuild when changing public backend configuration. `dist/` is ignored by Git. Do not load the source `extension/` directory; the generated package is `dist/extension/`.

## Backend prerequisites

The extension uses the same production backend as its configured public URL. Existing account membership, employee tracker profile, configured stores, screenshot limit/private storage, tracker context/snapshot RPCs, `save_doordash`, and the deployed `save-review` function must already work. Existing RLS remains authoritative. Follow the existing ordered backend rollout in `supabase/README.md` if setup remains pending. This feature introduces no SQL migration, Edge Function modification/deployment, new service, or automatic third-party page integration.

The **Open app** destination is `https://whizz.repondly.com`, matching the owner's requested deployment domain. Website deployment remains a separate owner step. No website hosting is needed for the packaged popup itself, but it requires a connection to Supabase for login, totals, and saves.

## Drafts and interrupted saves

- One draft per employee/account and entry type is kept in local IndexedDB, including a selected screenshot, stable request UUID, and save state. This is private data on the current Chrome profile, not an encrypted vault or cross-device sync. Use a trusted Chrome profile. No screenshot is uploaded before Save.
- Fields persist as you edit. Wait for screenshot preparation to finish before dismissing the popup. Storage failures are shown; do not assume a draft was retained when that message appears.
- A background worker performs submitted saves independently of the popup. Chrome shutdown, worker termination, authentication expiry, network failure, or extension reload can still interrupt a save.
- On reopening, the popup restores confirmed state or offers **Retry same entry** with the original immutable payload and UUID. An ambiguous save stays locked. Do not submit another copy through the website while resolving it. A known rejected review upload can be corrected when there has been no ambiguous attempt.
- Confirmed saves clear note/subscription/proof/image details, retain store/date, and refresh authoritative monthly totals. Counts and bonuses come from the backend, never a page sum or optimistic increment.
- Explicit extension sign-out clears draft records and the local extension session. Pending/uncertain saves must be resolved first so their retry identity is not discarded. Session expiry retains account-scoped drafts for that same account to resume after login. Removing the extension or clearing its storage discards drafts and retry receipts; contact the owner before doing so if a save is uncertain.

## Owner acceptance, not executed

1. Build with production-safe public values and load the generated package. Confirm local scripts/CSS/icons load under Manifest V3 CSP, with no remote script/eval errors. Inspect permissions: only the configured Supabase origin; no browsing-history, page-reading, screenshot-capture, or side-panel access.
2. Exercise employee login, wrong credentials, offline/retry, denied/offboarded access, session expiry, sign-out, and a separate manager login. Verify managers get no employee submission form and employee raw RPC/storage requests remain constrained by existing policies.
3. Choose a non-default store/date in each entry tab; switch tabs and close/reopen. Verify independent restoration, selected screenshot/name/preview, optional note, date/timezone, and active-tab retention. Verify a different account cannot see another account's draft. Confirm explicit sign-out clears both draft entries.
4. Check valid PNG/JPEG/WebP, invalid container/type, empty/oversize/oversized-dimension file, replacement/removal, native picker, drop, storage failure, and unconfigured upload limit. Verify preparation completes before dismissal and the original image remains readable.
5. Save each type, double-click Save, immediately close/reopen during upload, interrupt the connection, terminate/restart the worker, retry the same entry, and inspect backend record/evidence association for exactly one entry. Confirm fields stay locked for ambiguous outcomes and later rejections do not erase that uncertainty. Confirm failed/missing upload setup is actionable, with no false success.
6. Verify DoorDash cannot submit unchecked proof or an empty subscription number; verify server validation still applies to tampered requests. Check monthly whole-period counts/amounts against the full app, including zero data, unavailable totals, retry, both entry kinds, and month/timezone boundaries.
7. Verify refresh after save even if the other entry tab is open, saved feedback only after confirmed persistence, cleared attachment/details after success, and retained store/date. Test a background worker that completes while the popup is closed.
8. Review light/dark appearance, keyboard/tab order, segmented controls, menus/calendar inside popup bounds, error focus/links, screen-reader announcements, long store names, popup scrollbar, zoom/short screens, and reduced motion. Measure popup opening, input responsiveness, and save latency on the team's actual machines/network. No performance or accessibility conformance is claimed yet.

Chrome Web Store publication, managed distribution, account recovery, screenshot capture from third-party tabs, and automatic review/DoorDash detection are outside this slice. Chrome's messaging, service-worker lifecycle, and CSP references informed the implementation: https://developer.chrome.com/docs/extensions/develop/concepts/messaging, https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle, https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy.
