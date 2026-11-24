# Party action coordination — hidden 2.0 review

Selected V2 pure single-target direct support heals inspect other living
support actors' actual pending casts on the same patient, within 500 ms.
Nominal pending heal uses authored healing power, coefficient, flat,
healing-received and alchemy; excludes reactive, gems, sync, resources and
threshold boosts. If projected HP >=50%, redirect to another uncovered
equally urgent patient; do not redirect off a forecast-danger target.
Never suppress healing for a sole critical patient. A noncritical patient
projected >=80% with no alternate may defer the pure direct heal without
cooldown expenditure. Pure cast completion prefers living injured original
patient unless a different critical patient needs it; old emergency
replacement applies if downed. No reservation on HoT, cleanse, compound
heal or group heal; no hard locks or prediction of cast success.

Pure nonreflecting instant self/group/threatened shields may be skipped
in ordinary rotation only if all resolved targets are noncritical, already
shielded >=20% max HP and not forecast endangered. Existing tactical
pressure/critical promotion remains. V2 interrupt-target actions cannot
select a nonexistent cast, so ordinary selection can fall through to the
next ready skill after another actor cancels the cast. Existing authored
cooldowns, resources, damage, legacy actions and actor order remain.
This is sequential soft coordination, not global simultaneous scheduling.
Focused regression source added; exact-head CI still required.
