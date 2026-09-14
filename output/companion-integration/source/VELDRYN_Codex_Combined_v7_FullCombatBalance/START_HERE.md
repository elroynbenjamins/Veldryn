# VELDRYN Combined v7 — Full Combat Balance

Final source commit: `a3391847c6e8f9ada080b4001c42778cdea3d700`
Previous Companion Ecosystem v6: `fa21c18b9d06f9d38f6bd06ddcf54077e9a2a798`
Original reduced baseline: `5194c88`

This package adds the first full-game combat balance authority on top of v6.

## Read first
1. `FULL_COMBAT_BALANCE_V1.md`
2. `COMBAT_COMPANION_BALANCE_V1.md`
3. `verification/focused-tests.log`
4. `verification/REPLAY_STATUS.txt`
5. `VELDRYN_Master_Design_Database_v4.6_CombatBalance.xlsx`

## Apply
- If your repository is already at v6, use `v6-to-v7-full-combat-balance.patch`.
- If it still matches the original reduced baseline, use `changes.patch`.
- If the real repository has newer work, do not reset it. Use the patch plus `files/` as merge references and preserve newer semantic changes.

## Important scope
Executable retuning is concentrated on the systems proven out-of-band in the recovered source: Combat Companions, Companion-only combat, Companion Trials, repeat/passive Companion economy and Bond-XP consistency. Whole-game boss/elite/co-op/PvP/guild/raid/gear targets are captured as balance guardrails and must be validated against the complete current repository before changing healthy runtime values.

The old 18–30 active-equivalent-hour Level-25 vertical-slice target is superseded. See the full balance report for the current productive-combat and calendar pacing targets.
