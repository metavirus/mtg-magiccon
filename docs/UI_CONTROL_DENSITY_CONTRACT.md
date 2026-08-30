# UI Control Density Contract

Updated: 2026-08-29

Use this contract whenever adding or changing tabs, filters, search, view toggles, compact list actions, or their containing toolbars. The goal is one recognizable control grammar across the app, not a new miniature design system per surface.

## Reference grammar

The accepted reference family is the compact segmented control already used by Trip, Calendar, Explore, Plan, and Info:

- one enclosing border and background;
- `2px` group padding;
- `0–4px` gap between mutually exclusive segments;
- `30–34px` inner segment height;
- `10–11px` control text on the desktop-density scale;
- selected state carries the stronger fill/ring; inactive choices remain quiet;
- labels are vertically centered without a second line of empty padding.

Reuse the existing `.trip-tabs`, `.funnel-nav`, `.plan-view-toggle`, or `.calendar-filter` grammar when the interaction is equivalent. Do not invent a new tab or filter shell merely because the page is new.

## Control tiers

| Use | Height | Container padding | Text | Notes |
| --- | ---: | ---: | ---: | --- |
| Segmented navigation/filter | `30–34px` | `2px` | `10–11px` | Default for tabs, day filters, view switches |
| Search or compact select | `34–38px` | `6px` toolbar | `10–12px` | One-line browse controls; avoid form-field proportions |
| Icon-only row action | `40px` (`44px` only where touch context requires it) | none | icon only | Use `aria-label`; do not add redundant visible verbs |
| Data-entry field | `40–44px` | form rhythm | `12–16px` | Reserved for actual entry/review workflows, not browsing filters |
| Primary confirmation | `40–44px` | action area | `10–12px` | May use a visible verb because consequence matters |

These are CSS-pixel targets. Screenshots captured at high device scale can look numerically larger; judge proportions from the rendered control, not raw image pixels.

## Toolbar composition

- A compact browse toolbar uses `6px` outer padding and `6px` gaps by default.
- Do not place `42–44px` controls inside another `8–10px` padded box unless it is a genuine form or confirmation surface.
- Search may occupy its own mobile row. Filters beneath it remain compact; they do not inherit the search field's larger padding.
- Prefer one border layer. Nested pills inside padded rounded rectangles require a real grouping reason.
- Sticky controls must conserve vertical space because their cost repeats for the entire scroll.
- On narrow screens, collapse labels or use a select before wrapping multiple control rows. Horizontal scrolling is acceptable only for a deliberate segmented strip.

## Compact result rows

- A row is not a tile with a second action shelf.
- Default structure: square thumbnail, primary copy/value, compact status/people, one trailing action.
- Keep compact rows approximately `76–84px` high unless content genuinely needs more.
- Trailing save/interest is an icon-only bookmark with filled/unfilled state and an accessible label.
- Product thumbnails remain square. Never stretch an image surface to match variable copy or action height.
- Status belongs beside the value or in the trailing metadata cluster; it must not create a full-width second row by itself.

## Typography and spacing

- Do not solve hierarchy by making every new label larger or bolder.
- Browse-control text stays within the established `10–12px` range.
- Eyebrows and metadata use `7–9px`, strong letter spacing, and restrained color.
- Page headings may vary by surface; controls and result rows should not.
- Use the existing spacing steps (`2`, `4`, `6`, `8`, `10`, `12`, `14`, `16`) rather than arbitrary near-duplicates.

## Review gate

Before calling a control or density change complete:

1. Compare it beside at least one accepted peer surface at the same viewport width.
2. Inspect mobile and desktop after the production build.
3. Check top/bottom padding, text size, total sticky-toolbar height, wrapping, and whether icon-only actions gained redundant words.
4. Confirm compact rows do not grow because of controls, stacked metadata, or stretched images.
5. If the new surface is visibly denser or looser than its peers, explain the product reason or normalize it.

The default judgment is consistency. A surface earns an exception through a distinct interaction need, not because its CSS was written later.
