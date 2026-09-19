# VELDRYN v17 — Product + Implementation Contract

## 1. Purpose

v16.1 created persistent 1–4 player Parties, asynchronous Party Contracts, LFG/LFM, Guild seekers and normalized contribution scoring.

v17 turns that foundation into recurring social gameplay without requiring four people to be online at the same time.

The intended social ladder remains:

- Solo → normal skills/story/combat.
- Party → lightweight asynchronous cooperation.
- Guild → long-term community.
- Live Dungeon → synchronous strict 1 Tank / 2 Damage / 1 Support.
- Q-Mode → asynchronous dungeon alternative.
- Companion content → separate 3-companion ecosystem.

Party Events must not replace weekly Party Contracts. They run alongside them occasionally.

## 2. Live-Ops event content model

Every event definition is immutable and versioned by `(event_id, version)`.

Changing balance/content requires a new version. Never mutate a definition already used by an instance.

A Party Event definition includes:

- stable event ID + version,
- name/description,
- scope,
- duration,
- eligible high-level categories,
- optional eligible activity kinds,
- optional regions,
- optional content tags,
- small activity/challenge multipliers,
- daily account cap,
- optional category split requirements,
- personal milestones,
- Party milestones,
- ranking qualification,
- Party binding threshold,
- ranking reward bundle IDs,
- event/recruitment tags.

A scheduled event instance snapshots the complete definition + config hash so later content versions cannot alter a live/historical event.

## 3. Timing and lifecycle

Party Events are designed for **24–72 hours**. v17 templates use 48 hours.

All authoritative comparisons use UTC/epoch timestamps.

Lifecycle:

1. Scheduled.
2. Active.
3. Settling after end time.
4. Finalizable after a 5–30 minute settlement grace; v17 default is 10 minutes.
5. Finalized with immutable rank snapshots.
6. Archived later if desired while history/snapshots remain queryable.

Default scheduler policy rejects overlapping Party Events. This keeps the social loop readable and prevents event stacking from becoming mandatory.

## 4. Initial event templates

### Rift Surge

- Mixed.
- Combat + Skilling.
- 48 hours.
- Ranking requires at least 30% of the 4,000 qualification score from Combat and 30% from Skilling.
- Elites and bosses get only small additional event modifiers because v16 scoring already rewards challenge.

### Sunscar Invasion

- Combat.
- Sunscar region.
- 48 hours.
- Normal enemies, elites and bosses all contribute through time-normalized scoring.

### Rebuild Asterfall

- Skilling.
- Asterfall.
- Gathering, processing, crafting and deliveries.

### Frostmarch Supply Crisis

- Skilling.
- Frostmarch.
- Fishing, hunting, gathering, processing, crafting and deliveries.

### Blackened Wells

- Mixed specialized event.
- Eligible poison/antidote/tainted-tagged content.
- Combat + gathering + alchemy/crafting.
- At least 25% Combat and 25% Skilling for ranking qualification.

These are reusable templates, not a forced calendar.

## 5. Contribution scoring

v17 reuses the v16.1 standard:

`1,000 points ≈ one standardized routine hour`.

Base points:

`expected_seconds × units / 3600 × 1000 × v16_challenge_multiplier`.

v16 challenge multipliers remain:

- Routine 1.00.
- Demanding 1.10.
- Elite 1.20.
- Boss 1.35.

An event may apply a small additional 0.5–1.5 activity modifier and 0.75–1.5 event challenge modifier, but supplied templates stay close to 1.0.

Never score by raw count alone.

Never use player-submitted expected time, difficulty, units that were not actually settled, or point totals.

### Combat timing

Use server-owned **expected encounter effort**, not actual fight wall-clock duration, otherwise players could intentionally stall a fight to farm social points.

### Idle/gathering timing

Use authoritative claimed elapsed/action duration already validated by the idle/activity system, bounded by the activity's offline cap and the event daily point cap.

### Crafting

Use current recipe duration × authoritative settled quantity.

## 6. Transactional contribution outbox

This is mandatory for production integration.

When combat/skill/craft/idle settlement commits rewards, insert one `social_contribution_outbox` envelope in the same database transaction.

The envelope snapshots the state that mattered **at settlement time**:

- globally unique `source_event_id`,
- account,
- Party ID/name at settlement,
- category + activity kind,
- content ID,
- region/tags,
- server-owned contribution profile,
- units,
- active Party Contract instance if any,
- active Party Event instance IDs if any.

Worker processing may happen later. It must not rediscover current Party/event targets and reinterpret old activity.

Downstream contract/event receipt tables make retries idempotent.

Outbox retries up to 12 times, then dead-letters for operational review.

## 7. Event daily cap

Party Event credited contribution cap:

**2,400 points per account per UTC day per event.**

This is intentionally above the Party Contract 1,600/day cap because temporary 48-hour events have deeper optional milestones and rankings.

At routine rate this is roughly 2.4 standardized credited hours/day.

Raw points may remain visible in internal telemetry; credited points drive milestones/ranking.

## 8. Milestones

### Personal

- 250.
- 750.
- 1,500.
- 2,500.

Every player has achievable goals even if their Party is not competitive.

### Party

- 2,000.
- 4,000.
- 6,000.
- 9,000.

For a 48-hour event:

- 4 regular contributors should comfortably reach 4,000–6,000.
- 9,000 is an intentionally more active stretch target.
- two active players can still theoretically reach the final milestone under the daily cap.

Milestone rewards should use existing Gold/resources/Companion Essence/cosmetic reward bundles.

No Event Tokens or Party Tokens.

## 9. Party ranking qualification

A Party may appear in the live score UI before qualifying, but rank rewards require:

- at least **4,000 Party credited points**,
- at least **2 meaningful contributors**,
- meaningful contributor = **250 Party-event points**,
- all event category split rules satisfied.

This stops a one-person shell Party from winning a cooperative leaderboard while still allowing uneven contribution.

## 10. Party hopping / binding

A player's Party-event binding locks once that account reaches **250 Party-event points for one Party**.

Before binding, the player may change Party without being trapped by a trivial early contribution.

After binding:

- personal event progress can continue,
- only the bound Party may receive that account's Party/ranking contribution,
- joining a second Party does not move previously earned score,
- the second Party receives zero Party leaderboard points from that bound account for this event,
- Party/ranking reward claims remain tied to the bound Party.

This is much cleaner than locking Party composition for the full 48-hour event.

Party dissolution does not erase history: v17 stores historical Party ID/name snapshots outside cascading live Party foreign keys.

## 11. Leaderboards

Canonical leaderboard = **Global Party Ranking**.

Sort order:

1. Ranked eligible only.
2. Score descending.
3. Earlier `last_score_at` wins an exact score tie.
4. Party ID deterministic final tie-break.

Friends and Guild Party views are filtered views of the same global ranking. They preserve global rank.

Do not create separate high-value Friends/Guild reward ladders.

## 12. Finalization

At event end:

- enter settlement grace,
- finish processing events that occurred before `ends_at`,
- finalize after grace,
- compute eligible Party ranking,
- write one immutable rank snapshot per ranked Party,
- write rank/eligible-party-count/score/percentile/reward band,
- store finalization checksum,
- claims use snapshots from then on.

Never calculate ranking rewards from a mutable live query after finalization.

## 13. Ranking rewards

Reward bands:

- Top 10.
- Top 100.
- Top 10%.
- Top 25%.
- Qualified participation.

Higher bands override lower ones.

Permanent-power differences must remain modest. Top placements should emphasize:

- titles,
- profile borders/backgrounds,
- badges,
- cosmetic unlocks,
- temporary profile trophy,
- permanent leaderboard history.

The supplied code uses existing reward-bundle references rather than defining a new currency/economy.

## 14. Reward claim security

Claims are idempotent by deterministic claim key:

- personal milestone → event + account + milestone.
- Party milestone → event + bound Party + account + milestone.
- ranking → event + bound Party + account.

Ranking claim requires finalized snapshot.

Party milestone/ranking claims require the member to have at least **250 points** for the bound Party.

Leaving the Party after legitimately earning eligibility does not destroy the reward entitlement.

## 15. Contribution breakdown UI

Players can inspect where points came from.

Show categories such as:

- Combat.
- Gathering.
- Processing.
- Crafting.
- Fishing.
- Hunting.
- Alchemy.
- Deliveries.

Then top content sources, e.g.:

- Ash Wyrm — 250.
- Flame Elite — 105.
- Rift Core crafting — 260.

The database includes bounded daily aggregate storage so the UI does not need an unbounded raw receipt list.

## 16. Recruitment during events

Do not change the core matching philosophy.

Party discovery remains based mainly on:

- Combat / Skilling / Mixed.
- play style.
- broad goal tags.

Active event tags are only a **small optional compatibility bonus**.

Good:

`Mixed · Balanced · Party Events · Weekly Contracts · Rift Surge`

Bad:

`Only match me with Party contract/event instance 8473`.

This keeps Parties persistent beyond one rotating objective.

## 17. Full Guild recruitment

v17 completes both directions.

### Guild advert

Guild leader/officer with current recruitment permission can publish:

- description,
- focus tags,
- play style,
- optional current event interests,
- optional minimum Total Level,
- optional minimum Combat Level,
- application-required setting.

### Player advert

Player can publish:

- selected character,
- public class/combat/total level,
- desired guild focus,
- play style,
- short description,
- optional current event interests.

### Application flow

Player → Apply → officer accepts/declines.

### Invite flow

Officer → Player seeker → Invite → player accepts/declines.

Applications/invites expire after 72 hours in the supplied domain logic.

Server rechecks guild membership and capacity at acceptance time.

## 18. Mobile UX

Integrate under the existing Account > Social structure.

Suggested local tabs:

- Party.
- Events.
- LFG.
- Guilds.

Do not alter final bottom navigation:

**Character · Skills · World · Inventory · Account**.

Use the repository's current pixel UI tokens/components. The supplied React Native components are functional layout references and integration-ready data contracts, not permission to replace a newer design system.

Event screen includes:

- event status/name/description,
- personal points,
- Party score/rank,
- next personal/Party milestone,
- daily cap progress,
- rank qualification warnings,
- member contribution list,
- milestones/claim actions,
- leaderboard button,
- contribution breakdown button.

## 19. Notification hooks

Generate deduped notification intents for:

- event start,
- six hours remaining,
- rewards ready after settlement grace.

Honor the existing notification/quiet-hours system when delivering.

## 20. Worker/operations

Wire `runLiveOpsWorkerTick` or repository equivalent into the existing job runner, approximately once per minute.

Tick responsibilities:

- process contribution outbox,
- scheduled → active,
- active → settling,
- settling → finalized,
- dead-letter reporting.

Do not let the client trigger finalization or authoritative scoring.

## 21. Explicit non-goals for v17

- No new Party/Event currency.
- No mandatory realtime Party combat.
- No Party level/skill tree.
- No Guild Projects yet.
- No Regional Crisis/World Boss yet.
- No separate live-ops admin website yet.

The event publishing/scheduling **backend contract is included now** so a future admin UI can call it without redesigning event storage.
