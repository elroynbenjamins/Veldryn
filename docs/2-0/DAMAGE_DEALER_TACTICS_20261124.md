# Damage dealer tactics — hidden 2.0 review

Continuation of #1735, all player damage roles with selected V2 techniques.
Only ready instant current-target damage skills and existing targeted
interrupts are considered. Priority: dangerous visible interruptible boss
cast; nominal inexpensive finish on nonboss below 15% HP; eligible authored
execute; ready vulnerability setup before distinct ready burst; burst
against a boss with current positive damage_taken or source damage/crit
buff; otherwise original rotation. Burst classification uses existing
resource spend all or >=3 metadata, not new spell names. Actual target
selected for tactical action; same-target effects follow it, explicit
different targets preserved. No waiting for unavailable setup or predicted
phases, no RNG reads, no cooldown/resource/damage changes. Nominal finish
estimate omits advanced modifiers and can fail; no guaranteed kill.
Authored Wayfinder tests added; exact-head CI and wider DPS matrices needed.
Candidate policy only, no live deployment, UI or main merge.
