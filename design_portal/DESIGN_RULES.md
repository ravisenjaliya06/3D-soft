# Bravento Redesign — Design Rules

Goal: a modern, attractive, user‑friendly look for **every page**, applied **one page at a time**,
with **zero change to functionality**. Any AI or developer working on the redesign must follow these rules.

---

## 1. Golden rules (never break these)

1. **Style only.** Change CSS (`*.module.css`, `globals.css`) and purely presentational JSX
   (wrapper `div`s, class names, icons, text casing). Never change:
   - handlers (`onClick`, `onChange`, `onSubmit` …), hooks, state, Redux, API calls, routes, props, validation;
   - element `id`s, `name`s, `data-*` attributes, form field order of submission, keyboard behaviour;
   - anything in the 3D/2D engine (`three`, `konva`, `fabric`, scene/mesh code). Canvas areas keep their size logic.
2. **Don't remove or hide any feature, button, field, column, or message.** You may regroup, restyle, or move
   them visually inside the same component.
   - **Wording may be improved** (headings, labels, placeholders, button text, helper copy) to sound modern and
     fit the furniture/interior manufacturing product — but never change strings that logic compares against
     (e.g. backend error messages checked with `===`), routes, or keys.

### Product theme

Bravento is a **furniture & home‑interior manufacturing** platform (3D design → cut lists → nesting → CNC).
Every page should feel like a premium interior/workshop tool:

- Olive panels with terracotta highlights; blueprint/grid motifs and dimension lines for
  decorative areas; furniture illustrations (cabinets, wardrobes, kitchens) drawn as inline SVG using tokens.
- Copy speaks the trade: cabinets, wardrobes, kitchens, boards/sheets, cut lists, nesting, edge banding, CNC, workshop.
- The `Logo.svg` artwork has white parts — place it only on dark (`--bv-ink`) surfaces.

3. **Keep `html { font-size: 1vw }`.** All layouts use `rem` = 1% of viewport width. Changing it breaks every page.
4. **One page (or one shared component) per change.** Finish, check it in the browser, commit, then move on.
5. **Use tokens, never raw colors.** New code uses only the `--bv-*` variables from `globals.css`.
   No new hex/rgb values inside module files (exception: 3D scene/material colors, which are data).
6. **No new UI libraries.** Use what exists: CSS modules, Tailwind utilities, `react-icons`, MUI (already present).
7. **Verify before commit:** page loads, no console errors, every button/form on the page still works,
   check at 1366px, 1920px and a narrow window, and `npx tsc --noEmit` passes.

---

## 2. Color system — "Olive & Terracotta"

**Two brand colours only, on a white background.** No pale/cream page backgrounds; everything that is not
olive or terracotta is white or neutral grey.

| Role                 | Token                                     | Value                             | Use for                                                   |
| -------------------- | ----------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Brand 1 — Olive      | `--bv-primary`                            | `#545333`                         | Dark panels, sidebar, links, active nav, focus, selection |
| Olive hover          | `--bv-primary-hover`                      | `#3F3E25`                         | Hover/pressed; second dark surface (`--bv-ink-2`)         |
| Olive soft           | `--bv-primary-soft`                       | `#ECECE4`                         | Selected rows, active tab bg (small areas only)           |
| Brand 2 — Terracotta | `--bv-accent`                             | `#C8571B`                         | Main call‑to‑action button, highlights, feature icons     |
| Terracotta hover     | `--bv-accent-hover`                       | `#A94612`                         |                                                           |
| Terracotta on dark   | `--bv-accent-light`                       | `#F2914F`                         | Highlight text/icons on olive surfaces                    |
| Terracotta soft      | `--bv-accent-soft`                        | `#FBE9DE`                         | Small badges only                                         |
| Page / surface       | `--bv-bg`, `--bv-surface`                 | `#FFFFFF`                         | Always white                                              |
| Surface 2            | `--bv-surface-2`                          | `#F6F6F3`                         | Table headers, secondary panels                           |
| Border               | `--bv-border` / `-strong`                 | `#E4E4DE` / `#CDCDC3`             |                                                           |
| Text                 | `--bv-text` / `-muted` / `-subtle`        | `#1F1F14` / `#5C5C4E` / `#8A8A7C` |                                                           |
| Status               | `--bv-success/warning/danger` (+ `-soft`) | `#3F7D3A` / `#B07A10` / `#C0362C` | Feedback only                                             |

- One terracotta call‑to‑action per area; secondary buttons are white with an olive border/text.
- On olive surfaces use white text, `--bv-on-ink-muted` for secondary text and `--bv-accent-light` for highlights.
- Illustrations use only tints of the two brand colours (`--bv-wood*` map to terracotta shades).
- **Status badges:** Draft → olive soft, Ready → success, Nesting → warning, Completed → olive, Deleted → danger.
- **Contrast:** white on olive 8.6:1 ✔, white on terracotta 4.6:1 ✔ (AA).

## 3. Typography

- Font: **Plus Jakarta Sans** (`--bv-font`), fallback `system-ui`. Replaces Comfortaa page by page.
- Scale (rem = 1vw, so use `clamp` to keep readable on small/large screens):
  - Page title `--bv-fs-h1` · Section title `--bv-fs-h2` · Card title `--bv-fs-h3`
  - Body `--bv-fs-body` · Small/labels `--bv-fs-sm` · Tiny/meta `--bv-fs-xs`
- Weights: 400 body, 500 labels, 600 buttons/titles, 700 page titles only.
- Numbers in tables/stats: `font-variant-numeric: tabular-nums`.

## 4. Shape, spacing, depth

- Radius: `--bv-radius-sm` 6px (chips, inputs small), `--bv-radius` 10px (buttons, inputs), `--bv-radius-lg` 16px (cards, modals), `--bv-radius-pill` 999px.
- Spacing on a 4px grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 (`--bv-space-1…7`).
- Shadows: `--bv-shadow-sm` (cards at rest), `--bv-shadow-md` (hover, dropdowns), `--bv-shadow-lg` (modals). Soft and warm, never heavy black.
- Motion: `--bv-ease` 160ms for hover/focus; no animation over 300ms; respect `prefers-reduced-motion`.

## 5. Component patterns

- **Buttons:** Primary (pine fill, white text) · Secondary (white, border, text color) · Ghost (no border) · Danger (danger fill or danger‑soft). Height ≈ 40px, radius `--bv-radius`, 600 weight, icon + label gap 8px. Max one primary button per area.
- **Inputs/selects:** white surface, 1px `--bv-border`, radius `--bv-radius`, focus = pine border + `--bv-focus-ring`. Label above in `--bv-text-muted`, error text in `--bv-danger` below.
- **Cards:** surface, 1px border, `--bv-radius-lg`, `--bv-shadow-sm`; hover lifts to `--bv-shadow-md` (no color flood).
- **Tables:** header on `--bv-surface-2`, muted uppercase small labels, 1px row dividers, row hover `--bv-primary-tint`, selected row `--bv-primary-soft`.
- **Sidebar:** dark `--bv-ink`, icons + labels in light text, active item = pine‑soft pill with pine/white indicator.
- **Header/top bar:** white surface, bottom border, page title left, actions right.
- **Modals/popups:** `--bv-radius-lg`, `--bv-shadow-lg`, backdrop `rgba(19,32,29,.45)` + blur 4px; title, body, footer with actions right‑aligned.
- **Empty / loading states:** centered icon, short message, one action. Use skeletons where possible.
- **Icons:** `react-icons` — prefer one family (Lucide‑style `react-icons/lu`), 18–20px, `currentColor`.

## 6. Page rollout order

Shared pieces first (they appear on every page), then pages:

0. Foundation — tokens + font in `globals.css` ✅ (tokens added, not yet applied)
1. Shell — `components/sidebar` ✅, `components/header` ✅, global white background ✅, `components/inputfields` ✅, toasts ✅, `loading` ✅, maintenance + connection-lost screens ✅, `FreeBanner` (owner has local edits — colours only via legacy remap)
2. Auth — login ✅, register ✅, forgot ✅, otp ✅ (shared layout: `components/auth/AuthShowcase` + `auth.module.css`)
3. Dashboard ✅
4. Designs list ✅
5. Templates ✅
6. Catalog manager ✅
7. Material ✅ (wizard in `addItem.tsx` restyled via CSS only)
8. MES — design list ✅, cut list & exports ✅, nesting details ✅ (work-order components are unused, left as is)
9. Settings ✅
10. Rendering ✅
11. 3D design editor — header, toolbar, sidebar, panel design, popups (UI chrome only, never the canvas) ✅ colors done via CSS-variable remap + icon recolor; layout unchanged
12. Lab 2D design ✅ (shares the editor theme via bv-editor)
13. Error page ✅, legacy `--primary-*` palette remapped to olive app-wide ✅, purple SVG icons recoloured ✅, body font → Plus Jakarta Sans ✅. Legacy variables cleaned up ✅ (2026-11-23): the old purple `:root` values and the separate remap block were merged into one set of olive/terracotta values, and 72 variables nothing read were deleted

Track progress by ticking items here as each page is merged.

## 7. Workflow per page

1. Open the page in the browser, note every element and interaction.
2. Restyle its module CSS using `--bv-*` tokens; touch JSX only for presentation.
3. Re‑test every interaction on the page (forms submit, popups open, filters, pagination).
4. Screenshot before/after, commit as `design: <page> redesign`.

## Phase 2 — full restructure (2026-11-19)

The owner wants every screen to look clearly different from the inherited design, not just recoloured. Same features, new structure.

1. App frame ✅ — left sidebar replaced by a dark top navigation bar (`components/sidebar`), page title row under it (`components/header`). Section names: Overview, Designs, Materials, Catalog, Production. Page containers stack vertically.
2. 3D editor layout ✅ — dark "L" frame: full-width top bar (back, design name + version chip, centre tool capsule, full screen, account, Nesting, Render) plus a dark tool rail; the tool list, catalogue and inspector are flush docked sheets; the bottom pills became one centred view dock (View · Display · Edges, `footer/footer.module.css`). Frame sizes are `--bv-frame-h` / `--bv-rail-w` on `.bv-editor` in globals.css. Canvas untouched.
3. Material page + wizard layout ✅ — the left category list became a "shelf": material types as a horizontal tile strip, and a supplier bar for the open type (New supplier + supplier chips with an add-material button); the library table now spans the full width. The add/edit wizard is a split card: dark vertical step guide (steps with hints + progress bar) on the left, current step title + form on the right. "Company" is called "Supplier" in the UI.
2b. Editor side panels v3 ✅ — "floating workbench". Left: the full-height rail became a small dark launcher puck; the tool list is a floating white drawer with a 2-column tile grid (active tile olive, Model list opens as chips spanning the drawer); the catalogue is a floating card with a dark header (eyebrow, category, item count, round search, terracotta add) and 2-column picture tiles on a soft plinth with a "+ Add" badge on hover. Right: the inspector is a floating "spec sheet" card (dark title band with "Inspector" eyebrow, Setting/Navigation pill switch, each property group as its own card with a tinted head and diamond marker); collapsed it becomes a dark pill at bottom right. Hooks: `bv-insp-*` classes in sidebar.tsx, styles in globals.css; left side in toolbar.module.css ("Editor left side v3").
4. Settings layout ✅ — the left menu card became a dark masthead: account strip (initials, name, email, "n / 5" section counter) with the sections as horizontal tabs along its bottom edge (active tab joins the page, terracotta top mark). Below it a two-column body: a guide column (section icon, eyebrow, title, description, hint) beside the forms. The profile banner is a light card with an olive edge so it doesn't repeat the dark masthead. Phone width: one column, counter hidden.
5. Remaining pages restructured ✅
   - Overview: bento grid — tall welcome tile (illustration at the bottom) beside four stat tiles (Designs tile in olive); "Your workflow" row of numbered 01–04 steps joined by a dashed line.
   - Designs: studio rail on the left (dark "Start a new piece" card + Status list with counts, replacing the filter dropdown); library on the right with "Library / <filter>" heading, search and list/grid switch.
   - Catalog: slim dark selector band; full-width step-1 strip with material types as pill tabs and item details on the right; parts and material library side by side.
   - Production (MES): dark floor rail (intro, vertical pipeline of the four counts, how-it-works) beside the production table.
   - Templates: split chooser — dark intro column with a large "Smart template mode" card; templates as wide rows.
   - Rendering: dark top bar (logo, Back to design, title, Image/Video switch), photo-studio stage, captured angles as a bottom film strip.
   - Sign-in pages: whole page is the dark workshop board; form is a white floating card on the left, brand story on the right with a vertical feature list.
   - Lab 2D uses the editor frame (already done).
   - Cut list (nesting.tsx): "export desk" — panels table in the main area, dark right column with the title, part count, Quotation / BOM / CNC XML exports stacked, and "View sheet layout" at the bottom. CSS only.
   - Sheet layout (nestingDetails.tsx): stage first — drawing on the left with the legend as a bar under it, sheet list on the right with a terracotta top edge. CSS only.
   - Testing note: opening either nesting screen PUTs `nesting/download` with format json, which auto-runs nesting on the server. Check these screens with a made-up design id (the server answers 400) rather than a real design.
6. Full audit against the original design (git HEAD) ✅ — every screen that was still in the inherited look was redone:
   - Panel Designer: dark header bar with "Workshop" eyebrow, tools in a dark capsule, Cancel ghost + terracotta Complete; floating cards with dark grab handles, uppercase diamond-marked titles, rounded inputs, segmented corner-type buttons; leave dialog with terracotta top edge. Canvas drawing (Konva colours) untouched; 60px header and 280px card widths kept because the canvas sizing depends on them.
   - Editor helper bar (above a selected object): dark pill, white icons, terracotta hover, red delete.
   - Save to library, Add texture, Change material (assign materials to parts), Add part (with a direction compass for L/U shapes), Upload 3D model popups: new layouts (dark header bands or terracotta top edge, dark icon tiles, round close buttons, pill buttons, numbered steps in the material popup, dark 3D viewer on the left of the upload popup).
   - Texture picker beside the inspector (`bv-texture-*` hooks), 2D wall-properties card (unit-tagged inputs, Internal/Center/External pill), maintenance banner (dark strip with a terracotta tag, no blinking).
   - Not touched on purpose: `components/common/FreeBanner*` (owner's own work), `components/mes/workorders/*` and `createWorkOrder.tsx` (not used by any page), `3dmodel/sidebar/sidebar.module.css` (not imported anywhere).
7. Last purple removed ✅ (2026-11-23) — no `#392579` / `rgba(57,37,121,…)` or other inherited purple left in code, styles or SVGs (FreeBanner excepted):
   - Panel Designer drawing: panel fill/outline olive, hover/selection outlines dark olive ink `#2B2A1A` (terracotta would clash with the orange slotting colour), helper dots terracotta.
   - Editor header, toolbar, texture picker, Designs form borders, material wizard icon, `plus.svg`.
   - Quotation / BOM PDF exports: `PDF_THEME.titleColor` in `mes/constants.tsx` is now olive `[84, 83, 51]`, so generated PDFs use the new brand colour too.
