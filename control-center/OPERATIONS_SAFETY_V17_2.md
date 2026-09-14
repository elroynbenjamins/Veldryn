# VELDRYN v17.2 — Operations & Safety Foundation (corrected baseline)

This retained document describes the operations layer inherited by v17.3. The current product does **not** include a player Market.

## Remote Config rules

Remote config is registered, typed, bounded and server-authoritative. The browser cannot create arbitrary keys. Stable rollout uses a deterministic account bucket, and emergency safety ceilings may only constrain immutable live-event values rather than silently buff them.

Initial feature gates cover:
- persistent Parties,
- Party Contracts,
- Party Events,
- Guild recruitment,
- Live Dungeons,
- Crafting,
- Chat sending,
- Companion Trials,
- reward claims,
- global gameplay write lock.

Disabling a feature should normally block new entry/mutations while preserving safe settlement/recovery for already-started jobs or runs.

## Economy / health telemetry

Use bounded aggregate buckets, not unbounded per-action analytics in the primary database.

Initial metrics:
- Gold created by source,
- Gold destroyed by sink,
- item/material creation and destruction by bounded dimensions,
- registered currency creation/destruction,
- reward-bundle grants,
- skill/activity seconds,
- Dungeon completion by mode,
- normalized social contribution points by system.

Never place account IDs, emails, chat text, device identifiers or other user PII in metric dimensions.

## Alerts

Recommended automated alerts:
- Live-Ops worker heartbeat stale,
- central reset worker stale,
- Admin Command worker stale,
- reset dead-letter,
- social contribution dead-letter,
- reward error spike,
- unusual Gold net creation versus configured baseline.

## Central UTC Reset Service

Launch definitions:
- `daily.world`,
- `weekly.party_contracts` — Monday 00:00 UTC,
- `monthly.companion_trials` — first calendar day 00:00 UTC.

Reset runs are idempotent by `(reset_key, period_key)` and atomically claimed by workers.

## Player Support

v17.2 began as read-mostly support. v17.3 keeps the search/case/note tools but moves all player-state correction into the named, audited Admin Command Bus. Support staff never receive a raw database editor.
