# Tank protection AI — hidden 2.0 review

Continuation of support PR #1735. V2 player tanks only, instant authored actions.
Dangerous visible interruptible boss casts within existing 1.5-second forecast
window outrank critical self-heal, critical shield/ward, then preventive
shield/ward. Coverage count and existing authored priority resolve ties.
Interception is existing cast interruption, not damage transfer. Boss target
rules, damage coefficients, cooldowns, resources and ordinary legacy
rotation unchanged. No new mitigation effect or taunt/aggro semantics.
Existing shields reduce nominal forecast pressure; existing negative
damage-taken modifiers prevent additional emergency ward promotion.
Only actual same-target effects count for protection coverage; explicit
different-target effects preserve their original targeting. No ability
preemption; no unknown/random/periodic damage prediction. Review-only
self_below_50 or ally_below_80_or_targeted conditions may be overridden for
eligible protective shields/wards, never for preemptive self-healing.
Three compiled tank regression fixtures added; full CI and regional matrix
unverified. No main merge, UI, production flags, database or deployment.
