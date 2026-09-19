# VELDRYN Control Center — v19 Shared World wiring

v17.3's schema-driven **Full Controls** page is intentionally reused. v19 does **not** need a new hand-built admin page just to operate Regional Crises or World Bosses.

The v19 migration registers:

- `shared_world.crisis_cancel`
- `shared_world.crisis_recalculate`
- `shared_world.world_boss_cancel`
- `shared_world.world_boss_recalculate_hp`
- `shared_world.world_boss_repair_attempt`
- `shared_world.world_boss_finalize`

It also registers kill switches/tunables when `ops_remote_config` exists:

- `feature.regional_crises.enabled`
- `feature.world_bosses.enabled`
- `safety.regional_crisis.account_daily_credit_hard_cap`
- `safety.world_boss.daily_attempt_hard_cap`

## Event creation/scheduling

Use the existing versioned Live-Ops publishing pattern. Add `regional_crisis` and `world_boss` as server-side Live-Ops content kinds in the current repository. The immutable definition snapshot/hash rules must remain the same as v17.

For routine operation the Control Center should expose these through the existing Event Builder if the current UI already supports polymorphic schemas. If not, **do not block v19**: create/schedule instances through named schema-driven admin commands first, then allow the Event Builder to consume those same schemas when convenient. Do not add a raw SQL editor.

## Safe repair rule

World Boss HP repair is always:

`max_hp - SUM(canonical applied_global_damage receipts)`

never a manually entered HP number. Crisis repair similarly recomputes totals from immutable contribution receipts.

## Monitoring

Record bounded metrics in the existing v17.2 metrics system:

- `shared_world.crisis.active`
- `shared_world.crisis.contribution_points`
- `shared_world.crisis.secured`
- `shared_world.boss.active`
- `shared_world.boss.attempts`
- `shared_world.boss.raid_impact`
- `shared_world.boss.damage_applied`
- `shared_world.boss.defeated`
- `shared_world.worker.failures`

Add `shared_world_v19` to worker-health monitoring.
