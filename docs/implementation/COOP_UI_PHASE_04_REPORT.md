# Co-op UI Phase 04 — Route map, choices and room panels

Date: 2026-09-09

## Outcome

Phase 04 is implemented as a clearly marked, development-only shared-run gallery. It does not start or mutate a real run and stops before the Phase 05 Q-Mode vertical slice.

The existing Co-op UI gallery now includes:

- A code-rendered portrait route map with five pre-boss depths, three real options per depth, forward edges, completed/current/available/locked states, an accessibility list summary, selected-path progress, and one separate boss destination.
- Separate Live and Q decision presentations. Live shows one vote per eligible player and a valid 2/1/1 tally. Q has no timer, votes, ready check, or chat.
- Idempotent decision-intent construction carrying run ID, decision ID, decision revision, option ID, and a caller-owned request ID. No fixture intent is sent.
- A personal boon offer with supplied artwork, exact effect text, owned run-effect summary, scope, and one selection intent. It does not simulate a claim or outcome.
- A compact four-seat combat snapshot showing roles, health/downed state, a boss mechanic, and sequenced presentation events. It exposes no unsupported manual abilities, pause, speed, or chat commands.
- Camp-offer validation that explicitly rejects loadout or equipment editing while the run snapshot is frozen.

## Authority and privacy

The UI validates presentation structure only. It does not generate routes, resolve votes, choose tie winners, resolve rooms, apply combat events, spend currency, grant boons, or reveal hidden outcomes. Q and Live permissions remain distinct. No private Echo-owner identity is present in the fixtures.

## Files

- `apps/mobile/src/core/coop-shared-run.ts`
- `apps/mobile/src/dev/coop-shared-run-fixtures.ts`
- `apps/mobile/src/components/coop/CoopSharedRunGallery.tsx`
- `apps/mobile/tests/coop-shared-run.ts`
- Updated `apps/mobile/src/screens/CoopUiGalleryScreen.tsx` and `apps/mobile/package.json`.

## Test results

- Full mobile TypeScript check: PASS.
- Mobile core suite: PASS, including 4–7 route validation, five-depth fixture, forward edges, third-option reachability, selected-path count, boss unlock, 2/1/1 Live tally, duplicate-voter rejection, Q field separation, idempotent intent reuse, personal offer validation, and camp loadout-edit rejection.
- Mobile pre-Codex smoke suite: PASS.
- Android Expo/Hermes production export: PASS (1,182 modules, 412 assets). Temporary export removed.
- Backend TypeScript build: PASS.
- Backend Phase 04 graph test: PASS across 10,000 seeds with 90 distinct first layers.
- Backend Phase 05 stateful-run test: PASS with persistent damage and six visited nodes including the boss.

## Unresolved integration and QA gates

- The mobile `CoopRunView` HTTP projection is still too small for the typed graph, decisions, personal offers, persistent actor state, sequence/event cursor, and server-clock fields required by these views. The backend pure gameplay/runtime components exist, but an authenticated production projection/subscription path has not been demonstrated.
- The compact combat fixture does not yet bind the existing combat renderer to a canonical co-op combat projection; that requires the missing projection/event adapter and approved co-op battlefield/actor mapping. It remains a presentation fallback, not a claim of playable co-op combat.
- Native captures for map, Live choice, Q choice, and boon states remain pending because no connected Android target is available. The production bundle succeeds, but the 320-width/large-text visual gate is not signed off.
- Phase 04 fixture copy is developer-only English. Release content and UI strings still require the established six-language pipeline (English, German, Spanish, Dutch, Italian, and French) once canonical server content keys are exposed.

## Phase boundary

No Q-Mode recruitment, run start, real route command, room resolution, reward release, Live matchmaking, or chat integration was added.
