# Team installation through the Chrome Web Store

The app-side installation flow is prepared. The publisher account, registration payment, package build, screenshots, store upload/review, approval and website release have not been completed by the agent. Teammates cannot install from the sidebar until an approved listing is available and its URL is configured.

## Owner steps, in order

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Sign in with the Google account that should own future releases. Follow Google's publisher registration, contact verification and security requirements. Google requires a one-time registration fee; review the displayed amount before paying. No registration or payment has been made here.
2. Confirm the existing extension works with the intended production backend using the acceptance cases in [README.md](README.md). Use synthetic data for screenshots and reviewer access. Do not share an employee/manager's real credentials or records with Google reviewers.
3. Publish the website including the new public privacy notice at `https://whizz.repondly.com/extension/privacy/`. The workspace owner must review the notice against actual operations and complete their contact/retention practices before submission. This exact page is public without app login; the rest of the workspace stays behind existing authentication. Google requires an accurate accessible privacy policy for extensions handling user data.
4. In the repository root with the existing production-safe public Supabase values in `.env.local`, run:

   ```powershell
   npm run package:extension
   ```

   This builds the extension, derives a transparent 128 px store icon from the owner's existing icon, adds it to the generated manifest, and creates:

   ```text
   C:\Users\skand\Documents\apps\repondly_whizz\dist\whizz-repondly-chrome.zip
   ```

   The ZIP has `manifest.json` at its root and contains only the generated extension package. Source files, `.env.local`, collector configuration and private credentials are excluded by construction. The ZIP is generated/ignored output, not a file to commit. Do not share a package built against a test backend with the production team.
5. In the Developer Dashboard, choose **Add new item** and upload that ZIP. Use **Whizz Repondly** as the name. Suggested short description:

   > Quick review and DoorDash entry for your private Whizz workspace.

   Suggested detailed description:

   > Whizz Repondly gives authorized employees quick access to review screenshot uploads, DoorDash promo subscription entry, and personal monthly counts and bonus totals. Pin the extension, log in with your existing Whizz work account, and save entries from the toolbar popup. Unfinished drafts stay on the current Chrome profile. The full workspace remains available through Open app. A work account provided by your workspace owner is required. The extension does not read other websites or automatically detect subscriptions or reviews.

6. Complete the store listing's category/language/contact fields and supply the generated `dist/extension/icon-128.png` plus at least one accurate screenshot. Google's screenshot requirements currently allow 1280 x 800 or 640 x 400. Capture the actual popup with synthetic data inside an image at one of those sizes. Do not fake a working screenshot, include real staff/customer information, or claim automatic scraping. Additional store artwork may be requested by the current dashboard.
7. Complete **Privacy practices** truthfully. Single purpose: authorized Whizz review/DoorDash submission and personal tracking. Explain the one Supabase host permission as authentication, authorized tracker reads and user-requested record/evidence saves. The bundle runs packaged code, not remotely hosted executable code. Review Google's current data categories carefully: the implementation handles account identifiers/authentication data, employee work activity, subscription identifiers, user-provided notes and screenshots, and local drafts. Match disclosures to actual deployment and the public privacy notice; do not certify that the extension collects no data. If review requires a login, provide an owner-created restricted synthetic/demo account and instructions through Google's designated reviewer field, never a real team account or privileged key.
8. In **Distribution**, choose **Unlisted** for the simple team-link model. Anyone knowing the store URL can install the extension, but backend workspace membership still controls data access. Unlisted is not a substitute for authentication. If installation itself must be restricted to named Google accounts, use Google's Private/trusted-tester model instead and manage that tester list. Either choice goes through Google's policy review.
9. Submit for review and wait for approval. Follow any review feedback; no approval timeline is guaranteed. Verify that the final store URL is actually installable before enabling the app link.
10. Copy the approved listing URL. In Cloudflare Pages production build variables, set:

    ```dotenv
    NEXT_PUBLIC_CHROME_EXTENSION_URL=https://chromewebstore.google.com/detail/YOUR_LISTING_SLUG/YOUR_32_CHARACTER_EXTENSION_ID
    ```

    Replace both placeholders with the exact real listing values. IDs contain 32 lowercase letters from a through p. Set the same value in root `.env.local` if building the website locally. Do not use the developer dashboard URL. Leave the variable blank until a real listing exists.
11. Publish a new website build through your authorized release workflow. This is a build-time public variable: changing the dashboard setting alone does not change an already published website. The sidebar's **Add extension** link will then open the exact store listing directly. Without the variable, it opens the honest availability page at `/extension/` instead of a fake install/download.
12. Owner acceptance on a clean desktop Chrome profile: sign into the web app, click **Add extension** above the sidebar profile, confirm **Add to Chrome** / **Add extension** in Google's UI, pin it, log into the popup with an authorized test employee account, and verify review/DD saves and totals. Check collapsed-sidebar tooltip, new-tab behavior, keyboard access, mobile navigation, denied account access and the public privacy URL while signed out. No Developer mode, ZIP extraction, build tools or backend configuration should be required from teammates.

## The teammate experience

**Add extension in Whizz -> Chrome Web Store -> Add to Chrome -> confirm -> pin Whizz -> sign in once.**

Chrome controls the install confirmation. The website cannot silently install an extension or bypass the store. The website session is not copied into the extension. Pinning makes the popup available from the toolbar; it does not turn the website into an offline application.

## Future releases

Keep the same publisher account and store item so installed users retain the same extension ID. Increase `version` in `extension/vite.config.ts` before each package upload, rebuild with `npm run package:extension`, and upload the ZIP as an update to that existing item. Let Google review and distribute updates; teammates should not reinstall manually. Website releases and extension releases are separate. A backend public URL/key is embedded at build time, so backend configuration changes also require an extension release. Do not remove support for older installed extension versions without a compatible rollout.

## Official references

- [Publisher registration](https://developer.chrome.com/docs/webstore/register/)
- [Publish an extension](https://developer.chrome.com/docs/webstore/publish)
- [Unlisted and private distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Store icon and screenshot requirements](https://developer.chrome.com/docs/webstore/images)
- [Privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Install buttons link to the Web Store](https://blog.chromium.org/2018/06/improving-extension-transparency-for.html)
