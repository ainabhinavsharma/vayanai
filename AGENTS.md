# Instructions for agents working in this workspace

Before editing, read `README.md`, `PRODUCT_BRIEF.md`, `PHASE_PLAN.md`, `DESIGN_SYSTEM.md`, `FRONTEND_MAP.md`, and `AGENT_HANDOFF.md`.

## Product and design

- This is an India-first travel planning product. Preserve the editorial premium visual direction and the existing end-to-end flow.
- Treat the current pages as the interaction reference. Improve and connect them; do not replace them with a generic template.
- Vayu is an AI-assisted trip companion. Keep its actions explainable, editable and visibly grounded in sources when the backend exists.
- Keep local expertise human and accurately represented. Never fabricate partner profiles, biographies, reviews, quotations, or verification badges.

## Data and side effects

- Existing routes, budgets, partner categories and assistant replies are demo data. Never silently present them as live facts.
- Do not add a model, map, weather, transport, accommodation, currency or booking service until its current terms, free quota, coverage, attribution and credentials have been checked and documented.
- Keep API secrets server-side. Do not store a model key or partner credential in browser code.
- Do not contact suppliers, send messages, take payment, place bookings, purchase services, or deploy to production without explicit user authorization.

## Workflow

- Follow the phases in `PHASE_PLAN.md`; keep changes small and maintain a working mock/offline path.
- Inspect repository instructions and existing work before changing files.
- Report the chosen approach, changed files, checks run, mock/live status, and any decisions that need the owner.
