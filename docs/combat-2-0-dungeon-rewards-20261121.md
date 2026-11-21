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
| Boon | Bloodthirst (bleed on original crit) | Pending engine hook |
| Boon | Last Stand (health-threshold defense window) | Pending engine hook |
| Boon | Crippling Blows (limited armor debuff) | Pending engine hook |
| Boon | Wardweave (ally shield synergy) | Pending engine hook |
| Boon | Burst Window (class-skill synergy) | Pending engine hook |
| Artifact | Ashen Sigil (attack + crit) | Stat preview |
| Artifact | Dawn Reliquary (support heal + defense) | Stat preview |
| Artifact | Thornbound Aegis (bounded reflection) | Pending shared-reflect hook |
| Artifact | Temporal Echo (single secondary effect) | Pending engine hook |
| Artifact | Soul Lantern (other-ally secondary heal) | Pending engine hook |
| Artifact | Glacial Crown (limited slow) | Pending boss-safe hook |

Preserve the current distinction: Shrine/Forge/Echo award a three-card boon
draft; Treasure/Secret award a three-card artifact draft; Camps heal, Events
award supplies, and retired Merchant never quietly grants extra boons.
One room means at most one server-recorded selection.

Three deterministic server-secret offers are computed only from a persisted
run snapshot and remain identical on retries; choices over stack caps and
unsupported proc candidates are excluded. **No privileged transaction
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

The dedicated validation suite executes a **6 regional boss identity x 9
class/role label** matrix with two equivalent seeded previews per case
(108 simulated encounters). Also tests deterministic choices, generated
source/room proof, duplicate and stack rejection, empty/fake authority,
unsupported procs, role specificity, conditional boss-only bonuses and
unchanged legacy combat. This is not an approval of the real six boss kits,
their tuning, or current account combat balance: tests use synthetic enemy
stats and no fully authored skill rotations.

New proc eligibility **must** eventually be driven by original,
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
Then implement and test the nine pending proc handlers in the actual engine,
full 4-character Live authority / voting, seeded matrix with real skills,
rarities/quality and T1–T4 gear, and UI screenshot/design acceptance.

## Validation

PR CI:
- strict backend TypeScript build;
- hidden catalog, three-choice draft and 108 seeded synthetic encounters;
- existing exact-copy equipment trait and six-boss scenario tests;
- legacy engine smoke;
- grep hard-fence preventing imports from online/mobile/Edge.

No feature flag is changed, no 1.0.x dungeon reward count is changed, no
server deployment or database schema is touched.
