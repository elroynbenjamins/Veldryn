# Predictive support AI — hidden 2.0 review

Continuation of #1735 emergency triage. On ready support-class V2 actions,
visible active boss wind-ups within 1.5 seconds can promote instant authored
shields after emergency direct-heal/shield selection. Only confirmed current
target or all-player direct damage is estimated; random or unknown targets,
DoTs, nonboss casts, instant unseen attacks and already-resolved casts are
excluded. Nominal noncritical attack/defense/modifier estimate minus existing
shield, no future RNG, no exact forecast. Promote if uncovered projected
damage is >=20% max HP or would cross below 30% from at least 30%. Prefer
shield coverage across more endangered allies; ordinary authored priority
breaks ties. Partial existing shields reduce forecast pressure; no artificial
shield cap or new effect. This estimate omits crits, misses, gem/reactive,
synchronization, Ward and other advanced modifiers, so needs calibration.

Emergency heal remains highest priority. When exactly one living ally is
below 50% and critical, an available single-target direct heal can preserve
a group heal if nominal recovery reaches 45% max HP and is no slower than
the group cast. No guaranteed heal amount, no cooldown bypass or resource
change. Candidate design thresholds; not live-approved. Regression source
added to existing skills CI. No live routes, flags, deploy, UI or database.
