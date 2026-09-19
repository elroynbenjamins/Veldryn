# VELDRYN v17 — Social Live-Ops + Party Events

This ZIP is a **merge/implementation pack for Codex**, not a replacement repository.

The current VELDRYN repository is authoritative and may contain newer systems than the supplied reference backend. Codex must inspect the real project first, then merge this pass into current equivalents rather than overwriting newer architecture.

## Dependency

v17 extends **v16.1 — Persistent Parties, Party Contracts & Recruitment**.

If v16.1 has not yet been merged, a copy is included at:

`dependencies/VELDRYN_v16_1_PartiesContractsRecruitment.zip`

The v17 `files/` tree also contains the v16.1 party/recruitment files required by the reference integration so one upload is sufficient for Codex to understand the complete dependency chain.

## What v17 fully implements

- Versioned, immutable **Party Live-Ops event definitions**.
- 24–72 hour Party Event scheduling with UTC/epoch timing.
- One active/settling Party Event at a time by default.
- Initial reusable event templates:
  - Rift Surge — Mixed.
  - Sunscar Invasion — Combat.
  - Rebuild Asterfall — Skilling.
  - Frostmarch Supply Crisis — Skilling.
  - Blackened Wells — Mixed/specialized.
- Reuse of v16.1 normalized effort scoring: **1,000 points ≈ one standardized routine hour**.
- Small event-specific activity/challenge modifiers only; raw action counts are never authoritative.
- Per-account Party Event daily credited-point cap: **2,400**.
- Personal milestones: **250 / 750 / 1,500 / 2,500** points.
- Party milestones: **2,000 / 4,000 / 6,000 / 9,000** points.
- Party ranking qualification:
  - at least **4,000 Party points**,
  - at least **2 meaningful contributors**,
  - meaningful contributor threshold: **250 points**,
  - event-specific Combat/Skilling mix requirements where applicable.
- Party event binding after **250 Party-event points** to prevent Party hopping/rank manipulation.
- Personal progress remains account-owned; after binding, changing Party cannot move ranking contribution into another Party for that event.
- Historical Party IDs/names are snapshotted so event history survives Party dissolution.
- Global Party leaderboard with deterministic tie-breaking.
- Friends/Guild leaderboard views as **filters over global rank**, not separate easier reward ladders.
- Frozen rank snapshots after event settlement grace.
- Ranking reward bands:
  - Top 10,
  - Top 100,
  - Top 10%,
  - Top 25%,
  - Qualified.
- Prestige-heavy ranking reward bundle hooks. No new currency.
- Idempotent personal milestone, Party milestone and ranking reward claims.
- Contribution breakdown by Combat/Gathering/Processing/Crafting/Fishing/Hunting/Alchemy/Delivery plus top content sources.
- Transactional **social contribution outbox** so delayed/retried settlement processing cannot lose or misattribute points.
- Server snapshot of Party + active social targets at gameplay settlement time.
- Live-ops worker tick for outbox processing, event phase changes and finalization.
- Notification intents for event start, ending soon and rewards ready.
- Event history/final rank persistence.
- Party LFG/LFM event tags as a **soft bonus only**; exact event remains non-mandatory for finding a compatible Party.
- Full two-direction Guild recruitment:
  - Guild recruiting profile.
  - Player Looking for Guild post.
  - Guild requirements (optional Total/Combat level).
  - Player application flow.
  - Guild invitation flow.
  - 72-hour application/invite expiry domain behavior.
- Mobile-first Event Hub, leaderboard, contribution breakdown, enhanced LFG and enhanced Guild recruitment components.
- Event UI remains inside **Account > Social**; no sixth bottom-navigation tab.

## Important architecture decision

A gameplay settlement writes a server-only contribution envelope/outbox record **in the same transaction as the underlying gameplay/economy result**.

The envelope snapshots:

- source event ID,
- account,
- Party ID/name at settlement,
- activity/category/content metadata,
- expected-time/challenge profile from server-owned content,
- active Party Contract target,
- active Party Event instance IDs.

A worker later routes the envelope. Every downstream target has its own `source_event_id` idempotency receipt.

This prevents:

- retry duplication,
- contribution loss after a transient error,
- a Party switch between settlement and worker processing from moving score,
- an event ending before a delayed worker runs from invalidating an activity that actually occurred inside the event window.

## Merge order

1. Read `SOCIAL_LIVEOPS_PARTY_EVENTS_V17.md` completely.
2. Confirm/merge v16.1 first if not already present.
3. Inspect the current repository's authoritative activity, idle, crafting, combat, Party, Guild, friends, chat, reward/economy, API, cron/job and Supabase modules.
4. Merge `files/backend/src/server/liveops/` into appropriate current server modules.
5. Merge the v17-compatible Party/recruitment changes from `files/backend/src/server/party/` and `files/backend/src/server/social/`.
6. Add migration `20260913_026_social_liveops_party_events_v17.sql` as a **new migration**. Never edit an already-applied migration.
7. Implement the transactional contribution-outbox write in authoritative settlement paths using `SETTLEMENT_WIRING_V17.md`.
8. Wire a once-per-minute-ish existing cron/worker runner to `runLiveOpsWorkerTick` or equivalent repository-native job logic.
9. Map reward bundle IDs to existing VELDRYN economy/content reward bundles. Do not add Party/Event Tokens.
10. Integrate the mobile components into Account > Social using the current project design tokens/pixel UI components.
11. Wire Friends/Guild leaderboard filters to current social graph data.
12. Run all current tests plus the supplied v16/v17 tests and real Supabase migration/RLS tests.

## Verification performed against the supplied backend foundation

- TypeScript typecheck: PASS.
- TypeScript build: PASS.
- v16 Party tests: PASS.
- v16 recruitment tests: PASS.
- v17 Party Event definition/scoring/leaderboard tests: PASS.
- v17 binding/idempotency/Party-hop tests: PASS.
- v17 finalization/reward claim tests: PASS.
- v17 Guild recruitment tests: PASS.
- Existing production smoke: PASS.
- Existing backend-pass smoke: PASS.
- Mobile core v16 test: PASS.
- Mobile core v17 milestone test: PASS.
- ZIP/static/checksum audit: generated in `verification/`.

A real deployed Supabase reset/apply cannot be executed in this environment. Codex must run the repository's real database migration/RLS/RPC test suite before release.
