# Data rules and open questions

## Known constraints
- Track activated subscriptions and customer reviews manually, with screenshot support.
- Provide daily, weekly, and monthly points and history.
- Support employee, manager, and admin roles; provide management insights.
- Telegram reports are a later input source.
- Use synthetic data by default. Real employee/customer data and production screenshots require explicit access authorization.

No formula, target, reporting timezone, approval workflow, or peer visibility is currently approved. Unknown values must stay unresolved rather than receiving convenient defaults.

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
