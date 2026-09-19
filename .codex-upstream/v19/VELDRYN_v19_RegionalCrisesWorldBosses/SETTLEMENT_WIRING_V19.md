# v19 authoritative settlement wiring

## Regional Crisis path

Trusted gameplay settlement commits:

1. normal activity/combat/crafting result
2. `SocialContributionEvent`
3. v16/v17 Party targets snapshot
4. v18 Guild targets snapshot
5. v19 active Regional Crisis target snapshot for the settlement region
6. one transactional social-outbox row

The worker routes the same event through `routeSocialContributionV19`:

- Party Contract
- Party Event
- Guild Project
- Regional Crisis

Each system has its own eligibility/cap/receipt tables. Reuse of the envelope does **not** mean reuse of reward claims or caps.

Snapshot on commit:

- crisis instance IDs
- region ID
- Party ID/name (if any)
- Guild ID/name (if any)

A delayed worker must never discover current membership and move old contribution to a different Party/Guild.

## World Boss path

World Boss combat does not use the generic social contribution score.

1. Player requests attempt.
2. Server verifies feature gate, event schedule, character ownership, Combat requirement and one-open-attempt rule.
3. Database atomically reserves the attempt and enforces daily/Echo limits.
4. Server creates the authoritative combat encounter with a snapshot of the current boss phase.
5. Existing combat engine resolves/validates the attempt.
6. Trusted combat adapter produces `WorldBossCombatResult` metrics.
7. Server resolves role profile and computes Raid Impact.
8. `settle_shared_world_boss_attempt` idempotently applies damage and stores the canonical receipt.
9. Reward/progress/notification layers consume the settled receipt.

Never accept `raidImpact`, role, applied damage or boss HP from the mobile client.

## Existing combat integration

Add an adapter around the current combat result rather than a second combat engine. The adapter should expose:

- direct damage actually dealt to boss target
- server-calculated prevented damage attributable to mitigation/guard mechanics
- effective healing only (no overheal farming)
- approved useful buff/debuff/utility uptime only
- survival time
- death/survival result

Support/Tank utility metrics need allowlists. Do not count spammy zero-value effects.

## In-flight boss attempts

The worker must not mark an undefeated boss `expired` immediately at `ends_at` if valid scored attempts are already in flight. Give those reservations up to 10 minutes to settle. New attempts stop at the scheduled end.

If the boss was already defeated, the prestige ranking can freeze after the same short in-flight grace. The 12-hour Echo participation window does not delay prestige finalization because Echo attempts are rank-ineligible.

## Regional recovery modifier

On a secured crisis, schedule the configured regional recovery modifier through the existing season/weather/modifier system. Do not create a one-off bonus stack. Reference intent is 12 hours and about +5% eligible regional XP, subject to existing caps.
