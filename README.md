# Whizz Repondly

A private support-performance workspace, currently at the application foundation stage. The public preview contains no employee/customer data and no authentication or record mutations yet.

## Local setup
Use Node 24 and npm. Run `npm ci` after cloning. Copy `.env.example` to `.env.local` if needed, then supply the Supabase project URL and publishable key. Never use a secret or service-role key in public environment variables. Existing local configuration should be preserved.

Run `npm run dev` when you want a local development server. It has not been started by the agent.

## Owner verification
Commands are prepared but have not been executed:
```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```
The browser tests serve the built `out` folder on port 4173 and exercise desktop/mobile navigation, direct-route refresh, and keyboard access. Unit tests cover current-page navigation semantics and public configuration validation. No live Supabase credentials or network access are needed for these tests. GitHub Actions provides the same flow through manual dispatch; automatic triggers are intentionally disabled for now.

## Cloudflare Pages
Connect the GitHub repository after the feature branch is reviewed and merged. Use Pages, production branch `main`, build command `npm run build`, output directory `out`, and Node 24. Add the two variables from `.env.example` to the production build environment before implementing auth. Public values are compiled into the bundle, so changes need a rebuild. Do not give preview builds production credentials when real-data features are introduced.

Attach `whizz.repondly.com` through the Pages project's Custom domains flow after the first successful deployment. Cloudflare hosting and DNS have not been configured by this scaffold.

## Structure
- `src/app`: static routes, layout, and semantic theme tokens.
- `src/components`: shared shell/navigation and shadcn primitives.
- `src/lib`: validated environment configuration and lazy browser Supabase client.
- `tests/unit`, `tests/e2e`: prepared Vitest and Playwright coverage.
- `public/_headers`: Cloudflare response headers.

Feature modules and Supabase migrations will be added when their first feature needs them. See ROADMAP.md for status and DATA_RULES.md for decisions required before implementation.
