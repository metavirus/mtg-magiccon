# Calendar Surface Concept

Updated: 2026-08-03
Status: Direction and first-pass density model accepted

## Purpose

Calendar is a primary, visually rich surface for loose chronological browsing. It answers “what meaningful thing happens when?” across the months leading to MagicCon, the trip itself, and a small amount of post-event follow-up.

Calendar is expected to be an attention magnet: useful for quick glances, idle scrolling, timing speculation, and rediscovering how upcoming pieces relate. It should reward browsing with context, not gamified milestone celebration.

## Default form

Use a vertically scrollable calendar stream rather than a fixed 30-day grid:

- only meaningful dates receive substantial space;
- empty weeks compress;
- month and week markers preserve orientation;
- dense periods expand naturally;
- a compact date strip or navigator supports quick jumps;
- Today and Atlanta are obvious jump targets.

The surface can be thumbed forward and backward through time without manufacturing empty day cells.

The implemented first pass adds **Upcoming** and **Past** modes. Upcoming is the default orientation stream. Past begins with the genuinely completed badge-sale milestone and its official purchasing link; representative event history is not invented merely to populate it.

## Date content

The stream may include:

- expected milestone windows and later actual publication dates;
- badge, purchase, refund, or preparation deadlines;
- Black Lotus shopping windows and preview programming;
- flights, hotel check-in/out, and traveler transitions;
- convention-day summaries;
- selected personal reminders;
- receipts, reimbursements, or follow-ups after the event when useful.

Normal source checks and undated observations do not appear. Those belong in Activity.

## Visual language

- Month and week dividers create chronological rhythm.
- Date clusters use icons, color, and shading to distinguish milestone, deadline, travel, Black Lotus, convention, purchase, and follow-up context.
- Expected or speculative timing uses visibly softer treatment and confidence language.
- Completed milestones remain available but subdued; the next expected milestone receives emphasis.
- Changed or contradicted dates use graded ambient attention rather than automatic alert styling.
- Each date cluster is clickable and can reveal evidence, related objects, or contextual notes.

## Convention-day expansion

November 13–15 entries act as bridges into Plan.

Collapsed convention-day content may show:

- count of Committed and Purchased events;
- count of Tentative contenders;
- broad time span and notable pressure;
- key people or Black Lotus context.

Clicking the day expands a compact summary inline so the owner retains Calendar scroll position. It may show Committed/Purchased events individually, Tentatives as summarized alternatives, and one or two meaningful intelligence cues.

The expanded view includes “Open in Plan,” which deliberately changes context to the focused Plan workspace with the selected day active. Calendar never embeds the complete contention workspace.

Rows are not dead summaries. Milestones and travel anchors open compact contextual detail; convention days open day context; captured timed events open a responsive detail drawer or sheet with reversible Interested, Tentative, and Committed controls. Flexible/ongoing event families with no legitimate attendance slot, such as Mage Tower League and Progressive Sealed, belong in the Plan flexible lane rather than as fake agenda rows. Timed optional events, such as Commander and Cocktails, remain agenda rows because optional attendance is not the same thing as no scheduled time. Removing a planning state is deliberate rather than a stray row tap, while purchased financial history remains separate from planning state.

Clickable rows expose a compact destination cue so the interaction is predictable: Details, Trip, Plan, Day, or Official. On narrow screens the same cue collapses to its vector icon. The first click preserves Calendar context; a primary action inside the resulting detail moves to the full destination when that surface exists.

## Milestones

Calendar provides the total-view milestone history requested for pre-event browsing:

- completed milestones remain subdued;
- the next expected milestone is highlighted;
- later milestones follow in likely order;
- actual or expected timing is visible;
- concise evidence-based timing clues can be expanded;
- completed milestones move into history without celebratory UI.

Home may show the next expected milestone and a compact runway, while Calendar provides the broader scrollable dated context.

## Relationship to other surfaces

- **Home:** tells the owner what deserves attention now and confirms trustworthy quiet.
- **Calendar:** shows the broad dated story and supports loose chronological browsing.
- **Plan:** resolves dense November 13–15 resource contention.
- **Trip:** presents pleasant detailed flight and hotel reference.
- **Wallet:** preserves confirmations, purchases, receipts, and showable proof.
- **Activity:** preserves changes, source history, and personal actions.

## Boundary

Calendar is not Google Calendar, a booking tool, a recurrence engine, or the dense convention planner. It does not need arbitrary date-range scheduling, ordinary adult-life events, or empty month grids. It is a finite-event chronological intelligence surface.
