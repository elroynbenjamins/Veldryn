# Critical support thresholds — hidden 2.0 review

Parent: shared encounter assembly #1729, pinned ae735f650b9b03a8eda376f4a04e9a122f652deb. No release activation.

Existing Mercy (Dawn Mend: below 35%, +25%) and Spring (River Stone:
below 40%, +25%) retain authored values. Grim Resolve retains its self-heal.
New candidate Sanctuary (Solar Hymn): each living recipient below 30% HP
gets +20% direct healing. Wide Roots (Seismic Shelter): each living recipient
below 30% gets +25% shield strength. Exactly 30% does not qualify.
No new casts, resources, passives, resurrection or periodic triggers.
Threshold modifier is bounded to +40% per authored effect; existing ordinary
skill cooldown, healing received, resource and Synchronization rules remain.
Shield increase uses the existing shield pipeline, not a second shield proc;
existing total shield stacking policy is unchanged. Not a global shield cap.
These are candidate coefficients; full role/boss matrix and CI required before
release. The existing shared legacy/V2 engine file is modified only with V2
source gating for threshold fields (and explicit dead-target shield guard).
No main merge, deployment, public UI or production/staging changes.
