# Ticketed Play pre-canon intake

This folder is the staging lane for official MagicCon Atlanta Ticketed Play data before it becomes canonical app state.

Rules:

- Source is one-way: official MagicCon/LEAP pages hydrate this pre-canon layer; the app does not push state back to LEAP.
- Raw observations stay distinct from normalized drafts.
- Normalized drafts are not live Explore/Plan/Calendar data until reviewed and intentionally promoted.
- Sold-out, time, price, and location changes should become grouped Home/Activity signals before any broad app hydration.
- Purchased/registered state belongs in Supabase when wired; this folder is source evidence and diff material, not personal state.

Canonical command:

```powershell
pnpm ticketed:precanon
```

Current v1 source:

- `https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html`

