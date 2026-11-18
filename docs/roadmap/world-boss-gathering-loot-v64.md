# World Boss V64/V65 — milestone chests and Equipment 2.0-style gathering rolls (hidden)

**18 November 2026 — hidden source-level draft; NOT DEPLOYED.** No World Boss event, item grants, database migration, server route, chest opening, equipment catalog registration, live gathering modifier or production flag is enabled. World Boss V26/V28 receipt security, V57 erasure, V61–V63 emergency stops and all launch approvals remain prerequisites.

## Product rule: maximum THREE gathering chests per account, per boss event

The former **1% per-successful-attack RNG chest chance is fully removed** from the V64 per-attempt material loot planner. Three *earned milestones* now govern chests. One immutable, unique receipt per `eventId/accountId/bossId/source` (never per character or per retry).

| Source | Server-verifiable conditions | Reward |
|---|---|---|
| **War Camp** (`donations`) | **At least two** of the realm's three shared War Camp tracks (Fortifications / Field Provisions / Siegecraft) reach **Tier I**, **and** this account completes **at least one** verified V27 resource donation before the Saturday freeze | 1 themed chest |
| **Perseverance** (`three_attempts`) | **Three** account-wide V26/V28 committed, replay-proven attacks completed within the event; wins and losses both count, no extra chest for a 4th character | 1 themed chest |
| **Community Assault** (`community_damage`) | Global world-boss HP reaches **30% remaining or less** (≥70% total HP dealt, V18 server fact) **and** this account has ≥1 committed, replay-proven attack | 1 themed chest |

All conditions are monotonic server evidence across the event, not independent client counters or button presses. Server-issued chest receipts may be claimed/opened after the event closes, but no late donations or new attack reservations count. Zero or one chest is valid if a goal is not met. A new return of the same boss six weeks later creates a **new event ID** and its own maximum three chests, not a lifetime cap. No duplicate source grants even after crash/retry, multi-character login, concurrent claim/open, or read-after-write failure.

**Crucial distinction:** these are **three chests, not three equipment pieces guaranteed for every player**; participation and community milestones must actually be reached. All three are explicitly account-wide.

## Boss themes and common attack rewards

One world boss every 14 days, global rotation Hollowroot → Solbrand → Rimewarden. Each boss has a unique set of ten pieces in the already-defined slots Helmet, Chest, Gloves, Legs, Boots, Weapon, Offhand, Cape, Amulet and Ring. These are conceptual, class-neutral identities; class weapon/offhand compatibility must be reconciled with Equipment 2.0 before equip authority can be enabled. The gathering tool slot remains separate.

| Boss / region | Set / affected skill | Proven successful attack: always | 20% regional bonus | Gold |
|---|---|---|---|---|
| Hollowroot / Asterfall | Rootbound Harvester / Woodcutting | 8–16 Ironwood Logs | 1–3 Crownwood Logs | 500–900 |
| Solbrand / Sunscar | Sunforged Prospector / Mining | 8–14 Sunstone Ore | 1–2 Blackglass Ore | 700–1,200 |
| Rimewarden / Frostmarch | Rimebound Angler / Fishing | 8–14 Icefin | 1–2 Bellfin Scales | 900–1,500 |

Each attempt also separately has a draft **35% chance to grant 2–4 Companion Essence**. Failed, committed attacks grant half-rounded-down Gold/primary materials, still may roll the 20% secondary material and 35% Essence, but do **not** grant an extra RNG chest. These values are first-pass economy hypotheses. The existing World Sigil ledger remains unchanged.

## Each chest opens one individually rolled exact equipment instance

**Main/base stat: only +Gathering Speed for that boss's one skill.** No Attack, Armor, HP, Haste, combat class affix, CP, or cross-profession effect; no flat gathering XP is provided merely by wearing a single piece.

The gear instance must persist exact `itemId, slot, setId, bossId/skill, rarity, quality, gatheringSpeedBasisPoints, bonusStats[], rollVersion=65, chest receipt source, instanceId`. No reroll on reopen/retry; any copied/tampered client roll must be ignored. Distinct physical copies of the same item may carry different rarity/quality/affixes and should be compared by their actual instance receipts.

- **Rarity:** six-grade standard Veldryn Forge-style ladder, sampled once per chest and not fixed to Epic. Common 89.1%, Uncommon 7%, Rare 3%, Epic 0.6%, Legendary 0.2%, Mythic 0.1%. Reference shared source `crafted-gear-rarity.ts`; release must cross-check against then-current Equipment 2.0 rarity authority rather than silently forking it.
- **Quality:** Q0–Q100 following the existing crafted `u^1.25` quality distribution. The base-speed stat multiplies by the existing Q formula **0.75 + 0.005×Q**, so Q0 is −25%, Q50 neutral, Q100 +25%. Quality is not secretly applied twice to affixes.
- **Base Gathering Speed:** **+0.80% at Common/Q50** (80 basis points) before rarity/quality scaling. Existing rarity stat multipliers: Common 1×, Uncommon 1.12×, Rare 1.28×, Epic 1.5×, Legendary 1.8×, Mythic 2×. Result is rounded to integer basis points; Mythic/Q100 = **+2.00% speed per piece**.
- **Bonus stats:** only **Gathering XP**, **Additional Yield**, **Rare Material Find**. Exactly one for Common/Uncommon/Rare, **two unique** rolled bonus types for Epic/Legendary/Mythic. There is NO random speed affix: speed is already the piece's single base stat.
- Bonus roll base ranges before rarity affix scaling: Gathering XP **+0.8–2.2%**; Additional Yield **+0.4–1.3%**; Rare Material Find **+2.0–5.5% relative**. Affix rarity multipliers match the current early-release gear table: Common .85×, Uncommon 1×, Rare 1.20×, Epic 1.35×, Legendary 1.45×, Mythic 1.50×. Quality does not affect the bonus stats.

**Rare Find math:** a base 1.00% rare resource probability with +10% *relative* chance becomes 1.10%, **not 11%**. Yield and XP use their own percent semantics; any extra yield per action must be rounded and conserved through authoritative gathering save updates.

### Existing set thresholds (still draft, separate from rolled item stats)

| Worn set pieces | Additional set bonus (own skill only) |
|---|---|
| 2 | +3% Gathering XP |
| 4 | +4% Resource Yield |
| 6 | +10% relative rare-material chance |
| 8 | −4% action duration |
| 10 | +5% Gathering XP, +3% Resource Yield |

A full 10-piece set adds **+8% XP, +7% Yield, +10% relative Rare Find, −4% time** on top of the *individually rolled* Gathering Speed primary stats and bonus affixes. Previous static +0.5% XP **per piece is retired**; every individual piece's base stat is now Gathering Speed.

Balance and source cap rules: gathering speed from rolled pieces must combine **multiplicatively with** the independent equipped gathering tool time reduction, without becoming negative or producing zero-duration actions; rare chance has a server-side global cap and must always remain a valid probability. Reconcile the 8pc speed threshold, tools and future 2.0 equipment speed sources before release. No duplicate equipped-slot count, off-skill benefit or bonuses from merely owned-but-unequipped gear.

## Hidden pure functions and tests

- `backend/online/world-boss-gathering-loot-v64.ts`: thematic sets; per-attack material, Essence and Gold plan (**no chest**); private-proof milestone eligibility; uniform random piece, six-rarity + Q0–Q100 quality + gathering-only affix roll preview; read-model validation; exact set thresholds and rolled stat inspection.
- `apps/mobile/tests/world-boss-gathering-loot-v64.ts`: each of 3 sets has exactly 10 unique item slots, exact 3 milestone receipt sources, partial/complete goal edges, no extra chest from a fourth character or repeated claim, rarity boundaries, quality extremes, unique gathering affixes, zero combat bonus, invalid/forged payload rejection, cross-skill isolation. Typechecked and executed from hidden World Boss CI (actual run success to be verified).
- No direct-piece World Sigil shop purchase is included. The three chest opportunities remain the only proposed gathering gear sources in this pass. Duplicates remain possible and meaningful because rarity, quality and affixes differ per copy.

## Remaining before real release

1. Authenticate authoritative V27 contribution and global War Camp track tier receipts plus V26/V28 replay-proven account attempts; evaluate global V18 HP from DB at a consistent server time. Never accept evidence from the app. Resolve at most one event globally each cycle (V50), no boss ID from client.
2. Add transactional `world_boss_gathering_chest_sources` unique event/account/boss/source, unopened chest inventory and a **one-time** chest-opening transaction that creates exact owned per-instance equipment. User can open after event close. Preserve durable receipt + exact contents on retry, with no partial grants or double-rolls.
3. Wire item identities to Equipment 2.0 source, class weapon/offhand role safety, quality/rarity type authority, 10-slot set tally, equipment/bank custody, Market restrictions, inventory protection, no bonus from unverified/expired/wrong-account receipts. Never treat a temporary item ID, rarity label or frontend stat total as proof of ownership.
4. Wire real gathering action speed, XP, yield, rare-find modifiers server-side; cross-skill isolation, queue/AFK pacing, tool multipliers, rate ceilings, never faster than server min duration.
5. Build World Boss **Rewards** tab with three progress rows and chest icons; open and gear inspect panels with quality meter, rarity border, base Gathering Speed, skill-only bonus affixes, 2/4/6/8/10 set context. Keep buttons disabled until secure transaction routes and launch gates pass.
6. Test crash/concurrent claims, duplicate retries, late global threshold, refund/cancel, losing all 3 attacks, cross-event rotation, 3-character account proof, equipment equipped before and after bank moves, 320dp Android UI/TalkBack, rarity economy and 2.0 stat parity. Preserve V57 and V61–V63 stop-control gates.

**Not completed by this draft:** production/staging migrations, real milestone receipts, server-derived battle reward grants, real random chest inventory, equipped stat authority, artwork, live chest-opening UI, approved shop or final device/CI gate. No production release.
