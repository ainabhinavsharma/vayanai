# Product brief

## Product

**Vayanai** is an India-first travel network that helps people turn a travel feeling into a practical, personal trip. Travellers describe what they want, explore recommendations and local insight, shape an itinerary, compare options, and eventually book through authorized travel partners.

## Intended audience

Indian residents planning domestic trips first, with nearby international routes as a later expansion. Design for solo travellers, couples, families, and friend groups; for quick breaks and longer holidays; and for people who have a clear destination as well as people who only know the kind of days they want.

## Core promise

**A plan that feels personal and is grounded in real-world travel details.** Vayanai should reduce the searching and coordination without taking away the traveller’s control.

## Primary journey

1. **Discover:** See what Vayanai does and browse a small number of evocative, India-relevant route ideas.
2. **Describe:** Write naturally (example: “A quiet five-day break from Mumbai in October, lots of green, moderate comfort, nothing too strenuous”). Choose or correct origin, dates/flexibility, party, pace, comfort band, interests, accessibility needs, and hard constraints.
3. **Clarify:** Ask only for missing details that change the recommendation. Let the traveller edit the structured brief extracted from their text.
4. **Explore:** Present a small set of distinct routes, not a wall of search results. Explain the match in plain language and distinguish verified facts from suggestions.
5. **Shape:** Open a day-by-day draft with travel time, optional activities, quieter alternatives, local recommendations, and rest built in. Let people reorder, remove, or replace blocks.
6. **Save/share:** Save a trip without requiring a booking. Eventually support collaborators and version history with clear privacy controls.
7. **Book:** When partner integrations are authorized, verify current price and availability immediately before a handoff or booking. Clearly show the supplier, terms, and what action is being taken.
8. **Travel:** Provide a useful trip view with confirmed details, offline-friendly essentials, and a way to revisit source/partner information.

## AI experience: “Vayu”

Vayu is a visible trip-planning companion, not a fictional local guide. The intended pipeline is:

- Understand a free-text request and produce an editable trip brief.
- Resolve genuine ambiguities with short follow-up questions.
- Filter against hard constraints (dates, time, safety/accessibility requirements, budget ceiling, origin, required documents if international).
- Rank a small set of suitable routes using travel time, season fit, traveller preferences, group fit, cost band, and source confidence.
- Draft a feasible itinerary with buffers, rest, travel times, and alternative activities.
- Explain each important recommendation and point to the supporting source or human partner.
- Validate the draft for impossible timing, inconsistent dates, unsupported claims, and obvious budget/route gaps before showing it.
- Keep the final decision with the traveller. Request confirmation before publishing, sending, booking, or paying.

### AI product cues in this prototype

- Natural-language trip brief.
- Editable “what we understood” preference chips.
- Distinct route matches with short “why it fits” explanations.
- A visible planning-state moment and Vayu assistant drawer.
- Adjustable itinerary days, alternatives, and follow-up prompts.
- Source/estimate labels that establish a trust model before live APIs exist.

The current planning animation and responses are **local mock interactions**, not model output. Keep this disclosure in development builds until a real backend is connected.

## India-first UX considerations

- Default to Indian cities and domestic travel examples. Use `₹` with Indian digit grouping and label whether flights, taxes, meals, permits, and local transfers are included.
- Support Indian mobile-first usage, lower-bandwidth conditions, long names, and address / date formats chosen by the user rather than inferred from location.
- Allow trip party and preferences to represent families, children, elders, solo travellers, and different mobility needs without stereotype-based defaults.
- Show travel duration and transfer effort clearly. “Nearby” should not hide long road journeys.
- Avoid implying that every local partner is verified unless the verification process is real and current.
- For religious, cultural, protected-area, and weather-sensitive visits, use respectful language and source-backed practical notes.
- Treat Indian and international payments, permits, taxes, cancellation terms, and identity requirements as separate flows to be verified for each route.

## Scope exclusions until authorized integrations exist

- No live price, seat, room, flight, rail, bus, or activity availability claim.
- No promise of booking on behalf of suppliers with no signed / authorized partner interface.
- No fabricated reviews, local quotations, guide credentials, or “verified” badges.
- No model provider, API credential, payment secret, or customer personal data embedded in browser code.

## Success signals to instrument later

Track completion and abandonment at each planning step, edits to extracted preferences, route save/share rate, itinerary-day changes, source detail opens, assistant follow-up use, and successful partner handoffs. Keep analytics consent and retention policy explicit; do not infer sensitive traits from travel choices.
