# Deploy Whizz to whizz.repondly.com

Prepared on 2026-11-02. Target: Cloudflare Pages Free with GitHub integration, the existing Next.js static export, and the existing Supabase backend. This guide prepares deployment; no build, hosted configuration, DNS change, or deployment was executed by the agent.

## 1. Publish the intended source revision

Repository: https://github.com/Skanderba8/repondly-whizz

Use a reviewed production branch, normally `main`. The local work was on `codex/accurate-reporting` before this deployment preparation, so do not assume GitHub's `main` already contains the current app. Deployment preparation is on `codex/cloudflare-deployment`. Include the intended application changes and these deployment files in the release revision. Review, commit, push, and merge through the owner's normal workflow; none of those actions was performed for this preparation.

The production branch must contain `package-lock.json`, `.nvmrc`, `next.config.ts`, `scripts/validate-deployment-env.mjs`, and `public/_headers`. Keep `.env.local`, Telegram sessions, collector configuration, database credentials, and generated `out` files out of Git.

## 2. Confirm backend readiness

Use the existing Supabase project, not a new empty backend. Frontend deployment does not apply database changes or deploy Edge Functions. Follow [supabase/README.md](supabase/README.md) for the existing setup and only apply migrations not already applied, in order:

1. `202611020001_workspace_members.sql`
2. `202611020002_bonus_tracker.sql`
3. `202611020003_tracker_dashboard.sql`
4. `202611020004_accurate_reporting.sql`
5. `202611030005_review_evidence_limits.sql`
6. `202611030006_review_management.sql`
7. `202611030007_doordash_management.sql`
8. `202611030008_category_benchmarks.sql`
9. `202611030009_manager_dashboard.sql`
10. `202611030010_employee_reporting_scope.sql`
11. `202611030011_verified_employee_roster.sql`, using the corrected complete function definition.
12. `202611030012_manager_bonus_history.sql`

Confirm stores, owner-approved account mappings, employee/manager memberships, private evidence storage, and the screenshot size setting are configured. Keep public signup and anonymous sign-in disabled. Deploy both `save-review` and `manage-review` for review creation, edits, screenshot replacement, and deletion. Follow their authentication instructions in the Supabase guide; do not disable authentication to work around an upload error. Follow [RELEASE_REVIEW.md](RELEASE_REVIEW.md) for the corrected roster rollout and Android/iOS acceptance checklist.

Do not rerun account setup blindly or replace the existing backend. Preserve the two independent Skander accounts. Confirm backup/restore ownership and evidence retention before team release. A successful frontend build does not prove database permissions or data accuracy.

The Telegram collector remains a separate owner-run Python process. Pages does not run it or schedule report imports. Existing imported data remains in Supabase; ongoing freshness depends on that separate process.

## 3. Create a Git-connected Pages project

In the Cloudflare account that manages `repondly.com`, open **Workers & Pages**, choose **Create application**, then the **Pages** option and **Connect to Git / Import an existing Git repository**. Labels can vary. Choose Pages rather than a Worker deployment.

Authorize Cloudflare's GitHub integration for `Skanderba8/repondly-whizz`, preferably limiting repository access to this repository. Choose the repository and set:

| Setting | Value |
| --- | --- |
| Project name | `whizz-repondly`, if available |
| Production branch | `main`, after the intended release is merged there |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build:cloudflare` |
| Build output directory | `out` |
| Root directory | Repository root, leave blank |

If the static Next.js preset is unavailable, choose None and enter the same build command/output directory. Do not use `next-on-pages`, OpenNext, `next start`, or `.next` as the output for this static application. Pages installs the npm dependencies from the committed lockfile before building. No Wrangler dependency or Cloudflare API token is needed in the app.

## 4. Set production build variables before deploying

Add these to the **Production** environment in Pages, using the existing Supabase project's Connect/API keys screens or the existing local configuration:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing project's HTTPS API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing project's `sb_publishable_...` key |
| `NEXT_PUBLIC_CHROME_EXTENSION_URL` | Optional: approved `https://chromewebstore.google.com/detail/...` listing URL. Leave blank until available. |

The new build command reuses the app's environment schema and stops before Next.js builds when either Supabase value is missing or invalid. It does not contact Supabase or print either value. It expects dashboard environment variables; it does not load `.env.local` itself. Node 24 runs the shared TypeScript schema through its built-in type stripping.

These two Supabase values are intentionally browser-visible. Access depends on Auth and RLS. Never add a service-role/secret key, database connection string, or Telegram credentials to Pages. The app specifically expects a publishable key, not the legacy JWT-formatted anon key.

Select **Save and Deploy**. Wait for success and open the assigned `https://<actual-project>.pages.dev` URL. Build-time public variable changes require a fresh deployment, not just a browser refresh.

In **Settings > Builds > Branch control**, disable preview branch deployments initially. Leave preview variables without production Supabase configuration. Use a separate synthetic-data backend if preview deployments are enabled later. Pushes to the configured production branch trigger future deployments; keep that branch reviewed. The existing GitHub validation workflow remains manual and is not automatically a release gate.

## 5. Attach whizz.repondly.com

Open the Pages project, then **Custom domains > Set up a custom domain**. Enter `whizz.repondly.com` and follow Cloudflare's DNS confirmation. For a zone in the same Cloudflare account, Cloudflare can create the CNAME for you.

The expected DNS record is:

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `whizz` | The actual `<project>.pages.dev` hostname shown by Pages |

Use a hostname only in the target, without `https://` or a path. Associate the domain through Pages first; a standalone DNS record does not register the hostname with the project. If `whizz` already has a record, identify its current use before replacing it. Leave apex/root, `www`, email/MX, and unrelated records alone.

Wait for the custom domain and managed HTTPS certificate to become active, then open `https://whizz.repondly.com`. Do not add a wildcard DNS record or change nameservers for this setup. Avoid custom Cache Everything rules on the app hostname; preserve Pages' asset handling.

## 6. Set the Supabase production site URL

In **Supabase > Authentication > URL Configuration**, set **Site URL** to `https://whizz.repondly.com`. Keep additional redirect URLs limited to actual implemented auth flows; the current app uses email/password login and does not introduce a callback or reset route. Do not add a broad `*.pages.dev` allowlist. Site URL does not function as a CORS allowlist or replace RLS.

Users sign in again on the custom domain because browser sessions are stored separately by origin. There is no need to change the Supabase API hostname, move its database, or proxy it through `whizz.repondly.com`.

## 7. Owner acceptance and rollback

The owner performs these checks; the agent has not run them:

- HTTPS and a signed-out login screen on the custom domain.
- Open and refresh `/`, `/activity/`, `/reviews/`, and `/doordash/` directly.
- Sign in with synthetic employee and manager accounts; confirm own-only employee reads, expected manager reads, and separate identities.
- Confirm totals against approved source data and test a review upload, private evidence access, and a DoorDash entry.
- Confirm sign-out, denied/missing membership, mobile navigation, keyboard access, and recoverable network failures.

For build failures, read the Pages build log: confirm Node 24, dependency availability, the environment values, and output directory `out`. Do not change locked dependency versions speculatively. For a login configuration error, confirm the production variables and rebuild. For missing reporting RPCs or setup messages, resolve the existing Supabase setup rather than changing DNS. For a pending domain, inspect Custom domains and the exact `whizz` DNS record, including any conflicting record or certificate restrictions.

For a bad frontend release, open **Pages > Deployments**, select a prior successful production deployment, and use **Rollback to this deployment**. A first release has no prior deployment. Rollback restores frontend assets only; it does not revert Supabase data, migrations, function versions, or auth settings. Preserve backward-compatible backend changes and use a separately reviewed recovery procedure for backend issues.

## Official references

- [Cloudflare static Next.js deployment](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Cloudflare build image and Node overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Cloudflare GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare branch controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)
- [Cloudflare rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
