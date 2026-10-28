# Companion stage-specific picks — October 28, 2026

Implemented on the unmerged full-screen combat theater feature branch and PR #620.

## Player intent

Distinct companions and complementary lineups should matter depending on the **current stage** rather than only by total Team Power, without making lower-rarity units obsolete or requiring an impossible affinity to progress. This applies to *combat Companion Trials*; separate Sanctuary Expeditions already have mission-specific requirements and grade/bonus rewards.

## Actual combat changes (server-authoritative Companion Trials)

Existing Trial roles remain exactly one Tank, one Damage and one Support. Existing rarity progression, skill identity, monthly modifiers, rewards, cooldowns, checkpoints, replay events, and challenge restrictions are not replaced.

A single shared catalogue in `backend/src/shared/companion-trial-stage-matchups.ts` defines the six five-floor bands:

| Floors | Stage | Favored offense | Favored protection |
| --- | --- | --- | --- |
| 1–5 | Asterfall | Wild | Construct |
| 6–10 | Sunscar | Primal | Arcane |
| 11–15 | Frostmarch | Arcane | Radiant |
| 16–20 | Ashlands | Construct | Primal |
| 21–25 | Rift | Umbral | Construct |
| 26–30 | Apex | Radiant | Umbral |

For each selected companion, if its affinity is the stage's offensive one: **+6.5% attack power**. If its affinity is protective: **+6% HP, defense, and healing power**. If at least one of each favored affinity is in the formation, all three receive **+2 percentage points of Haste** (capped by existing combat Haste bounds). All effects apply only to the server's battle snapshot; no player account data is mutated and enemy stats, drop tables, essence and rewards are unchanged.

The bonuses are deliberate opportunities, not mandatory requirements. Roles, levels, rarities, Bond, Ascension, techniques and original companion abilities remain the main factors. A strong off-affinity pick can beat a much weaker matching one.

## Player-facing UI

In the Trials tab and boss preview, show the stage threat, preferred offensive/protective affinities, their reasons and current pair-active status before the fight. The team chooser marks matching units. A stage-fit team suggestion searches owned, available Tank/Damage/Support combinations and maximizes estimated performance rather than just matching affinities. The original monthly-challenge suggestion remains separate and is never silently replaced.

In *Sanctuary Expeditions*, selected formation now displays **projected grade** and **mission bonus active / inactive** outside the long Mission Details view. It uses the existing authoritative mission requirements and grade prediction; it does **not** introduce new Expedition reward modifiers. This makes existing differences between companion combinations visible immediately.

## Verification

- `backend/src/server/companions/__tests__/phase2-trials-monthly.ts` verifies matchups for six regions, bounded strength, server simulator integration, and unchanged original role validation.
- `apps/mobile/tests/companion-stage-picks.cjs` protects the UI, stage-fit suggestions and Sanctuary mission bonus/grade messaging; wired into `test:companions`.
- English, German, Spanish, Dutch, Italian, French localizations include new stage and expedition guidance.

## Release caveats / follow-up

PR #620 remains unmerged. Existing unrelated Guild/chat and starter-companion TypeScript failures in the baseline must be resolved separately before production release; run current CI and Android trials across all six stage bands.

Guild PvE is still a **one-equipped-companion**, three-minute attempt, and its existing assist damage formula uses character damage and companion investment rather than the full companion stats/abilities. This change does not silently retune Guild PvE balance or milestones. A distinct server-balancing pass would be needed for boss-specific companion skills and defenses in Guild PvE; do not conflate Sanctuary mission and Trial simulation with Raid damage.
