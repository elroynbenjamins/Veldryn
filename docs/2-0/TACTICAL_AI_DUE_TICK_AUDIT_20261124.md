# Tactical forecast due-tick correctness audit

Previous exact-head workflow 45424882878 and its seven jobs are queued,
including diagnostics job 138554043533. Local git access fails DNS.
No simulation evidence or numerical balance adjustment.

Source audit found a boundary mismatch: player actors are processed before
enemy actors, but forecast and tactical interrupt filters excluded an
active cast whose completion is exactly the current simulation tick.
While the enemy still owns that cast, a ready player action can respond
before the existing enemy resolution. Include equality in all three
forecast/tank/DPS filters; continue to exclude past or absent casts.
No change to actor order, cooldowns, damage formulas or legacy selection.
Add regression for last-tick shield and interrupt against a synthetic
100ms cast with competing ordinary offensive priority. CI unverified.
