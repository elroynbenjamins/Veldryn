# VELDRYN v17.2 — Operations & Safety Foundation

## Product goal

Give VELDRYN a safe operational control plane before adding the next major asynchronous Guild/World systems. The goal is not to remotely redesign the game after launch; it is to let an operator disable broken systems, tune explicitly live-safe values, see economic/worker health, keep all recurring resets on one UTC authority, and investigate player-support problems without direct database editing.

## A. Remote Config rules

### Registered keys only
Arbitrary key/value creation is intentionally NOT exposed in the admin UI. New remote-controlled behavior must first be registered in a migration/code review with:
- value type,
- default,
- live-safe bounds,
- risk tier,
- client exposure,
- rollout rules.

### Server authoritative
Mobile can receive resolved `client_safe` values for UI presentation, but every protected server handler enforces the feature gate again.

### Stable rollout
Rollout is deterministic by `account_id + config_key + rollout_seed` into 10,000 buckets. A 10% rollout always selects the same accounts until the seed changes.

### Immutable event fairness
Remote config MUST NOT increase scoring, reward eligibility or contribution caps that are frozen inside an active Party Event definition. Emergency ceilings use:

`effectiveCap = min(frozenDefinitionCap, remoteSafetyCap)`

### Critical controls
Critical controls require Owner role and a meaningful operator reason. Every successful change writes:
- `ops_remote_config_revisions`, and
- the existing Control audit log.

## B. Initial emergency controls

- persistent Parties
- Party Contracts
- Party Events
- Guild recruitment
- Live Dungeons
- Player Market
- Crafting
- Chat sending
- Companion Trials
- reward claims
- global gameplay write lock

Disabling a feature should normally block NEW mutations/entry while preserving recovery paths for existing escrow/jobs/runs.

## C. Economy/health telemetry

Metrics are intentionally aggregated into bounded buckets, not stored as an unbounded analytics event stream in the primary database.

Initial recommended metrics:
- Gold created by source
- Gold destroyed by sink
- Item creation by bounded source/item dimensions
- Market trade count / Gold volume
- skill/activity seconds
- dungeon completions by mode
- normalized social contribution points by system

Never put account IDs, emails, chat text, device identifiers or other user PII in metric dimensions.

## D. Alerts

`ops_alerts` supports info/warning/critical and open/acknowledged/resolved lifecycle.

Recommended first automated rules:
- Live-Ops worker heartbeat stale >5 minutes
- central reset worker stale >5 minutes
- reset run dead-letter
- social contribution outbox dead-letter
- reward claim error spike
- unusual Gold net creation vs trailing baseline

Critical alert resolution is Owner-only in the Control site.

## E. Central Reset Service

All migrated recurring progression resets must use UTC and the same idempotent ledger.

Launch definitions:
- `daily.world`
- `weekly.party_contracts` — Monday 00:00 UTC
- `monthly.companion_trials` — calendar day 1, 00:00 UTC

Companion Trial monthly reset clears monthly floor/checkpoint progress, first-clear flags and monthly challenge state. It preserves companion ownership/progression and lifetime profile statistics.

Do not leave the old feature-specific reset path running after moving that feature into the central service.

## F. Player Support

v17.2 intentionally favors observation over intervention.

Operators can:
- find indexed accounts,
- inspect relevant public/progression/social/live-ops state,
- see recent reward claims and Party Event bindings,
- see operational alerts,
- create support cases,
- add internal notes.

Operators cannot through this UI:
- add/remove Gold,
- edit items,
- change skill levels,
- force event rewards,
- alter Party/Guild membership,
- ban/delete accounts,
- read private chat content.

Any future state-mutating support action should be built as a narrow audited server command with idempotency, explicit reason, before/after snapshot and the minimum role required.
