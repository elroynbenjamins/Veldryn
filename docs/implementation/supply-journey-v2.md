# Supply Journey 2.0 — implementation contract

## Gameplay and UX

The **Supply Journey** replaces the old Daily Supplies panel with a 28-claim account-wide track. Four chapter selectors show seven reward days each. Players can inspect past/future rewards, collect the current UTC-day reward, and open the **Boost Vault** to inspect and activate stored charges. Missing days pause progression; they do not reset or consume claims. All actions continue through the validated `daily_supplies_claim` and `daily_supplies_activate` game-command flow.

Regular rewards rotate five types, one 2-hour **+10%** charge per claim:
- Gathering Speed (mining, fishing, woodcutting, herbalism)
- Crafting Speed (timed alchemy and processing)
- Skill XP (qualifying noncombat skill activities)
- Combat XP (ordinary hunt XP)
- Combat Speed (ordinary idle-hunt encounter speed, not dungeons, bosses or PvP)

The milestones on **days 7, 14, 21 and 28** now grant **player-selected Supply Blessings** instead of premium currency:

| Day | Bonus | Activity time |
| --- | --- | --- |
| 7 | +20% | 2 hours |
| 14 | +20% | 3 hours |
| 21 | +25% | 3 hours |
| 28 | +25% | 4 hours |

The player must select one of the same five buff categories before claiming a milestone. Future regular rewards continue rotation between 28-day cycles to reduce overrepresentation. Each reward is stored independently; no timed reward requires immediate use.

## Bonus stacking and timer settlement

The best active Supply tier per **category** applies. If a player activates a stronger tier of the same category, the weaker tier is paused, with its remaining activity seconds preserved. Activating another lower-tier charge queues it. When the stronger tier expires, the best queued tier automatically resumes, including within long offline settlements. Categories remain independent and can run simultaneously.

Bonuses from events, candy, pets and permanent sources remain separate and follow their own stacking rules. Supply Speed enters the existing activity/encounter cadence as an extra multiplier; Supply XP is awarded after the base reward is derived, without directly changing drops, gold, rarity or combat damage. The Supply system never extends the Offline Reserve cap. Only real qualifying activity seconds reduce charges; ordinary UI time does not.

For timed alchemy and processing, accelerated work time is converted back to **actual wall-clock completion timestamps** before event or seasonal reward processing. Pure menu/instant crafting operations have no time-based Crafting Speed benefit. Equipment Forge jobs are deliberately not accelerated by this change: their multi-slot scheduled reservation model needs a separate atomic per-job entitlement/timer contract before introducing discounts, especially when jobs are queued, cancelled, or completed offline.

## Save compatibility

The canonical Supply v2 ledger lives under `account.dailySupplies`, including the bank, current active boosts and queued/paused boosts. Previous v1 account claim counts and last UTC claim day remain intact. Existing character-bound boost charges and timers migrate into the shared bank once, across the complete character roster, and legacy item-output/yield types convert to the corresponding new speed types. The migration clears old character mirrors and is idempotent on subsequent save normalization.

This is a **client/offline-game implementation** on a feature branch. Cross-device concurrent claiming, server-authoritative account write guarantees, Android device layout, and release-version rollout remain release gates. Do not deploy this as verified production behavior solely because the local command route exists.

## QA checklist

- Complete two 28-claim cycles, including missed days and all milestone choices.
- Confirm no premium-currency balances change on new milestone claims.
- Migrate v1 saves with multiple characters, banked charges and partial active timers; reload twice without duplication.
- Verify strongest-of-type, weakest paused, timer expiry, and resumed queued charges over 1–8 hours of offline progress.
- Verify parallel Gathering Speed + Skill XP, Combat Speed + Combat XP and independent candy/event bonuses.
- Verify long alchemy/processing sessions use correct real completion times and capped rewards.
- Verify duplicate UTC claim rejection and invalid character/type/choice rejection.
- Check 320px device layouts, RTL/long translations where available, large fonts, accessibility labels, light/ember/obsidian themes and reduced motion.
- Run mobile TypeScript, all mobile core tests, online integrity checks and stage cross-character save reconciliation.
