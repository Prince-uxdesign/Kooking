# Kooking — Design System: "Clean Kitchen"

Status: **Implemented.** Tokens, shared components, app shell, and Home use this language.
Showcase: `/design-system`.
Source of truth for values: `app/globals.css` (`@theme`). There is no second copy to keep in sync.
**Every screen, past or future, follows this document.** If a screen needs something this file doesn't cover, add it here first, then build it.

> Supersedes "Fresh Market" (bold weights, shadows, glows, gradients, pastel tiles). That direction read as generic and over-decorated. Don't bring any of it back.

---

## 1. The idea

Clean, sweet, calm. A white page, soft gray cards, one fresh green, and near-black type. It should look like a carefully made product where every element has room to breathe and nothing is shouting.

Three laws:

1. **Flat.** No shadows, no gradients, no glows, no blur, no glassmorphism. Depth comes only from a gray fill against white, and from a dark surface against light.
2. **Whitespace is the layout.** Separate things with space and with gray fills, not borders, dividers, or boxes inside boxes.
3. **Quiet type.** Semibold titles, regular body, medium labels. Nothing heavier than 600. Hierarchy comes from size and colour (ink vs gray), not weight.

### 1.1 Color psychology

- **Fresh green (`#3EDC6B`)** is bright, clean, and alive: herbs, freshness, "go". It is the only saturated colour on most screens, so wherever it appears is where the eye goes. That's why it's reserved for **the primary action and the active state**.
- **Near-black ink** gives contrast and confidence: dark cards, the floating nav, primary text. Green on near-black is the signature pairing.
- **Neutral soft grays** (no blue cast) make everything feel calm and hygienic, like a clean kitchen counter.
- **Tangerine** is a pinch of salt: only the small "in progress" dot. No orange surfaces, buttons, or icons.

### 1.2 Balance

On any screen: ~**75%** white, ~**15%** soft gray cards, ~**8%** ink (text, one dark card, nav), ~**2%** green. If you see more than two or three green things at once, remove some.

---

## 2. Color tokens

### 2.1 Green

| Token         | Hex       | Use                                                                                                              |
| ------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `primary-500` | `#3EDC6B` | **Primary.** Main CTA, active tab/sidebar item, search submit, toggles, progress, selected chip, "Featured" chip |
| `primary-600` | `#2FCB5C` | Hover on green fills                                                                                             |
| `primary-400` | `#5EE387` | Hover on green fills sitting on dark surfaces                                                                    |
| `primary-100` | `#DBFBE4` | Checked ingredient rows, soft green chip                                                                         |
| `primary-700` | `#0E7A34` | Green **text**, only when truly needed (status). Links are ink, not green                                        |

> **Rule:** green fills always carry **ink-900 text/icons** (10:1). White on `#3EDC6B` is 1.8:1 and is never allowed.

### 2.2 Ink and surfaces

| Token          | Hex       | Use                                                                               |
| -------------- | --------- | --------------------------------------------------------------------------------- |
| `ink-900`      | `#111311` | Text, headings, dark cards, floating nav, dark buttons, close buttons             |
| `ink-800`      | `#222522` | Hover on dark buttons                                                             |
| `ink-700`      | `#3A3E3B` | Chip text on white                                                                |
| `ink-600`      | `#4F544F` | Chip icons, inactive sidebar items                                                |
| `ink-500`      | `#646965` | Secondary text, meta, placeholders, "See all" (5:1 on gray)                       |
| `ink-400`      | `#9A9F9B` | Decorative only                                                                   |
| white          | `#FFFFFF` | Page background; icon circles **on** gray cards                                   |
| `surface-100`  | `#F3F4F3` | **The card colour.** Cards, chips, search, fields, list groups, secondary buttons |
| `surface-200`  | `#E9EBE9` | Photo placeholders, hover on gray, progress track                                 |
| `surface-300`  | `#DFE2DF` | Toggle off                                                                        |
| `line-strong`  | `#DADDDB` | Hairline on the white chevron circle in list rows                                 |
| `line-default` | `#EBEDEB` | The rare divider (desktop sidebar edge)                                           |

### 2.3 Accent and status

| Token        | Hex                   | Use                                    |
| ------------ | --------------------- | -------------------------------------- |
| `accent-500` | `#FF7A1A`             | 8px "in progress" dot only             |
| success      | `#0E7A34` / `#DBFBE4` | Have it, ready (icon + text)           |
| warning      | `#B54708` / `#FEF0C7` | Missing items (icon + text)            |
| error        | `#B42318` / `#FEE4E2` | Failures (icon + text)                 |
| info         | `#175CD3` / `#E0EAFF` | Swappable, notices; **the focus ring** |

Status is never colour alone.

---

## 3. Typography

**Inter** via `next/font/google` (`--font-inter`), self-hosted at build time. Clean, neutral, excellent at small sizes. Headings get `letter-spacing: -0.015em`.

| Level            | Size / line-height  | Weight  | Colour  | Use                                          |
| ---------------- | ------------------- | ------- | ------- | -------------------------------------------- |
| Page title (H1)  | 30/36 → 34–36/42–44 | 600     | ink-900 | "What would you like to cook?", page headers |
| Dark-card title  | 24/32 → 28/36       | 600     | white   | Featured card                                |
| Section (H2)     | 20/28               | 600     | ink-900 | `SectionHeading`                             |
| Lead / greeting  | 16/24               | 400     | ink-500 | Greeting, page descriptions                  |
| Row / card title | 15–16 / 20–24       | 400–500 | ink-900 | List rows (400), recipe cards (500)          |
| Step body        | 17 / 1.65           | 400     | ink-900 | Cooking instructions (never < 16)            |
| Body             | 15 / 24             | 400     | ink-500 | Empty states, descriptions                   |
| Button / chip    | 15–16               | 400–500 | —       | Buttons 500, chips 400                       |
| Meta             | 13 / 20             | 400     | ink-500 | Time, servings, hints                        |
| Small chip       | 12 / 16             | 500     | —       | Badges                                       |

Never use `font-bold` (700) or heavier. No uppercase or tracked-out labels. Inputs are 16px minimum. Quantities and timers use `.tnum`.

---

## 4. Space, shape, depth

### 4.1 Spacing (generous)

Base 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64.

- **Gutters:** 20px phones, 24px from 640px, 48px from 1024px. Content max 1120px.
- **Between sections:** 32px phones, 40px tablet, 48px desktop.
- **Title → content inside a section:** 16px. **Header block** (greeting, title, search): 24px between groups.
- **Card padding:** 20px. Media cards use a **6px inset** (`p-1.5`) so the photo floats inside the gray card with its own radius.
- **Chips:** 8px apart. **List rows:** 4px apart inside an 8px-padded group.
- When something feels cramped, add space. Don't add lines.

### 4.2 Radius: big and soft

| Class               | px  | Use                                                          |
| ------------------- | --- | ------------------------------------------------------------ |
| `rounded-full`      | —   | Buttons, chips, search, icon buttons, nav, avatars, badges   |
| `rounded-[32px]`    | 32  | Dark feature card, sheets, modals, big recipe photo          |
| `rounded-3xl`       | 28  | **Default card**, list groups, empty states, timer           |
| `rounded-[22–27px]` | —   | Photos inset in cards (outer radius − inset)                 |
| `rounded-[20px]`    | 20  | Rows (ingredient, checkbox, toggle, stepper), list-row hover |
| `rounded-2xl`       | 24  | Text fields                                                  |
| `rounded-[18px]`    | 18  | Small thumbnails (56–64px)                                   |

### 4.3 Depth

There are **no shadow tokens.** Depth comes from exactly three moves:

1. Gray card (`surface-100`) on white page.
2. White element (icon circle, chevron circle, chip) on a gray card.
3. Dark surface (`ink-900`) for the one thing that should anchor the screen (feature card, floating nav, close button).

Overlays use an `ink-900/40` scrim and nothing else.

---

## 5. Component recipes (`shared/ui`)

Use these components. When you style something new, copy a recipe; don't invent one.

- **Button / `buttonClasses()`:** pills, `font-medium`, no shadow. `md` 48px, `lg` 56px (full-width bottom CTA). Variants: `primary` (green + ink), `secondary` (gray), `tertiary` (text), `dark` (ink + white), `light` (white, for dark cards). One primary per region. Links styled as buttons use `buttonClasses()` on the `<Link>`; never put a `<button>` inside a link.
- **IconButton:** 48px circle. `soft` (gray, on white), `white` (on gray/photo), `primary` (green), `dark`. `label` required.
- **Card:** `rounded-3xl bg-surface-100 p-5`. No border, no shadow.
- **RecipeCard:** gray card `p-1.5`, photo `aspect-[4/3] rounded-[22px]`, then title (15/500) and meta (13 ink-500, outline icon). Demo label is a white pill on the photo. The whole card is one link; hover darkens the gray slightly.
- **Dark feature card** (Home "Featured"): `rounded-[32px] bg-ink-900 p-1.5`, photo panel `rounded-[27px]`, then on the dark band: green "Featured recipe" chip, white 24–28/600 title, `white/70` meta, `light` pill CTA. On phones the photo stacks on top; from 640px it sits side by side. One per screen.
- **ListGroup / ListRow / ListIcon:** the settings-menu pattern. A gray `rounded-3xl p-2` group; rows are 64px+ links with a leading **white 48px icon circle** (or an 56px `rounded-[18px]` thumbnail), a 16px regular title + 13px meta, and a trailing **white 40px chevron circle with a hairline**. Rows separate by 4px of space, never dividers. Use it for menus, recents, shortcuts, and settings.
- **Chip:** 44px gray pill, 15px regular, optional 18px outline icon in `ink-600`; selected = green + ink. Rows of chips scroll horizontally on phones (`no-scrollbar`, bleeding to the screen edge) and wrap from 640px. `ChipButton` is the button form for in-page state: `pressed` for filter toggles (`aria-pressed`), a white 24px × circle (`trailingIcon`) for removable active filters, `disabled` at 45% for zero-result options.
- **Badge:** small flat pill (`neutral` on white, `white` on gray, plus status tones with icons).
- **Search (`SearchInput`, Home search):** 56–60px gray pill, ink search icon, `ink-500` placeholder "Search for recipes", 48px green circle action on the right. Focus: white fill + ink border.
- **Fields:** 52px, `rounded-2xl`, gray fill, no border; focus = white + 1px ink border. Labels are always present.
- **Rows** (`Checkbox`, `IngredientRow`, `Toggle`, `QuantityInput`): gray `rounded-[20px]` rows, no borders. Checked ingredient = `primary-100` + "✓ Have it". Toggle on = green. Stepper: white pill track, gray minus circle, green plus circle.
- **Segmented control** (when needed): gray pill track, active segment = green pill with ink text.
- **Feedback:** `Toast` is a gray rounded row with a tinted icon circle. `EmptyState`/`ErrorState` are gray `rounded-3xl` blocks with a white 64px icon circle. Skeletons are `surface-100`.
- **Overlays:** `BottomSheet` has a white `rounded-t-[32px]` sheet with a **dark 48px close circle centered at the top**, the title centered under it, content that scrolls inside the sheet (max 85% of the viewport), and an optional pinned `footer` for actions ("Clear all" + green "Show N recipes"). It behaves as a modal dialog: focus moves in, Tab is trapped, Esc closes, focus returns to the trigger, and the page behind is scroll-locked. `Modal` is a white `rounded-[32px]` panel with a dark round close button.
- **Progress / Timer:** 8px gray track with green fill. Timer is an `ink-900 rounded-3xl` block with a 34px semibold tabular clock and green Start pill.

### Navigation (shell)

- **Phones/tablets (< 1024px):** **floating dark pill** centered 16px above the bottom (+ safe area). 48px circular items: inactive = `white/10` circle with white outline icon; active = green pill with the icon and a short label (label hidden under 360px). Every item keeps its full name as `aria-label` + `title`.
- **Header (phones):** plain white, brand only (green circle mark + "Kooking" 20/600). No border, not sticky.
- **Sidebar (≥ 1024px):** white with one hairline edge; 48px pill rows; active = green fill + ink text; inactive `ink-600`, hover gray.
- A center "+" button is allowed only once a real create action exists.

### Section header

`SectionHeading`: 20/600 title left; `SeeAllLink` right ("See all ›", 15px `ink-500`, hover ink). Vertically centered.

---

## 6. Screen anatomy

1. **Header:** greeting (16 ink-500) → **page title** (30/600) → optional round icon button on the right (white or gray circle).
2. **Search pill** with the green action.
3. **Anchor card:** one dark feature card, _or_ a large photo.
4. **Chips row** for categories/filters.
5. **Sections:** title + "See all", then a 2-up recipe card grid (3-up from 768px) or a list group.
6. **Bottom:** floating pill nav; on detail screens a full-width `lg` green CTA with a plain white strip behind it (no fade).

Recipe detail (when built): big photo `rounded-[32px]` with white circle back/save/more buttons on it → title 30/600 + heart icon button → `ink-500` description → gray stat pills → ingredients as gray tiles → steps as list rows (green number circle) → sticky green "Start cooking" `lg` pill.

Cooking mode: `ink-900` canvas, white text 17px+, green controls with ink text, tabular timers.

---

## 7. Icons, imagery, motion

- **Icons:** `lucide-react` only, **outline**, `strokeWidth 1.75` (2–2.25 when active or inside green). 20px in nav/rows, 18 in chips/buttons, 14–16 in meta. Colour ink-900 or ink-500/600. No coloured icons, no pastel icon tiles.
- **Imagery:** real food photos on light, neutral backgrounds, always rounded. Missing photo = flat `surface-200` tile with a white icon circle and "Photo coming soon". No stock photos pretending to be the dish.
- **Motion:** colour transitions only (150ms). No lifts, scaling, bounces, or parallax. `prefers-reduced-motion` is respected globally.
- **No emoji** in UI copy.

## 8. Accessibility (non-negotiable)

- Contrast: ink on green (10:1), white on ink, ink-900/ink-500 on white and gray (≥ 4.5). Never white on green.
- Focus: global 3px `info-700` outline; fields switch to an ink border. Never remove focus without a replacement.
- Targets ≥ 44px (most are 48–60). Labels on every control. Icon-only controls need `aria-label`; nav items also get `title`.
- Status = icon + words. Semantic landmarks, ordered headings, live regions for steppers and timers, Esc closes overlays.

## 9. Responsive

Mobile-first, one route tree. Test at 320 / 375 / 390 / 430 / 768 / 1024 / 1280.
< 640: 20px gutters, stacked feature card, scrolling chip row, 2-up cards. 640–1024: side-by-side feature card, wrapped chips, 3-up cards from 768. ≥ 1024: sidebar, 48px gutters, max 1120px.

## 10. Honesty rules

No fabricated ratings, reviews, popularity, calories, difficulty, or endorsements. Show a stat only if the content model has it. Demo content is labelled "Demo".

## 11. New-screen checklist

- [ ] No `shadow-*`, gradients, `blur`, glows, `font-bold`/`font-extrabold`, uppercase labels, or emoji
- [ ] White page, gray `rounded-3xl` cards, white circles on gray
- [ ] At most 2–3 green things visible; green fills carry ink text
- [ ] One dark anchor at most (plus the nav)
- [ ] Generous spacing: 20px gutters, 32px+ between sections
- [ ] Buttons, chips, search, icon buttons are pills or circles
- [ ] Menus and recents use `ListGroup`; categories and filters use `Chip`
- [ ] Shared components and `buttonClasses()` only; no ad-hoc hex values
- [ ] 44px targets, labels, visible focus, status = icon + text
- [ ] Checked at 320 and 1280; `npm run check` green

## 12. Landing page (`/welcome`)

The marketing page (`app/(marketing)/welcome`, components in `features/landing/`) has its own, warmer register, set by product direction (references: opencollective.com and an editorial review-card layout). The app screens keep everything above. On the landing page only:

- **Type:** display headings are Inter **800** with tight tracking (`-0.04em`); section eyebrows are set in braces, e.g. `{How it works}`. Body stays 400.
- **Texture:** `Wash` draws a watercolour band with torn-paper edges (SVG noise, green or cream) behind one section at a time. `Highlight` draws a marker stroke behind 1–3 key words (keep them short: they don't wrap).
- **Cards:** white with a 1px `line-default` border on white, or white on a wash/gray band. Still no drop shadows.
- **Photography:** real people cooking and real Nigerian dishes from Unsplash (free licence), hot-linked from Unsplash's CDN and credited in the footer (`PHOTOS` in `content.ts`). People photos are scenes, never the face of a named story or quote. Avoid shots with brand packaging.
- **Motion:** fade + ≤ 16px rise on scroll (`Reveal`), marker strokes that draw in, colour-only scroll fill (manifesto), sticky scrollytelling (How it works), slow drift on hero cards, photo and testimonial marquees (pause on hover/focus), and the Cooking Mode band widening to full bleed. Everything stops at its final state under reduced motion, and nothing is hidden without JS.
- **Live demos run on real code:** Kitchen Check and the servings card call `scaleAmount`/`formatQuantity`.
- **Honesty (§10):** no star ratings, review counts or user numbers. The case studies and the testimonial wall are labelled illustrative until real, consented reviews exist; testimonial avatars are initials, not stock faces.
