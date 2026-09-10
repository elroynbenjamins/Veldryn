# Co-op UI Phase 05 — Q-Mode vertical slice

Date: 2026-09-09

Status: **integration gate blocked; safe mobile foundation implemented**

## Implemented

- Added a typed, privacy-safe Q-Mode team projection with recruitment, ready, candidate-shortage, content-conflict, resume, error, reward-pending and completed states.
- Enforced exactly one Tank, two Damage and one Support, one controller, three Echoes, four distinct public member IDs and no private source-owner/wallet fields.
- Added a production adapter for authenticated Q start and resume. It maps only the existing public `CoopRunView` seat summaries and rejects non-Q responses, queue-ticket responses and incomplete/invalid teams.
- Added a backend controller-safe Q run projection. It reveals the visited path, current node, three currently authorized options, public team identities, persistent HP/resources/run effects and settlement state while withholding Echo owner account IDs, unrevealed graph nodes, RNG state and calculated-but-unentitled Marks.
- Aligned the mobile adapter with both the new public projection and the older compact run shape, allowing a staged backend rollout without weakening validation.
- Q-Mode resume now reads `coop_run_client_snapshots` through the existing authenticated Supabase client and RLS policy. It does not fall back to a fixture or private service RPC after a production failure.
- Added a versioned `coop_saved_loadouts` persistence migration. Owners have read-only RLS access; authenticated clients cannot insert/update/delete snapshots, and the trusted lookup RPC is service-role-only. This prevents client-editable character equipment/base-stat JSON from becoming co-op authority.
- Added 2×2 phone-width team presentation to the development Co-op gallery. Echoes are labelled “Saved player build · automated ally”; no online-owner claim, Ready check, votes or chat appears.
- Added candidate-shortage, content-version conflict and reconnect/resume gallery states. Resume remains non-actionable until a fresh server fetch returns a ready projection.
- Request identity is caller-owned and preserved for idempotent retries. The UI does not invent a second run when the same request is retried.

## Deliberately not enabled

The production loadout CTA does not call Q start yet. The repository exposes mobile client paths for `/coop/qmode` and `/coop/runs/:id`, but the inspected server code does not demonstrate deployed HTTP handlers returning the required public team, graph, decision, persistent combat, offer, event-cursor and settlement projections. Enabling the CTA would create an unverified/broken production flow.

The development gallery does not simulate recruitment success, advance rooms on a timer, offer a canned victory button or claim rewards.

## Files

- `apps/mobile/src/core/coop-qmode.ts`
- `apps/mobile/src/online/coop-qmode-source.ts`
- `apps/mobile/src/dev/coop-qmode-fixtures.ts`
- `apps/mobile/src/components/coop/CoopQModeTeamGallery.tsx`
- `apps/mobile/tests/coop-qmode.ts`
- `backend/src/server/coop/qmode-public-projection.ts`
- `backend/src/server/coop/__tests__/phase6-public-projection.ts`
- `backend/supabase/migrations/20260921000000_coop_saved_loadouts.sql`
- Updated `apps/mobile/src/screens/CoopUiGalleryScreen.tsx` and `apps/mobile/package.json`.

## Verification

- Full mobile TypeScript check: PASS.
- Mobile core suite: PASS, including exact composition, three Echoes, unique members, candidate shortage, content conflict, resume fetch gate, private-data rejection and stable request identity.
- Mobile pre-Codex smoke suite: PASS.
- Android Expo/Hermes production export: PASS (1,185 modules, 412 assets). Temporary export removed.
- Backend build: PASS.
- Backend Phase 06 Q-Mode test: PASS — three distinct Echo owners, seven pre-boss visits in this deterministic run, completed boss and 74 calculated Marks.
- Backend Phase 06 public-projection test: PASS — three visible next choices, hidden future graph, no controller/Echo owner IDs and no unreleased reward amount.
- Backend Phase 11 reward-integrity test: PASS, including personal spending/entitlement protections exercised by that suite.

## Completion gate still required

Phase 05 cannot honestly be marked end-to-end complete until an authenticated mobile request completes one server-backed Rootbound run, reconnects at a route or offer, restores the same roster/outcomes, and observes pending/committed personal rewards without source-owner wallet access. No such deployed integration was available in the inspected repository.

The Supabase project is linked, but the local integration stack could not be inspected because neither Docker nor Podman is installed or available on PATH. The authoritative saved-loadout schema is now defined, but it cannot be migration-tested locally and still needs a trusted snapshot-publication worker. A start/choose Edge Function also needs secure deployment configuration and integration tests; adding a client-authoritative shortcut would violate the handoff.

Native team/choice captures and full six-language Q-Mode copy also remain pending. Do not proceed to Phase 06 as though Phase 05 production integration passed.
