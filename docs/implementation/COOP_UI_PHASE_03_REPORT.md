# Co-op UI Phase 03 — Loadout and synchronization

Date: 2026-09-09

## Outcome

Phase 03 is implemented in the existing Expo/React Native application and stops before party finding, Echo recruitment, matchmaking, ready checks, and shared-run UI.

The expedition detail CTA now opens a loadout-selection screen. It displays the current character's selected fixed skin, server-projected class and role, readiness failures, saved skills/equipment summaries, effective level, and owned-versus-effective stats. Equipment is presentation text only and never changes the character artwork.

Android hardware back returns from loadout selection to expedition details, then to the expedition list. Existing app navigation, authentication, and the stable five-item phone navigation remain unchanged.

## Authority boundary

- `presentCoopLoadout` only validates and presents a server projection. It does not derive a role or calculate normalized stats.
- `buildCoopLoadoutIntent` fails closed unless the projection is verified, current, ready, for the selected character, and contains an effective server snapshot.
- The resulting intent contains only mode, dungeon, tier, character ID, loadout ID, and revision. It contains no client-authored role or stats.
- Pressing the Phase 03 CTA shows a truthful later-phase notice and does not call `/coop/queue` or `/coop/qmode`.
- The production verification adapter rereads the authenticated `/coop/entry` projection and rejects missing or mismatched revisions.
- Development fixtures exercise eligible and stale states only when the co-op backend is not configured and the app is running in development.

## Files

- `apps/mobile/src/core/coop-loadout-presentation.ts`
- `apps/mobile/src/online/coop-loadout-source.ts`
- `apps/mobile/src/components/coop/CoopLoadoutSelection.tsx`
- `apps/mobile/src/i18n/coop-loadout.ts`
- `apps/mobile/tests/coop-loadout-presentation.ts`
- Updated `apps/mobile/src/online/coop-client.ts`, `apps/mobile/src/dev/coop-dungeon-fixtures.ts`, `apps/mobile/src/screens/CoopExpeditionScreen.tsx`, `apps/mobile/App.tsx`, and the mobile test script.

## Test results

- Mobile full TypeScript check: PASS.
- Mobile core suite: PASS, including Tank, Damage, Support, missing capability, below-minimum-level, stale revision, switched character, failed verification, safe intent shape, and all six language catalogs.
- Mobile pre-Codex smoke suite: PASS.
- Android Expo/Hermes production export: PASS (1,179 modules, 412 assets). Temporary export removed after verification.
- Backend TypeScript build: PASS.
- Backend Phase 03 normalization test: PASS.
- Backend Phase 03 roster-commit test: PASS, including canonical 1 Tank / 2 Damage / 1 Support composition and frozen snapshot hashes.

## Remaining gate

The backend contains authoritative Phase 03 normalization and roster-freeze logic, but the inspected server surface does not expose a dedicated mobile loadout-verification route. The mobile production path therefore depends on `/coop/entry` returning the new verification projection. Until that endpoint/projection is deployed and exercised with an authenticated account, real server verification remains an integration gate; the app does not fall back to fixtures in production.

Native 320-width and large-text visual-device review remains pending because no connected Android target was available during the earlier visual audit. The production bundle itself succeeds.

## Phase boundary

No Phase 04 route/map work was added.
