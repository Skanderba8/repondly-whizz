# Whizz Repondly: product requirements

## Purpose
A private performance workspace for approximately 12 customer support employees and their manager. `repondly.com` is already owned through Cloudflare. Hosting and domain configuration are not yet selected.

Help employees understand their own performance and help management review reliable team results without spreadsheet reconciliation.

## Roles and intended capabilities
| Role | Intended capability | Unresolved boundary |
| --- | --- | --- |
| Employee | View personal dashboard and history; submit subscriptions and customer reviews with screenshots | Editing, deletion, approval status, and visibility of peers |
| Manager | View team insights and employee performance | Team scope, evidence access, approval and correction rights |
| Admin | Manage access and configuration | Whether admins also see performance and whether manager/admin may overlap |

These are product intentions, not an approved permission matrix. Access defaults to denied until defined.

## Delivery scope
First release: invite-based private access; agreed role permissions; manual subscription and review records with protected screenshots; personal daily, weekly, and monthly points/history; manager team insights; traceable corrections.

Later: Telegram performance report import after manual records and reconciliation rules are stable. Design for a future source adapter; do not build an integration now.

No public registration, public leaderboard, billing, payroll, complex organization hierarchy, or native mobile app is currently requested.

## Acceptance targets
- Authorized employees can submit agreed record types, attach evidence, and inspect their own history.
- Points and period totals match owner-approved sample calculations and reconcile with source records.
- Management can inspect agreed team metrics with explicit date ranges and freshness information.
- Unauthorized users cannot read another employee's records or private evidence, including through direct API/storage access.
- Core flows work on mobile and desktop, with accessible forms and clear loading, empty, success, and error states.

## Decisions required
DATA_RULES.md tracks unresolved scoring, reporting periods, evidence, approvals, corrections, import, and retention rules. No scoring values or real employee data are approved.

## Current authorization
Planning documents only. No application implementation, package installation, account creation, deployment, DNS edits, Telegram connection, or real-data access is authorized by this phase.
