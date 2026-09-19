# VELDRYN v19 — Regional Crises + Asynchronous World Bosses

## Purpose

v19 makes VELDRYN's world feel shared without requiring players to be online together. It deliberately reuses v17 Live-Ops, the transactional social-contribution outbox, v18 Guild systems, the central UTC clock/reset model, notifications, reward bundles, metrics and the v17.3 schema-driven Control Center.

There are two separate loops:

1. **Regional Crises** — server-wide campaigns tied to a region. Normal eligible combat/skilling activity contributes automatically.
2. **Asynchronous World Bosses** — each player fights a short personal authoritative encounter. Valid combat output is converted to role-aware Raid Impact and applied to one shared global HP pool.

No new player currency is added. No player Market dependency exists.

---

## Regional Crises

### Player flow

A crisis appears on the affected World/region UI. The player sees:

- crisis name and region
- time remaining
- global progress meter
- current stage
- personal contribution
- optional Party/Guild contribution context
- personal milestones/rewards
- "what helps" activity guidance

The player does **not** queue into a special instance. Normal eligible activities settle through the existing authoritative activity/combat/crafting pipelines, which snapshot the active crisis target into the social contribution outbox.

### Focuses

- Combat
- Skilling
- Mixed

Mixed crises use minimum category shares so one activity family cannot completely carry the objective. Launch templates use roughly 30% Combat + 30% Skilling minimums.

### Stages

Launch structure:

- 25% — Response Mobilized
- 60% — Turning Point
- 100% — Region Secured

Stages can trigger notifications, unlock content, and optionally unlock a World Boss.

### Population scaling

The target is frozen when the crisis starts. Reference scaling uses:

- eligible active accounts from the prior 7 days
- expected participation fraction (default 45%)
- expected contribution time per participating account/day (default 20 minutes)
- event duration
- 1,000 standardized points ≈ one active hour
- minimum/maximum target clamps

The scale snapshot is immutable after start. Never live-edit the target because participation turns out higher/lower than expected.

### Individual caps and rewards

Launch daily normalized contribution cap: **2,200/account**, further bounded by the global remote-config hard ceiling.

Launch personal milestones:

- 250
- 750
- 1,500
- 2,500

Participation rewards are baseline/useful. Server success can grant an additional existing reward bundle. Success also supports an optional **12-hour regional recovery modifier** using the existing modifier/bonus-cap infrastructure (reference intent: about +5% eligible regional XP, not an uncapped new stacking family).

There is no harsh server-wide failure penalty. A low-population period should not make the region unpleasant to play.

### Early completion / time zones

When the server secures a crisis early, the crisis becomes **Secured** but remains contribution-eligible until its original end time. Global progress can overfill internally, while the UI caps the success meter visually at 100%. Late players can still earn personal milestones and participation rewards.

---

## Asynchronous World Bosses

### Shared HP, personal encounters

The World Boss has one shared server HP pool, but every player enters their own short combat encounter.

Reference launch rules:

- 90-second attempt window
- 4 score-bearing attempts per UTC day
- attempts are never sold for premium currency
- one open attempt per account/boss
- daily limits are enforced atomically in the database, not only in the API
- server-issued encounter IDs and authoritative combat settlement only

### Class fairness — Raid Impact

Raw DPS alone must not decide shared-world value. The trusted combat result exposes server-resolved metrics such as:

- direct damage
- valid damage prevented/mitigated
- effective healing
- useful buff/debuff/utility uptime
- survival time

The server resolves the character's World Boss role profile (Damage/Tank/Support/Hybrid) and applies role weights. The result is **Raid Impact**. Raid Impact becomes global boss damage.

Clients do not submit:

- Raid Impact
- role profile
- expected damage
- boss HP damage
- contribution points

They only display the authoritative result.

Gear/build quality still improves performance; the normalization exists to stop class role from inherently deciding who matters.

### HP scaling

World Boss max HP is frozen at spawn using a scale snapshot containing:

- eligible combat-active accounts over the prior 7 days
- expected participation fraction (default 35%)
- expected scored attempts per participating player (default 3)
- median benchmark Raid Impact per attempt
- target clear fraction (default 78%)
- min/max HP clamps

The median benchmark should come from server combat/content benchmarks, not client telemetry claims.

### Phases

Launch boss templates use:

- Phase 1: 100%–70%
- Phase 2: below 70%
- Phase 3: below 35%

A new encounter snapshots the current phase at attempt start. An encounter already in progress does not mutate mechanics midway because another player changed global HP.

### Concurrency/idempotency

Attempt reservation is serialized per `(boss, account)` via a database advisory transaction lock.

This prevents:

- double-tap fifth attempts
- duplicate open encounters
- multiple Echo attempts
- request retry duplication

Attempt settlement locks both the receipt and boss row, and applies:

`appliedDamage = min(remainingHP, requestedAuthoritativeDamage)`

The encounter receipt is settled once. Concurrent final hits cannot over-damage the boss or credit the same attempt twice.

### Defeat and Echo window

When HP reaches zero:

- no new score-bearing attempts may start
- in-flight scored encounters receive a short settlement grace
- prestige ranking freezes from score-bearing encounters only
- players with **zero** prior scored attempts may use **one** Echo encounter for up to 12 hours after defeat (and before the scheduled event end)
- Echo encounters grant participation eligibility only
- Echo Raid Impact does not reduce HP, reach personal impact milestones, or enter prestige rankings

This gives time-zone fairness without artificially pinning the boss at 1 HP.

### Rewards

Use existing reward bundles.

Possible reward layers:

- participation
- personal scored Raid Impact milestones
- server victory reward if defeated
- prestige ranking reward (primarily title/border/background/badge/cosmetic; do not create a large permanent power gap)

Reference personal impact milestones:

- 750
- 2,000
- 4,000
- 7,000

Prestige ordering is deterministic:

1. Raid Impact descending
2. applied global damage descending
3. best attempt Impact descending
4. earlier last scored attempt
5. account ID lexical fallback

Echo attempts never enter the ranking candidate set.

---

## Crisis → World Boss chaining

A Regional Crisis stage can include a `unlockWorldBossTemplateId`. v19 launch examples use the 100% secured stage for the linked World Boss.

The minute worker detects the reached stage and creates the boss instance exactly once. The World Boss gets its own immutable definition/scale snapshot and can also be scheduled independently for future Live-Ops content.

---

## Launch template pool

Regional Crises:

- Rift Breach — Mixed — can unlock The Riftbound Colossus
- Sunscar Incursion — Combat — can unlock Cindermaw, the Sunscar Tyrant
- Frostmarch Whiteout — Skilling — no boss required

World Bosses:

- Cindermaw, the Sunscar Tyrant
- The Riftbound Colossus

These are content templates, not a hard-coded calendar. Validate all content IDs/reward bundles/region IDs against the current repository before publishing.

---

## Control Center

The existing v17.3 schema-driven controls are reused. The migration registers controls for:

- cancel crisis
- rebuild crisis aggregates from canonical receipts
- cancel World Boss
- rebuild boss HP from canonical applied-damage receipts
- repair one stuck boss attempt
- finalize World Boss ranks/rewards

Remote config adds:

- Regional Crises master gate
- World Boss master gate
- crisis daily contribution emergency ceiling
- boss daily-attempt emergency ceiling

No raw SQL editor is introduced.

---

## Metrics / health

Bounded operational metrics should include:

- active crisis count
- crisis contribution points
- secured/failed crisis count
- active World Boss count
- boss attempts
- Raid Impact
- applied damage
- defeated bosses
- worker failures
- attempt settlement failures/dead letters

Register `shared_world_v19` in worker health.

---

## Important non-goals

v19 does not add:

- synchronous open-world raid networking
- purchasable World Boss attempts
- a new event token/currency
- mandatory Party/Guild membership
- a player Market
- punitive regional failure debuffs
- client-authoritative contribution/damage
