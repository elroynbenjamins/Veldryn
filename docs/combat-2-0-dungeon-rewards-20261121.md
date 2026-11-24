# Veldryn 2.0: hidden dungeon rewards + Combat 2.0 integration QA

**Status: PRIVATE WIP / NO MERGE TO MAIN / NO DEPLOY / NO 1.0.11 ACTIVATION.**
Child of draft Combat 2.0 equipment trait custody / six regional boss matrix.
No production or staging data writes, no migration, no public app asset or UI change.
UI/theme redesigns still require separate visual review and approval.

## Pass 1: Catalog and room-choice structure

The published Endurance catalog on main defines 9 active boons (+1 retired
legacy Supply boon) and 8 relic/artifact types. The old generic 126 launch
boon IDs are *not* 126 distinct implemented dungeon combat buffs.

Proposed **Dungeon 2.0: 16 boons, 14 artifacts, 30 total**. Keep all 17
existing active IDs (including their known 1.0.x identities). Add:

| Type | New candidate | Implementation stage |
|---|---|---|
| Boon | Vanguard Step (small defense + haste) | Stat preview |
| Boon | Battle Trance (small attack + crit) | Stat preview |
| Boon | Bloodthirst (bleed on original crit) | Hidden solo engine hook (Pass 4) |
| Boon | Last Stand (health-threshold defense window) | Hidden solo engine hook (Pass 4) |
| Boon | Crippling Blows (limited armor debuff) | Hidden solo engine hook (Pass 4) |
| Boon | Wardweave (ally shield synergy) | Hidden four-player shield hook (Pass 5) |
| Boon | Burst Window (class-skill synergy) | Hidden solo engine hook (Pass 4) |
| Artifact | Ashen Sigil (attack + crit) | Stat preview |
| Artifact | Dawn Reliquary (support heal + defense) | Stat preview |
| Artifact | Thornbound Aegis (bounded reflection) | Hidden shared-cap reflection (Pass 5) |
| Artifact | Temporal Echo (single secondary effect) | Hidden solo engine hook (Pass 4) |
| Artifact | Soul Lantern (other-ally secondary heal) | Hidden four-player heal hook (Pass 5) |
| Artifact | Glacial Crown (limited slow) | Hidden solo engine hook (Pass 4) |

Preserve the current distinction: Shrine/Forge/Echo award a three-card boon
draft; Treasure/Secret award a three-card artifact draft; Camps heal, Events
award supplies, and retired Merchant never quietly grants extra boons.
One room means at most one server-recorded selection.

Three deterministic server-secret offers are computed only from a persisted
run snapshot and remain identical on retries. Drafts favor different playstyles
and hide role-irrelevant artifacts; choices over stack caps and unsupported proc
candidates are excluded. **No privileged transaction
persists the candidate yet.** No mobile UI wired. This is review-only.

## Pass 2: Refine and polish

- Validate unique node receipts, strict increasing depths, type-specific room
  eligibility, character/seed/revision binding and bounded stacks (boon 1-3,
  artifact <=2), with a mandatory ledger verification callback.
- Rejected room grants and unsupported/missing engine hooks fail closed.
- Existing stats use explicit percentage fractions/percentage points. Never
  silently clamp an excessive combination of attack/defense/healing/haste/crit.
- Preserve role-specific Guardian's Pact and Oathbound Crest, boss-only Ward
  and elite-only Hunter bonus. Enemy-kind preview works on homogeneous enemy
  groups; mixed encounters require future per-target damage hooks.
- Keep old Second Wind and Supplies Cache **room-only** rather than accidentally
  turning them into combat stats.
- Code is entirely in hidden server v2 files, without production caller.

The stat adapter intentionally uses a *synthetic QA-only* Combat 2.0 actor.
It does not yet accept the new persisted full Equipment+Skill+Enemy snapshots.
A caller-provided test verifier is **not** evidence of real DB authority.

## Pass 3: Next Combat 2.0 pass — seeded encounter compatibility

The first validation suite executes a **6 regional boss identity x all 9
canonical class/role IDs** matrix with two equivalent seeded previews per case
(108 synthetic encounters). It tests deterministic choices, generated
source/room proof, duplicate and stack rejection, empty/fake authority,
unsupported procs, role specificity, boss-only bonuses and legacy combat.
This is not approval of the real boss kits or balance: these have synthetic
enemy stats and no fully authored skill rotations.

A second, deeper integration now connects the stat reward overlay to the
hidden **unified Equipment + Skills + Enemy/Boss Combat 2.0** path. On 108
existing genuine nine-class / two-specialization / six-boss fixtures,
the actor is first compiled from server-owned Class, Skills, Equipment set
and affix state; reward stats are then attached, and enemy + selected
equipment-trait authority is newly bound to the final combined encounter.
Every outcome is replayed twice to guard against drift; denial of the
persisted-run verifier and unsupported proc rewards fail closed. This remains
test-only: the callbacks are synthetic, not a live dungeon receipt store,
and newer independent Skills 2.0 refinements are not yet integrated.

New proc eligibility is now driven by original for the six signed solo
engine hooks; remaining future proc eligibility **must** also be driven by original,
server-tagged direct events, never by generated gem/equipment/reward/DoT
events. In particular:
- Bleed: one bounded status, ICD, and a per-target limit; no DoT recursion.
- Reflect: Thornbound Aegis must consume the exact same shared rolling
  5-second per-target defensive budget already used by EQ2 Reflect% and
  Thornbound Riposte (including 0.1% regional-boss cap).
- Temporal Echo: a secondary effect, not an extra skill action; no chaining
  into resource, cooldown or proc generators.
- Last Stand: once per combat, actual direct HP loss threshold, capped
  duration, no triggering from self-injury or synthetic/secondary damage.
- Healing/shield: effective amount only, no fully shielded or overheal
  triggering, no secondary-to-secondary recursion.
- Enemy and boss counterplay (interruptible casts, phased mechanics, control
  resistance) must be retained under status boons.

**Next required integration**, not accomplished here: combine the hidden
Skills 2.0 ability parity branch, exactly persisted equipment/skill snapshots,
server-authoritative dungeon run HP/room receipts (including migration),
the new 2.0 enemy kits, trait source precedence and cross-system 5s budgets.
The nine draft proc handlers now have signed engine prototypes (Passes 4–5);
still implement the real privileged party Live authority / room voting and
persistence, seeded matrix with real skills,
rarities/quality and T1–T4 gear, and UI screenshot/design acceptance.

## Pass 4: Real engine reactive hooks (21 November continuation)

Six of nine proposed reactive effects now have a **hidden, source-authorized,
real-engine implementation**:

1. **Bloodthirst:** a critical **original** direct player hit may apply one
   nonstacking three-second Bleed, with a 12-second per-target cooldown,
   capped at a total 0.09% of regional-boss Max HP per application. The
   generated ticks are explicit HP-damage events, not rerolled attacks.
2. **Last Stand:** once per encounter, an actual direct enemy hit that
   crosses from above 30% HP to 1–30% HP grants six seconds of +10%
   defense and healing received. Boss phases, telegraphs and fatal hits
   cannot trigger it.
3. **Crippling Blows:** original direct hit applies a five-second -4%
   Defense modifier (-2.5% for bosses), 18-second per-target cooldown.
4. **Burst Window:** an original direct class skill hit opens a five-second
   +5% damage window, 25-second cooldown. No buff feedback into its trigger.
5. **Temporal Echo:** once per 30 seconds, an original direct class
   ability hit delivers a capped **secondary** amount (4%, or 6% with
   two artifacts), never an additional skill cast. 0.05% regional-boss
   Max HP cap per trigger; no secondary proc or lifesteal.
6. **Glacial Crown:** an original direct hit reduces future enemy haste
   by 4% for four seconds (2% on bosses), 20-second per-target cooldown.
   Existing boss casts are neither delayed nor interrupted.

**Still deliberately blocked:** Wardweave (party/secondary shielding),
Thornbound Aegis (must use the existing EQ2 shared rolling reflection
budget), and Soul Lantern (requires authenticated other-ally heal target).
No proc is advertised by the draft room chooser because there is not
yet an atomic server-owned run grant/persistence implementation.

The engine receives a fourth, independent opaque server-authority token;
it is issued only after matching a validated, source-owned room receipt
snapshot to the exact already compiled Equipment+Skill+Enemy encounter.
None of these effects are obtainable in 1.0.x; no public route issues
this token. All six effects emit explicit replay events, enforce cooldown
and boss limits, and keep generated effects out of attack/crit RNG,
gem triggers, equipment triggers, class resources and additional rewards.

The new tests include source-digest and seed tampering, forged authority,
denied persisted verifier, forbidden live mode, unsupported proc
rejection, original-crit Bleed tick and budget, no repeat-cast Temporal
Echo, defensive Last Stand threshold (direct rule and actual engine),
repeat-seed replay, and old combat identical without a token. The fake
QA ledger callback is **not a working database verifier**.

## Pass 5: Four-player support and shared reflected-damage cap

The last three candidate mechanics now have **hidden runtime implementations**,
separately gated by server-issued solo or four-member party encounter tokens.
They are NOT accessible through current dungeon, party, Live, Q-Mode, mobile
or Edge routes; there is no production DB ledger verifier.

- **Wardweave:** an effective ORIGINAL, authored class shield (not a gem,
  trait, passive or generated shield) sends a second shield to the lowest
  effective-HP eligible third party member, never to the source or original
  recipient. Up to 12% of the effective original shield, additionally
  capped at 2% recipient maximum HP and 10% total preexisting shield
  occupancy; 20-second per-caster cooldown. The copy does not generate
  resources, capstones, extra shield-reflect instances, gem actions or
  further Wardweave effects.
- **Soul Lantern:** an effective ORIGINAL direct class heal applied to
  ANOTHER player may send one bounded third-party heal to the lowest-HP
  eligible OTHER party member. One artifact: 10% of original effective heal;
  two: 15%; in either case <=1.5% of the third character's max HP and
  never overheal; 24-second per-caster cooldown. No self-heal, HoT,
  lifesteal, gem, trait or secondary-healing loop.
- **Thornbound Aegis:** original avoidable enemy direct HP loss allows
  8%/12% reflected loss at one/two relics, capped by 1.5% defender Max HP
  and 15-second cooldown. Boss phase abilities and boss skill casts do
  NOT generate a reflection (boss basics only). The same per-encounter,
  attacker-specific five-second allocator is now shared by Equipment 2.0
  Reflect% and Thornbound Riposte. Every source together has a maximum
  0.1% regional-boss Max HP reflected per rolling five seconds, or
  0.2% for other enemies. Per-encounter history never leaks to another fight.

Party authority is explicitly **four players**, with unique and ordered
actor IDs, canonical persisted node order, per-character grants and
owned account/character identities. The strict validator requires a
privileged persisted digest callback with matching run/seed/revision,
denies duplicates, missing members, wrong rooms, stale initial HP,
foreign grants, legacy inputs and unknown rewards. **This validation
contract is not a working production persistence implementation**:
current tests deliberately supply a synthetic callback and fictitious
account/item IDs.

The dedicated real-engine test runs four synthetic V2 characters with
class shield, class heal and an AoE boss to test actual ability hooks,
deterministic replay and nonrecursive secondary effects. It also binds
four QA Equipment 2.0 sources to prove relic and gear reflection share a
single 5-second boss budget, including ownership/seed/digest tampering
cases. Exactly-authored nine-class skills, real persisted dungeon state
and regional boss kits still need dedicated integration testing.

**No new reactive reward is offered by the public/hidden 3-choice
preview**, even though all nine engine hooks exist. The offer/grant route
must be implemented transactionally and approved before enabling any
of these mechanics for users. Party-wide room rewards versus individual
grants also require explicit design approval before persistence semantics
are finalized.

## Validation

PR CI:
- strict backend TypeScript build;
- hidden catalog, three-choice draft and 108 seeded synthetic encounters;
- 108 genuine hidden full-equipment/skills/six-boss reward integration cases;
- existing exact-copy equipment trait and six-boss scenario tests;
- signed four-player party reward grant and real engine triad integration;
- cross-equipment five-second reflection budget adversarial tests;
- legacy engine smoke;
- grep hard-fence preventing imports from online/mobile/Edge.

No feature flag is changed, no 1.0.x dungeon reward count is changed, no
server deployment or database schema is touched.
