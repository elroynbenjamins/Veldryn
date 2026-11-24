# Weekly Guild Hunt shared combat — first review pass (2026-11-24)

Review only. Normal weekly raid, not seasonal bosses or future Guild Expeditions.

## Current baseline
The existing attempt RPC freezes contribution before the 180-second resolution. Weekly role scoring is 65% general / 35% role-weighted stat estimates. The authenticated timeline RPC partitions the frozen totals; these are not real combat events. The current polish draft #1716 uses cosmetic strikes and shared server HP, not real-engine hits. Do not label estimated defence/support as actual blocks/heals.

## Pass A: legacy-compatible shared combat experiment
Three existing names retained. Oathbreaker: interruptible heavy physical attacks and vulnerability; Troll: seismic attacks and shield pressure; Revenant: shadow curse DoT and sustain/cleanse opportunity. Each uses real engine casts, damage, phases, shield/HP and existing class abilities. Fixed synthetic cohort reference per bracket; no attacker-dependent boss scaling. Exact values are candidate balance only. 180-second maximum; death may end simulation earlier, but existing server resolution semantics remain unchanged.

Tests exercise 9 existing class/gear fixture loadouts, three bosses and two seeds. No authenticated player data, real companions, party state, shared HP, contribution formula or rewards in this pass. Metrics are diagnostics, not payouts. Existing UI draft #1716 is independent and should not be merged as part of this change.

## Next passes and stop-ship gates
1. Compare T1–T5 cohorts including companions using saved-loadout compiler; quantify current legacy scoring and caps vs real-engine damage/sustain. Review role fairness and no mandatory class.
2. Bind server-authoritative frozen character/companion/gear snapshots and engine version to attempt nonce; atomic attempt caps and shared HP settlement, clamp actual HP removed to current encounter budget; preserve existing weekly cycle, guild level, attempts, milestones and claim history. Resolve concurrent stale attempts once. Never trust client damage, heal or shield figures.
3. Presentation adapter uses actual engine replay cast/interrupt/heal/shield events; never uses old partitioned cues as real hits. Current review layout and themes need owner approval; reconnect must replay only current events, not recalculate or show stale hits. Preserve reduced motion and localized labels.
4. Hidden 2.0: reuse the shared simulation contract with the approved Equipment/Skills/Combat 2.0 compiler, explicit versioned encounter/receipt identity and migration at a cycle boundary. Keep all 2.0 content hidden until coordinated release. Do not replace the separate Guild Expeditions work (#1625).
5. Full CI, staging rollback/replay/races, role/economy balance, Android QA and explicit release review. No new routes, migrations, deployment, flags or settlement on this branch.

## Pass B: tier progression, companion effects and legacy cap diagnostics
- 1,080 matched-seed cohort fights: five requested equipment tiers, nine classes, three bosses, two seeds and four companion states (none / Ironwood Hound / Runebound Sentry / Silverbrook Sprite). Actual weapon catalog tier is printed; a requested fixture tier is not proof of full exact-tier gear.
- 135 additional no-companion fights against the same fixed T2 reference to separate power progression from cohort normalization.
- Use existing verified co-op loadout adapter and the canonical character-assist path, not an extra independently targetable companion. Report directly attributed damage/heal/shield-grant events; do not equate shield granted to absorbed, or claim all indirect companion effects.
- Source-aligned legacy scoring diagnostic mirrors the authored 65/35 role focus and 11/28% caps, roll 1.0, no guild bonuses, synthetic HP budget and fixture effective stats as a proxy for DB base_stats. Score and real-engine HP damage are distinct units; no payout conversion or balancing approval.
- First-pass dedicated CI #45357230631 passed; broad Dungeon Mechanics failed. New-head CI required; no rollout.

## Pass C: measured balance response and bounded score candidate
Verified pass B CI run 45359611242 (1,215 fights, all 45 class/tier weapon IDs matched). T2 bare means Oathbreaker tank/damage/support HP 25,789/15,502/22,986; Troll 3,333/11,682/481; Revenant 24,652/19,103/22,855. T2 damage class mean duration 38.8/61.5/49.4s; tank and support means 180s. Fixed T2 reference is cleared by all T4/T5 no-companion fixtures; no global scaling approval.
Candidate tuning: boss attack power x0.70 across all three; Troll shield 3.0 -> 0.9 reference attack, cooldown 14.5 -> 22s. Baseline remains available to reproduce old numbers. 1,080 matched baseline/candidate pairs log HP loss, duration, wipes and candidate utility; latest CI must be inspected before claiming improvement.
Score review: actual HP loss plus bounded shield pressure; measured effective healing, absorbed player shield, interrupts and cleanses weighted and capped by fixed cohort attack and offensive work. No points for idling, class labels or overheal; no support points added to HP. Utility capped at 50% offensive work (at most one third of total score). Separate HP-credit preview clamps to real HP damage, shared remaining HP, 11% attempt and 28% personal budget, without claiming authoritative settlement. This does not yet establish final fairness, reward currency or caps approval. No persisted/externally supplied metrics, live routes, UI, database or production changes.
