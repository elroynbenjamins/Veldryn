# Veldryn 2.0 — ATK Stat Gems & Legacy Protection

Status: **future 2.0 balance branch / NOT for 1.0.x production**.
This is a full replacement of current Stat Gem balance *when 2.0 is promoted*,
not a live hotfix. Effect Gem behavior, grades, refining/combine odds and
the existing 80–120% socket quality roll are unchanged.

## Combat semantics

- `stat_might` means **Attack**; it multiplies the actual Attack value used
  in combat before class, faith, preparation and account combat multipliers.
- It does **not** multiply `power` as a distinct gem stat. Combat Power may
  increase secondarily because a character now has more real Attack.
- `stat_vitality` = Max HP; `stat_iron` = Armor/Defense; `stat_ward` =
  incoming-damage mitigation stat; percentages and percentage points are
  distinct. The rest retain their existing corresponding stat targets.
- Equipment set and weapon Power bonuses remain **Power** bonuses.
  Do not globally rename Power to Attack.
- Stat gems scale additively with other same-stat gem copies before the
  existing set/character modifier stage. A 10-socket all-Might G5 build
  provides +35% base ATK, or up to +42% with perfect 120% rolls.
  This is a proposed **2.0** balancing budget, not a live 1.0.x guarantee.
- Do not apply the canonical Might multiplier again in boss damage,
  CP projections, or legacy gem processing.

## V2 base grades (values are percentages, except where noted)

| Family | G1 | G2 | G3 | G4 | G5 | Applied stat |
|---|---:|---:|---:|---:|---:|---|
| Might | 1 | 1.5 | 2 | 2.75 | 3.5 | ATK % |
| Vitality | 1.5 | 2 | 2.75 | 3.75 | 5 | Max HP % |
| Iron | 1 | 1.5 | 2 | 2.75 | 3.5 | Armor % |
| Ward | 0.5 | 0.75 | 1 | 1.25 | 1.5 | Ward % |
| Precision | 0.4 | 0.55 | 0.7 | 0.9 | 1.1 | Accuracy pp |
| Keen | 0.25 | 0.35 | 0.45 | 0.6 | 0.8 | Crit Chance pp |
| Savage | 1.5 | 2 | 2.5 | 3.5 | 5 | Crit Damage % |
| Piercing | 0.3 | 0.45 | 0.6 | 0.8 | 1 | Penetration pp |
| Swift | 0.5 | 0.7 | 0.9 | 1.2 | 1.5 | Haste % |
| Potent | 0.7 | 1 | 1.3 | 1.65 | 2 | Potency % |
| Elusive | 0.2 | 0.3 | 0.4 | 0.55 | 0.7 | Evasion pp |
| Resolute | 0.6 | 0.8 | 1 | 1.3 | 1.6 | Tenacity % |

Actual socket strength = base value × saved roll / 100 (80,85,...120).
Existing socketed legacy items keep their original legacy stat identity,
including old +2% Attack and +5% Attack bonus definitions.

## Converted Attack gem protection — optional 2.0 restoration

On 2026-11-20, the legacy exchange transformed:
- `EMBER_SHARD` (+2% ATK) → 3 × `gem:stat_might:g1` (formerly Power);
- `EMBERHEART_GEM` (+5% ATK) → 4 × `gem:stat_might:g3`.

With 2.0 Might, an individual G1 is only +1% Attack. Three G1 spread
across three slots are worth +3% total ATK, but a player who wants one
strong gem for **one** socket should not be forced into a random merge.

Offer an **optional** historical-conversion restoration, never silently
rewrite the player's inventory:

| Source in verified pre-conversion backup | Consume existing converted gems | Restore as |
|---|---|---|
| 1 old Ember Shard | 3 × G1 Might | 1 × G3 Might (+2% ATK base) |
| 1 old Emberheart | 4 × G3 Might | 1 × legacy Emberheart (+5% ATK base) |

- Eligibility is determined ONLY by the original trusted
  `private.legacy_gem_conversion_backup_v1` snapshot, not by a client claim.
- Store cumulative successful restorations in a server-side per-account,
  per-original-item **unique receipt ledger**. Account and state are locked in
  the transaction; consume and grant are atomic; repeat claims grant nothing.
- The pure, tested preview in
  `backend/src/server/equipment/gems/legacy-attack-gem-reconciliation-v2.ts`
  computes eligibility, current convertible quantities and manual-review cases.
- Never consume more than the current available unbound quantities. When gems
  were already socketed, merged, sold or transferred, show **manual review**
  rather than minting extras or deleting equipment.
- The pure preview is deliberately **not** a live RPC/migration. The receipt
  ledger and production transaction are a separate 2.0 rollout gate and need
  validation on staging against real save patterns before activation.
- Old +5% Emberheart stays a supported legacy socket item; do **not**
  downgrade it to a weaker new-grade gem or make it newly farmable.
- The old 1.0.x on-save exchange remains unchanged until the 2.0 migration
  is formally activated; no production SQL is to be executed for this branch.

## Release and QA gates

1. Keep this development branch unmerged into 1.0.x `main`.
2. Run backend `gem-v1.test.ts`; mobile `stat-gem-runtime-v1.ts`,
   `gem-progression-v1.ts`, and equipment/raid combat suites.
3. Verify server/mobile family targets and all 60 grade values match exactly.
4. Check 1, 3 and 10 equipped Might gems at min/base/max rolls, ensuring
   true Attack increases only once and any CP rise is indirect.
5. Verify +2% / +5% already-socketed legacy Attack gems are unaffected.
6. Test 2.0 legacy exchange claims on staging with a transactional receipt
   and conversion backups before enabling a player-facing claim.
7. Review T1–T5 solo and dungeon combat simulations with 10 max-grade gems,
   and later classes/tiers before approving the 2.0 release.
8. Once approved, update release notes and publish a migration/rollout plan.
