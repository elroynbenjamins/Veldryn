# v18 authoritative contribution / settlement wiring

v18 reuses the v17 standardized social-contribution pipeline.

## One gameplay settlement, multiple independent social targets

A trusted combat/gathering/processing/crafting/fishing/hunting/alchemy/delivery settlement may legitimately contribute to:

- the active Party Contract,
- an active Party Event,
- the account's current Guild Weekly Project.

These systems share the same authoritative activity profile but keep independent receipts, caps, eligibility and rewards.

## Required settlement snapshot

At the same database transaction boundary as the underlying gameplay settlement, snapshot:

- `sourceEventId`
- account ID
- activity profile/content/units/date
- Party targets (v17)
- current Guild ID/name
- Guild membership joined-at
- active eligible Guild Project instance IDs

Then enqueue the v17 social contribution outbox envelope with v18 `guildTargets` included in `targets_json`.

Do not discover Guild membership later in the delayed worker.

### Why

Without the snapshot a player can:

1. finish a boss in Guild A,
2. leave Guild A,
3. join Guild B before the worker processes,
4. accidentally or deliberately give Guild B the old boss contribution.

v18 prevents that.

## Weekly cycle binding

After an account reaches the project's meaningful-contributor threshold, create an immutable `(cycle_key, account_id) -> guild_id` binding.

- The player may still leave/join Guilds normally.
- Normal gameplay continues normally.
- For the rest of that weekly project cycle, their standardized Weekly Guild Project contribution cannot feed a second Guild.
- Development-project direct donations are separate, but completion/reward rules still validate current membership.

This prevents cross-Guild leaderboard/reward farming without trapping players socially.

## Weekly project scoring

The same v16 standardized-effort formula is used:

`expected server seconds × challenge weighting -> standardized points`

Never trust a client-submitted expected duration, challenge multiplier or points value.

v18 reference constants:

- 1,000 points ≈ one standardized hour.
- Daily credited cap per account/project: 2,400.
- Mixed projects: at least 30% Combat and at least 30% Skilling.
- Dynamic single-account completion-share cap based on active roster size.
- Dynamic meaningful-contributor count based on active roster size.

## Active roster snapshot

When a weekly project starts, calculate a stable `active_member_snapshot` from server activity in the previous 14 days. Recommended source:

- current Guild members with at least one authoritative gameplay/social activity in the previous 14 days.

Clamp project scaling to the v18 design band (2–40 active members) even though Guild capacity can ultimately be 60. This stops a 60-member Guild with 25 actually-active members from receiving a 60-player project target.

The snapshot never changes for the active project.

## Development donations

Do not route stockpiled Gold/material donations through standardized effort points.

Development Projects use exact resource goals. Donation execution must be atomic and idempotent through the current economy/inventory services. Never perform:

`remove item -> network call -> update Guild Project`

as separate non-transactional operations.

A Development Project also requires multiple meaningful donors; one wealthy account can supply most of the resources, but should not be the only participant in a mature Guild.

## Guild XP

Do not convert every v18 project point 1:1 into Guild XP. Normal Guild-contribution XP can continue through its existing capped system; the Project itself grants its configured fixed Guild XP on completion. This avoids double-leveling Guilds just because the same activity was eligible for a Project.
