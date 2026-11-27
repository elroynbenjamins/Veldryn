# Party Events 2.0 — compact UI and reward integration review
27 November 2026 | HIDDEN DESIGN ONLY | owner visual approval required

## Source baseline
Reviewed FeaturePreviewScreen.tsx (PartyPreviewPanel, PartyContents, partyStoryGuides, partyChestDesign), party-event-reward-readonly-v62.ts, weekly-party-events-v2.ts, weekly-party-event-canonical-pg-v87.ts and V89 retry. Existing preview has six content areas, shared party chat dock, family accents, three chest rows and eight named sets. It is not a production screen. Preserve current bottom navigation and compact mobile layout; no theme changes.

## Proposed hierarchy (not implemented)
- Adventure: family illustration and title, active/rest/results status, server-driven countdown, frozen roster 2–4, difficulty, three-stage tracker, one contextual primary action. Keep current live Party membership visibly separate from frozen event roster. If no verified snapshot, use unavailable state, never invented progress.
- Stages: three compact cards with current/complete/locked markers; personal four objective slots separate from aggregate party progress. Event Points shown only if a trusted projection supplies them. No forced class composition.
- Supplies: three required material rows per stage with exact donated/target counts, inventory availability only from authenticated source, explicit quantity confirmation and remaining cap. Optional Stage 2 preparation cards distinct from required supplies, never imply they are mandatory for stage advancement. Disabled / sold-out / insufficient / locked / pending / replay states. No changes to donation budgets.
- Votes: two choices for current stage, frozen-roster majority, six-hour server deadline, deterministic default on timeout; show locked choice and own recorded ballot independently. No local selection may look like a server-confirmed vote.
- Finale: family boss illustration, preparation summary, frozen loadout status, eligibility and encounter state. No estimated victory or guaranteed reward. Combat presentation deferred to reconciled 2.0 engine.
- Results: settlement status, three chest rows with authentic earned/locked/claimed distinctions, actual difficulty odds; two collection rows with 3+2 piece counts and optional expanded slot list. Show Party Sigils and 60-Sigil exchange only from approved authenticated source; never imply exchange is enabled while disabled. Historical claim via future approved Inbox policy.
- Keep Party Chat accessible, but do not cover the main action. Proposed compact layout: stack primary actions full width on narrow devices; no fixed bottom button overlaps or extra persistent navigation bars.

## Four family art directions (proposals, no assets generated)
| Family | Existing accent | Proposed motif | Icon silhouette |
| --- | --- | --- | --- |
| Broken Caravan | #D8B17C | battered convoy, bridge and lanterns | wagon wheel |
| Nightfall Hunt | #A7B3DF | moonlit forest and tracks | claw and crescent |
| Broken Wards | #B6A6E0 | unstable runestones and sparks | fractured rune |
| Lost Reliquary | #9FD4CC | ancient vault and mirrored glyphs | sealed relic |
Use matching header, small stage marker and reward-card accent; theme palette remains authoritative. Never rely on accent alone for state. Reuse existing art where suitable; new pixel assets must be explicitly approved. No fabricated gameplay screenshots.

## Source discrepancies blocking final UI and rewards
1. V2 canonical supply planner places all three independent optional preparations in Stage 2; V87 canonical SQL looks for Stage 3 optional orders and Stage 3 donation/seal. Both V87 and PG17 V89 fixtures currently manufacture Stage 3 optional orders. Real canonical plans cannot satisfy that path as authored. Confirm the reward qualification semantics (one completed optional goal vs all three; personal donation to which stage/order) and align planner, proof, query, UI and real-DB fixture before enabling. Do not silently change the economy.
2. PartyPreviewPanel matches reward family and event week but does not check reward difficulty against the V33 event snapshot; final UI must deny inconsistent difficulty instead of presenting incorrect odds. Validate at joint read boundary and add mismatch regression.
3. Preview Results header says baseline Standard while authenticated rows can show Veteran/Heroic odds; distinguish real odds from preview odds explicitly. Keep three chest names and existing catalog; no odds or prices changed.
4. Existing status lacks authoritative aggregate EP, stage/vote deadlines and complete eligible-action reasons. Add an approved versioned projection before exposing these values. No client-clock authority.
5. Existing V89 synthetic PG17 fixture is not independently certified real victory/tier issuance; exact-head CI and actual private schema staging parity remain outstanding.

## Acceptance checklist
Owner sees actual pixel-art layouts before any runtime UI change; review all current supported themes and EN/DE/ES/NL/IT/FR/RU/TR. Validate narrow 360dp and 390dp widths, larger text, keyboard/chat, safe areas, scroll, TalkBack, reduced motion and physical Android devices. Test no party, 2/3/4 members, disbanded live party with frozen roster, rest week, first/last active instant, Day 8, timeout, vote lock, stale snapshot, wrong family/difficulty, inventory locked, claim replay, unavailable/offline. Verify no economic action is wired in developer preview and no preview data can be mistaken for an authenticated reward. Real production asset screenshots and explicit owner acceptance required before implementation.

## Release gate
No UI/runtime edits, route activation, grant, database migration, main merge, new assets or final reward balancing in this review. All existing feature flags stay off. Pass 6 retry identity fix is committed separately; its tests still require exact-head execution. Pass 7 design review is not implementation or visual approval.
