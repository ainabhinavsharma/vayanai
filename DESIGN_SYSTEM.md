# Design system and interaction notes

## Visual direction

Premium, editorial, tactile, and distinctly travel-oriented. Use deep monsoon green/ink as the foundation, warm limestone for reading surfaces, saffron/copper as the action colour, and muted leaf green for secondary signals. Let destination photography provide colour. Avoid generic gradient blobs, excessive pill cards, fake dashboards, robot imagery, and canned “AI magic” language.

## Tokens in the prototype

- Ink: `#101a19`; lifted ink: `#162322`.
- Warm paper: `#f0ece2`.
- Saffron: `#e8a34c`.
- Soft green: `#d7edaa`.
- Editorial serif: Playfair Display; interface sans: DM Sans.
- Shared CSS variables and responsive rules live in `assets/styles.css`.

## Layout

- Wide editorial hero with image-led storytelling, left-aligned headline, clear single primary CTA, restrained nav.
- Planner uses a split panel: editable trip brief on the left and a dimensional India map / destination card on the right.
- Result page moves from one clear route recommendation into alternatives, a day-by-day plan, rationale, source state, and estimate range.
- Use generous whitespace, varied image crops, fine borders, and typographic hierarchy rather than repeated rounded cards.
- Mobile collapses to a clear vertical flow, preserves the planner map and its destinations, keeps tap targets comfortable, and avoids horizontal overflow.

## Interaction patterns

- Use buttons for state changes and links for navigation. Keep `aria-pressed`, dialog labels, focus-visible styles, keyboard close for dialogs, and live announcement for save/status feedback.
- Motion is short and purposeful: map tilt, hover depth, reveal-on-scroll, and a visible planning state. Respect `prefers-reduced-motion`.
- Show input errors next to the relevant field; preserve answers after validation failure.
- AI states should state what Vayu is doing in plain language (“checking route shape”, “matching your pace”), never an endless spinner or simulated “thinking” presented as real backend work.
- Label estimates and sources beside the relevant content. Do not make a grey footnote carry an important limitation.
- Make actions recoverable: route edits can be undone or reset; saving gives a clear confirmation; removing a trip asks only if data loss would be surprising.

## Copy voice

Warm, perceptive, specific, and concise. Indian-market examples should feel native, not like international copy with rupee symbols added. Avoid claiming that AI knows a traveller better than they know themselves. Prefer “Here’s why this might fit” to “perfect trip, guaranteed.” Do not fabricate partner biographies, user reviews, verification status, availability, or local quotations.

## Asset guidance

The prototype uses Unsplash image URLs and Google Fonts; internet access is required for these assets. For production, check each asset’s current license/usage and either keep attribution or self-host appropriately licensed imagery. Provide alt text for meaningful images and empty alt for decoration. Do not make the map image the only way to select a destination.
