# v18 compatibility note — the player Market is removed

The uploaded historical design database contains older Market-era Guild concepts. These are **not current VELDRYN product requirements**.

Do not implement or restore:

- Player Market.
- Guild Procurement activity/orders.
- Procurement escrow tied to a player Market.
- Market-based Guild contribution sources.
- Market rankings/Market Tycoon UI.
- Market controls in VELDRYN Control.

## Safe concepts that remain

### Guild Treasury / Vault
A Guild can still have shared progression costs and direct Project donations. This is **not a player marketplace**. There is no buying from/selling to players and no order matching.

v18 development-project donations are project-scoped. The server atomically:

1. validates the project/resource requirement,
2. debits Gold or an item from the contributor,
3. increments the project goal,
4. writes an idempotency receipt,
5. updates normalized donor participation.

There is no freeform officer withdrawal path in v18.

### Quartermaster
Keep the Quartermaster Guild role, but its current purpose is:

- manage Guild Projects,
- manage project/vault logistics,
- view donation requirements,
- help select Decrees if permitted.

Remove `Can_Post_Procurement` or equivalent Market-era permission.

### Historical skill: Procurement Network
If the current code/content still contains this skill, do **not** keep a dead Market bonus. Recommended compatibility replacement:

**Project Logistics** — +2% Guild XP earned from completed Guild Projects per rank, max +10% at rank 5. It must not increase project completion points, project rewards, player rewards, or leaderboard score.

Keep the existing internal content ID only if changing it would break saves; change the user-facing name/effect through a versioned content migration.

### Historical Treasury II `Procurement Slots`
Do not expose Procurement Slots. If the upgrade already exists in saves, retain the upgrade record but reinterpret its current benefit as a Guild-project/vault quality-of-life unlock (for example extra saved Project supply presets / improved project logistics UI), not as additional Market orders.

## Data cleanup

Do not delete historical production data blindly. Remove stale UI/config/commands, keep audit/history where needed, and migrate user-facing effects through normal versioned content migrations.
