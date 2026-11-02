# Whizz Repondly: working agreement

## Scope and source of truth
- Read only the documents and files needed for the task. Ask when required context is missing.
- The owner authorized M1 application foundation and dependency installation on 2026-11-02. Business features follow the roadmap; merge, deployment, and service provisioning require authorization for those actions.
- Use PRD.md for scope, DATA_RULES.md for business rules, ARCHITECTURE.md for boundaries, and ROADMAP.md for status.
- Never silently turn an unresolved rule into application behavior. Record decisions in DECISIONS.md.
- Use anonymized, synthetic data until real-data access is explicitly authorized.

## Implementation conventions
- TypeScript with strict checking. Prefer small, named functions and explicit domain types; avoid `any` and unnecessary abstractions.
- Use Next.js App Router. Under the proposed static hosting approach, Server Components generate public shell markup at build time; authenticated runtime reads and interactions use Client Components. Do not introduce request-time Next.js features without revisiting hosting.
- Group domain code by feature. Validate external input at server boundaries with a shared schema library chosen during setup.
- Use Tailwind tokens and shadcn/ui primitives consistently. Follow DESIGN.md.
- Use descriptive names: PascalCase components, camelCase functions, kebab-case feature folders. Never use em dashes in code.
- Keep secrets and privileged Supabase clients server-only. Never trust browser-supplied identity, role, ownership, or point totals.
- Keep changes focused. Add dependencies only for a concrete need; document significant tradeoffs.

## Feature workflow
1. Plan: define user outcome, allowed roles, acceptance criteria, data changes, unknowns, and test cases. Resolve blocking rules with the owner.
2. Implement: make the smallest complete change, including validation, access policies, loading, empty, and failure states.
3. Review: assess correctness, role access, accessibility, privacy, migration safety, and fit with the acceptance criteria.
4. Verify: prepare and, when execution is authorized, run the relevant checks described in ARCHITECTURE.md. Report actual results and skipped checks accurately.
5. Record: update ROADMAP.md, document business decisions, and summarize the change and remaining limitations.

## Execution preferences
- Do not start a dev server, run server checks, diff checks, or inline checks. The owner will check changes.
- Do not run other checks unless the owner explicitly requests them. Planned coverage and executed verification are distinct.
- Finish the conversation when the requested code or documentation changes are made. Do not expand scope.

## Git and delivery
- Use a short-lived branch per milestone or feature, with a descriptive name such as `feat/subscription-entry` or `docs/project-plan`.
- Use small commits with imperative messages. Do not commit secrets, real screenshots, generated build output, or local environment files.
- Never overwrite unrelated work, force-push, or make destructive changes without explicit authorization.
- A PR describes the outcome, acceptance criteria, data/security changes, validation results or skipped checks, and material limitations.
- A reviewer must assess authorization and data changes before merge. If no separate reviewer is available, record self-review and obtain owner review.
- Do not claim a milestone is complete until its completion criteria and required owner checks are satisfied. Merge and deployment need owner authorization.
