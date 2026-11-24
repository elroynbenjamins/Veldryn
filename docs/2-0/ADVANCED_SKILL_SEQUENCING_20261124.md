# Advanced skill sequencing — hidden 2.0 review

Continuation of role AI PR #1735. Only ordinary V2 damage-role decisions
on a single known enemy are eligible; earlier tactical interrupts, executes,
finishing hits, vulnerability setup and active-window bursts take precedence.
If a boss spender is ready below half class resource capacity (rounded up),
prefer a ready instant no-cost damage/DoT action; no new resource triggers,
no hard minimum and no idle wait. If no alternate is available, use original
ability. Hold budget per actor/ability is 1.5 seconds from first diversion;
cleared on actual use. Current offensive/vulnerability or primed capstone
windows and target below 35% preserve ordinary action.

Avoid premature refresh only when every authored DoT/debuff has the same
source and exact ability/tag still active with >1 second remaining (and a
future DoT tick); only if another ready nonmajor, nonredundant direct action
exists. No interference with rupture, lifesteal, execute, interrupts, other
utility, party status sources or multi-target randomness. Does not change
status or resource calculations. Tank/support priorities unchanged.

Focused authored-skill regression sources added for low resource, fallback,
bounded hold, legacy and exact-source DoT refresh. Test-only accelerated
cooldown/instant casts exercise branches, not live tuning. No CI result
claimed; thresholds and encounter balancing outstanding. No deployment.
