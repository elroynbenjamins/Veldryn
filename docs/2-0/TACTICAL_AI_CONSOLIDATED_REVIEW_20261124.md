# Consolidated role AI review — 2026-11-24

Reconciles draft #1735 with #1729 at 36842b78cc7df9510a7b7e7ea8ea023ed1dcc45f. Preserves parent
Synchronization fractional credit and secondary HoT snapshot corrections.
Adds private positional authored-priority comparator (same V2 skill effects,
gear, boss kits, seeds, resource rules and synchronization; selection policy
only; not a CombatInput field). No public or persisted selector.

Matched diagnostic: 432 solo cases (9 classes x 2 specs x 6 bosses x
2 gear profiles x 2 loadout strategies), signed synthetic equipment trait
receipts and boss-kit authority; 432 party cases (36 strict compositions x
2 spec bands x 6 bosses) with verified synthetic ten-slot gear and party
Synchronization rehearsal. Three executions per case: standard, tactical,
tactical replay. Party cases intentionally do not supply signed persisted
party trait or enemy-kit authority; existing separate persisted-party
rehearsals remain. Captures damage, effective healing, normalized HP,
survivors, interrupts, absorbed, duration, victories and resource gain/spend.
Checks determinism, source immutability, stat/ability parity, finite values,
resource bounds and bounded events. Logs each matched row for calibration.
Synthetic data, 20-second encounter windows, not equal CP or production
balance, no quantitative superiority promise. No coefficients retuned until
real results are available. Existing focused regressions and CI preserved.

Execution pending: connector CI runs queued; local GitHub DNS inaccessible.
No main merge, release activation, deployment, SQL or public UI changes.

Review output includes solo-class and boss-level aggregates, victory and
survivor changes, mean normalized HP deltas, and flagged losses (>15 pp HP
or >15% damage reduction, any victory or survivor loss). These are review
flags, not hard balance approvals: offense can legitimately trade for
survival. Absorbed damage counts only player targets. Identical seeds
permit deterministic paired runs, not identical random draws once tactical
selection changes the action path. The existing synthetic enemy fixture
has a limited pressure budget; real regional danger bands and longer runs
remain required before approval. No coefficients adjusted without results.
