# V2 emergency support targeting (review only)

Stacked on critical-support #1735. Candidate triage boundary: strictly below
30% HP, independently of skill-specific bonus thresholds. Only player support
actors with V2 runtime and selected class abilities participate. Ready and
condition-eligible direct heals outrank ready shields, which outrank normal
priority; authored order resolves ties within a rank. Routine HoTs, buffs,
damage, non-support actors and legacy combat retain their original priority
when no emergency candidate is available. No cooldown bypass or interrupted
cast preemption. Shields already present disqualify an emergency shield
candidate; ordinary shielding is unchanged. Threatened-ally protection
prefers a threatened critical eligible target, otherwise the lowest eligible
HP; without an eligible critical ally original threatened-target rules remain.
Cleanse continues to prefer afflicted allies and only gets emergency priority
if its actual heal target is critical. Equal critical HP uses actor ID for
single-target triage. An already-started support cast whose target dies can
complete only when an eligible emergency replacement exists, with original
cooldown and resource handling. No new player UI, production flags or routes.
Focused authored-skill regression added to existing CI; full matrix and
exact-head results are required. Numerical and strategic policy is provisional.
