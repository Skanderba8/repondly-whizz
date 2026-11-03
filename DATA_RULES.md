# Data rules and open questions

## Known constraints
- Track activated subscriptions and customer reviews manually, with screenshot support.
- Provide daily, weekly, and monthly points and history.
- Support employee, manager, and admin roles; provide management insights.
- Automatic store-group productivity extraction is now requested for the core; see D23 and the latest rules below.
- Use synthetic data by default. Real employee/customer data and production screenshots require explicit access authorization.

The dated sections below partially resolve scoring and workflow rules. Unknown values must stay unresolved rather than receiving convenient defaults.

## Decision register
| ID | Owner decision needed | Blocks |
| --- | --- | --- |
| R01 | What may each role read/create/change/delete? Can roles overlap? Can employees see peers? Is management scoped to a team? | M2/M3 |
| R02 | Who invites users and assigns roles? What happens to access, sessions, ownership, and history when someone leaves? | M2/M3 |
| R03 | What qualifies as an activated subscription? Required identifiers, products, activation date, quantity, cancellations, and duplicates? | M4/M5 |
| R04 | What qualifies as a customer review? Which platforms, rating requirements, identifiers, and duplicate rules apply? | M4/M5 |
| R05 | Is evidence mandatory for each record? How many screenshots, allowed formats/size, authorized viewers, redaction, retention, and cleanup rules? | M4/M5 |
| R06 | Do submissions need approval? Who can approve/reject, can authors review their own records, and when does a record count? | M4/M5/M6 |
| R07 | Which timestamp determines a reporting period? What timezone, week start, month boundary, late-entry, backdating, and closed-period rules apply? | M4/M6/M7 |
| R08 | How many points for each eligible activity? Multipliers, caps, targets, bonuses, rounding, negative points, and treatment of unapproved records? | M6/M7 |
| R09 | Who can correct/delete records and for how long? Required reasons, audit visibility, reversal handling, and historical recalculation after rule changes? | M4/M6/M7 |
| R10 | Which management metrics and comparisons matter? Are targets, rankings, exports, or employee comparisons wanted and authorized? | M8 |
| R11 | What personal/customer fields are necessary? Which must be prohibited or redacted? What retention, deletion, data region, and backup retention apply? | Relevant schema/upload work and M9 |
| R12 | Telegram report examples, sender/channel access, frequency, employee matching, source authority, conflict handling, deduplication, and retry rules? | M10 and later import |

## Data integrity requirements to implement after approval
- Stable record IDs and explicit employee ownership; reject attempts to assign unauthorized owners.
- Server validation and database constraints for required values and allowed state transitions.
- Store event instants consistently; derive reporting boundaries from the approved business timezone. Do not infer it from a developer's device.
- Preserve sufficient source and correction history to explain totals. Agree retention before choosing deletion mechanics.
- Associate point calculations with their approved rules and eligible source records; define recalculation before changing scoring behavior.
- Generate evidence paths server-side and verify access independently of the visible page.
- For future imports, preserve source identity and define idempotency before accepting retries.

## Sample data policy
Use invented names, synthetic IDs, fabricated activities, and generated evidence containing no customer information. Label demo values and provisional UI totals as sample data. Do not encode an invented scoring rule in fixtures or tests; use owner-approved worked examples when scoring is implemented.

Owner answers should include at least one ordinary case and one edge case. Record accepted answers in this document and link the corresponding decision ID in DECISIONS.md before implementing dependent behavior.

## Approved access and review rules: 2026-11-02

See D17-D19 in DECISIONS.md. These decisions partially resolve the register; unresolved details above remain open.

- R01: Two initial roles: employee and manager. Employees view and submit only their own records and may edit their own pending records. Managers view the whole team's performance, subscription/review records, and screenshots and may edit those records. No deletion permission has been approved.
- R02: The owner creates work-email/password accounts in Supabase and assigns employee or manager access explicitly. Users log in and out; there is no public registration or app password-reset flow. Offboarding, session revocation requirements, ownership, and history handling remain open.
- R06: Managers may accept or deny submissions; a note is optional for both outcomes. Whether a manager can approve their own record, whether reviewed records may be reopened, and when records earn points remain open.
- R09: Employees may edit their own pending records. Managers may edit team records. Correction audit requirements, time limits, deletion, post-review transitions, and recalculation remain open.

Only account access and role lookup are implemented in this auth slice. Record editing, evidence access, and review actions need corresponding business schemas and RLS in subsequent milestones.

## Core workflow discovery: 2026-11-02

See D22 in DECISIONS.md. The owner supplied a report example for understanding the format. Do not copy its employee names or results into fixtures.

- Productivity results cover the previous day's work. Whizz IT Assistant posts them to chat roughly around 5 pm the following day, with variable arrival time. Arrival time is not the performance date or a reliable completeness cutoff.
- Only CSR sections and members of this team's roster are relevant. Mechanic sections and people outside the team are excluded. Roster identifiers, name matching, and unmatched-name handling need agreement before saving imports.
- CSR source fields include new subscriptions, bikes/batteries sold, RTF, RTC, accessories sold, associated dollar amounts, daily revenue, and a reported daily points total. The example does not establish per-type scoring formulas or prove that revenue determines points.
- Requested core surfaces are points, customer reviews, DoorDash tracking, and points totals by type. Input should be fast and simple; analytics should show useful actual data with a graph and concise labels.
- Still required: report entry method and authorized submitter; whether the reported points total is authoritative; per-type, review, and DoorDash scoring; review and DoorDash required fields and evidence; eligibility/approval and duplicate rules; reporting timezone and week start; and late/corrected report handling.
- Proposed, not approved: paste a report, preview team matches and the work date, then save. A trend and type breakdown can follow once the underlying rules are agreed. No automated chat integration is authorized by supplying this example.

## Owner core rules: 2026-11-02

This follow-up supersedes the paste-entry proposal and integration deferral above. See D23 in DECISIONS.md.

- Extract productivity messages from Whizz IT Assistant in store general groups, such as Brooklyn, Harlem, and Washington DC. Restrict saved results to team CSRs. Platform, authorized connection method, group/sender IDs, and roster mapping remain to be established. No external connection or real-data fetch has been performed.
- RTC earns 2 points per activity; accessories earn 1 point per activity. RTF earns either 2 or 3 points, with the applicable rate or condition unresolved. New-subscription and bike/battery-sale rates remain unresolved.
- One point is worth $0.50. An additional 2.5% of collected RTF revenue is earned. Keep this monetary component distinguishable from productivity points; conversion into points, rounding, and treatment of source-reported totals require clarification.
- Google Maps reviews are checked by people and logged manually. One eligible review earns $2. Required review identifiers, attribution, eligibility, duplicates, approval timing, and whether this payment also appears in point totals remain unresolved.
- DoorDash entry consists of a subscription number and a checkbox labeled "DD proof added". An attachment upload was not requested for this entry. Reward amount, eligibility when unchecked, duplicate rules, and verification remain unresolved. A checkbox is a declaration, not independent proof validation.
- Monthly points cover the first through the actual last day of the calendar month, including February. Reporting timezone remains unresolved.
- Shifts are inconsistent. The owner wants earnings assigned to the appropriate work week, but described a Saturday report as Sunday work, conflicting with the earlier previous-day description. Do not implement a date offset, week start, or weekend attribution rule until a concrete dated example resolves this.

Implementation remains dependent on the unresolved source, scoring, eligibility, and date rules. No rate is inferred from the supplied report, and no unconfirmed RTF rate is selected.

## Current core contract: 2026-11-02

D24 supersedes the unresolved source-authority, week-boundary, bonus eligibility, and manager-approval assumptions in the earlier discovery notes.

- The assistant's fully calculated CSR daily points total is authoritative. Do not reconstruct or adjust it from activity counts. New subscriptions are described as possibly 3 points and RTF as probably always 3; both remain unconfirmed and are not used for calculations. Bike/battery scoring is deferred. Activity-level points cannot be reliably broken down from this source.
- Productivity point value is $0.50 per reported point. RTF commission is 2.5% of the reported collected RTF money. Reviews are $2 per logged review, DoorDash is $5 per logged subscription. All three additional amounts stay separate from productivity points. Do not convert them into points.
- Reviews are checked by team members on Google Maps and logged manually with an arbitrary optional note and one screenshot. No rating, review link, customer identifier, or manager approval is required by the current entry contract. DoorDash requires only a subscription number and a "DD proof added" checkbox, plus store/work date for reporting. No DoorDash attachment or manager approval is required. The checkbox records a declaration, not an independent proof check or a new approval gate.
- Saved review/DoorDash entries immediately contribute their stated value to the personal tracker. Values are self-reported tracking amounts, not verified payment entitlements. Managers can inspect team entries and screenshots. No approval state or accept/deny controls exist in this slice. Corrections and deletion controls remain deferred.
- Weeks are Sunday through Saturday. Assign every record to its work date, never to the report's arrival/import week. A Sunday report for Saturday belongs to the previous week; Monday's report for Sunday belongs to the new week. Calendar months run from the first through the actual last day. Shift schedules vary, but hourly tracking is not requested and does not determine these totals.
- Each store uses its own local calendar. Supplied stores: New Jersey, Brooklyn, Philadelphia, Chicago, San Francisco, Washington DC, Union, Harlem. Union is confirmed as Manhattan, NYC. Configure America/New_York for the eastern stores and Union, America/Chicago for Chicago, and America/Los_Angeles for San Francisco. Store selection supplies date context for manual entries; it does not restrict authorized users to a guessed home store.
- The owner supplied 12 exact report names, recorded in collector/config.example.json for matching only. Account/email associations are unknown and must remain unset until the owner supplies them. Match normalized complete names, preserve accents, and skip unknown people. Never assign an unmatched result to the current account.
- Use the owner's personal Telegram account, not a group bot. Group/sender IDs and account authorization must be configured privately. Only configured assistant messages and allowlisted team CSR results are eligible for extraction; do not retain whole group messages or outsiders' results.

Still unresolved: business duplicates across separately submitted manual entries, corrections/reversals, special delayed reports whose wording does not identify the actual work date, retention, offboarding, final payout rounding, and historical rate changes. None is silently implemented. Exact duplicate source imports and retries reuse stable identities; conflicting daily source reports are flagged instead of overwriting data. Commission retains fractional cents in Postgres and displays up to four dollar decimal places without a payout rounding rule.

Screenshot implementation supports one PNG/JPEG/WebP with private record-scoped access. D38 sets a maximum of 10 MiB (10,485,760 bytes) per screenshot. Apply the limits migration before enabling uploads; no retention period is assumed. Notes have a technical 4,000-character limit. Image signatures/containers are checked at the trusted endpoint; no full image-decoder or malware scan is claimed.


## Review screenshot refinement: 2026-11-03

D38 confirms 10 MB per image (implemented as 10 MiB). One required PNG/JPEG/WebP remains the contract. Store-local today is the default and the work date remains editable. Before store selection, Eastern today is shown as a calendar convenience and saving still requires a store. The note is optional, compact, and retains its 4,000-character cap.

Technical resource guards cap screenshots at 24 million pixels and 16,384 pixels per side in both browser and trusted endpoint. Browser decoding catches unreadable files for normal users; PNG re-encoding is lossless and used only when smaller, without resizing or lossy JPEG/WebP recompression. Original files remain when smaller; metadata removal is therefore not guaranteed. The endpoint checks size, raster headers/containers, MIME agreement, dimensions, authenticated ownership, membership, profile, store, and request identity. Full trusted image decoding and malware scanning are not implemented. Retention, storage-capacity operations, business duplicate detection across new entries, and correction/deletion rules remain unresolved.


## Review editing and deletion: 2026-11-03

D39 supersedes the deferred review correction/deletion rules for this workflow. Employees may edit and permanently delete their own reviews; managers may edit and delete any review. No time window or manager approval is required. Editing permits store, work date, optional note, and optional screenshot replacement; omitting a replacement keeps the existing screenshot. Ownership, record identity, creation timestamp, review kind, and fixed $2 value cannot be edited. These permissions do not authorize DoorDash or productivity mutations.

Updating store/work date moves the existing $2 review to the corresponding reporting period; deleting removes its contribution. Replacing a screenshot deletes the previous object, and deleting a review deletes its stored screenshot through the Storage API. There is no undo. Minimal mutation receipts retain actor/owner/record IDs, action, request hash, prior version, old/new store/date, cleanup paths, and timestamps, without image bytes or note contents. This supports correction traceability and safe retry, not a complete before/after content archive. General backup retention and offboarding rules remain unresolved.

A database mutation and object-store deletion cannot be one atomic transaction. The row change and cleanup receipt commit together; the endpoint then removes actual Storage objects and marks completion. Until cleanup succeeds, the app reports unfinished cleanup and allows only the same operation retry. Removed/replaced images lose new record-scoped read access immediately; existing signed URLs have their existing short expiry and object deletion invalidates the object. Unfinished cleanup remains recorded for owner recovery. A record version rejects concurrent stale edits; repeated identical operations reuse a receipt rather than applying twice. A deleted ID cannot be resurrected by a delayed original-save retry.


## DoorDash management and monthly entry history: 2026-11-03

D41 extends the owner-approved review management permissions to DoorDash: employees edit/delete their own entries; managers edit/delete all team entries. Editable fields are store, work date, subscription number, and DD proof added. Ownership, entry ID, creation timestamp, kind, and the fixed $5 amount cannot be changed. Proof remains a declaration, with no photo upload or approval gate. Deletion permanently removes the row and its $5 contribution; there is no undo. A work-date correction moves the same entry between reporting periods rather than adding another bonus.

DoorDash changes use an authenticated transactional RPC deriving actor/role from Auth and owner-assigned membership. Mutation receipts record IDs, actor/owner, action, request fingerprint, prior version, old/new store/date, and creation time. No plaintext subscription number is retained in receipts. Same-operation retries acknowledge the original commit; stale versions cannot silently overwrite newer edits. Deletion receipts prevent delayed creation retries from resurrecting an entry. Do not purge receipts without preserving an equivalent tombstone. General retention and complete content-level correction audit remain unresolved.

D42 replaces the large reporting controls on Reviews and DoorDash with a month selector attached to their Records section. It defaults to the current store-local month and filters the full calendar month, including its last day; this changes those entry-history screens only. Manager owner/team scope remains available. Overview and Activity retain their existing range controls and accounting rules.

## Overview presentation and anonymous benchmarks: 2026-11-03

D44 supersedes four-decimal currency display: show dollars with exactly two decimal places and points with at most two decimal places. Keep full stored/calculated precision; final payout rounding remains unresolved. Category count/revenue comparison meters use the selected individual's selected-period value divided by the largest known individual total for that same category/metric/period among mapped current workspace members. Null source values do not become zero; maxima use known source values without claiming collection completeness. A zero maximum produces a zero-length bar. Team aggregate view is explicitly labeled and is not compared to an individual maximum. Authenticated employees and managers may read anonymous category maxima only; this does not authorize employee access to peer source rows, identities, evidence, or individual histories.

## Manager reporting contract: 2026-11-03

D50-D52 authorize manager-only multi-person/multi-store reporting. Null filter arrays mean All; explicit arrays mean the intersection of saved owner/store IDs with the inclusive work-date range. Empty arrays produce no matching events. A person's profile home store is metadata, not a reporting filter. All mapped profiles remain selectable and appear with zero display totals if no records match. Store rows include selected configured stores with no matching records. Accounts remain independent.

Authoritative points are summed from imported reports; point value remains points × $0.50. Collected revenue is the sum of numeric source total_revenue_cents, not category-revenue sums or point conversion. Extra bonuses are server-calculated RTF commission + logged review amounts + logged DoorDash amounts; estimated earnings add point value. Review/DD counts and money remain separately attributable. Manager record output projects stored report rtf_commission into fractional cents for the shared Bonus display; it does not change stored rows. Category counts/revenue are the requested substitute for undefined category-point allocation. Missing fields increment source-missingness counts and are not repaired in storage.

Previous period is exactly N inclusive days immediately before the selected start, where N is the selected period's length. It uses the same people/store intersection. Charts align preceding data by day offset before applying the same calendar bucket boundaries; this is not a same-weekday comparison. Clip first/last buckets to the selected interval. Numeric deltas require actual current/prior records for the relevant metric; missing source revenue blocks a complete-revenue-change assertion. Relative employee bars use the highest currently selected known metric value, with zero scale handled explicitly. No performance target, attendance rule, productivity quality score, or final payment entitlement is inferred. Migration 009 and owner reconciliation/security/UI acceptance are pending.

## Employee-only manager reporting roster: 2026-11-03

D53 excludes all role=manager identities and their records from the reporting roster, not merely one name. Managers read employee profiles and employee-owned reports/bonus entries only; their own manager profile is also excluded. This affects manager/legacy reporting aggregates, selected people, profile lists, period and store/category totals, history, evidence read visibility, and anonymous employee benchmarks. Employee self-read remains available for role=employee; manager accounts authenticate independently of a visible tracker_people row. Manager-owned stored rows and account associations remain preserved. The separate Skander employee identity remains a reporting subject if its membership is employee. No account merge, hardcoded name exclusion, ownership reassignment, destructive deletion, or scoring/payout change is authorized.
