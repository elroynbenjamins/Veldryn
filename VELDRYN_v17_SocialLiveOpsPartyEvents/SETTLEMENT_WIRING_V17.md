# v17 Trusted Settlement Wiring

## Required rule

The client never calls contribution-scoring endpoints directly.

Every qualifying activity creates a server-owned social contribution envelope from data already validated by the authoritative settlement.

Insert the outbox record in the **same transaction** as the underlying reward/XP/inventory settlement.

## Common envelope fields

- `sourceEventId`: unique idempotency key for the underlying settlement/action.
- `accountId`.
- `occurredAtMs` + UTC `dateKey`.
- `partyIdAtSettlement` and `partyNameAtSettlement` from trusted Party state.
- `profile.id` = current content/action ID.
- `profile.category` = Combat or Skilling.
- `profile.expectedSecondsPerUnit` from server content/timing.
- `profile.challenge` from server content.
- `units` actually settled.
- `activityKind`.
- `contentId`.
- optional region/tags.
- targets snapshotted at settlement: active Party Contract instance + active Party Event instance IDs.

## Gathering / fishing / hunting / processing

Use the authoritative activity cycle duration from the current content definition.

Example concept:

```ts
profile: {
  id: activity.id,
  category: 'skilling',
  expectedSecondsPerUnit: activity.cycleSeconds,
  challenge: activity.challenge ?? 'routine',
},
units: settledCycles,
activityKind: activity.kind,
```

Do not create a second duplicate timing table if the current content registry already owns cycle time.

## Idle claims

Use only the elapsed/cycles accepted by the current idle-claim cap logic.

Do not award event points for time beyond the game's normal offline cap.

The event's own 2,400/day credit cap applies after normal idle validation.

## Crafting

Use current recipe duration and settled quantity:

```ts
expectedSecondsPerUnit: recipe.durationSec,
units: quantityActuallyCrafted,
activityKind: 'crafting',
```

If a batch partially fails/rolls back, only committed units may enter the outbox.

## Combat

Use server-owned expected encounter effort and challenge tier.

Do **not** use actual battle duration as expected seconds. Otherwise intentionally slow builds could farm contribution.

Example concept:

```ts
profile: {
  id: encounter.id,
  category: 'combat',
  expectedSecondsPerUnit: encounter.socialExpectedSeconds,
  challenge: encounter.isBoss ? 'boss' : encounter.isElite ? 'elite' : 'routine',
},
units: 1,
activityKind: 'combat',
```

For repeated auto-combat, `units` is the number of server-confirmed completed encounters.

## Deliveries/contracts

Count only when an authoritative delivery is completed/consumed. Derive expected effort from the objective's server-owned effort budget, not the submitted item count alone.

## Target snapshot

At settlement time, snapshot:

- currently active Party Contract for the Party/account,
- event instances whose `starts_at <= occurred_at < ends_at`.

Do not query `now()` later in the worker and guess what was active when the activity happened.

## Retry model

1. Gameplay/economy transaction commits reward + outbox record.
2. Worker claims outbox row.
3. Routes to Contract/Event targets.
4. Each target checks its own `(instance, account, source_event_id)` receipt.
5. Worker stores processed result.
6. On transient failure, retry.
7. After 12 attempts, dead-letter and alert operations.

This gives at-least-once delivery with exactly-once credited effect per target.
