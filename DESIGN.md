# Product and UI direction

## Character
A premium, calm performance workspace with an editorial feel: clear typography, deliberate spacing, restrained color, and precise data presentation. Whizz Repondly is the working product name; brand assets are not yet approved.

Avoid interchangeable dashboard cards, rainbow metrics, decorative gradients, excessive rounded containers, and charts without a useful question. Do not imply a leaderboard or competition model before business approval.

## Composition
- Employee view: prioritize the selected period, points with calculation context, meaningful activity, and quick submission access.
- Management view: prioritize agreed team outcomes, period comparison, and drill-down to source records. Any targets or rankings need approval.
- Use a strong page hierarchy and fewer well-composed sections. Use tables for comparable records and charts only for trends worth inspecting.
- Provisional visual direction: warm neutral canvas, dark ink text, one controlled accent, tabular numerals, subtle borders, and limited elevation. Confirm a representative screen before broad UI implementation.
- Define semantic Tailwind tokens for color, type, spacing, radius, and focus. Customize shadcn/ui consistently rather than accepting an unstyled default appearance.

## Quality bar
- Responsive layouts for small phones through desktop; tables remain readable with intentional mobile alternatives or labeled horizontal scrolling.
- Target WCAG 2.2 AA: keyboard operation, visible focus, semantic structure, labeled controls, adequate contrast, and accessible validation messages.
- Do not rely on color alone. Give charts textual summaries and clearly label units, dates, period boundaries, and timezones.
- Cover loading, first-use empty, filtered empty, partial failure, permission denial, validation, success, and retry states.
- Keep motion restrained and honor reduced-motion settings. Confirm destructive actions and explain effects in plain language.
- Show evidence previews only to authorized users. Avoid customer details in decorative samples.

Visual review uses synthetic data, including long names, missing evidence, large totals, and empty periods. Owner review of one employee screen and one management screen is required before expanding the visual system.
