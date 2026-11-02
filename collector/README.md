# Personal Telegram collector

This is an owner-run Python process, separate from the static Next.js app. It reads your Telegram account's configured store groups using Telethon. It sends no Telegram messages, adds no bot, and writes only allowlisted CSR results to Supabase. It has not been installed, authenticated, run, or deployed by the agent.

The source roster in `config.example.json` contains only the 12 names supplied by the owner for matching. It contains no account IDs, emails, source messages, or performance data. Exact full-line name matching normalizes Unicode, whitespace, and case while preserving accents; it does not use fuzzy or substring matching. Unmapped account names are counted and skipped, never assigned to a guessed user.

## Setup

Interactive source configuration is available with `python collector/connect.py` from the repository root, after installing dependencies and setting TELEGRAM_API_ID/TELEGRAM_API_HASH. It signs in locally, lets the owner choose a store/group and a verified assistant report, and writes only configured source IDs into ignored config.local.json. Repeat for additional stores. It reads up to 500 recent messages in the selected group to find report candidates, prints identifiers/timestamps rather than message bodies, and imports no performance records. The session is reused by collect.py. This helper has not been executed by the agent.

1. Use Python 3.11 or later. Install `requirements.txt` into an isolated environment. On Windows, also install `tzdata` if your Python environment has no IANA timezone database.
2. Complete the Supabase setup in `../supabase/README.md`, including exact report-name/account mappings. Mapping is intentionally deferred until the owner identifies the account emails.
3. Copy `config.example.json` to ignored `config.local.json`. Set each group's numeric `chat_id` and the assistant's exact numeric `sender_id`. These are Telegram peer IDs, not display names or invitation links. Remove stores you are not ready to connect. The program refuses unconfigured sources.
4. Keep credentials in the process's private environment: `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Obtain your own API ID/hash through Telegram's API development tools. Do not put them in `NEXT_PUBLIC_*`, the config JSON, source control, or chat. The database credential is privileged and belongs only on the trusted machine running this collector.
5. `TELEGRAM_SESSION_PATH` optionally specifies a private session location. The default is `.secrets/telegram-owner` relative to the repository root. The session grants access to the Telegram account; protect it like a password. Session and journal files are Git-ignored. First-run phone/code/2FA prompts belong in your local terminal only.

From the repository root, explicitly choose the earliest **work date** to read:

```text
python collector/collect.py --config collector/config.local.json --since YYYY-MM-DD
```

This performs one scan. Add `--watch` to repeat every 120 seconds while the process remains running. It does not create a scheduled task, background service, or hosting account. It starts no web server. A machine running this process is required for continuing collection; static Cloudflare hosting cannot run a persistent Telegram account session.

## Report handling

Current owner setup restricts the local team_names allowlist to Skander Abdallah Ben. The full roster remains in the example for later onboarding; connect.py preserves the local allowlist and existing aliases. Only allowlisted names are parsed, even if other account profiles already exist in Supabase.

Chicago and Washington DC use `"topic": "general"`. The collector scans group history but ignores messages flagged as belonging to another forum topic before parsing/importing. Ordinary replies in General remain included. No `reply_to=1` history query is used: Telegram treats General differently from other topic threads. Setup automatically chooses General for forum groups. Reference: [Telegram forum topic semantics](https://core.telegram.org/api/forum). Specific non-General topics are not implemented. No Telegram configuration, messages, or existing database profiles are changed by this filter.

- Groups and assistant senders are checked by numeric ID. Report location must match the configured store aliases. The parser recognizes the supplied `Productivity Update` / `Yesterday’s Results` format, one `Location:` and one `CSRs` section. Unexpected layouts require reconciliation rather than a guessed import.
- The work date is the report's original send date in that store's timezone, minus one calendar day. Import time and edit time do not change the work date. Explicit differently dated reports are not supported yet. A report posted more than one day late needs owner reconciliation; the program cannot infer the actual work date from the supplied relative wording.
- Sunday through Saturday determines weeks by **work date**. A Sunday message about Saturday belongs to the preceding week; a Monday message about Sunday belongs to the new week. Months use the first through actual last local work date, including February.
- Points come directly from the CSR's `Total for the day` line. Activity counts and source dollar amounts are retained for inspection, never used to reconstruct points. Missing RTF revenue stays null, making the commission explicitly partial/unavailable.
- Only the matched person's parsed fields, store/work date, and source identifiers/timestamp are saved. Full group messages and other people's results are not persisted. Telethon's local session may cache dialog/entity metadata; its session file remains private.
- Retries compare the source chat/message/person identity. Identical results are skipped. Edits, another message for the same person/store/day, and ambiguous fields are flagged, never overwritten or added twice. No correction policy is invented. Reports are saved per person, so a scan can be partial; inspect the issue counts before relying on coverage.
- A scan rereads the selected window to catch late arrival and edits. Keep the chosen window bounded to the period you need. If a network/database failure stops a scan, rerun the same command; existing source identities prevent duplicate points. There is no automatic deletion or cleanup policy.

Prepared parser coverage uses synthetic names and values. Nothing has been executed. Live group access, sender IDs, matching, midnight/DST boundaries, late reports, duplicates/edits, authorization, and owner sample totals all require verification before live use.

References: [Telethon account sign-in](https://docs.telethon.dev/en/stable/basic/signing-in.html), [session files](https://docs.telethon.dev/en/stable/concepts/sessions.html).
