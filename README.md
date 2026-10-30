# Vayanai · AI travel network

This folder is a **design-led, front-end prototype and implementation brief** for the Vayanai website. It is intended to become the starting workspace for a local coding agent.

## Start here

1. Read `PRODUCT_BRIEF.md`, `PHASE_PLAN.md`, and `DESIGN_SYSTEM.md` before changing the UI.
2. Open `index.html` in a browser, or serve this folder with any static file server.
3. Walk through the flow: home → create a trip → review the sample itinerary → save it → view saved trips → browse local travel partners.
4. Use `AGENT_HANDOFF.md` as the first prompt/instruction set for the local implementation agent.

The prototype is plain HTML, CSS, and JavaScript so it opens without installing packages. The same experience can later be rebuilt in the project’s chosen framework; keep the visible design and interaction intent intact.

## Prototype pages

- `index.html` — India-first landing page and entry points.
- `plan.html` — preference-led trip brief with a simulated planning step.
- `trip.html` — sample Meghalaya itinerary, editable day pacing, cost bands, and a Vayu assistant drawer.
- `people.html` — local-expertise discovery and partner categories.
- `my-trips.html` — saved trip shelf using browser local storage.
- `assets/styles.css` and `assets/app.js` — shared visual system and prototype interactions.

## Prototype limits

The destination suggestions, itinerary, sample budgets, partner cards, and assistant replies are illustrative UI content. No live travel feeds, model, account, payment, or booking provider is connected. Prices are explicitly marked as planning estimates. Unsplash photos and Google Fonts load over the internet; all product interactions work without API credentials.

## Product principles

- Start with the traveller’s reason for going; make destination, pace, cost, and logistics editable.
- Explain why a place or route was suggested. Show where a fact came from and when it was checked once live sources exist.
- Keep local people visible in the experience. AI helps assemble and adapt a plan; it should not impersonate local partners.
- Distinguish ideas, estimates, verified availability, and confirmed bookings in both language and UI.
- Never place a booking, payment, or external message without explicit user intent and the necessary partner authorization.
- Use free-to-access data sources only where their current terms, usage caps, attribution, and India coverage support the feature. “Free API” does not mean unrestricted or suitable for commercial use.

See `PHASE_PLAN.md` for the suggested build sequence and acceptance checks.
