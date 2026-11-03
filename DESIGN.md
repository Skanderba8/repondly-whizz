# Whizz Repondly design system

Design specification revised 2026-11-02. Scope: a private performance workspace for approximately 12 support employees and their manager. This document defines the intended visual system, not completed application behavior or authorization to build new features.

## 1. Direction and product boundaries

Whizz Repondly should feel precise, energetic, and calm: premium analytics with Whizz's electric lime identity, confident dark typography, white surfaces, and generous working space. The signature is a strong points figure, a fine lime accent, and a disciplined arrangement of supporting information. Most of the screen stays neutral.

Use Linear as a reference for hierarchy, Vercel for spacing discipline, Stripe Dashboard for metric clarity, and Raycast for compact navigation and immediate feedback. These are qualities to pursue, not layouts or assets to copy. No gradients, glass effects, decorative illustrations, emoji UI, glowing charts, or oversized marketing headings.

### Source of truth and implementation status

- `PRD.md` controls product scope, `DATA_RULES.md` controls business rules, `ARCHITECTURE.md` controls technical boundaries, and `ROADMAP.md` controls implementation status. This document controls visual presentation only.
- M1 is implemented as a foundation awaiting owner verification. Authentication, submissions, performance reporting, and management insights remain future milestones. Designs below must not be presented as already working features.
- Later confirmed decisions in `DECISIONS.md`, especially D16, explain why the foundation exists despite earlier planning-only wording in the PRD and architecture. This revision does not resolve those documents' status wording or authorize further implementation.
- Permissions default to denied. A manager label does not establish team scope, evidence access, or correction rights; an admin label does not imply access to performance data.
- The design-document revision originally changed `DESIGN.md` only. The owner subsequently authorized applying this system to existing application screens on 2026-11-02 (D20). Business questions remain in the existing decision register; visual choices do not answer them.

### Scope matrix

| Experience | Design treatment | Delivery gate |
| --- | --- | --- |
| Private invitation and sign-in | Required first-release flow; no public signup | M2/M3, R01/R02, approved onboarding and recovery method |
| Subscription and review logging with protected evidence | Required first-release flow; fields and evidence rules unresolved | M4/M5, R03-R07/R09/R11 |
| Personal daily, weekly, monthly points and history | Required first-release flow; no invented formulas | M6/M7, R07-R09 |
| Team summaries and employee drill-down | Required management direction; exact metrics and scope unresolved | M8, R01/R10 |
| Administrative access management | Intended admin capability; no default performance access | M2/M3, R01/R02 |
| Historical comparisons, category breakdowns, activity counts | Conditional analytics within approved reporting contracts | R07-R10; approved definitions and comparable data |
| Leaderboards, medals, peer comparisons | Conditional design only; omit from initial navigation | R01/R10, ranking metric, ties, eligibility, audience |
| Personal bests, weekly achievements, goals, streaks | Conditional design only; no new scoring or targets | Explicit owner approval and reliable eligibility/history rules |
| Approval queues and approve/reject controls | Conditional design only | R01/R06/R09 |
| Telegram report ingestion and imported report history | Later phase only | M10, R12 |
| Notifications, exports, global search, billing, payroll | Not part of the initial UI; no placeholder controls | Separate scope approval; exports also depend on R10 |

Do not show disabled navigation teasers for unapproved features. In a synthetic foundation preview, label data clearly as sample and identify unavailable capabilities. In production, ship only approved capabilities and distinguish genuine no-data states from unavailable calculations.

### Design principles

1. Make the next useful action obvious. Each page has one main purpose and normally one lime primary action.
2. Establish hierarchy with size, spacing, and alignment before adding color or cards.
3. Show the period, units, source context, and freshness alongside results. An attractive number without a reliable definition is not a KPI.
4. Use progressive disclosure: a summary leads to a trend, then records, then authorized evidence and correction details.
5. Keep performance encouraging and factual. Do not invent targets, shame lower results, or imply that activity volume measures all aspects of work.
6. Keep the system small. Reuse a few component variants, one shell, and one reporting-period pattern.

## 2. Screenshot inspiration and deliberate improvements

The two owner-supplied Whizz ERP screenshots are visual references only. Their operational content, customer information, assets, identifiers, and workflows must not be copied into fixtures, documentation examples, or Repondly features. No screenshot files are added to the repository.

| Observed in the references | Preserve | Refine for Repondly |
| --- | --- | --- |
| Electric lime logo treatment and primary action pills | Recognizable lime action accent and near-black lettering | Reserve solid lime for small actions and meaningful highlights; never a full dashboard background |
| White modules on a light-gray workspace | Clear separation between canvas and working surfaces | Use a lighter, slightly green-neutral canvas and fewer enclosing panels |
| Bold dark section titles and compact line icons | Confident headings and functional iconography | Increase body legibility and use a consistent type scale and icon stroke |
| Rounded corners, pale green status strips, pastel badges | Friendly geometry and soft semantic states | Use one status vocabulary, compact badges, and restrained tint coverage |
| First screenshot: narrow sidebar, broad main work area, secondary detail column, collapsible sections | Stable navigation and summary-to-detail relationships | Two clear content levels; details in a sheet or dedicated view rather than repeated nested cards |
| First screenshot: dense table, small metadata, several competing action colors | Aligned tabular information and visible actions | Readable rows, one primary action, neutral secondary actions, metadata disclosed on demand |
| Second screenshot: three dense columns with financial summaries and a chronological activity column | Strong numerical alignment and traceable activity | One dominant metric region, one main visualization, and a quieter history section |
| Second screenshot: multiple blue, purple, green, and red panels | Color as a cue when it has meaning | Neutral panels; distinct semantic status colors; stable chart-series colors only |
| Both: crowded icon toolbars and tightly packed content | Fast access to relevant tasks | At most one primary action and two visible secondary actions; move rare actions into a labeled menu |

The palette below is an intentional design selection informed by the screenshots, not a claim of exact color sampling or official brand tokens. Use `#C4FF4D` as the Repondly brand lime. Preserve the real Whizz logo only when a clean, authorized asset is available; do not crop the ERP screenshot or reconstruct the logo. Until then, use a plain text brand lockup, not an invented brand mark.

The previous design document lacked concrete tokens, a dark theme, component geometry, page blueprints, and workflow states. This specification supplies them. It also reconciles the requested long sidebar with the architecture's compact navigation and explicitly separates proposed analytics from approved business behavior.

## 3. Color and theme tokens

Token names are the implementation contract. Values are opaque colors unless noted. Consume semantic tokens through Tailwind and shared primitives; do not scatter hex values through feature components.

### Core palette

| Semantic token | Light | Dark | Intended use |
| --- | --- | --- | --- |
| `background` | `#F6F7F5` | `#111411` | Application canvas |
| `foreground` | `#181A1B` | `#F3F5F0` | Primary text |
| `card`, `popover` | `#FFFFFF` | `#1A1F1A` | Content panels, dialogs, menus |
| `card-foreground`, `popover-foreground` | `#181A1B` | `#F3F5F0` | Text on those surfaces |
| `muted` | `#EFF2EC` | `#242B24` | Quiet inset, hover surface, skeleton base |
| `muted-foreground` | `#5F685F` | `#ADB7AA` | Secondary text, chart axes, captions |
| `subtle-foreground` | `#687267` | `#99A594` | Tertiary metadata; never essential text at reduced opacity |
| `border` | `#E2E7DE` | `#354035` | Decorative dividers and panel edges |
| `input` | `#7A8378` | `#74816F` | Essential control boundary, checkbox outline |
| `primary`, `brand` | `#C4FF4D` | `#C4FF4D` | Primary action and small brand accents |
| `primary-foreground` | `#17191A` | `#17191A` | Text/icons on lime |
| `primary-hover` | `#B5EF3B` | `#D0FF75` | Primary hover |
| `primary-active` | `#A5DE2D` | `#B5EF3B` | Primary pressed |
| `primary-border` | `#526C24` | `#C4FF4D` | Defined primary-button boundary |
| `secondary` | `#EFF2EC` | `#283128` | Neutral secondary buttons |
| `secondary-foreground` | `#181A1B` | `#F3F5F0` | Neutral button text |
| `accent` | `#EDF7DA` | `#2B3A20` | Selected navigation and subtle selection |
| `accent-foreground` | `#304914` | `#DCF6BA` | Text/icons on selected surface |
| `link`, `ring` | `#365D19` | `#C4FF4D` | Text links and visible focus |
| `ink` | `#17191A` | `#17191A` | Brand lettering, not default dark-mode text |
| `overlay` | `rgba(17,20,17,0.40)` | `rgba(0,0,0,0.64)` | Modal scrim |

Lime is not a text color on white. Primary actions use dark text and a defined border; selected states use a pale fill, strong text, and a leading marker. The decorative `border` token is too subtle to serve as the sole visual boundary of an input or focus indicator. Links in prose are underlined, not distinguished by color alone.

### Semantic states

Use the foreground for text/icons and the background for badges or small callouts. Do not paint a whole KPI card with a semantic background.

| State | Light foreground / background | Dark foreground / background | Meaning |
| --- | --- | --- | --- |
| Success | `#166534` / `#ECF8EF` | `#8EE5AA` / `#183522` | Confirmed persistence or an explicitly successful state |
| Warning | `#854D0E` / `#FFF6DD` | `#F5D174` / `#3D3017` | Needs attention under an approved rule |
| Error / destructive | `#B42318` / `#FFF0ED` | `#FFB4AB` / `#411F1C` | Failed operation, invalid input, authorized destructive action |
| Information | `#2455A4` / `#EDF4FF` | `#AAC9FF` / `#1C2E49` | Helpful context, processing information |
| Neutral | `#52604E` / `#EFF2EC` | `#BEC9B7` / `#2A3328` | Neutral states and non-evaluative change |

Expose paired names such as `success-foreground` and `success-background`; follow the same naming for warning, error, info, and neutral. Map shadcn's `destructive` to the error foreground in light mode and `#F97066` in dark mode, with `#FFFFFF` and `#17191A` respectively as `destructive-foreground`. Prefer an outlined destructive action except for the final confirmation button.

Brand lime and semantic success green have different jobs. Lime says “primary” or “selected”; success green says an outcome succeeded. A stored screenshot does not earn a success badge implying business validation.

Performance change uses a signed number, directional icon, and comparison label. `performance-positive` may alias success and `performance-negative` error only when the metric's approved meaning makes that interpretation valid. An increase is not automatically good. Unknown direction, incomplete comparisons, and non-evaluative activity changes use neutral text. Zero change reads “No change”; unavailable comparison reads “Comparison unavailable,” never `0%`.

### Chart series

| Token | Light | Dark | Default role |
| --- | --- | --- | --- |
| `chart-1` | `#456B22` | `#C4FF4D` | Points, primary series |
| `chart-2` | `#3369B8` | `#8AB4FF` | Subscriptions, when shown by type |
| `chart-3` | `#7851A9` | `#C7A5F4` | Customer reviews, when shown by type |
| `chart-4` | `#936413` | `#E8BE64` | Additional approved category only |
| `chart-comparison` | `#6B7369` | `#B0BAAA` | Prior comparable period, dashed stroke |
| `chart-grid` | `#E2E7DE` | `#354035` | Quiet horizontal reference lines |

The primary line is dark green on light surfaces so it remains visible; lime may fill bars with a `chart-1` outline or a small highlighted marker. Use series labels, markers, and dash patterns alongside color. Limit charts to three simultaneous series by default. Assign colors consistently across pages and themes, not by array position after filtering.

### Dark theme behavior

Light is the first-visit default. Provide Light, Dark, and System appearance choices in the profile menu/settings; System applies only when chosen. Persist only the appearance preference locally. Dark mode uses the token pairs above, never an inverted screenshot or translucent white cards. Inputs, selected rows, badges, menus, skeletons, charts, and focus rings all change together. Use borders and surface steps rather than large dark shadows. Evidence images keep original colors with a neutral frame. Theme changes do not animate colors across the entire page, and first paint should honor a stored preference without exposing private markup.

## 4. Typography, spacing, and geometry

### Typography

Use Geist Sans with `ui-sans-serif, system-ui, sans-serif` fallbacks. Use the same family throughout; no decorative display font. Package or self-host font assets through the existing Next.js setup, without a request-time font dependency. Body text is sentence case; reserve uppercase for meaningful abbreviations such as IDs.

| Token / role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| `page-title` | 28 / 36 px desktop; 24 / 32 px mobile | 650, or 600 if unavailable | -0.025em |
| `section-title` | 18 / 26 px | 600 | -0.015em |
| `panel-title` | 16 / 24 px | 600 | -0.01em |
| `kpi-primary` | 40 / 44 px; 32 / 38 px mobile | 650, or 600 | -0.035em |
| `kpi-secondary` | 28 / 34 px; 24 / 30 px mobile | 600 | -0.025em |
| `body` | 15 / 24 px | 400 | 0 |
| `table`, `control`, `navigation` | 14 / 20 px | 400; 500 for controls | 0 |
| `label` | 13 / 20 px | 500 | 0 |
| `caption`, `chart-label` | 12 / 18 px | 400; 500 for badges | 0 |

Use 16 px input text on touch layouts to keep fields readable and avoid mobile focus zoom. Twelve pixels is the minimum for secondary metadata, not a way to squeeze primary content. Use 400/500/600 as the normal weight set; bold is selective. Wrap titles and names rather than reducing the type size.

All points, ranks, counts, deltas, table numbers, and dates use tabular numerals. Align numeric table columns to the end and labels to the start. Use locale-aware grouping consistently; show full values in KPI cards and record tables, compact units only on crowded chart axes with exact values available in details. Points precision and rounding come from R08, not a design default. Show a true zero as `0`, an unavailable value as “Unavailable,” and a pending value as a skeleton or “Calculating.” Never turn missing data into zero.

Use unambiguous dates such as “2 Nov 2026.” Display exact period boundaries and the approved business timezone near reporting controls. No inference from the viewer's device timezone. Dates in examples describe formatting, not approved reporting boundaries.

### Spacing and dimensions

Base spacing scale: `space-1 = 4`, `space-2 = 8`, `space-3 = 12`, `space-4 = 16`, `space-5 = 20`, `space-6 = 24`, `space-8 = 32`, `space-10 = 40`, `space-12 = 48`, `space-16 = 64` px. Use 2 px only for optical alignment or fine indicators. Layout spacing uses the scale rather than arbitrary values.

| Item | Specification |
| --- | --- |
| Main container | Maximum 1440 px of content, centered inside the remaining shell width; no fixed page height |
| Content gutters | 32 px at 1280+ viewport; 24 px at 768-1279; 16 px below 768 |
| Section spacing | 32 px desktop, 24 px mobile |
| Grid gaps | 24 px major panels; 16 px supporting metrics; 12 px tight form groups |
| Card padding | 24 px normal; 20 px compact metrics; 16 px mobile |
| Sidebar | 232 px expanded; 72 px collapsed; 12 px inner horizontal padding |
| Top bar | 64 px desktop/tablet; 56 px mobile, allowed to grow for text zoom |
| Sidebar item | Minimum 44 px high, 12 px horizontal padding, 12 px icon/text gap |
| Form field gap | 20 px between fields; 8 px label-to-control; 8 px control-to-message |
| Buttons | Default 40 px high, 16 px horizontal padding; compact 32 px; large 44 px |
| Inputs/select triggers | Minimum 44 px high; textarea minimum 112 px and vertically resizable |
| Table | Header minimum 40 px; body row minimum 52 px; 16 px horizontal cell padding |
| Activity rows | Minimum 64 px with wrapped secondary context |
| Avatar | 32 px standard; 40 px profile/drill-down; initials fallback |
| Dialog | 480 px small, 640 px form; maximum width `viewport minus 32 px` |
| Detail sheet | 480 px desktop; up to 640 px for evidence-rich details; full width mobile |
| Chart plot | 280 px desktop; 220 px mobile, excluding header and data alternative |

Row and header heights are minima, never clipping rules. Compact buttons must still have adequate hit area; use 44 px controls for touch and icon-only actions. One main surface can contain sections separated by space or dividers. Do not put a bordered card inside another bordered card just to group a label and value.

### Radius, borders, elevation, and layers

| Token | Value / role |
| --- | --- |
| `radius-sm` | 6 px: small badges, tooltip |
| `radius-md` | 8 px: controls, navigation, menus |
| `radius-lg` | 12 px: cards and upload areas |
| `radius-xl` | 16 px: dialogs and sheets |
| `radius-pill` | 999 px: small status pills and avatar; primary buttons remain 8 px |
| `border-width` | 1 px standard; 2 px selected marker/control focus outline |
| `shadow-none` | Cards and ordinary page content |
| `shadow-sm` | `0 1px 2px rgba(17,25,17,0.05)`: occasional sticky surface edge |
| `shadow-popover` | `0 8px 24px rgba(17,25,17,0.10)`: menus, tooltips |
| `shadow-dialog` | `0 16px 48px rgba(17,25,17,0.16)`: modal surfaces |
| Dark elevation | No card shadow; popover/dialog shadow uses black at 0.30/0.40 with visible surface borders |
| Layers | Base 0; sticky table header 10; shell 20; popover 30; modal overlay 40; modal 50; in-modal popover 60; toast 70 |

Focus is a 2 px `ring` outline with a 2 px surface-colored offset. It must remain visible on lime, white, selected, and dark surfaces. Never replace it with a subtle box shadow. Portal layers must preserve modal focus containment and not hide a menu behind its dialog.

## 5. Shell, navigation, and responsive layout

Use one shared shell for all roles. Management changes the content density and available destinations, not the branding or component system. Keep the shell mounted across route changes. A skip link leads to the main content. Sidebar, header, and main content have distinct landmarks.

### Information architecture

| Primary destination | Internal views and actions | Icon | Visibility |
| --- | --- | --- | --- |
| Overview | Summary, My Performance tab | `LayoutDashboard` | Own permitted performance |
| Activity | Records, Points History tabs; All/Subscriptions/Customer reviews filter; add actions | `ListChecks` | Own permitted records/history |
| Team | Team Analytics and employee drill-down; conditional Rankings tab | `Users` | Explicitly authorized management scope |
| Administration | Access management and approved configuration only | `Settings2` | Explicitly authorized administrative capability |
| Profile menu | Profile, Appearance, Sign out | `UserRound` | Signed-in user |

“My Performance,” “Points History,” “Subscriptions,” and “Customer Reviews” are clear views within the compact architecture, not four additional top-level destinations. Logging opens from Activity or an Overview quick action. Leaderboard is a conditional Team tab, or a separately permitted Rankings view if employee peer visibility is later approved; do not expose Team management content to employees to make that link work. Settings are in the profile menu rather than an always-visible extra navigation group.

Use the authorized Whizz mark at a maximum 80 x 28 px with “Repondly” beside or beneath it, with 24 px breathing space before navigation. Use a text lockup until an asset exists. Active navigation uses `accent`, `accent-foreground`, a 2 px leading marker, and `aria-current`. Inactive items use neutral text; hover adds `muted`. No rainbow icon tiles or notification dots without a real supported event.

The collapse button has an accessible name and expanded state. In the 72 px rail, center 20 px icons in 44 px targets and provide visible-on-focus tooltips. Keep every destination keyboard reachable. Store collapse preference locally; never hide the active destination. The sidebar footer contains avatar/initials, display name, and the profile menu. Show a role only when its meaning is approved; do not imply permissions from a cosmetic badge.

### Header and context

The top bar contains navigation context on the left and the profile trigger on the right, plus at most one contextual action. The page heading appears once as the main H1 below it; drill-down can use a breadcrumb in the bar. Put reporting controls in the page heading row, not alongside a crowd of global icons. No global search, notifications bell, assistant, export, or ERP toolbar by default.

Use a shared period control: Day / Week / Month segmented selector, an exact range label, previous/next controls, and a date picker when supported by the reporting contract. Custom ranges are conditional on supported queries. Preserve the selected period between related views; do not silently reset it on drill-down. Show timezone and last successful refresh in quiet text. Avoid totals for one period beside a chart for another without explicit labels.

### Breakpoints

Breakpoints are viewport widths: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` px. Use available content width as the final layout constraint, including when the sidebar is expanded.

| Width | Shell and content |
| --- | --- |
| Below 640 | No persistent sidebar; 56 px header with labeled menu button; single-column panels; primary KPI full width; supporting metrics stack when two cannot fit at 160 px each |
| 640-767 | Drawer navigation; supporting metrics may form two columns; forms remain one column |
| 768-1023 | 72 px navigation rail with an expand-to-overlay control; two-column metric layout; major chart and activity sections stack |
| 1024-1279 | 232 px sidebar, optionally collapsed; 12-column content grid; two-column metrics unless the content width supports more |
| 1280+ | Expanded sidebar; primary metric spans 6 of 12 columns, two supporting metrics span 3 each; main chart/detail row uses 8/4 when each panel remains readable |

Below 768 px, navigation opens as a modal left sheet, maximum 320 px wide, with a close button, focus containment, Escape dismissal, and focus restoration. Avoid a second mobile bottom navigation system. On mobile, filters wrap into a two-row control area; secondary filters open a sheet with Apply and Clear. Essential date context remains visible.

Forms use a centered maximum 640 px reading column. Form dialogs become full-height sheets on small screens with safe-area padding and a visible close button; keep fields above the virtual keyboard. Sticky submit controls must not cover content or focused fields. Charts reduce tick density, not text size; all values remain available in an accessible data view. Tabs may scroll horizontally with visible overflow affordance and preserved keyboard focus.

Record lists become compact semantic lists on mobile: type/title, date, points when available, status when defined, and one Details link. Comparison tables that need aligned columns use an explicitly labeled horizontal scroll region; preserve row identity and never allow whole-page horizontal overflow. Do not hide required data without a detail path.

## 6. Component standards

Prefer shadcn/ui primitives with a small set of named variants. They provide interaction structure; these tokens and composition rules provide the Whizz identity. Do not expose component-library terminology in product labels.

| Component | Anatomy and behavior |
| --- | --- |
| Button | Primary lime, secondary neutral, outline, ghost, and destructive variants. Use action verbs such as “Log subscription.” Optional leading 16 px icon with 8 px gap. Pending preserves width, disables duplicate sends, and changes the label to “Saving.” Disabled controls need a nearby reason when the next step is unclear. |
| Card | Title, optional description/action, content, optional footer. White/dark surface, 1 px decorative border, 12 px radius, no default shadow. No hover effect unless actionable; use an explicit link instead of turning a card containing multiple controls into one nested link. |
| KPI card | Label, value and unit, period context, optional supported delta, and a definition tooltip. Primary variant uses 40 px value and a 32 x 4 px lime accent above the label. Supporting variant uses 28 px value and no accent. No generic colored icon box in every metric. |
| Badge | 12/18 px label, 4 px vertical and 8 px horizontal padding, optional 12 px icon. Always readable text such as “Saved”; color never supplies the only meaning. Use approved business-state labels verbatim. A badge is not a button unless it visibly offers a supported filter. |
| Table | Semantic header/cell relationships, 14 px body, 13 px headers, quiet dividers, no vertical gridlines. Align numbers, keep status widths stable, show units in headings. A focused row link provides detail access; action menu is a separate target. Sort buttons announce direction. Pagination uses Previous/Next and result context, not infinite scrolling. |
| Input / textarea | Visible label, optional help, control, inline error. Show “Optional” only for fields confirmed optional; explain the required marker once. Never use placeholder text as the label. Preserve entered values on failure. No browser input for employee ownership or authoritative points. |
| Select | Labeled 44 px trigger; selected text remains visible; clear disabled/unavailable states. Use native select for short simple choices when suitable. Searchable combobox only when an approved choice set is genuinely long. |
| Date picker | Text entry with a format hint plus a calendar control. Keyboard month/day navigation and visible selected range. Reporting dates follow the approved timezone and cutoff contract; do not silently assume Monday, local midnight, or permission to backdate. |
| Dialog | Title, short purpose, content, action footer; single primary action. Focus enters a sensible control, remains contained, and returns to the opener. Escape closes unless a pending operation needs an explicit safe exit explanation. Confirm loss of a dirty form; no stacked confirmation dialogs. |
| Sheet / drawer | Record details or mobile filters/forms. Same title and focus rules as dialogs. Preserve the list's filters and scroll position on close. Long content scrolls within one main region. Provide full-page detail navigation when needed, rather than opening nested sheets. |
| Tabs | 40 px minimum visual row, 44 px touch targets; neutral text, selected label weight and 2 px underline. Follow tab keyboard behavior. Use actual links instead when switching routes. Do not replace all content with a blank screen during refresh. |
| Dropdown | Labeled trigger, 8 px menu padding, 36 px minimum item height and larger touch targets. Group related actions with a single divider. Destructive actions are last and clearly named. No menu item that implies an unapproved capability. |
| Tooltip | 12/18 px text, maximum 280 px width, 8 x 12 px padding, popover surface/border. Opens on focus as well as hover; Escape dismisses. Essential instructions and errors stay inline. Use a click-accessible information popover for definitions needed on touch. |
| Chart | Header with question/title, period and units, plot, optional comparison control, and “View data” alternative. Share color and formatting configuration. Do not assume chart-library defaults provide accessible interaction. |
| Empty state | Small 24 px line icon if useful, 16 px heading, one or two sentences, relevant action. “No records in this period” differs from “No results match these filters.” No large illustration, invented achievement, or fake chart line. |
| Skeleton | Match real card/row geometry with muted blocks. Hide decorative skeletons from assistive technology and expose one loading status per region. Initial loads reserve space; background refresh keeps authorized cached content visible. |
| Toast | Compact surface, icon, concise message, dismiss button, optional relevant link. Success normally lasts 5 seconds; errors stay inline as well. No critical information or required action exclusively in an expiring toast. Announce without stealing focus. |
| File upload | Labeled file picker plus optional drag area, requirements, file rows, progress, and per-file error/retry. Never a decorative drop zone with no keyboard alternative. See the upload contract below. |
| Leaderboard row | Conditional: rank, initials/avatar, authorized display name, metric with unit, and “You” label when relevant. Current user gets a subtle accent marker. Equal-height rows, no podium; only approved rank and movement data. |

Use Lucide outline icons at 20 px in navigation, 16 px in buttons/metadata, and 24 px in empty states, with consistent 1.75 px stroke. Icons inherit semantic text color. Use meaningful choices such as `Plus`, `CalendarDays`, `ChevronDown`, `ArrowUpRight`, `Image`, `CircleCheck`, `TriangleAlert`, and `CircleAlert`. Icons accompanying text are decorative to screen readers; icon-only controls need an explicit accessible name. Never use a chevron to imply a row expands when it only navigates.

## 7. Performance hierarchy and analytics

### Employee summary composition

At desktop width, use one primary points card and two quieter activity cards in a 6/3/3 grid. The primary card reads “Points this [day/week/month],” not an ambiguous “Total points.” Supporting cards may show activated subscriptions and customer reviews only after qualifying/counting rules are approved. If those values are not available, use fewer cards; do not fill the gap with fabricated metrics.

Below the metrics, use a primary trend panel and a narrower category breakdown at 8/4 columns where space permits. Follow with a full-width recent activity list. The primary points card has one lime accent strip; the panels remain neutral. Quick submission access sits in the heading action or a short text action row, not inside every card.

Today's, weekly, and monthly values are different selections of the same primary metric, not three equally prominent cards plus an unlabeled lifetime total. A lifetime total, trend, or rank appears only when specifically defined and useful; it never displaces the selected-period result by default. A small overview should answer “What have I recorded, what counts, and where can I inspect it?”

KPI definitions explain scope and eligibility in plain language using approved rules. Delta labels identify the comparison period. Do not show a sparkline unless it represents the same definition and period as the card; the main chart usually makes it unnecessary.

### Chart selection and behavior

| Question / view | Visual specification | Preconditions |
| --- | --- | --- |
| Daily points over a selected week or month | Vertical daily bars, 4 px top radius, baseline at zero; lime fill with dark green outline in light mode | Approved day boundaries and point events; complete query coverage |
| A single selected day | Total and chronological source records; no invented hourly curve | Hourly aggregation requires a separately approved definition |
| Week-to-week performance | Line with 2 px stroke, straight segments, markers on selection; explicit week boundaries | Approved weekly aggregation and historical range |
| Month-to-month performance | Same line treatment with month labels; no cumulative interpretation unless labeled and approved | Approved monthly aggregation and comparable periods |
| Points by category | Horizontal bars with category name, exact points, and share only if meaningful | Approved categories and denominator; categories reconcile to total |
| Subscription and review activity | Two-series grouped bars or small multiples, labeled in records rather than points | Approved qualifying counts; separate count view from point view |
| Previous-period comparison | Optional neutral dashed line on trend charts, or an explicit text delta above bars | Approved alignment, comparable duration and eligibility; distinguish partial periods |
| Team performance distribution | Conditional sorted horizontal bars, explicit names only for authorized viewers | R01/R10, comparison audience and metric approved |

Do not build seven charts on one screen. Overview gets one main trend and at most one compact breakdown. My Performance exposes other approved aggregations through tabs or selectors. Default to the current selected period; historical range choices must be supported by the data contract. No chart-library installation is authorized by this document. Reuse a compatible existing chart integration if present; select any new library during M7 after accessibility, static-export compatibility, bundle cost, and approved chart needs are known.

Chart grammar:

- Use a white/dark card, 24 px padding, at most four quiet horizontal reference lines, no enclosing plot box, and no vertical grid by default. Axis labels use 12/18 px type; cap visible tick density instead of rotating labels into unreadability.
- Bar scales start at zero. Line-chart ranges must be explicit; include zero when showing magnitude and clearly indicate any nonzero baseline. If approved corrections can be negative, extend the scale below zero and label the baseline. Never clip reversals away.
- No 3D, gauges, gratuitous donuts, dual-axis charts, smoothed curves that invent peaks, gradients, or animation that draws fictitious intermediate values.
- Show gaps for missing/unavailable observations, not a line through them or zero-height bars. Known empty buckets can be zero only when coverage and eligibility are established. A single data point gets a marker and text, not a misleading trend line.
- Tooltips show full date/range, exact value and unit, relevant source category, and incomplete-data caveat. Use 14 px values, 12 px context, 12 px padding, and a 1 px border. Hover, keyboard focus, and tap must reach equivalent information; tapping outside dismisses without blocking scrolling.
- “View data” exposes a semantic table with the same values and permitted drill-down links. A brief text summary identifies the period and notable factual change. The table remains available if the visual chart fails to load.
- Omit the legend for one series; directly label short category bars. Multiple-series legends include text and a line/marker sample. Any series-toggle control exposes its selected state and cannot silently change a headline total.
- Drill-down from a date or category preserves the selected reporting context. Focus returns to the originating control when closing detail. A noninteractive chart does not use a pointer cursor.

### Comparison integrity

Comparison eligibility, partial-period handling, ties, negative points, and rounding are business decisions. Until resolved, show the current approved result without a delta. Once defined, compare like periods and disclose both ranges. Never compare a partial current month to a complete previous month as if they were equivalent. With a zero baseline, use an approved absolute change or “No comparable baseline,” not infinity or a fabricated percentage.

Display refresh time and any known incompleteness. Keep previously loaded results visible during refresh, labeled if stale. If the selected period changes, cached results for a different period must retain their old label or give way to a correctly labeled loading region. Do not show old values under a new date heading.

### Management information density

Managers use the same period control, type system, and metric definitions as employees. Start with at most three approved team KPIs, one trend, and an employee table. Keep the currently permitted team scope visible. A table provides comparison more clearly than twelve employee cards; show name, agreed metrics, and a drill-down link, with extra detail on demand.

Default employee ordering is neutral, such as display name, until performance ordering is approved. Sorting a metric into a ranking is itself a comparison capability, not a purely visual choice. Team totals and employee views must reconcile under the same period/eligibility rules; do not average away missing data or assume an admin can inspect the team.

Data-quality notices are compact inline callouts near affected results. Show an issue only when a trusted process identifies it; absence of records alone is not an anomaly or poor performance. Do not add an automated anomaly detector, approval queue, or correction action through this design. A warning can link to authorized source details once its workflow exists.

## 8. Activity, forms, and protected evidence

### Activity and traceability

Activity is a chronological record view, not a social feed. Use one list/table with type, occurrence time where approved, record reference, points if calculated, and defined state. Details disclose submission time, source, authorized evidence, and correction history. Distinguish occurrence time from recorded time; neither should silently stand in for the other.

Initial sources are manually logged subscriptions and reviews. Do not fabricate “daily performance reports” or Telegram entries; report-specific history belongs to the later import phase. When corrections exist, preserve original and correction events with the approved reason, actor visibility, and effect on points. Do not rewrite history visually as if an adjusted record had never changed.

Filters: period and record type first, then approved state when it exists. Default history page size is 25 records; preserve filters and page context when returning from details. Do not invent filters for attributes absent from the approved schema. A record detail can show an evidence count without loading screenshots into every table row.

### Form contracts

The PRD names the record types but does not define their exact fields. The following groups specify visual order, not new mandatory inputs. Before implementing a form, map each approved field to the relevant group; omit groups with no approved fields.

| Group | Subscription logging | Customer review logging |
| --- | --- | --- |
| Context | “Log subscription”; signed-in ownership shown as read-only context if useful | “Log customer review”; same ownership behavior |
| Record details | Only approved R03 identifiers, product/quantity details, and qualifying activation information | Only approved R04 platform, review identifier/link, and rating fields if required |
| Timing | Only the agreed occurrence/activation input, timezone, and backdating rules from R07 | Only the agreed review date/time input and R07 rules |
| Evidence | Required/optional label, allowed files and count from R05 | Same; never assume screenshots are mandatory or sufficient proof |
| Additional context | Notes only if authorized and necessary under R11 | Same; avoid collecting unnecessary review/customer text |
| Submission footer | Cancel and “Save subscription,” or approved workflow-specific wording | Cancel and “Save review,” or approved workflow-specific wording |

Never add payment amounts, customer portraits, contact details, ERP product information, points inputs, or employee selectors merely because they appear in the references. Manager submission on behalf of someone else requires separate permission. Do not estimate awarded points in a form before an authoritative rule and eligibility state exist.

Validate required fields on blur or submit, not while the user is first typing. On submit failure, show an error summary with links to invalid fields, keep values intact, and focus the first actionable error. Client messages mirror trusted validation without exposing private identifiers. Server validation remains authoritative.

### Submission feedback and state vocabulary

Local UI states are `ready`, `saving`, `saved`, and `save failed`; they describe persistence only. Evidence transfer states are separate. Business states such as pending approval, accepted, rejected, or counted must come from R06/R08; do not install that state machine through labels or badge colors.

While saving, preserve the form, show immediate feedback, and prevent repeated submission. Show “Saved” only after the backend confirms the relevant record and evidence association. On success, show a concise inline confirmation with a record-detail link, update the affected history, and refresh authoritative totals. Do not animate unconfirmed point awards or imply that “Saved” means “Validated.”

If a request times out and persistence is uncertain, say “We could not confirm this save” and reconcile the result before encouraging a second submission. Safe retry and duplicate behavior depend on the approved backend contract. A failed evidence upload must not be disguised as a completed record with valid evidence. Preserve form input while explaining what succeeded, what remains, and the supported recovery action.

Existing records are read-only by default until R01/R09 define editing, deletion, and correction rules. Once permitted, show explicit Edit or Correct actions and explain effects before confirmation. Remove/replace evidence controls must follow those same rules. Do not offer Undo unless the backend has an authorized reversal operation.

### Upload experience

- Use a 144 px minimum-height drop area, 1 px dashed `input` border, 12 px radius, a 24 px `Image` icon, “Choose screenshots,” and a short drag-and-drop hint on desktop. The file picker remains the primary accessible path; mobile copy does not require dragging.
- Show allowed formats, size per file, total/count limits, evidence requirement, and redaction instructions from R05/R11 before selection. Do not invent numeric limits or retention claims. Upload implementation remains blocked until those rules are agreed.
- Each selected file gets a 64 x 64 px contained preview, filename with wrapping, readable size, state label, and permitted remove action. Never crop out critical evidence in the enlarged view. Multiple-file controls appear only if evidence cardinality permits them.
- Use the state sequence “Selected,” “Uploading,” “Processing” when trusted validation is running, then “Attached” after association succeeds. Show percentage only when real byte progress is available; otherwise use an indeterminate progress indicator. Include accessible progress text without announcing every percentage point.
- Validate early for helpful feedback, then require trusted ownership, type/content, and size validation. Explain rejected format, oversized file, interrupted transfer, or access expiry with a specific recovery action. Preserve unaffected files; retry only where the backend supports it.
- Before submission, local remove/replace affects the pending selection. After persistence, controls depend on correction/deletion rights. Describe discard behavior if leaving would lose a pending selection; do not persist private drafts or images in browser storage by default.
- Enlarge evidence in an authorized viewer with filename, Close, Fit, and Zoom controls. Supply button alternatives to pinch/drag. Preserve image aspect ratio and original colors. On mobile, use a full-screen viewer with reachable controls.
- Fetch evidence only on authorized demand using private storage and short-lived access. An expired image can request renewed authorized access; denied access uses a neutral message without revealing another person's record. Clear previews and sensitive caches on sign-out or permission changes.
- No public share links, open-bucket URLs, screenshots in logs, or private thumbnails in global navigation. A screenshot's presence is an attachment fact, never proof that the activity qualifies or earns points.

## 9. Subtle gamification

Gamification is conditional and must not delay the accurate core tracking experience. The initial design gets its energy from clear progress over time, responsive controls, and trustworthy history, without inventing awards.

| Conditional feature | Allowed presentation once approved | Required definition |
| --- | --- | --- |
| Leaderboard | Calm ranked list with aligned numbers, period, scope, and own-row marker | Audience, metric, eligibility, ties, period, corrections, completeness, privacy |
| Personal best | Small inline highlight in My Performance with the exact period/value | Comparable historical coverage, eligible records, revised-history behavior |
| Weekly achievement | One concise text callout with a small line icon | Approved criterion and award timing; never an invented point bonus |
| Personal goal | Thin labeled progress bar with actual value and approved target | Ownership/edit rights, target source, period, treatment of over-target/negative values |
| Streak | Quiet text annotation, no flames or punitive messaging | Work calendar, time off, missing data, late entries, corrections, reliable timezone |
| Rank indicator | Rank numeral; a small neutral medal outline for approved top positions | Tie presentation and rank calculation; no assumed gold/silver/bronze hierarchy |

No childish badges, public comparisons, podiums, confetti, forced celebrations, shaming labels, or unexplained movement arrows. A confirmed achievement may use a single 150 ms icon fade; reduced motion removes it. Never replay it on every page visit. Corrections can change achievements only according to the approved business rules, with transparent context rather than silent manipulation.

## 10. Interaction, loading, and failure standards

### Motion tokens

| Token | Duration / curve | Use |
| --- | --- | --- |
| `motion-fast` | 100 ms, ease-out | Button hover/pressed colors, row hover |
| `motion-standard` | 150 ms, cubic-bezier(0.2, 0, 0, 1) | Popover opacity, tab indicator, optional confirmed number crossfade |
| `motion-panel` | 180 ms, cubic-bezier(0.2, 0, 0, 1) | Sheet/dialog entrance, sidebar width change |
| `motion-skeleton` | 1600 ms gentle opacity pulse | Initial skeleton only; no sweeping shimmer |

Pressed buttons use the active token; no bounce or large scale transform. Actionable cards may change border and background, not lift off the page. Dialogs may move at most 8 px while fading; sheets slide without overshoot. Keep all controls usable during transitions. Charts render values immediately; no animated path drawing. Optional number updates crossfade the final confirmed value, never count through fabricated intermediate scores.

With reduced motion, remove transforms, skeleton pulsing, number transitions, and animated scrolling. State changes remain immediate and understandable. Open tooltips after about 400 ms hover or immediately on keyboard focus; dismissal is immediate. Tabs respond immediately while their content reports loading separately.

### Shared state contract

| State | Required presentation |
| --- | --- |
| Initial load | Shell stays visible; region-shaped skeleton and one loading announcement; no fake zeroes |
| Background refresh | Keep authorized cached data and last successful refresh time; quiet progress; no whole-page flash |
| First-use empty | Explain no records exist and offer a permitted logging action; no invented totals or accomplishments |
| Empty period | Name the selected range; offer another period or a permitted submission action |
| Filtered empty | “No results match these filters” with Clear filters; retain chosen filters |
| Partial failure | Keep successful sections; inline failed-region message and Retry; do not imply totals are complete |
| Full failure | Plain explanation, Retry, and safe navigation; no stack trace or sensitive backend detail |
| Permission denial | Neutral access message and return link; no private preview or count; server authorization remains decisive |
| Validation failure | Error summary and associated field errors; preserve user input and focus the actionable issue |
| Save success | Confirm persistence, provide record access, refresh relevant data; no assumed approval or points |
| Session expiry | Explain sign-in is needed; protect private content; preserve a safe return destination without private form data in URLs |
| Unavailable calculation | “Points unavailable” with a factual reason when safe; never substitute a sample value |

Do not label work “Live” without a real supported refresh contract. Follow the architecture's focus-refresh model initially. Target immediate visible feedback, but do not hide delays behind false success. Unknown request outcomes and retry restrictions must be explained in the affected workflow.

## 11. Accessibility and usability

Target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) for complete flows. Text contrast must reach 4.5:1 for ordinary text and 3:1 for qualifying large text; essential control boundaries and graphical information need 3:1. Support keyboard access, visible unobscured focus, semantic labels, programmatically associated errors, and status announcements. Do not rely on color alone. Support text resizing and reflow at 320 CSS px, with intentional table scrolling where necessary. Authentication must allow password managers and paste; dragging needs an alternative. These requirements are acceptance targets, not a claim of conformance.

Product-specific practices:

- Use 44 x 44 px touch and icon-button targets. Desktop compact controls may have smaller visual geometry with separated hit areas; avoid overlapping hit boxes.
- Maintain one H1, logical section headings, meaningful control names, and a visible skip link. Keep DOM reading order aligned with visual order on every breakpoint.
- Preserve focus after modal close, row updates, failed saves, and navigation. Sticky headers, toast stacks, and mobile footers must not cover the focused control.
- Give every chart a text summary and data table; avoid dozens of needless tab stops. Make period controls and meaningful data selections keyboard reachable.
- File upload works without drag-and-drop. Evidence viewers have keyboard zoom/close controls and descriptive labels without unnecessarily copying sensitive image contents into alt text.
- Tooltips supplement visible labels. Use polite announcements for save/load results, urgent alerts only for actionable failures, and avoid live-region chatter during chart interaction.
- Keep touch scrolling, browser zoom, and reduced-motion preferences intact. Never disable zoom or rely on hover to reveal a required action.

The proposed palette, focus treatments, and dark variants require owner verification in rendered screens. No contrast calculation, accessibility audit, browser run, or conformance check has been executed as part of this documentation task.

## 12. Application implementation contract

The 2026-11-02 redesign applies this system to existing surfaces: Overview, Activity, login, access verification, denial/failure, and not-found. This is a UI delivery awaiting owner verification, not completion of reporting or submission milestones. Future changes must preserve these patterns unless the owner explicitly changes the direction.

### Shared implementation map

| Pattern | Source | Usage |
| --- | --- | --- |
| Semantic palette, type, geometry, layout | `src/app/globals.css` | Use semantic Tailwind colors; change tokens centrally in paired themes, never feature-local hex values. |
| Font | `src/app/layout.tsx` | Geist Sans through Next's build-time font pipeline with system fallback. No runtime font CDN. |
| Branding | `src/components/brand.tsx` | Plain text Whizz/Repondly lockup with lime backing; replace only with an authorized clean asset. |
| Workspace | `src/components/workspace-shell.tsx`, `workspace-nav.tsx` | Stable shell, context bar, active destination, collapsible sidebar, tablet overlay expansion, modal mobile navigation. |
| Account and appearance | `src/components/account-menu.tsx`, `appearance-provider.tsx` | Radix keyboard menu, Light/Dark/System radio choices, explicit logout. Only appearance and sidebar preferences are stored by the UI. |
| Page heading | `src/components/page-heading.tsx` | One H1, concise description, optional permitted action. No eyebrow or marketing hero. |
| Working panel | `src/components/workspace-panel.tsx` | Named section, shared H2, optional action, open content. Avoid repeated nested bordered panels. |
| Access screens | `src/components/access-frame.tsx` | Shared brand/header and centered reading width for login, access loading, denial, and recovery. |
| Controls and states | `src/components/ui` | Button variants, 44 px inputs, field groups, badges, separators, and small icon empty states. Extend shared primitives for repeated needs. |

### Recipes for subsequent workflows

- Start a workspace page with `PageHeading`. Use `WorkspacePanel` for an actual working region, not every individual field. Add at most one lime primary action to the current context.
- Build forms with `FieldGroup`, `Field`, visible labels, `Input`, help and associated errors. Use approved schema fields only. Keep input at 16 px on touch layouts and retain values after failure. Use the same panel, padding, footer, and pending feedback across record types.
- Build history as one semantic table on desktop and a compact semantic list on mobile. Use 52 px minimum table rows, end-aligned tabular numbers, a clear detail action, and explicit pagination when a data contract exists. Filters must reflect real supported fields.
- Use the shared `Empty` composition for genuine no-data and filtered-empty states. An unavailable integration or calculation needs explicit unavailable wording. The foundation intentionally shows no invented scores, periods, charts, activity counts, or success states.
- Use Radix-backed dialogs/sheets/menus for disclosure. Preserve title semantics, focus containment/restoration, Escape dismissal, and keyboard operation. Keep essential instructions visible outside tooltips. Portal layers follow the tokens and layer scale above.
- Keep points, dates, counts, and table numbers tabular; use shared type sizes and semantic state badges. Show persistence and business-validation states separately.
- Keep route content static/server-rendered where appropriate; client islands own appearance, navigation, auth, and actual interactions. Do not add a chart library, state framework, animation library, or request-time Next feature for decoration.

The redesign uses existing dependencies. A generated full-screen concept informed composition only; it is not shipped as a screenshot-based UI or production asset. Palette, navigation responsiveness, focus, menu behavior, first-paint appearance, login/logout, access failure, and layout at 320 px require owner review. No server, build, test, lint, diff, inline, browser, or performance checks were executed under the owner's execution preference. No measured performance or accessibility conformance is claimed.

### Core tracker recipes: 2026-11-02

D24-D25 supersede the earlier manual-first/import-later and approval assumptions for this slice. Navigation now includes Overview, Activity, Reviews, and DoorDash. Keep the existing shell, heading, panel, field, and semantic-token system.

- Overview shows one selected-period reported-points total with its $0.50 value. A separate panel lists RTF commission, reviews, and DoorDash in dollars; never add these to point totals. Missing reports and missing RTF amounts remain unavailable/partial. Activity counts appear only in source details; uncertain per-activity points are not charted.
- Reuse one day/week/month selector, a store timezone selector for the calendar anchor, and a date input. Manager employee selection changes the read scope, never the author of a submission. Period history is paginated at 25 rows with a desktop table/mobile semantic list. Reviews and DoorDash reuse the same filters with server-side record-type filtering.
- Daily points use a semantic-token SVG bar chart with a zero baseline, no animation, explicit gaps, factual coverage summary, and an expandable equivalent data table. No library or fabricated hourly curve is introduced.
- Manual entry uses store/work date plus the approved minimal fields. Notes are optional. Review upload accepts one owner-size-limited PNG/JPEG/WebP via the native file picker, with a contained preview and associated validation. The picker rather than a custom drag surface keeps this flow small and keyboard accessible. This intentionally extends the prior upload recipe. The image-size requirement is visible before selection; no upload runs until configured.
- Evidence opens in a Radix dialog on demand with Close, Fit/Zoom, and renewed-access Retry. Source fields and report timestamps use native details/summary. Approved entries count immediately in the personal tracker; there are no approval badges or approval actions.
- Shared `Select` and `Textarea` use the central `form-control` token recipe; table geometry and metric type are centralized in globals.css. Save uncertainty retains a request identity and locks its payload for safe retry. Successful persistence clears entry-specific fields, keeps store/date context, and refreshes totals/history.

All rendering, keyboard/mobile behavior, accessibility, database policies, and performance remain owner verification items. No checks were executed.

### Personal and manager dashboard: 2026-11-02

- Every account opens its own weekly Overview, including managers. Managers participate in team totals and keep their own submission identity. My overview / Team overview uses the shared Radix-backed segmented control; a member selector and View action allow individual drill-down. The member list is alphabetical, not a leaderboard.
- Overview starts with current-week, current-month, and all-imported-history reported points. The period control changes the daily chart, bonus, activity counts, and records below, while these three explicitly labeled summary windows stay current. No target, rank, or category points are inferred.
- The reporting calendar defaults to the viewed person's home store, then the current account's home store, then a configured Eastern-time store, then the first configured store. This is a calendar convenience only; it does not assign a work store or alter an entry's local work date. Exact date/timezone controls remain behind Calendar and date. Previous/next and Today simplify period navigation.
- Shared Select uses the installed Radix primitive for keyboard navigation, typeahead, focus restoration, portal positioning, and scrollable options. Shared SegmentedControl uses Radix single-selection ToggleGroup. Both consume central tokens and preserve 44 px targets. Scrollbars use existing neutral tokens, stable page gutter, and browser-native scrolling.
- Daily charts use readable weekday/date labels, bounded bar widths, dashed missing-report markers, unique accessible labels, and an expandable equivalent data table. Small screens scroll the chart region rather than shrinking text. Missing reports remain distinct from zero values.
- Bonus meters show relative shares of known dollar amounts; team meters show shares of reported team points. They are explicitly labeled as composition, never goals. Partial RTF commission and team report coverage are stated. Activity category counts are disclosed separately because the source does not supply complete category points.
- New analytics use read-only, RLS-scoped Postgres aggregates and the existing bounded authenticated cache. Data refreshes preserve the selected view's successful results with a quiet status and last-loaded timestamp. Snapshot history remains independently recoverable if analytics setup fails.

This extends the existing code-native design system, with a generated dashboard concept used for composition. No browser, render, accessibility, performance, or automated checks were run under the owner's execution preference. Visual and functional acceptance remains owner verification.

### Unified accurate-reporting contract: 2026-11-02

D29-D30 supersede the earlier fixed-period dashboard recipe. Overview opens month-to-date; its visible inclusive range controls totals, point-value and extra-bonus amounts, combined estimated earnings, charts, categories, comparisons, and paginated source history. Use the shared Select for This week / This month / Last month / Since July 2026 / Custom. Custom exposes From, To, and Apply with validation and an unapplied-draft message. Calendar settings remain secondary; source work dates retain their store-local meaning.

Keep four selected-range summary values: reported points, point value, extra bonuses, and combined estimated earnings. Dollars are never added to the numerical points figure. Show RTF/review/DoorDash amounts and source missingness explicitly. A known combined total is partial when source components are missing; no reports and zero-point reports remain distinct. Available report dates, latest source/import timestamps, and View available history explain empty periods. Do not label a last-import timestamp as a successful collector scan or claim complete history.

Points and stacked monetary charts stay mounted for empty periods, with missing-data markers, readable axes, semantic-token colors, a single keyboard-accessible period slider, exact selected-bucket values, and equivalent data tables. Group daily through 31 dates, weekly through 180, then monthly, clipping boundary buckets. Use a horizontal chart/table scroll region on narrow screens. Category counts and collected revenue are directly visible in a shared working panel, with separate relative scales, factual units, and partial labels; category points remain unavailable.

Managers see alphabetical per-category comparison bars for points, RTF commission, reviews, or DoorDash. Scale to the largest known value, rescale when it changes, and show actual values. D30 explicitly authorizes a small semantic-warning-colored crown beside each tied positive leader, without awards, goals, animation, public comparisons, or employee peer visibility. Separate accounts remain distinct rows. Team source history identifies each author.

Visible data and access refresh quietly every minute, with focus/save refresh, pending-request deduplication, matching-view stale-result retention, and independent retry paths. Keep forms and chart inspection mounted. Existing shared shell, panels, controls, typography, palette, scrollbar treatment, and static hosting remain in use; no new dependency was added. All visual, interaction, accessibility, performance, RLS, and numeric acceptance checks are prepared or owner-pending, not executed.

### Daily controls refinement: 2026-11-02

Owner requested removal of the full report-availability/import/coverage panel and View available history action from all reporting pages. Keep availability metadata in the API for diagnostics without rendering that panel. Empty selected-period point/earnings summary values and chart bars display 0; source nulls and missing RTF/category fields remain unchanged in storage and retain unavailable/partial handling where relevant. This is presentation, not a new scoring or data-completeness rule.

Overview and Activity use shared daily-sized, 56 px minimum-height action buttons: Reviews and Add DoorDash, with semantic action icons and responsive two-column grouping. Reviews retains the primary style and DoorDash the shared outline style.

All custom reporting dates and review/DoorDash work dates use the shared DatePicker. It preserves a directly editable native date field and adds a token-styled Radix popover calendar with month/year selectors, previous/next navigation, selected/today states, Today/Yesterday shortcuts, and keyboard arrows/Home/End/PageUp/PageDown. Popover dismissal restores trigger focus. From/To changes still require Apply; entry work dates still save only with the form. Store-local today is passed explicitly. No calendar dependency or hosting change is introduced.

This follow-up follows the owner's default no-check execution preference. No checks, server, browser, or hosted changes were run for it; owner verification remains pending.

### Range toolbar and chart readability: 2026-11-02

Owner requested a more direct, less verbose daily interface. Overview greets the signed-in profile by its first display-name word using the existing Geist page-title scale. Manager drill-down does not change the greeting identity. The description is Points, bonuses, and estimated earnings. Reviews uses the same MessageSquareText icon in the action and sidebar; Add DoorDash uses Bike and the shared delivery button variant. Delivery foreground/background/hover/border tokens are paired centrally for light and dark themes, using a restrained warm red without reusing destructive-action semantics.

The workspace content uses the available width with existing responsive gutters and a tighter shared section gap. Quick dates exposes This week, This month, Last month as shared segmented controls. Since July is removed from the UI. The adjacent Custom range form is always visible, with Start, Finish, and Apply range. Inputs show the active range until edited, preserve unapplied drafts, validate reversed dates, and apply together. Manager scope uses one Viewing selector rather than duplicate selectors and toggles.

Chart grouping is explicit: By day / By week for ranges through 31 days, By week / By month through 180 days, and automatic monthly grouping for longer ranges. These options reuse the existing server query limits and scoped cache. Point and earnings charts occupy separate full-width working panels for readable axes. Labels use weekday/month-day or weekly/monthly dates, values appear above short-series or selected bars, and hover/click/keyboard sliders expose exact selected periods. A small selection marker replaces the full-height shaded column. Equivalent data tables and partial RTF states remain available.

Removed the requested inclusive-date explanation, category-bar explanation, and last-loaded/minute-refresh copy. Refresh continues quietly, with button progress and a screen-reader status. No new chart library, schema, dependency, hosting feature, rate, or access change was introduced. Existing coverage assertions were updated for the new greeting and labels; no checks, servers, or browser runs were executed for this follow-up.

DoorDash reference follow-up: the owner supplied a solid orange-red DoorDash reference. The shared delivery variant now uses that solid color family with white text/Bike icon and a deeper hover color in both themes, replacing the pale tinted treatment. Shared button size, geometry, and focus remain in use. No checks or server run.


### Review screenshot entry: 2026-11-03

Retain the store/date row and default to today in the selected store timezone. Reviews use the shared ScreenshotUpload primitive: a full-width 224 px minimum-height neutral dashed area, semantic input/accent tokens, 24 px ImagePlus icon, click/file-picker and keyboard access, drag-over feedback, one-file validation, and associated help/error text. Show a contained 64 px preview, readable file size, ready state, Replace via the same area, and Remove before submission. Show preparation and save progress without invented percentages. Preserve a valid selection when a replacement is rejected. Place the optional note below evidence at an 80 px minimum height, vertically resizable. Other textareas retain their existing default. Preparing disables submission; uncertain saves lock the payload and retry the same reference. Successful persistence clears the screenshot and note, retaining store/date context. No new palette, dependency, or post-save editing permission is introduced. Owner visual, keyboard, mobile, and accessibility verification remains pending.


### Review drop area visual refinement: 2026-11-03

Owner requested a stronger upload-first hierarchy. The shared screenshot area now uses a centered 48 px ArrowUpToLine icon without a decorative tile, a 288 px mobile / 352 px desktop minimum height, a two-pixel dashed input border, neutral inset surface, and a clear browse-files prompt. Hover/focus accents the arrow and boundary; dragging switches to the accent surface with a centered release-to-add/replace prompt. Drag nesting is counted to prevent flicker. The selected image appears inside the same large area with an uncropped 176/208 px contained preview and click/drop replacement. Preparation has an indeterminate spinner with reduced-motion support. Filename/size, deferred-upload status, and Remove remain below the area. The optional note starts at one 44 px line, is limited to a reading-width column on desktop, and can be expanded vertically. Store/date and upload/security contracts remain in place. No new dependency or database migration. Owner visual and interaction review pending; no checks or server run.


### Review management dialogs: 2026-11-03

Show neutral Edit and destructive-text Delete actions only on authorized review rows, in both desktop tables and mobile lists. A shared Radix dialog loads the current RLS-scoped review before interaction. Editing reuses Select, DatePicker, compact Textarea, existing evidence viewer, and ScreenshotUpload with unique field IDs; screenshot replacement remains optional. Delete requires explicit confirmation describing permanent screenshot removal and the $2 tracking impact. The primary action confirms only persisted operations with completed screenshot cleanup. Keep uncertain requests locked in the dialog for same-reference retry, preserve drafts across history refreshes, and show a specific stale-version reload action. Keep confirmation dialogs mounted when records disappear after refresh; return focus to the initiating button or history region when the row was removed. Reuse semantic tokens, 44 px targets, responsive 560 px modal geometry, accessible titles/descriptions, and live feedback. All rendered/mobile/keyboard checks remain owner-pending.


### Compact monthly records and DoorDash management: 2026-11-03

Reviews and DoorDash reuse MonthlyRecords: put month controls in the Records panel header, with 44 px previous/next buttons, a 160 px native month input, conditional This month shortcut, small Refresh action, and a compact manager scope Select. Controls wrap on mobile and directly filter that panel by full calendar month. Show a quiet record count and dollar total, inline retry/loading states, and pagination only for multiple pages. Correct an out-of-range last page after deletion. Keep empty-month language specific to the record type. Do not render the large quick/custom/calendar range panel or unused analytics requests on these entry pages. Their history table omits the inapplicable points column. Overview/Activity retain their existing toolbar.

Both review and DoorDash management use the shared RecordDialog primitive for modal geometry, accessible title/description, focus containment, backdrop/escape behavior, and uncertainty locking. DoorDash fields reuse existing compact controls; Delete states its permanent $5 impact before confirmation. Mutation dialogs remain mounted while history refreshes, and successful database responses trigger shared cache invalidation. No new palette, dependency, animation system, or file upload is added. Owner rendering/mobile/keyboard verification remains pending; no checks were executed.

### Compact overview: 2026-11-03

Owner requested a smaller, consistent overview with no page scrolling. Supersedes the earlier chart, coverage-copy, calendar-settings, and source-history presentation on Overview. Reuse WorkspacePanel with Activity by category first, date controls in its header, a plain count/revenue table, adjacent compact extra bonus breakdown, and four smaller totals beneath. Remove all rendered charts, composition/comparison bars, known-amount/incomplete-source notices, Calendar settings, timezone controls, grouping controls, and overview source records. Null category/commission values still display Unavailable; stored source fields and calculations are unchanged. Manager team totals use a compact collapsed list with authorized member selection.

Reporting defaults to this month to date, preserving the existing calendar anchor. This month, This week, and Yesterday apply immediately. The shared compact PeriodPicker opens on demand, offers a scrollable month list with year selection, or a calendar whose rows select full Sunday-to-Saturday weeks. Explicit month selections cover the full calendar month; quick current periods end today. The same reporting header serves Activity, where paginated records remain available. Calendar/timezone configuration is no longer rendered; existing store-local date calculations remain internal.

Overview uses a viewport-height shell, tighter shared spacing, standard-sized Reviews/DoorDash actions, no repeated footer, and a bounded internal panel scroll region for smaller screens, zoom, long names, errors, or expanded team details. Popovers retain their own scroll area and Radix focus/dismissal behavior. No page overflow is hidden by clipping data. Overview no longer fetches unused source history; Activity no longer fetches unused analytics. No dependency, schema, access, hosting, or payout-rule change. Owner verification must cover viewport fit, keyboard/mobile/zoom access, month/year/week boundaries, date selection, scope changes, refresh/error retention, and unchanged totals. No checks, server, or browser run.

### Overview hierarchy and team benchmarks: 2026-11-03

Owner refinement supersedes the previous compact overview layout. Keep the date toolbar stable: a fixed-width, responsive From/To trigger always shows both endpoints, including the same date twice for Yesterday. Totals occupy their own compact surface above Activity by category; rename Reported points to Total points. Currency presentation uses exactly two decimal places across the app; source precision and payout rules remain unchanged. The shared DoorDash button has a stronger two-pixel border with paired light/dark delivery-border tokens.

Below totals, use a wider category working panel and a narrower full-height bonus panel. Category rows use larger values and green semantic chart-1 horizontal meters comparing the selected person's count/revenue to the highest individual category total in the team for the identical date range. Each meter displays its value and Team high denominator, exposes accessible meter values, and distinguishes missing values from zero. Team-wide totals are labeled as aggregate values without individual comparison meters. Bonus rows share the panel height evenly, with aligned large amounts, concise rate/count details, and a header total. Manager account drill-down remains progressively disclosed. Keep the overview in its viewport shell; allow internal scrolling at small/short viewports and when team details expand.

Migration 008 adds a read-only security-definer category-maxima RPC with explicit authenticated workspace-role validation, bounded dates, fixed category keys, and revoked public/anonymous execution. It returns only count/revenue maxima from mapped current workspace members, without names, IDs, source records, or per-person arrays. This aggregate comparison is owner-authorized; existing raw-record RLS and manager access stay unchanged. Reporting and benchmark requests run concurrently under the existing authenticated bounded cache. Benchmark failure does not block totals and shows an unavailable/retry hint. Owner must apply migration 008 before green comparisons are available. No checks, server, browser, migration application, or hosted action performed.

### Overview density and daily actions: 2026-11-03

Owner requested slightly smaller category content to fit one visible working block. Use 56 px category rows, compact header spacing, and put the current value and team-high label on one line above an 8 px neon brand-primary meter. Preserve exact accessible meter descriptions and comparison calculations. Tighten totals/section spacing without shrinking primary content below shared readable sizes. Remove the repeated total beside Extra bonus breakdown and the point-value footer sentence. Bonus rows divide the panel height evenly with stacked muted labels, prominent amounts, and concise rate details. Reviews/Add DoorDash use the shared workspace button size: 52 px minimum height, 12 px corners, 20 px icons, matching widths in a responsive two-column action group. Keep all smaller-screen/zoom/expanded-detail content reachable through existing internal overflow. No new data, dependency, migration, or access change. No checks, server, or browser run; owner viewport and visual review pending.

### Category panel height correction: 2026-11-03

Owner screenshot showed the compact rows leaving a large empty area below the table. Category table now fills the panel's remaining height and distributes surplus space across its five rows, retaining a compact column header and readable 16 px values. Keep 56 px row minimums rather than forcing all rows to that height. The desktop fill layout applies down to 620 px viewport height; narrower/very short screens retain natural table height and reachable overflow. Neon bars and the bonus/action refinements remain in place. No checks or server run; owner visual verification pending.

### Compact entry pages and centralized Activity history: 2026-11-03

Owner requested consistent page padding and viewport height for Overview, Reviews, and DoorDash, with records removed from entry-page bottoms. All workspace pages now share the overview's 16 px vertical padding, 12 px section gaps, existing horizontal gutters, and title/description spacing. Overview/Reviews/DoorDash share a bounded viewport shell without the repeated footer; entry forms retain internal overflow for smaller screens, validation, file details, and zoom rather than clipping controls. Reviews uses the shared ScreenshotUpload compact variant with a viewport-responsive 160-240 px drop area and contained preview. Other upload contexts preserve their existing large variant. Fields, form spacing, and save footer are tightened; store and editable date controls stay available.

Remove Saving for, store-time/date-explanation copy, and per-entry reward copy from page descriptions. Date validation errors remain associated with their field; internal store-local dates and all rates/ownership remain unchanged. Each entry page has a top-right See all reviews / See all subscriptions link and a clearly labeled personal This month dollar total from the existing scoped snapshot. Totals refresh after save, retain matching-view successful values during refresh, and expose retry on failure. No fake/loading zero is shown.

Owner clarified that the current dashboard stays Overview and moves to the last navigation position, while Activity holds combined history. See all links open Activity's Reviews or DoorDash filter via a stable URL hash. Activity offers All activity / Reviews / DoorDash; all activity retains range/scope/pagination, and filtered history reuses MonthlyRecords with month controls, total amounts, existing manager scope, edit/delete, and pagination. No entry history, management capability, or evidence access is removed. No new route, dependency, database migration, access rule, or hosting change. Owner checks for viewport fit, mobile/zoom overflow, stable navigation, direct history links, keyboard filters, totals after saves, validation, upload preview/retry, and history edits/deletes remain pending. No checks, server, browser, or hosted operations executed.

### Navigation order correction: 2026-11-03

Owner explicitly sets the shared desktop/mobile navigation order to Overview, Reviews, DoorDash, Activity, superseding the earlier Overview-last direction. Reviews/DoorDash remain entry-only in the current source; records render in Activity and are reached through See all links. No checks or server run.

### Entry copy, monthly counts, and action colors: 2026-11-03

Owner requested removing the screenshot privacy/dimension helper, the format/size line, and DoorDash checkbox explanation. Remove these lines from the shared upload/entry presentation while preserving upload validation, invalid-file feedback, setup-unavailable messaging, and selected-file replacement/removal. Shared Select now has an opt-in showAllOptions variant used for entry store selection: use available viewport height instead of the 320 px cap, displaying all configured stores when space permits and retaining scroll access on constrained screens.

Top-right history actions use the shared 52 px rounded workspace size: brand green for See all reviews and delivery red for See all subscriptions. Adjacent This month metadata shows the signed-in person's matching-kind count and money from the same scoped snapshot, with singular/plural labels and existing refresh/failure behavior. Save DoorDash uses the shared delivery-red variant. Its entry button remains disabled until DD proof added is checked; the checkbox is required and the submit handler also guards unchecked submission. This is the requested entry-form interaction gate, not independent evidence verification, a change to stored historical proof flags, or a backend eligibility/payout rule. No new dependency, database migration, or hosted action. No checks, browser, or server run; owner visual/keyboard/viewport and save-flow verification pending.

### Overview missing-value display: 2026-11-03

Owner requests zero instead of Unavailable for Overview category counts/revenue and RTF commission. Render null category values as 0 or $0.00 with a mounted empty comparison track, and null RTF commission as $0.00. Keep stored nulls and calculations unchanged. Known team highs stay visible; missing benchmarks retain a distinct could-not-load/retry message without inventing a maximum. Existing team aggregate view remains without individual comparison meters. No checks or server run.

### Compact Activity and shared day/week/month filters: 2026-11-03

Owner requested a clearer Activity page with less record-row text, visible revenue, and the same period picker as Overview. All activity, Reviews, DoorDash, and Reports now share one reporting range/scope component and server-side kind filtering. Switching record types preserves selected dates and manager scope while resetting pagination; hash links from entry pages still select the appropriate kind. Use This month / This week / Yesterday and the shared Day / Week / Month popover. Day selects one calendar date with equal From/To endpoints, Week selects the existing Sunday-to-Saturday rows, and Month selects full calendar months. Compact mode controls fit beside the year selector and preserve the stable range trigger.

Activity uses a concise selected-period record count, bonus amount, and applicable point total above a compact table. Revenue is the source report's explicit total_revenue_cents, shown directly per report, not a sum of potentially overlapping category revenue or inferred from points. Reviews/DoorDash display bonus money rather than invented collected revenue; filtered entry histories omit inapplicable point/revenue columns. Period bonus totals use existing scoped snapshot fields, including RTF commission for reports, while per-record productivity bonuses remain unspecified when not returned by the API. Pagination appears only for multiple pages and clamps after deletion.

Record rows retain date, type/subscription, store, optional manager-visible author, report revenue/points where applicable, bonus, and inline screenshot/edit/delete actions. Use named accessible 44 px icon actions and shared semantic palette. Notes/import/source fields are expandable Details; remove repeated affirmative proof badges and verbose not-applicable labels. Missing historical DoorDash proof remains a concise warning. Mobile uses compact semantic lists with visible revenue/earnings and the same authorized actions. Mutation dialogs stay mounted across refresh/deletion and retain existing focus fallback. No new schema, migration, rate, access rule, dependency, or hosting feature. No checks, browser, or server run; owner date/filter/numeric/mobile/keyboard and record-management acceptance pending.

### Quiet save and review-delete completion: 2026-11-03

Owner requested removing the review deletion completion screen and its Done button. Keep the pre-delete confirmation; close automatically only after manage-review confirms the matching operation and completed screenshot cleanup, then refresh history/totals and restore focus through the existing parent handler. Failed or uncertain outcomes retain their current dialog/retry behavior. Review and DoorDash save-success messages now state only that the entry was saved, without displaying request/reference IDs. Internal IDs and idempotent retry logic remain unchanged. No checks, server, browser, or hosted action run.

### Dedicated manager dashboard: 2026-11-03

Owner authorized a complete manager workspace using the existing Whizz patterns. Overview now lazy-loads Team overview for managers, while employee Overview is unchanged. Reuse PageHeading, WorkspacePanel, semantic colors, compact shared spacing, rounded existing controls, and neon composition bars. A generated design-only concept guided the composition; synthetic concept numbers/names are not shipped as app data. No new raster asset, font, icon system, chart library, state library, or dependency is used.

The viewport shell stays mounted. Manager content has one internal scroll region with Summary / People / Records views, rather than compressing all analytics into one screen. Shared date presets include This month, This week, Today, Yesterday and the Day/Week/Month picker. Searchable People and Stores popovers support one/multiple selections and explicit All, with selected names/counts, keyboard-native checkboxes, and constrained-viewport scrolling. Date anchoring stays consistent with the signed-in manager's existing calendar context; actual record filtering uses each saved work_date and actual store_id, never a guessed home-store restriction. Filters apply to every data surface and both compared periods. Reset returns to current month-to-date and the whole team/all stores.

One summary strip shows total points, explicit collected revenue, extra bonuses, estimated earnings, and review/DoorDash counts with amounts. Summary includes a metric-switchable trend chart with current lime bars, preceding-period dashed green line, honest zero baseline, missing-report markers, exact inspection by hover/click/keyboard slider, and equivalent expandable data table. Daily/weekly/monthly grouping reuses the shared range-length behavior. Prior values align by offset into the immediately preceding equal-length range, not a claim of matching weekdays. Period comparison gives factual signed numeric/percentage differences, no-current/no-prior states, and suppresses complete-revenue change claims when source revenue is missing. Active profile counts and peak reported-point bucket are factual observations, not ratings, targets, attendance judgments, or inferred employee quality.

Alphabetical employee comparison remains the default, with optional highest-value ordering and selectable comparison metric. Show actual points/revenue/bonuses/review/DD counts plus relative-to-selected-high neon bars and prior point change. Every mapped profile remains present with no records. View profile selects that person while preserving dates/store filters, and exposes their trend, earnings, last activity, home-store metadata, and category counts/revenue. The owner explicitly chose category counts/revenue alongside total reported points; no per-category point formula is invented. Category count bars are relative composition across categories, not goals. Store performance uses the actual event store and allows drilling into that store.

Records shares all date/person/store filters, adds All/Reviews/DoorDash/Reports and applied literal search by name/store/subscription, and paginates 25 rows with deletion clamping. Reuse History and protected screenshot/edit/delete dialogs. Manager report rows expose the existing stored generated RTF commission as a cents projection for the Bonus column; mobile shows report points, revenue, and that commission separately. No new write path or evidence permissions are introduced. Records remain mounted across view changes and fetch only when visible. Summary and records errors/retries are independent; no last-page record sums are represented as whole-period results.

Migration 009 adds two manager-only security-invoker Postgres functions and store/date indexes. Both verify auth.uid plus tracker_is_manager internally, validate bounded dates/UUID filters and supported kind/page/search inputs, and remain under existing table RLS. Public/anonymous execution is revoked. Dashboard aggregates current/prior metrics, bucket series, people, stores, and per-person categories in Postgres. Source total_revenue_cents alone determines collected revenue; fractional commission precision remains stored and dollar display remains two decimals. Data details disclose actual import/load timestamps and missing revenue fields without claiming collector completeness or payout finality. Employee manager-RPC calls are denied even if browser state is modified.

The existing authenticated provider now has bounded, deduplicated manager caches cleared by the same minute/focus/save invalidation cycle. Results are retained only for matching scopes during refresh; failed requests leave retry paths. Employee bundles do not load manager dashboard/graph components. No checks, browser, dev server, diff/inline checks, hosted reads/writes, migration application, or deployment were executed under the owner's preference. Numeric examples, role/direct-RPC checks, comparison boundaries, refresh/retry, management operations, and visual/mobile/keyboard/zoom/performance acceptance are prepared in supabase/README.md and remain owner-pending.

### Role-specific manager sections and employee-only roster: 2026-11-03

Owner requires a distinct manager sidebar: Team overview, Employees, All reviews, All DoorDash, Team activity. Use the shared navigation for desktop/mobile/collapsed variants with verified role passed from WorkspaceShell, with matching breadcrumb labels. The Employees route opens the existing manager profile/performance view. On manager accounts, Reviews and DoorDash routes render team-wide record views, not personal entry forms. Both retain date/day/week/month, multi-person, multi-store, search, counts, bonuses, pagination, screenshots, and existing authorized management. Team activity opens all employee record types. Dedicated sections hide redundant Summary/People/Records switches and fixed-kind review/DoorDash screens hide inapplicable kind switches. Employees retain their original navigation and forms. Manager account surfaces use the generic Manager workspace label instead of a personal manager identity.

Manager profiles, including the separate Skander manager identity, are not reporting subjects. Migration 010 narrows tracker_people/productivity_reports/bonus_entries SELECT policies using a security-definer, boolean-only tracker_is_employee helper with fixed search_path and explicit grants. It exposes employee eligibility only to self or verified managers, never the membership table or profile details. Manager-only/legacy security-invoker reporting RPCs inherit the same employee-only scope, including totals/history/store/category/comparison data. The security-definer anonymous category benchmark function explicitly aggregates employees only. Protected storage evidence reads inherit the narrowed bonus-row visibility. Stored manager records are preserved, not deleted or reassigned. Manager auth still works without a self profile in tracker_context; TrackerGate requires a profile only for employees. This is role-based: the separate actual employee account remains eligible.

Apply migration 010 after 009, publish the frontend, and restart authenticated sessions to discard old context/data caches. No Edge Function deployment, new dependency, score/rate change, name hardcoding, account merge, or data deletion. Direct manager/employee/raw-table/RPC/evidence acceptance and UI filters/navigation checks are prepared in supabase/README.md. No checks, browser, server, hosted reads/writes, or migration application run.

### Sidebar scroll containment: 2026-11-03

Owner reports sidebar scrolling moving the app. Give desktop sidebar a bounded dynamic-viewport height and its own flexible navigation scroll region, with logo/collapse controls and account footer kept fixed. Apply overscroll containment and horizontal clipping to the nav region. A sidebar-local, non-passive wheel boundary guard prevents background-page scrolling when the nav has no overflow, reaches either end, or the pointer is over fixed sidebar chrome; native scrolling inside the nav remains available, and Ctrl/pinch zoom is preserved. The listener is removed on unmount. Mobile drawer reuses the bounded nav region with fixed header/footer and existing Radix modal scroll lock. No data, role, route, or dependency change. No server, browser, or checks run; owner wheel/trackpad/short-screen/mobile/zoom verification pending.

### Persistent manager filters: 2026-11-03

Owner requests top-panel choices to survive refresh until explicitly changed or reset. Persist manager people/store UUID selections, preset, exact resolved inclusive date range, and Overview view in versioned browser storage scoped by authenticated role and user ID. Share that saved scope across Team overview, Employees, All reviews, All DoorDash, and Team activity. Restore and validate the saved state before requesting data, avoiding a default-scope flash/request. Explicitly selected dates remain fixed across refresh/day changes; clicking a quick preset recalculates it, and Reset restores fresh current-month-to-date/all-employee/all-store/Summary defaults. Keep Reset always visible so an older saved month range can be reset even when the preset label is still This month.

Store only filter identifiers/dates/view preferences, never records, names, amounts, screenshots, tokens, or authorization decisions. Existing RLS/RPC access remains authoritative. Removed/ineligible saved employees/stores are omitted from the request without broadening a now-empty selection to All. Invalid saved JSON/schema falls back to defaults; unavailable browser storage leaves current-session controls usable. No dependency, schema, or migration. No checks, server, browser, or hosted actions run; owner refresh/navigation/account-isolation/reset verification pending.

### Persistent employee reporting dates: 2026-11-03

Employee Overview and Activity share a versioned, role/user-scoped reporting-period preference through `useReportingPeriod`. Save the preset and exact inclusive dates when selected; restore and validate them before fetching or displaying reporting data. Navigation, Activity kind changes, and browser refresh preserve the chosen range in either direction. Explicit dates remain fixed until changed; selecting a quick preset or Reset recalculates against the existing store-calendar anchor. Reset restores current-month-to-date. Reuse the shared date picker, segmented control, and ghost button without new styling or dependencies. Invalid saved data falls back to defaults; unavailable storage leaves current-view controls usable. Store no records, amounts, screenshots, credentials, or authorization decisions. Owner navigation/refresh/preset/reset/account-isolation verification remains pending; no checks were run.

### Verified employee roster safeguard: 2026-11-03

Owner reports a manager identity still visible after the earlier reporting-scope change. Require manager_employee_roster (migration 011) to resolve manager context, independently of the generic people payload. This manager-checked, fixed-search-path security-definer read returns mapped employees only by actual membership role and excludes the authenticated manager. Never cache or render the generic manager people list. Every manager summary/history request, including All, sends the explicit verified employee whitelist; returned employee/record rows also pass that whitelist. Keep employee self-read behavior unchanged. Changed roster membership invalidates existing caches. Failed roster verification clears manager context/data and shows setup/retry rather than rendering an unverified/stale roster. Saved disallowed UUIDs cannot become All. This complements migration 010's raw/legacy/evidence access policies; both remain required. No name hardcoding, account deletion/merge, stored metric changes, dependency, or Edge Function deployment. No checks or hosted operations run.

### Manager cleanup and scroll stability: 2026-11-03

Owner requests removing Earnings breakdown entirely, Data details from all manager pages, visible Chart data toggles, and the Highest-point bucket sentence. Remove ManagerBonus and its mounts rather than leaving hidden or empty panels; reflow profile trends to full width and the Summary category/store row to two working panels. Remove obsolete load-timestamp UI state. Preserve chart exact values through the existing visible keyboard inspection slider and a screen-reader-only equivalent table, without a disclosure button or extra nested vertical scroll region. Keep the concise period comparison and employee report coverage count.

Employee performance defaults to Highest value using the selected comparison metric (points initially), with alphabetical tie ordering and the optional alphabetical sort retained. Estimated earnings keeps its accurate monetary label because it equals point value plus RTF/review/DoorDash bonuses, not a points total. Source calculations are unchanged.

Team activity All now requests a combined bonuses kind: Reviews plus DoorDash only. Migration 012 adds that read-only manager_records filter before search/count/pagination; explicit Reports remains available. Existing manager/employee whitelist/store/date constraints remain. No page-level filtering of a 25-row mixed page is used to imply complete results.

Manager workspace owns vertical scrolling, prevents scroll chaining, reserves stable scrollbar space, disables refresh-induced scroll anchoring, and keeps child panels from flex shrinking. Manager tables/chart frames retain horizontal scroll only; graph inspection reserves consistent height. Overview/entry scroll containers also contain overscroll, and Overview/entry layouts reserve scrollbar space. Keep native wheel/trackpad behavior and reduced-motion preferences rather than forced animated scrolling. Sidebar boundary isolation remains. No dependency, amount, ownership, permission, write-path, or storage change. No checks, browser, server, hosted action, or migration application run; owner scroll/layout/record-filter acceptance pending.

### Global favicon assets: 2026-11-03

Owner supplies and authorizes the existing favicon_io icon package. Preserve the original files in public: favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, android-chrome-192x192.png, and android-chrome-512x512.png. Root layout metadata links browser ICO/PNG variants, the 180 px Apple touch icon, and site.webmanifest so all routes inherit the same icon configuration. Manifest supplies Whizz Repondly/Repondly names, root start/scope, original Android icons, and existing light background color. No icon reconstruction, asset resizing, sidebar logo change, service worker, offline capability, dependency, or deployment is introduced. Replace these public files to update future favicon assets. No checks, server, or browser run; owner verifies after publishing, allowing for browser favicon caching.
