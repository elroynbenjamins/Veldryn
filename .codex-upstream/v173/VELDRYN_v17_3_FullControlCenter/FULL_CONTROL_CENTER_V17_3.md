# VELDRYN v17.3 — Full Control Center

v17.3 makes **VELDRYN Control** the long-term private administration surface for the game rather than a sequence of one-off admin pages.

## Compatibility baseline

- Merge into the current local VELDRYN repository; it is authoritative.
- The user described the local implementation as broadly based on v16-era code.
- v17/v17.1/v17.2 systems are additive reference modules if they are not already integrated.
- **There is no player Market.** Do not restore any historical trading/listing system from older backend material.

## 1. Schema-driven Admin Command Bus

The browser does not edit arbitrary tables. It renders forms from `ops_admin_command_registry` and queues validated commands.

A command definition carries:
- command key/category,
- label/description,
- target scope,
- minimum admin role,
- risk tier,
- typed parameter schema,
- trusted handler key,
- reversibility metadata,
- approval requirement,
- enabled/disabled state.

Supported generic field types include text, textarea, integer, number, boolean, date/time, UUID, select, single catalog value, multiple catalog values and validated JSON. This means future ordinary commands can reuse the same page.

### Current command families

**Account / moderation**
- force logout,
- schedule/cancel account deletion,
- chat mute/unmute,
- hide/restore reported chat message without deleting moderation evidence,
- suspend/unsuspend account,
- character rename.

**Economy / inventory**
- Gold delta adjustment,
- exact Gold corruption repair,
- registered non-premium/event currency delta adjustment,
- exact registered non-premium/event currency repair,
- exceptional premium-currency support correction with external reference,
- item/material quantity adjustment,
- exact item/material quantity repair.

**Rewards / progression**
- validated reward-bundle grant,
- failed/missing reward-claim recovery,
- skill XP delta,
- exact skill XP repair,
- derived Combat/Total/account progression recalculation,
- stuck activity cancellation/recovery.

**Entitlements / collections**
- entitlement override grant/revoke,
- pet/background/border/skin/achievement/title grant/revoke.

**Companions**
- companion grant,
- exceptional companion revoke,
- companion XP adjustment,
- exact companion XP repair.

**Social / Dungeons**
- Party member removal/repair,
- Party rename/disband,
- Guild member removal,
- Guild rename,
- Guild leadership transfer,
- Guild disband workflow,
- stuck Live/Q-Mode Dungeon cancellation/recovery,
- stale queue release.

**System**
- sync admin content catalog.

A command that does not exist in the current local domain must remain disabled until Codex wires its trusted handler. Do not fake support by writing tables directly.

## 2. Safety model

1. No raw database editor.
2. Commands are idempotent via `admin-command:<idempotency_key>`.
3. Multiple workers atomically claim with `FOR UPDATE SKIP LOCKED`.
4. Viewer / Editor / Owner role separation.
5. Low / medium / high / critical risk tiers.
6. High and critical commands require exact typed confirmation.
7. Critical commands can require a different Owner approval.
8. Every mutation requires a human reason.
9. Command lifecycle events are append-only.
10. Reversal is a new audited command, never a database rewind.
11. Catalog-backed inputs reject unknown IDs.
12. Exact-set repair controls are higher risk than ordinary delta adjustments.

## 3. Content Catalog

`ops_admin_content_catalog` mirrors authoritative IDs into the admin plane for safe dropdowns and inspection.

Recommended synced entity types:
- item,
- skill,
- currency_nonpremium,
- premium_currency,
- reward_bundle,
- companion,
- entitlement,
- pet,
- profile_background,
- profile_border,
- skin,
- achievement,
- title.

New ordinary content does not require a Control website change; sync the catalog after deployment/content activation.

## 4. Redeem Codes

Owners can create controlled codes for event rewards, compensation or promotions.

Properties:
- secure random code by default,
- optional custom code with minimum length validation,
- SHA-256 hash stored, not plaintext,
- short display hint,
- validated reward bundle,
- optional start/end,
- optional total claim cap,
- per-account claim cap,
- enable/disable,
- recent claims/status visibility.

The game backend reserves claims atomically with the service-role RPC and grants the reward through normal idempotent reward receipts. The mobile client never receives database/service secrets.

## 5. Announcements

The Control Center schedules:
- all-player messages,
- single-account support notices,
- Guild messages,
- event-participant messages,
- optional push delivery.

Audience resolution and delivery are trusted backend work. Critical/push messages are Owner-only.

## 6. Existing operations retained

- Live-Ops event builder/templates/versioning/scheduling,
- Party Event leaderboards/finalization,
- Remote Config / emergency kill switches / staged rollout,
- Health & Economy telemetry,
- central UTC reset service,
- Player Support lookup/cases/notes,
- worker/dead-letter operations,
- Admin Users,
- Audit Log.

## 7. What “no more admin-site edits” realistically means

The Control UI should not need a custom page for every future item, skill, reward, Companion or ordinary support action.

Usually:
- new content -> sync catalog,
- new admin action -> register command + implement trusted handler,
- new event instance -> create from Control,
- new reward code -> create from Control.

A fundamentally new mechanic can still require a new backend handler/read model. That is intentional: the site must never become an unrestricted production database editor merely to avoid future coding.
