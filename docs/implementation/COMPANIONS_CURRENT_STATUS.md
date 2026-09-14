# Companion integration status

Implemented in the mobile app and shared authoritative game engine on 2026-09-13. Open **Character → Combat Companions**. The supplied v7 archive is design/reference code; the older companion handoff documents in this directory describe that package, not the current app's save schema or deployment status.

## Available implementation

- Separate 24-unit Combat Companion catalog, ownership, same-role equip restrictions, levels, ascensions, cumulative Bond, traits, and technique selection.
- Sanctuary upgrades, capped offline training and essence claims, mastery, dedicated companion materials, collection milestones, favorites, and showcase slots.
- Monthly UTC 30-floor Trials with role-balanced teams, actual deterministic combat, checkpoints, first-clear rewards, and saved active runs.
- Timed assignments, claim-once rewards, weekly Proving Grounds, and special-challenge rules.
- Selected idle companions contribute to normal hunting. Published co-op loadouts freeze companion progression and use a bounded role-specific assist without adding a fifth player or changing equipment stats. Units occupied by Trials or assignments cannot also assist or train.
- Existing quest, gathering, equipment-crafting, hunting, and boss reward paths record relevant progression. Existing completed prerequisites reconcile on save load and game commands.
- Offline saves preserve companion state; online commands use the existing atomic character-state transaction, server time, validated arguments, and retry receipts. No client-provided costs, battle victories, or rewards are accepted.

## Passive pets: user override

Every owned inactive passive pet contributes **25% of its configured perk**. The selected owned pet contributes **100%**, replacing its inactive share. Ownership lists are deduplicated; existing multiplier caps remain. For example, a configured +4% perk gives +1% inactive or +4% selected. Pets without a configured numerical perk remain cosmetic. Passive pets do not become Combat Companions.

## Compatibility and content boundaries

### Follow-up companion pass

- Monthly featured Trial challenges now have validated, claim-once rewards. Their claim history survives reloads and resets with the month. The three supplied seasonal themes continue rotating beyond November 2026.
- Trial and special-challenge resolutions impose recovery time equal to the simulated fight duration, with a one-second minimum. The persisted server-checked deadline prevents instant repeat-reward farming; the UI displays the countdown.
- After the first story victory, the Fallen Knight offers one rematch attempt per UTC day. A win grants 40 Essence, one Bondstone, and companion boss/Bond progression; no story Gold, XP, or sigil is repeated. Both wins and losses consume the daily attempt. Older saves retain credit for the first victory.
- Expedition Pens unlock supply purchases: five supplies for 250 Gold. This is an explicit integration balance choice because the supplied missions consumed supplies without a dependable purchase path.
- Bond 2 offers a claim-once 20-Essence progression reward. This amount fills the source design's unspecified small progression reward. Bond Hall now applies once to hunting, Trials, and assignment Bond rewards. Sanctuary training uses the shared maximum-level XP-to-Essence conversion and weekly cap.
- Executioner now changes actual damage below 30% target HP. Reflective Shell returns a share of damage absorbed by its own shield; reflection cannot recurse or outlive that shield. Both effects reach co-op assists, and damage/healing/shield/cooldown techniques affect the assist calculation.
- Collection entries show requirement counts and material sources. Technique requirements correctly show both Ascension II and Bond 7, and switching shows its 2,500-Gold/80-Essence cost.

The existing game save remains version 6 with additive `account.companionSchemaVersion: 1`. The package's version-13 migration and separate companion SQL tables were not substituted for the current authoritative JSON-state persistence.

Class-skill and monster-mastery progression now supply the Gloamknife Shade and Briarhorn Cub unlock paths; see `ZIP_PROGRESSION_STATUS.md`. Some catalog unlocks still require dungeon telemetry or later-region content. Those entries stay locked; their completion flags are not fabricated. The Oathglass challenge can now accumulate ten Fallen Knight clears and earn its Gloamknife Shade prerequisite. Arena and roguelite integrations remain future hooks from the supplied design. The first story encounter's readiness formula is unchanged; rematches include the equipped idle companion's output contribution.

## Verification and delivery

Run `node tools/test-companions.mjs` for 14 backend companion suites, 116 mobile integration checks, and online authority/retry/frozen-loadout checks. Coverage includes actual execute/reflect combat, monthly and Bond claim replay, supply-payment replay, battle recovery, rematch daily limits, and capped training conversion. Additional save, offline gameplay, progression, dashboard, and online-command regressions passed. Full mobile TypeScript and Android Metro export passed. Metro emits a nonfatal `@noble/hashes/crypto.js` exports fallback warning.

The local gameplay/co-op edge bundles were regenerated. Hosted functions were **not deployed**, and physical-device UI testing has not been performed. Online use requires deploying the updated bundles through the project's normal release process.
