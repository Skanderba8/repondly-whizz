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

Same-message duplicate rule (2026-11-03): when the exact normalized CSR name has multiple valid blocks inside one Telegram message, keep only the whole block with the highest estimated report bonus: reported points x $0.50 plus RTF revenue x 2.5%. Never add the blocks or combine their individual fields. Identical blocks collapse to one. Conflicting equal-highest blocks or duplicates with unknown RTF revenue remain pending for reconciliation because a unique highest complete result cannot be determined. Other people and other Telegram messages are never compared by this rule; existing cross-message daily conflicts and edited-source protections remain unchanged. Restart a running collector to apply this parser change; its pending message queue retries automatically. No full history rescan is required for previously pending messages. Regression coverage is prepared but not executed.

The collector now defaults to the full approved team roster in config.example.json, including when local team_names still contains only Skander Abdallah Ben. Only exact mapped profiles receive imports. Use --configured-roster explicitly for a restricted local allowlist; connect.py preserves that saved allowlist and existing aliases. Source IDs, topics, and store aliases are unchanged.

Chicago and Washington DC use `"topic": "general"`. The collector scans group history but ignores messages flagged as belonging to another forum topic before parsing/importing. Ordinary replies in General remain included. No `reply_to=1` history query is used: Telegram treats General differently from other topic threads. Setup automatically chooses General for forum groups. Reference: [Telegram forum topic semantics](https://core.telegram.org/api/forum). Specific non-General topics are not implemented. No Telegram configuration, messages, or existing database profiles are changed by this filter.

- Groups and assistant senders are checked by numeric ID. Report location must match the configured store aliases. The parser recognizes the supplied `Productivity Update` / `Yesterday’s Results` format, one `Location:` and one `CSRs` section. Unexpected layouts require reconciliation rather than a guessed import.
- The work date is the report's original send date in that store's timezone, minus one calendar day. Import time and edit time do not change the work date. Explicit differently dated reports are not supported yet. A report posted more than one day late needs owner reconciliation; the program cannot infer the actual work date from the supplied relative wording.
- Sunday through Saturday determines weeks by **work date**. A Sunday message about Saturday belongs to the preceding week; a Monday message about Sunday belongs to the new week. Months use the first through actual last local work date, including February.
- Points come directly from the CSR's `Total for the day` line. Activity counts and source dollar amounts are retained for inspection, never used to reconstruct points. Missing RTF revenue stays null, making the commission explicitly partial/unavailable.
- Only the matched person's parsed fields, store/work date, and source identifiers/timestamp are saved. Full group messages and other people's results are not persisted. Telethon's local session may cache dialog/entity metadata; its session file remains private.
- Retries compare the source chat/message/person identity. Identical results are skipped. Edits, another message for the same person/store/day, and ambiguous fields are flagged, never overwritten or added twice. No correction policy is invented. Reports are saved per person, so a scan can be partial; inspect the issue counts before relying on coverage.
- The first incremental scan reads the selected window oldest first and saves progress in ignored .secrets/collector-progress.sqlite3. Later scans read only newer message IDs and retry individual failed messages. Newly posted messages are collected even after a quiet period. Previously successful historical messages are not reread for edits automatically; use --rescan for explicit reconciliation. Existing database points remain stored and identical results are skipped. There is no automatic deletion or cleanup policy.

Prepared parser coverage uses synthetic names and values. Nothing has been executed. Live group access, sender IDs, matching, midnight/DST boundaries, late reports, duplicates/edits, authorization, and owner sample totals all require verification before live use.

References: [Telethon account sign-in](https://docs.telethon.dev/en/stable/basic/signing-in.html), [session files](https://docs.telethon.dev/en/stable/concepts/sessions.html).

## July history and mapped-team mode

The owner authorized July 1, 2026 onward collection for the approved team roster with confirmed account mappings. Use:

```text
python collector/collect.py --config collector/config.local.json --since 2026-07-01 --mapped-team
```

`--mapped-team` explicitly selects the default: config.example.json's approved names in memory. It does not rewrite config.local.json, source IDs, topic choices, aliases, or saved own-only settings. Use --configured-roster to opt into the saved local allowlist. The collector prints mapping coverage before scanning, skips unknown account mappings without guessing, and prints observed mapped work dates and issue counts for each store and person. Those ranges describe observed records, not proof that every shift or source message was collected. Existing source identities and person/store/day constraints still prevent duplicate imports; edited/conflicting reports require reconciliation. A persistence conflict for one person no longer skips later people in the same parsed message. A malformed report still fails parsing without guessing results.

Before backfilling, run ../supabase/audit-team-mappings.sql in the trusted SQL Editor. It compares the 11 confirmed emails to Auth accounts, memberships, report-name ownership, and stored report counts/date ranges. Chams remains explicitly unmapped. Resolve missing mappings with configure-team.sql; stop for owner reconciliation on conflicting identities. The audit does not move records or establish that stored totals match Telegram. Everyone uses the same app dashboard and database calculations, scoped by their authenticated UUID; manager-only team visibility remains role-controlled. Run the historical command again after mapping accounts to import previously skipped names. A collector already running must be restarted to use these code changes.

Use the same command with `--watch` for continuing 120-second scans. The dashboard's 60-second background refresh reads Supabase only and cannot replace the collector. Exact account mappings keep the employee report identity and the separately named manager tracker independent. No historical scan or local configuration changes were executed by the agent.

## Windows launcher and verified environment

### Incremental daily operation (2026-11-03)

After setting credentials in the private PowerShell environment, start:

```powershell
.\collector\run.ps1 --config collector/config.local.json --since 2026-07-01 --mapped-team --watch
```

Keep the same --since value on future runs. The first run of this version makes one history pass to establish its cursor, comparing previously stored reports without adding them twice. Saved progress survives Ctrl+C, terminal closure, and computer restarts. Subsequent polls every 120 seconds request newer Telegram messages plus failed message IDs, not the entire July history. Network/database interruptions in watch mode retry from saved progress. A crash after a database insert but before saving the cursor safely rechecks the same source record on restart.

Progress is scoped by Supabase project, store/source settings, earliest date, approved roster, and resolved account IDs. Changing that scope intentionally starts a history pass so newly mapped colleagues are not skipped. Unmapped names and parser/persistence failures retain their message IDs in a retry queue while newer messages continue. Deleted/unavailable queued messages stay flagged for owner reconciliation. Progress stores only hashed scope keys and message IDs, never credentials or message bodies. Keep .secrets/collector-progress.sqlite3 on the machine running collection; a different machine or missing progress file performs a fresh idempotent history pass. A cleared/restored database requires --rescan because local progress cannot detect missing historical database rows.

For old message edits or a deliberate history reconciliation, run once:

```powershell
.\collector\run.ps1 --config collector/config.local.json --since 2026-07-01 --mapped-team --rescan
```

Conflicting totals are still flagged without overwriting stored records. With --rescan --watch, the explicit rescan runs once and later polls are incremental. This change does not create a Windows startup task or hosted process: the collector machine must remain awake with the process running. No new migration, dependency, or frontend deployment is needed for these collector changes. Prepared progress/retry regression coverage has not been executed.

Telegram retrieval uses ascending history and exclusive message offsets documented in [Telethon iter_messages](https://docs.telethon.dev/en/stable/modules/client.html#telethon.client.messages.MessageMethods.iter_messages).

Use the repository's Python environment rather than a global `python` command. The project's `.venv` already contains Telethon 1.45.0 and tzdata 2026.6. From the repository root:

```powershell
.\collector\run.ps1 --config collector/config.local.json --since 2026-07-01 --mapped-team
```

Equivalent explicit interpreter:

```powershell
.\.venv\Scripts\python.exe collector/collect.py --config collector/config.local.json --since 2026-07-01 --mapped-team
```

For a fresh machine, create `.venv` using an installed Python and run `.\.venv\Scripts\python.exe -m pip install -r collector/requirements.txt`. The launcher never installs packages or changes the user's environment automatically. Credentials still belong in the current terminal's private environment; `--help` validates imports and CLI setup without reading Telegram or Supabase.

## Verification run: 2026-11-02

Owner-authorized checks executed: Python 3.14.7 project environment, Telethon 1.45.0, tzdata 2026.6, launcher --help, and 11 parser/roster/topic tests all passed. A global python command is a different interpreter and need not contain project dependencies. No Telegram sign-in, messages, reports, or live Supabase writes were performed during verification.
