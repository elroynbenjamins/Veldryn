# Co-op refinement pass 01

Date: 2026-09-10

## Outcome

This pass follows the supplied Dungeon Details and Loadout Concepts while retaining live text, the existing app shell, authoritative gameplay corrections, and the fixed five-room launch route.

- Dungeon-list cards no longer repeat full descriptions; those remain on the detail screen.
- The detail screen now prioritizes requirements, party, route, duration, rewards, tier and mode.
- Possible room types are collapsed by default and remain available as an explicit disclosure.
- Difficulty uses compact tier tiles with their required level. Tiers above the current character level are visibly locked and cannot lead into loadout selection.
- The chosen tier is checked through a reusable presentation-domain eligibility function; server verification remains authoritative at queue/start.
- Run projections now reject blank roster summaries and duplicate, blank or incomplete route options instead of rendering misleading choices.
- Reward tests now cover all twelve weekly enhanced rewards, the unlimited-play 20% payout after the weekly limit, and renewed eligibility in a new authoritative week.

## Changed files

- `apps/mobile/src/components/coop/CoopDungeonBrowser.tsx`
- `apps/mobile/src/screens/CoopExpeditionScreen.tsx`
- `apps/mobile/src/core/coop-dungeon-browsing.ts`
- `apps/mobile/src/core/coop-presentation.ts`
- `apps/mobile/tests/coop-dungeon-browsing.ts`
- `apps/mobile/tests/coop-presentation.ts`
- `backend/src/server/coop/__tests__/phase11-rewards.ts`

## Tests actually run

- Backend `npm run build` — PASS.
- Backend `npm run coop-phase11` — PASS, including charge capacity, eight-hour recharge, twelve-per-week limit, post-limit rewards and weekly renewal.
- Backend `npm run coop-phase12` — PASS, 8,000 full-combat simulations. Reference clear rates remain 95.3% and 96.6%; all solo scenarios remain 0%; observed Damage share remains uncapped at 41.52%.
- Targeted mobile co-op TypeScript compilation — PASS for the browsing/presentation domains and the changed screen/component graph.
- Targeted mobile `coop-presentation` and `coop-dungeon-browsing` tests — PASS.
- Android Expo/Hermes production export — PASS: 1,217 modules and 435 assets. Temporary export output was removed.
- Full mobile TypeScript check — BLOCKED by pre-existing concurrent errors in untracked `src/core/equipment-enhancement.ts` and an unrelated missing `detailActions` style in `CharacterScreen.tsx`; no co-op errors were reported.
- Web preview — NOT RUN because the repository does not include the optional React DOM / React Native Web dependencies. No dependencies were installed for this pass.

## Remaining work

- Capture native 390-width and large-text screenshots on a connected Android runtime.
- Connect the production queue/Q-Mode CTA once the deployed HTTP handlers return the required sanitized projections.
- Add authoritative current-room progress to `CoopRunView` before replacing the run overview with the full Concept map; do not infer progress from phase text.
- Exercise Tier II–V combat balance once tier-scaled encounter inputs are present.
