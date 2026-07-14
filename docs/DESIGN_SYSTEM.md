# Exam Reviewer Design System

**Direction:** Exam Studio  
**Audience:** Engineering, product, and design contributors  
**Status:** Source of truth for all student, course, assessment, chat, account, auth, and admin interface work

## 1. Product Character

Exam Reviewer is a high-trust study environment for Philippine board-exam preparation. It should feel calm, capable, and academic—not like a generic learning-management system or a gamified consumer app.

The visual language is **Exam Studio**:

- **Focused:** Every important screen answers “what should I do next?” before exposing secondary controls.
- **Evidence-led:** Scores, mastery, and recommendations must use real data and explain their basis.
- **Editorial:** Warm canvas, generous space, restrained ornament, and a display serif give the product academic confidence.
- **Supportive:** Language is direct and encouraging, never alarmist or falsely celebratory.
- **Premium through restraint:** Use one strong action per region, clear hierarchy, tactile surfaces, and deliberate whitespace. Do not use decoration to compensate for weak information hierarchy.

### Non-negotiable rules

1. A student-facing page must lead with the relevant next action, current state, or decision—not a wall of equal-weight cards.
2. Never present missing evidence as `0%`, “complete,” “behind,” or a mastery judgment. Use **Not Assessed** and explain the next reliable action.
3. Use the dark ink treatment for focus areas and primary actions. Oxblood is an accent, not a full-page background or an error substitute.
4. All interactive UI is keyboard reachable, visibly focused, and has a touch target of at least 44px where space permits.
5. Components must represent their real semantics: links navigate, buttons act, labels name fields, and cards are not fake buttons.

## 2. Foundations

### 2.1 Color roles

Use semantic roles instead of inventing page-level colors. `app/globals.css` remains the implementation source for global variables; these values define the intended system and should be centralized as aliases before broad rollout.

| Role | Target | Use | Never use for |
| --- | --- | --- | --- |
| Canvas / porcelain | `#F4ECE2` | Main student-page canvas, quiet background areas | Body text or controls |
| Surface | `#FFFFFF` | Cards, forms, dialogs, tables | Full-page canvas when a softer canvas is available |
| Ink | `#18243A` | Primary actions, dark recommendation panels, navigation chrome, main headings | Error states |
| Ink raised | `#293752` | Hovered ink controls, dark-surface elevation | Large page backgrounds |
| Slate | `#647087` | Secondary text, metadata, inactive controls | Important body text below AA contrast |
| Border | `rgb(36 51 76 / 10%)` | Surface separation and input borders | Heavy dividers between every element |
| Oxblood | `#8E3039` | Active state, focused study cue, selected filter, restrained emphasis | Every primary button, destructive actions, or paragraphs |
| Oxblood strong | `#6F2730` | Pressed oxblood state | Regular text on dark surfaces |
| Brass | `#E4B57A` | Small accent on dark study surfaces, achievement detail | Large fills or warning-only meaning |
| Evidence / info | deep sky blue | “Not Assessed,” neutral information, guidance | Success or destructive feedback |
| Needs focus | `#A0363D` | Evidence-backed mastery below 60 | Generic brand emphasis |
| Building confidence | accessible amber | Mastery 60–74 | Error messages |
| Proficient | accessible emerald | Mastery 75+ | Decorative green accents |
| Destructive | `--destructive` | Irreversible actions and errors | “Needs focus” or any learning outcome |

Dark shell values are intentionally warm and inky: use `#18243A` for the nav and `#142037` for sidebar footer depth. On dark surfaces, use porcelain/white text, muted slate-blue text, and a pale rose focus ring (`#E3AAAD`).

### 2.2 Color usage

- Give each region one visual job: canvas, surface, dark focus panel, or destructive feedback.
- Use borders before shadows to separate adjacent light surfaces. Reserve stronger shadows for raised dialogs, command panels, and hoverable cards.
- Every status must include an icon, label, or explanatory text. Color cannot be the sole signal.
- Course artwork may use controlled gradients. Product UI, cards, and metrics should not use arbitrary rainbow gradients.
- Do not use pure black. Ink is the darkest neutral.

### 2.3 Typography

| Role | Font | Weight / tracking | Use |
| --- | --- | --- | --- |
| Display | Newsreader (`--font-display`) | Regular/medium, tight tracking | Page titles, recommendation headlines, card titles, score callouts |
| UI / body | Plus Jakarta Sans (`--font-sans`) | 400–700 | Navigation, controls, body, tables, helper copy |
| Code / identifiers | System monospace only when needed | 500, tracked | Class codes, IDs, snippets, technical formulas |

Use display typography sparingly. It creates hierarchy when reserved for high-value content; do not set every section label, table heading, or dialog title in Newsreader.

| Token | Size / line height | Use |
| --- | --- | --- |
| Eyebrow | 10–11px / 1.3 | Uppercase section label; `font-bold`, `tracking-[0.14em]` |
| Display 1 | 40px mobile, 48px desktop / 1.0 | Main page title |
| Display 2 | 30–36px / 1.05 | Primary panel title, empty-state title |
| Display 3 | 24–28px / 1.1 | Card title, major section title |
| Heading | 18–20px / 1.25 | Dialog, table, or form section heading |
| Body | 14–16px / 1.5 | Product copy |
| Metadata | 12–13px / 1.4 | Date, instructor, supporting evidence |
| Micro | 10–11px / 1.3 | Compact labels only; never required instructional copy |

- Use sentence case for descriptions and system messages. Use Title Case for page, section, button, and dialog headings.
- Apply `text-wrap: balance` or `text-pretty` to display headings where supported.
- Use `font-variant-numeric: tabular-nums` for score comparisons, timers, percentage columns, and analytics tables.
- Do not use more than three type sizes in one card.

### 2.4 Spacing, radii, and elevation

Base spacing is 4px. Use this scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64**.

| Element | Radius | Padding / gap | Elevation |
| --- | --- | --- | --- |
| Buttons, inputs, compact controls | 10–12px | 12–16px horizontal | Border; shadow only when raised |
| Standard card | 16px | 20px | 1px border + soft shadow |
| Feature / recommendation panel | 24px | 24px mobile, 32px desktop | Dark fill or stronger shadow |
| Dialog / sheet | 20–24px | 24px | Elevated shadow, backdrop |
| Status badge | Fully rounded | 8–10px horizontal, 4–6px vertical | Flat |

- Never stack a heavy border, a heavy shadow, and a saturated background on the same neutral card.
- Default vertical page rhythm is 32px between major regions and 16–20px inside regions.
- Use 1px borders at low opacity; avoid thick rules except progress indicators and intentionally active elements.

### 2.5 Responsive layout

| Viewport | Page padding | Course / content grid | Guidance |
| --- | --- | --- | --- |
| 320–639px | 16px | 1 column | Controls stack; filters scroll horizontally; preserve 44px targets |
| 640–1023px | 24px | 2 columns where cards support it | Keep main action before supporting metrics |
| 1024–1279px | 32–40px | 2–3 columns | Recommendation panel becomes two-column |
| 1280px+ | 40px | 3 cards per row, max content width 1280px | Do not expand reading columns indefinitely |

- Use the application shell: 64px top nav, 296px expanded sidebar, 80px collapsed sidebar.
- Student workspace pages use the warm page canvas and a max-width container. Chat and timed assessment routes may opt into their dedicated full-height layout.
- Never rely on JavaScript measurements for standard card grids. Use CSS grid/flex and container-aware layouts.

## 3. Shared Shell

### Top navigation

The top nav is the product’s stable frame. It uses dark ink, a light academic mark, page context, and a clear sidebar trigger.

- Height: 64px.
- Keep the brand, current page label, and admin-state indicator compact.
- Use 40–44px icon controls with visible focus rings and tooltips when labels are unavailable.
- Navigation chrome is not a place for large status cards, repeated buttons, or decorative gradients.

### Sidebar

- Expanded: 296px; collapsed: 80px.
- Group navigation under small uppercase labels; active entries use a restrained oxblood surface, not a full red block.
- Long course and thread labels truncate with the full name available through the destination page or tooltip.
- The user account footer is a compact identity/control zone; do not duplicate account settings elsewhere in the shell.
- On mobile, the sidebar is a focus-contained overlay with an ink backdrop and safe-area-aware spacing.

### Page header

Every standard workspace page begins with:

1. Optional eyebrow showing the workspace/context.
2. One clear display title.
3. One-line plain-language description or count when useful.
4. At most one primary action and one secondary action.

The page header should not include a collection of unrelated metric tiles. Put decision-relevant metrics in the next section.

## 4. Core Component Contracts

### Buttons

| Variant | Treatment | Use |
| --- | --- | --- |
| Primary | Ink fill, light text | Main page action: Continue Reviewing, Save Changes, Start Assessment |
| Secondary | White surface, ink border/text | Join a Class, Export, Preview, Cancel |
| Quiet / ghost | Transparent, clear hover | Inline actions, menus, low-emphasis controls |
| Destructive | Destructive fill/text | Delete, revoke, permanently discard; always confirm |
| Icon | 40–44px square/round | Utility only; requires `aria-label` |

- Use a specific verb plus object: **Save Course**, **Take Diagnostic**, **Review Mistakes**.
- Buttons that navigate must render as links (`Button asChild` + `Link`).
- Keep primary buttons at 44px high in student workflows. Dense desktop table toolbars may use 36–40px controls only when they remain accessible on touch devices.
- Do not place two visually identical primary buttons beside each other.

### Links

- Use links for navigation, including card titles and “View all” actions.
- Preserve browser behavior for Cmd/Ctrl-click and middle click.
- Inline links are oxblood with an obvious hover/focus treatment. Do not rely on color alone in long instructional paragraphs.

### Cards

Cards are information containers, not a default layout mechanism.

| Card type | Required content | Behavior |
| --- | --- | --- |
| Course card | Context, title, student state, evidence, one next action | Title/action are links; utility actions are separate buttons |
| Recommendation panel | Why it is recommended, one action, data basis | Dark ink feature panel; one per page |
| Metric card | One metric, label, comparison or context | Use only when it changes a decision |
| Task card | Status, due/context, next action | Clear action, no fake progress |
| Insight card | Evidence-backed observation and suggested response | Never make a generic AI claim without data |

- Standard cards are white on porcelain with a low-opacity ink border, 16px radius, and 20px padding.
- Use deterministic fallback artwork for courses without thumbnails; never show a broken image or an unrelated stock photo.
- Long user-generated titles use `line-clamp-*` and `min-w-0` inside flex layouts.
- Hover elevation is subtle (`transform` and `box-shadow` only) and is never the only indication that a card is interactive.

### Forms

- Every field has a visible `Label`, meaningful `name`, correct `type`, and `autocomplete` value.
- Place help text and errors directly below the associated field. Give errors `role="alert"` or an appropriate live region.
- Use examples in placeholders and end them with an ellipsis: `Search courses…`, `e.g. ABC123`.
- Do not disable a submit button before the user has attempted an action unless the form cannot be valid; display progress only after submission begins.
- Keep validation specific and actionable: “Enter the 6-character code from your instructor.”
- Dialog forms should have one primary submit action and a clear cancel/close path.

### Filters, search, and tabs

- Search and filters are an aid to finding, not decoration. Show them when the collection can realistically grow beyond a quick scan.
- Selected filter state is visible, removable, and represented in the URL (`?filter=needs-focus&q=mechanics`).
- Segment controls use buttons with `aria-pressed`; tabs use the shared Tabs primitive and tab semantics.
- On mobile, horizontal filter rows scroll with visible affordance rather than wrapping into uneven rows.
- Show result counts near the collection, not inside every filter chip unless the count is reliable and helpful.

### Menus, popovers, dialogs, and sheets

- Use a menu for a compact list of related actions, a popover for lightweight contextual detail, a dialog for focused decisions/forms, and a sheet for detail that benefits from retaining page context.
- Dialogs need a title, a concise description when intent is non-obvious, focus containment, and `overscroll-behavior: contain`.
- Destructive actions require confirmation and name the exact object affected.
- Never hide essential mobile-only information behind hover-only popovers.

### Tables and data lists

- Use tables for comparisons across rows; do not force tabular data into tiles.
- Pin important identifiers/names on narrow screens or switch to a row card only when comparison is no longer the primary task.
- Align numbers right and apply tabular numerals. Include units in headers, not every cell.
- Use a single, calm row hover. Avoid zebra striping plus dense borders plus multiple badge colors.

### Progress, mastery, and status badges

Use the following mastery language only when the underlying score is backed by assessment evidence:

| State | Rule | Copy | Visual treatment |
| --- | --- | --- | --- |
| Not Assessed | No mastery rows / no relevant evidence | “Build Your Baseline” | Sky information badge; diagnostic CTA |
| Needs Focus | Under 60 | “Focus next on [subject].” | Oxblood status, supportive language |
| Building Confidence | 60–74 | “Keep building confidence.” | Amber status |
| Proficient | 75–89 | “Strong foundation.” | Emerald status |
| Mastered | 90+ when confidence is sufficient | “Consistently strong.” | Emerald + restrained brass detail |

- Do not label a course “Completed” without a real completion model.
- Label `last_updated` from mastery data as **Last Assessed**, not “Last Practiced,” unless an activity event proves practice occurred.
- Pair every progress bar with a text value, an accessible label, and a sentence explaining its basis or next action.
- For insufficient evidence, show the number of answered questions only if it is useful; do not fabricate trend lines.

### Loading, empty, error, and pending states

Every async region must define all four states before implementation.

| State | Pattern | Copy principle |
| --- | --- | --- |
| Loading | Layout-matched skeleton, no flashing spinner wall | “Loading…” only when text is needed |
| Empty | Calm icon/illustration, one explanation, one next action | Explain how to populate the page |
| No results | Preserve controls, show active search/filter context, offer clear action | “No courses match that view.” |
| Error | Inline alert card with recovery action | State what failed and what the student can do |
| Pending | Visible in-place confirmation | Explain the wait and who acts next |

- Skeletons must mirror the final layout and stop animating under reduced-motion preferences.
- Never replace a stable list with an empty blank screen while refreshing.

## 5. Student Experience Patterns

### Student Courses (`/dashboard`) — reference implementation

This is the reference for all future student dashboard work.

1. Page header: review-space eyebrow, **My Courses**, count, Join a Class.
2. One dark **Your Next Best Step** panel with a deterministic recommendation and evidence basis.
3. Course collection with URL-synced search and state filters.
4. Course cards with course context, real status, mastery/evidence, and a clear course action.

The recommendation algorithm is intentionally bounded: use active-course status and persisted `subject_mastery`; do not invent goals, streaks, deadlines, or AI confidence scores that are not stored.

### Course workspace (`/course/[id]`)

The course page should become a focused study desk, not a dashboard inside a dashboard.

- Lead with course identity, current mastery/evidence, and one recommended next action.
- Use a two-column desktop layout only when the support column contains decisions: topic tracker, insight, or active assessment context.
- Topic rows show topic name, evidence state, mastery, and a single “Practice” or “Review” action.
- Keep assessments and notes as clearly labelled sections/tabs. Preserve URL state when tabs represent meaningful destinations.
- Sheets for topic details, diagnostics, quick practice, flashcards, and notes must open from an explicit action and return focus to the trigger.

### Assessments and quizzes

Assessment UI is an exam environment. Clarity and calm beat novelty.

- Before starting, show title, question count, time limit, attempts, availability, and what happens after submission.
- During an assessment, use a stable top progress/timer region, one readable question column, and a predictable answer layout.
- The current question needs a strong but non-alarming active state. Answer choices use large hit areas and a visible selected state.
- Do not use red for unanswered questions; reserve it for invalid/destructive contexts. Use neutral “Not Answered” labels.
- Keep question navigation compact and numeric. Never rely on color alone for answered, flagged, and current states.
- Submission requires a review state that names unanswered questions and lets students return to them.
- Results lead with the outcome, then an evidence-backed review plan: weak subjects, missed concepts, and clear next actions.

### AI tutor chat (`/course/[id]/chat`)

- The course context is always visible but quiet; the conversation remains the focus.
- Student and assistant messages have distinct surfaces without decorative chat bubbles that waste horizontal space.
- Assistant explanations use a readable line length (roughly 65–75 characters), hierarchy for steps, and clear math/code treatment.
- Source-grounded answers, uncertainty, and fallback states are explicit. Do not imply an answer is verified when retrieval failed.
- Composer has a visible label for assistive technology, keyboard shortcut hint only when available, and a clear send/loading state.
- Thread history is navigation, not the primary content. It truncates safely and exposes full titles on focus/hover.

### Notes and generated study material

- Notes use an editorial reading surface with comfortable measure and generous vertical rhythm.
- Separate authored text from AI-generated content with provenance and actions such as **Insert**, **Regenerate**, or **Keep Draft**.
- Save state is explicit: Saving…, Saved, or an actionable error. Do not silently lose drafts.
- Math, code, and long links must scroll safely without causing page overflow.

### Account and settings (`/account`)

- Use grouped settings sections: profile, security, preferences, and account actions.
- A setting row contains a title, one-line consequence, control, and save/apply behavior that is immediately clear.
- Keep destructive account actions isolated at the end with stronger confirmation language.
- Do not use dashboard metrics or celebratory cards on settings pages.

### Auth (`/auth`, `/auth/reset-password`)

- Auth is quiet and reassuring: one task, one form, concise privacy/support text.
- Use the porcelain canvas and ink brand treatment without a heavy dashboard shell.
- OAuth and email alternatives have equal clarity. Inputs, password visibility controls, reset links, and errors are fully labelled.
- Authentication failure copy tells the user what to check next and never reveals sensitive account information.

## 6. Admin Experience Patterns

Admin pages share the same shell, typography, surfaces, focus treatment, and interaction rules. They may be denser, but they must not regress to a separate visual product.

### Admin dashboard and course overview

- Lead with actionable course health: enrollments requiring action, assessment availability, question-bank quality, and recent changes.
- Use compact metric cards only for metrics that lead to a drill-down action.
- Keep administrative emphasis distinct from student mastery: student-facing “Needs Focus” is never reused to judge instructor performance.

### Course management

- Treat general settings, members, documents, topics, and enrollment requests as task-based sections with a single visible current context.
- Multi-step or destructive workflows use clear progress, confirmation, and recovery copy.
- Member lists favor searchable tables with bulk actions in a contextual toolbar; never hide selection state.
- Empty document/topic states explain the next authoring step and offer a relevant action.

### Assessment builder and question bank

- Make creation mode explicit: draft, preview, published, archived.
- Keep question editing readable; question stem, options, answer key, explanation, subject/topic, and source must have stable field order.
- Separate editor controls from student-preview UI so creators can reason about both without visual collision.
- Generated questions are drafts until reviewed. AI origin, generation status, and approval actions must be unmistakable.

### Admin visual emphasis

- The existing admin red can remain a scoped administrative accent during migration, but it must use the same ink, porcelain, surface, border, spacing, and typography system.
- Do not introduce another admin font, radius scale, navigation shape, or button language.

## 7. Content and Data Language

### Voice

- Write to the student: “Review Strength of Materials next.”
- Be specific: “12 questions answered” instead of “You’re making progress.”
- State uncertainty: “Complete a diagnostic to generate a recommendation.”
- Celebrate only supported outcomes: “Strong foundation in Hydraulics” is valid only with adequate evidence.
- Prefer concise active verbs: Continue, Review, Practice, Start, Save, Publish, Invite, Resolve.

### Copy rules

- Use **&** in compact UI labels when it improves scanability.
- Use an ellipsis character in ongoing states: Loading…, Saving…, Joining…
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat`; the current product convention is `en-PH` where a fixed locale is required.
- Use numerals for counts: 4 courses, 12 questions, 35 minutes.
- Avoid “magic” AI language such as “AI knows exactly what you need.” Explain the evidence or present the recommendation modestly.

## 8. Interaction, Motion, and Feedback

### Focus and hover

- Light surfaces: visible 2px oxblood/ink-tinted focus ring.
- Dark shell: pale rose focus ring with a dark offset.
- Hover increases clarity through one or two properties: text color, border, background, shadow, or transform. Do not use `transition: all`.
- All buttons, links, rows, and icon controls need an obvious hover and active response.

### Motion

| Use | Duration | Properties |
| --- | --- | --- |
| Button / filter feedback | 150ms | color, background, shadow |
| Card hover | 200ms | transform, border, shadow |
| Dialog / sheet | 200–250ms | opacity, transform |
| Content entrance | 200–300ms | opacity, small translateY only |

- Use `ease-out` or the existing product easing for entrance; motion should never delay task completion.
- Respect `prefers-reduced-motion`: remove non-essential transform/opacity animation and animated skeleton shimmer.
- Do not animate layout dimensions when CSS grid/flex can handle the change.

### Notifications

- Success: name the completed action (“Course settings saved”).
- Error: name the problem plus recovery (“Couldn’t save changes. Check your connection and try again.”).
- Use toasts for confirmations that do not need follow-up; use inline errors for fields and persistent regions.
- Async status changes need `aria-live="polite"` unless they are urgent errors.

## 9. Accessibility and Quality Baseline

Every new or migrated page must meet WCAG 2.2 AA intent.

- Use semantic landmarks (`header`, `nav`, `main`, `section`) and sequential headings.
- Provide a skip link for the application main content when the page shell is present.
- Contrast: 4.5:1 for normal text and essential icons; 3:1 for large text and non-text UI boundaries.
- Focus must remain visible, never be hidden by sticky chrome, sheets, or dialogs.
- Inputs have labels; icon-only buttons have `aria-label`; decorative icons have `aria-hidden="true"`.
- Images have meaningful alt text or empty alt text when decorative. Include explicit image dimensions or a stable aspect-ratio container.
- Support keyboard navigation through filters, menus, dialogs, course cards, answer choices, and rich editors.
- Do not make hover the only way to reveal mastery, feedback, explanations, or controls required on touch devices.
- Keep text readable at browser zoom and prevent horizontal overflow from equations, tables, names, or code.
- Do not encode time-critical or score-critical information in color alone; pair with text and icon/state.

## 10. Engineering Conventions

### Component ownership

| Location | Purpose |
| --- | --- |
| `app/globals.css` | Global semantic tokens, theme behavior, base accessibility rules |
| `components/ui/` | Generic primitives built on Radix/shadcn patterns: Button, Input, Dialog, Tabs, Table, Progress |
| `components/layout/` and shell components | Navigation and shared page layout |
| `components/course/`, `components/quiz/`, `components/assessment/` | Reusable product-domain composites |
| Route folders | Page-only composition and state orchestration |
| `lib/` | Pure data derivation and formatting helpers, such as student course summaries |

- Promote a pattern to `components/ui/` only when it is domain-neutral and used across route families.
- Keep domain state/status derivation in `lib/`, not duplicated in card components.
- Add a semantic token or component variant before adding the same arbitrary color, radius, or shadow to three pages.
- Avoid new CSS files for one-off pages. Use existing tokens and Tailwind utilities; add global CSS only for system-wide behavior.

### Required implementation checklist

Before merging a visual change:

- [ ] Uses the foundation tokens and type scale above.
- [ ] Includes loading, empty, error, and pending states where data is async.
- [ ] Uses real data semantics; missing data is not rendered as a score.
- [ ] Works at 320px, tablet, and wide desktop widths.
- [ ] Is keyboard usable with visible focus and appropriate ARIA labels.
- [ ] Respects reduced motion and avoids `transition: all`.
- [ ] Uses `Intl.*` for dates/numbers and clamps long user-generated content.
- [ ] Passes targeted lint, TypeScript, production build, and visual review with realistic long/empty/error data.

## 11. Route Migration Map

Use this order to maintain a coherent student journey. Do not redesign isolated cards without their parent page hierarchy.

| Priority | Route family | Required outcome |
| --- | --- | --- |
| Complete | `/dashboard` | Exam Studio reference: recommendation, real mastery, course collection, class join |
| Next | `/course/[id]` | Study desk with current evidence, topic focus, assessments, notes, and one clear action |
| Next | `/course/[id]/chat` | Focused AI tutor workspace with readable responses and source/status clarity |
| Next | Quiz and assessment components | Calm exam flow, review state, accessible answer selection, evidence-led results |
| Then | `/account`, `/auth`, `/auth/reset-password` | Quiet, trustworthy transactional experience |
| Then | `/admin/dashboard`, `/admin/courses`, `/admin/course/[id]` | Same system foundations with productive data density |
| Then | Course management and assessment-builder subflows | Consistent task-based management, authoring, and review patterns |

## 12. Anti-Patterns to Remove During Migration

- Generic white-card grids with equal visual weight and no recommended action.
- Fake clickable `div`/card containers, nested interactive controls, and icon buttons without labels.
- Progress bars that always show 0%, hover-only mastery details, and “Completed” labels based only on a course end date.
- Multiple arbitrary gradients, saturated status colors, or red used for every emphasis.
- Tiny controls, unlabelled fields, silent errors, and disabled submit buttons without feedback.
- Loading spinners that replace page structure, empty states with no next action, and errors that do not offer recovery.
- Page-specific fonts, radii, or shadow systems that drift from the shared shell.
- Unbounded `transition-all`, autoplay motion, and animations that ignore reduced-motion preferences.

---

When a future feature does not fit a pattern in this document, decide its **user decision**, **data evidence**, and **semantic component** first. Extend the system only after those three are clear.
