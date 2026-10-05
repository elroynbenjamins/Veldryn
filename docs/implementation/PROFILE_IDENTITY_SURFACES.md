# Player profile icons across social and dungeon screens

Updated: 2026-10-05

## Display contract

A player identity uses that account's selected public profile icon. The selected
icon is separate from combat class artwork, companion artwork, and a frozen
Echo loadout. `IdentityArtwork` resolves a valid selected icon even when no
recognized class is available. Unknown or unavailable icons fall back to the
known class, then the neutral account marker. Explicit portraits and Guild
artwork keep their existing precedence.

An explicit `profileIconId: null` means the public projection has no available
selected icon. It must not revive an older icon from the account identity cache.
The profile's selected/showcased character can differ from the character in a
dungeon. `iconClassId` is therefore a cosmetic fallback only; it never replaces
the run member's `classId`, role, body presentation, or equipment.

## Covered surfaces

| Surface | Identity source |
| --- | --- |
| World, Guild, and Party chat message rows | Sender account ID through the existing batched public identity provider; wired in PR #549 |
| Current online Guild roster and member profile sheet | Existing account-based identity provider and public profile projection |
| Reusable Guild roster | Now forwards its existing member account ID |
| Guild applications, outgoing player invitations, and Party invitations | Now forward their known player account IDs; incoming Guild invitations retain Guild artwork |
| Live ready-check members | Authorized ready-check cosmetic projection; unfilled seats retain role placeholders |
| Live LFG player posts | Cosmetic projection for posts in the existing discoverable board |
| Live, Q-Mode Echo, and seasonal expedition run rosters | Authorized run cosmetic projection keyed by the existing member/character ID |
| Dungeon combat name plates and party-member inspection | Same run cosmetics, alongside canonical combat class art and companion information |

This does not add a new Echo-owner directory or change the contents of private
loadouts. The development-only Q-Mode state gallery remains a fixture surface.

## Server boundary

Migration: `backend/supabase/migrations/20261102000000_coop_profile_icons.sql`.

`coop_profile_icons_v1(p_scope text, p_ids uuid[])` returns only:

```text
subject_id uuid
profile_icon_id text | null
icon_class_id text | null
```

| Scope | Request IDs | Returned subject ID | Authorization |
| --- | --- | --- | --- |
| `run` | Exactly one run ID | Member character ID | Active viewer access membership for a Live, Q-Mode, or event run |
| `ready` | Exactly one ready-check ID | Member character ID | Viewer is in that check's authoritative roster |
| `lfg` | Up to 100 existing post IDs | Post ID | Signed-in viewer; posts must remain in the existing active first-50 discovery window |

The authenticated public SQL wrapper invokes a checked private definer. Both
routines pin an empty search path and have explicit execute grants. They add no
table or private-schema access grants. The private helper resolves account
ownership internally and calls `profile_public_v43` under the actual viewer's
identity, preserving public/Guild/private visibility and both block directions.
Denied profiles produce null cosmetics. Account IDs, Echo donor IDs, private
state, and combat statistics are never returned.

This is a read-only projection over existing membership and profile data. It
does not modify snapshots, loadout hashes, queues, ready-check state, reward
entitlements, or gameplay RPCs, and requires no Edge Function bundle change.

## Mobile lifecycle

`apps/mobile/src/online/coop-profile-icons.ts` owns the RPC and cosmetic lifecycle.
The screen/lobby decorates a separate view of members; authoritative projections
and request payloads remain unchanged. There is no account ID lookup by player
name.

Requests are keyed by the viewer, scope, requested IDs, and roster revision or
member IDs. They run on entry and foregrounding, then at 60-second intervals,
independently of the gameplay poll. Requests do not overlap while active.
Account/scope/roster changes, backgrounding, errors, explicit nulls, and missing
rows clear previous metadata. Late responses cannot cross these boundaries.
An initial unknown native AppState permits the first read; offline fixtures and
disabled consumers do not send requests.

## Verification for this change

- Full mobile TypeScript and core TypeScript checks passed.
- `pnpm --dir apps/mobile test:pre-codex` passed all four smoke checks.
- `node tools/validate-coop-profile-icons.cjs` passed all five React 19 suites:
  cosmetic-only transport, refresh cadence, stale-response isolation, lifecycle
  cleanup, and actual shared artwork selection/fallback behavior. It is registered
  in `tools/mobile-core-tests.json` for the complete CI suite.
- `node tools/validate-dungeon-combat-lifecycle.cjs` passed all five suites,
  including ready/LFG/overview/inspection rendering, same-replay icon refresh,
  and actual combat-card layout contracts at 320/360/390px with 100% and 150%
  text. The legacy source contract accepts the optional scene-layout lookup;
  runtime assertions verify the resulting scene and portrait dimensions.
- Existing mobile Co-op presentation, Q-Mode, Live lobby, LFG TTL, social
  identity, profile selection, PvE intel, and reward-feedback checks passed.
- The backend's installed TypeScript compiler passed both `--noEmit` and the
  full build. Direct compiler invocation was used because this environment's
  pnpm dependency check stopped at the existing ignored esbuild install script.
- Existing backend public-projection, normalization, frozen roster commitment,
  and ready/recovery suites passed.
- The recent migration version/dollar-quote validator passed across 213 files.
- `backend/online/tests/coop-profile-icons-db.mjs`, using isolated PGlite 0.5.8,
  passed six groups with the actual migration and existing public-profile
  resolver. Coverage includes authenticated role execution, membership and
  input bounds, both block directions and visibility changes, exact LFG
  discovery limits, untouched frozen state/hashes, and complete fixture rollback.
  Set `PGLITE_MODULE` to an installed PGlite `dist/index.js` to run the test.

## Production verification and deployment

The new RPC was deployed on 2026-10-05. The connected migration receipt is
`20261005060028 / coop_profile_icons`; the repository file uses `20261102000000`
so its dependencies remain ordered after the existing forward-dated chain.
Migration SHA-256:
`5815f3547bcb7a70a95fbe2f20f83fe023f78e96d774c8c9803e8e85c140467e`.

Before deployment, connected migration history and prerequisites were inspected.
The legacy CLI's linked list/dry-run/lint commands could not authenticate because
this environment has no CLI access token. Instead, the exact new migration was
validated against the connected production schema in an intentionally aborted
transaction. Scoped `plpgsql_check` returned no warnings or errors, security
attributes and execute grants passed, and role/auth/input/outsider probes ran
read-only with zero fixture writes. A separate readback confirmed both temporary
functions, the temporary linter extension, and the validation history entry were
absent after rollback. The final migration was then applied once.

Post-deployment checks verified the recorded migration, authenticated-only
execute grants, the bound public wrapper, empty authorized LFG results, and
non-participant denial. Both routines are declared `VOLATILE` to match the
existing public-profile resolver; their bodies remain read-only. No existing
Edge Function, public-profile policy, or gameplay state was changed.

Native Android visual confirmation remains a device check. The UI change needs
a new mobile build; an already-installed binary does not acquire new components
from a database migration.
