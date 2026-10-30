# Frontend map

## Navigation

Home → Plan a trip → Route result → Itinerary / edit days → Save trip → My trips. Local travel expertise is discoverable from every page.

## Pages and content purpose

### Home — `index.html`

**Job:** Establish the product and invite someone to describe a trip. Hero: “India, your way. And at your pace.” The page shows a few route directions, explains the Vayu planning assist, and introduces local expertise without claiming every route is bookable.

**Main action:** “Start planning with Vayu” → `plan.html`.

### Trip brief — `plan.html`

**Job:** Collect useful constraints without turning discovery into a long form. Free-text request plus editable origin, timing, party, mood, comfort, and pace. Present “what we heard” as editable chips.

**Main action:** “Shape my route” → simulate a short local planning state and continue to `trip.html`. The page must clearly say that the bundled response is a sample until the backend exists.

### Route and itinerary — `trip.html`

**Job:** Make the recommendation understandable and adjustable. Demonstration route: five nights around Shillong and Sohra / Meghalaya. Explain match reasons, highlight route effort, offer an alternative, show sample cost bands and data-source states, and let people mark/remove/pace days. Vayu follow-up suggestions appear in a side drawer.

**Main action:** Save the trip to `my-trips.html`; booking language is intentionally partner-handoff/future-state only.

### Local expertise — `people.html`

**Job:** Explain and browse how local knowledge could be part of a trip. The sample directory uses partner-type cards, not invented named people, quotes, ratings, or verification claims. Filters demonstrate “food”, “outdoors”, “family pace”, and “culture”.

**Main action:** Choose an interest, then return to planning with the interest added to the visible demo brief.

### My trips — `my-trips.html`

**Job:** Show saved ideas and their state. Prototype persistence uses browser `localStorage` only. Clearly label it as local-device demo storage, not cloud sync. Include an empty state and remove action.

## Shared interaction details

- Global nav adapts to narrow screens.
- Vayu is represented with a distinctive editorial “V” signal and contextual planning language, not a generic robot assistant.
- Planner animation is simulated; route cards, itinerary, budgets, and assistant answers are sample data.
- Trip save persists a minimal demo trip object in the current browser. Back-end implementation should replace this storage without changing the user mental model.
- Search, date, group, accessibility, and cost controls should be keyboard-operable and usable on touch screens.

## Content status

All travel facts and rupee amounts in this prototype are illustrative. The destination/route content is a product-design sample, not a live quote, safety update, or confirmed recommendation. Before launch, replace sample data with source-checked content and correct provider terms.
