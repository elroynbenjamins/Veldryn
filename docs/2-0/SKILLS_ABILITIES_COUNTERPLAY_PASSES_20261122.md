# Veldryn 2.0 — Skills & Abilities continuation (22 November 2026)

**Status:** Hidden, review-only draft. Parent: canonical private Skills/Combat #1377
(`feature/combat-v2-foundation-contract-20261118`). Never merge into `main`,
deploy, migrate, activate public 2.0 flags, edit players' XP/items, or attach
unapproved UI themes/screens.

## Preserved foundation

- Nine classes / eighteen distinct specializations and capstones; 54 skills /
  162 variants and 81 passive nodes. Two character-local build presets.
- At combat level <10: two active slots; at 10+: three slots and specialization.
  Variants unlock at level 20; two invested signatures from level 30;
  capstone at level 50. Combat talent points at 10/15/20/25/30/35/40/45/50.
- Ironwarden Iron Riposte: authentic reactive ward, surviving-hit response,
  currently provisional 0.32 attack coefficient and once/8s, no recursion.
- Stonecaller Thunder Totem: one encounter-scoped totem, pulses at 2/4/6s,
  refresh not stack, no resource/proc farming; auto-recast haste interaction
  must preserve the third pulse. These values are NOT release-approved.
- Separate class/combat level and independent profession progression. Tier
  thresholds 1/10/22/35/45/55/65/75/90 currently live in the hidden
  profession policy, but a sibling independent-careers review uses
  1/12/24/36/48/60/72/84/96. **Resolve this conflict and preserve existing
  specialist entitlements before any activation.**
- Signed, exact-copy equipment trait source in the hidden integration is
  SOLO-only; do not silently treat party/dungeon/World Boss compatibility as
  implemented.

## Completed hidden diagnostic pass A — paired counterplay integrity

Pure `ability-counterplay-review.ts` groups three strategies by exact
scenario, class, specialization, boss/enemy, and deterministic seed:
`generic`, `targeted` and `alternative`.

- Rejects incomplete or duplicate strategies; unequal character combat
  levels/Combat Power; forged class/spec pairs; invalid HP, damage, healing,
  cast counters or seed; impossible win/wipe HP snapshots.
- Preserves independent metrics: outcomes, enemy HP remaining, player HP,
  damage, damage taken, heals, interrupts, cleanses, mitigation and actual
  counter-mechanic events. No invented all-role weighted damage score.
- Emits **review flags**, not balancing changes: underperforming targeted
  build, unexercised counter, targeted win/alternative wipe risk, universal
  wipes and universal zero damage.
- Result always includes `releaseApproved:false`. Source summaries are
  synthetic inputs, not authenticated battle receipts, and cannot be
  used by gameplay, Economy, Market or XP award code.

## Completed hidden diagnostic pass B — coverage and adversarial QA

- Added 18-specialization three-strategy synthetic fixture coverage.
- Added seed, duplicate, completeness, bad class-spec, level/CP mismatch,
  nonfinite/negative metrics and contradictory HP/outcome rejection tests.
- Deterministic output is checked against reordered input.
- The hidden Combat 2.0 skills CI runs the new QA after TypeScript compile.
  Actual new-branch exact-head CI must pass before considering QA verified.

## Proposed next balance work (NOT implemented or approved)

### Class identity and readable counters

| Class | Signature strength | Example counter-build approach | Nonmandatory fallback |
|---|---|---|---|
| Ironwarden | Guard, Oathwall, Iron Riposte | Block/interrupt with Rune Bash and timed ward | Sustain and mitigation |
| Bastion | Durable team protection | Layered Fortress and precise Shield windows | Lower incoming damage with debuffs |
| Dreadguard | Pressure, self-sustain, control | Binding Chain and Dark Mantle | Heal-through plus armor |
| Wayfinder | Marked-target ranged damage | Hunter Mark, Snare Shot and burst timing | Sustained accuracy and safe kiting |
| Ravager | Guard break / finishers | Sunder Blow before Overpower | Durable steady damage |
| Hexweaver | Long curses / dispel control | Null Script and Curse of Frailty | Ward, safe DoT and sustain |
| Knife Dancer | Speed, evasion, precise strikes | Feintstep timing and Shadow Veil | Reduced-risk multi-hit pressure |
| Dawnkeeper | Heal, cleanse, group sustain | Purifying Light before dangerous cast | Shield-first survival |
| Stonecaller | Nature shields, cleanse, totem | River Stone and timed shelter/totem | Control, healing and defensive uptime |

All approaches are balance **examples**, not new class abilities or
guaranteed counters. Enemy cast tells already established for the six
regional bosses must remain readable, deterministic and include a
class-neutral response whenever interrupt/cleanse is unavailable.

### Suggested balancing fixtures

Start with **18 class/spec identities × six authored regional bosses × three
strategy choices = 324 equal-CP scenario summaries per seed**. Add several
deterministic seeds after fixtures are assembled, then repeat against verified
equipment tiers, companion archetypes, defensive traits and Party/Event
coordination. Do not claim the 324 runs occurred merely because the diagnostic
function exists; only synthetic identity tests are present today.

Collect P50/P90 encounter time, effective class resources per minute, skill
cast count, ability uptime, cleanse/interrupt response windows, target
survival, nonrecursive proc events, counter-build advantage and fallback
viability. Keep role-specific reporting for tanks, damage and support.
No fixed win-rate, DPS ratio, haste cap, cooldown or item stat is approved by
this review file.

### Refine/polish gates

1. **Ability timing and ownership:** ensure one Stonecaller totem produces
   2/4/6s pulses at high haste; recasts refresh source-owned DoTs/HoTs, never
   multiply them; Iron Riposte only counters authentic hits without nested
   counters or gem/event proc loops.
2. **Idle vs Live control:** server-chosen default ability priorities must
   avoid wasting major cleanses/defensives, provide intelligible combat logs,
   and allow Live manual interventions without granting extra casts.
   Counterplay must remain viable for offline Q-Mode without requiring
   perfect timing. No UI changes in this pass.
3. **Build/security/economy:** enforce two presets and actor snapshot
   equivalence; recheck physical item ownership, class/level, skill variants
   and talent budgets when a build is activated; block switching during
   combat, dungeon, World Boss, Party Event, Guild PvE and equipment transfer.
   Atomic CAS and trustworthy storage/activity authority are still release
   gates. Preserve combat-only character level and profession independence.
4. **Mobile acceptance:** only design unmounted compact previews until the
   owner approves actual visual layout and themes. The requested production
   Skills layout change is **card appearance only**; no further Navigator or
   navigation redesign is authorized here.

## Hard release blockers

No release until exact-head CI, authentic server battle receipt provenance,
all six boss/18 spec/real 10-slot equipment and companion balance, durable
multi-worker transactions, economy/market custody, native Android QA,
translations, staging and rollback are verified. New diagnostic code is
test-only and unreferenced by the public service. Do not merge this draft to
main or treat reports as authorization.
