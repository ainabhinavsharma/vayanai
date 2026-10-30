# Phased implementation plan for the local coding agent

Use these phases in order. Keep the product brief and approved page flows as the source of truth. Ship a reviewable result at each phase; do not jump to live booking before its provider and consent requirements are settled.

## Phase 0 — Workspace and product discovery

**Read:** `README.md`, `PRODUCT_BRIEF.md`, `DESIGN_SYSTEM.md`, `FRONTEND_MAP.md`, and all page files. Run the prototype and capture its current behaviour before replacing it.

**Do:** Inspect the starter repository and its existing framework, dependency rules, deployment target, and project instructions. Preserve existing user work. Identify unresolved business decisions and list assumptions; continue with reversible UI scaffolding rather than blocking on content choices.

**Deliver:** A short repository assessment, an implementation sequence mapped to the existing stack, and a list of decisions that genuinely require the product owner.

**Accept when:** The agent can explain the user journey and can identify mock-only content, external assets, and nonfunctional integrations.

## Phase 1 — Rebuild and complete the frontend

**Do:** Implement the five prototype experiences in the existing stack, using the static pages as the visual/interaction reference. Keep navigation, mobile layout, focus states, errors, empty states, loading states, and reduced-motion behaviour. Create reusable components for navigation, cards, planner steps, itinerary days, provenance labels, and the assistant drawer.

**Required views:** Home/discover; trip brief; route comparison; itinerary details with day editing; local partner discovery; saved trips; plus responsive navigation and helpful empty/loading/error states.

**Accept when:** A visitor can start at home, submit/change a brief, see a route, open an itinerary, edit its shape, save it, return to it, and browse local expertise. The frontend can run with mocked data and no API keys. No booking UI suggests a real reservation has occurred.

## Phase 2 — Domain model and backend foundation

**Do:** Agree the stack, hosting, datastore, authentication need, privacy model, and operational budget. Define versioned API contracts before UI-specific backend coupling. Add server-side validation, configuration, migrations, error handling, logging with PII minimization, and request IDs.

**Suggested entities:** `User/GuestSession`, `TravellerProfile`, `TripBrief`, `Trip`, `TripVersion`, `Destination`, `RouteLeg`, `ItineraryDay`, `ActivitySuggestion`, `CostEstimate`, `SourceRecord`, `Partner`, `PartnerOffer`, `SavedItem`, and consent / audit records where needed.

**Model notes:** Preserve units/currency and date semantics; store timezone and source freshness for sourced facts; mark generated content and its evidence; separate an estimate from a supplier quote and a booking confirmation. Store preferences only with clear retention and deletion behaviour.

**Accept when:** The schema and API types support editing, provenance, trip versioning, and later partner handoff without treating generated prose as factual data.

## Phase 3 — Free-source research and data adapters

**Do:** Research each candidate source at implementation time. Confirm current free quota, commercial-use terms, attribution, caching, geographic coverage in India, rate limits, and whether an API key/account is required. Keep a source register with owner, terms URL, checked date, fields used, quota, fallback, and review date. Add adapters behind a server-side interface with timeouts, caching, validation, and rate limiting.

**Potential categories to evaluate:** Geocoding/maps/routes; weather and alerts; public destination/heritage information; currency conversion for international routes; and authorized accommodation/activity/transport partner feeds.

**Accept when:** Every user-visible live fact has a source, freshness timestamp, and clear failure/fallback behaviour. The site remains useful when any free endpoint is offline or quota-limited. No secret appears in client JavaScript.

**Important:** Do not assume free public access permits commercial display or booking. Do not invent an open booking API for flights, Indian Railways, buses, stays, or activities. Use a contracted partner API or a clearly disclosed external handoff; otherwise leave that booking route unavailable.

## Phase 4 — Vayu planning service

**Do:** Implement the planner server-side. Start with a reliable orchestration flow: parse → editable brief → clarify → hard-constraint filtering → route candidate ranking → itinerary draft → route/time/budget/source checks → response with explanations and evidence. The model can phrase and adapt suggestions; deterministic checks should handle constraints and calculations where possible.

**Safety and quality:** Treat retrieved pages and user-generated content as untrusted data. Prevent prompt injection from becoming tool instructions. Minimize personal data sent to the model. Keep tool permissions narrow and read-only by default. Add timeouts, retry limits, fallback responses, usage caps, and moderation appropriate to the product. Ask for user confirmation before side effects.

**Accept when:** The returned result is structured, editable, sourced, and validated; the UI can explain why each route fits; unsupported facts are omitted or qualified; ambiguous requests get a clarifying question rather than a confident guess.

## Phase 5 — Persistence, identity, and collaboration

**Do:** Connect saved trips and preference editing to the backend. Decide guest-first versus account-required journeys. Add access control per trip and explicit share permissions. Provide deletion/export behaviour and useful empty, sync-conflict, and offline states.

**Accept when:** A saved trip survives across sessions according to the selected identity model, belongs only to its owner/sharees, and the owner can remove it. Local prototype storage is not presented as account sync.

## Phase 6 — Partner offers and booking handoff

**Do:** Integrate only partners with an approved commercial relationship and current interface terms. Represent availability/price as provider-specific, expiring data. Recheck live offer and cancellation terms immediately before handoff/checkout. Record the exact supplier and status. Add reconciliation and support paths for failure, cancellation, and refunds.

**Accept when:** The UI distinguishes suggestion → offer → user-confirmed handoff → supplier-confirmed booking. No payment card data is stored unless a separately reviewed, compliant payment architecture requires it. A booking is never inferred from a click or itinerary save.

## Phase 7 — Verification, launch readiness, and operations

**Do:** Add tests for the key journey and backend contracts, accessibility and mobile checks, API quota failure, stale prices, model timeout, malformed output, permissions, prompt injection, and booking confirmation states. Measure page performance and privacy-safe product metrics. Document provider rotation and incident handling.

**Accept when:** The end-to-end journey works in staging with realistic test partners; disclosures match actual implementation; source and price freshness are visible; privacy, security, and supplier obligations have been reviewed by the relevant owners.

## Work rules for the agent

- Keep phases as small, reviewable changes and report files changed, decisions, and checks run after each phase.
- Do not write secrets into the repository or client bundle. Provide `.env.example` with names only.
- Keep an offline/mock mode throughout development.
- Do not mark live integrations complete based on a mocked response.
- If a provider’s pricing/terms are unclear, keep the adapter disabled and document the open question.
- Ask the product owner before irreversible external actions, paid infrastructure, new partner outreach, or production deployment.
