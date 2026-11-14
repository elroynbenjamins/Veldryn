# World Boss V14 — five-bracket audit and Echo matching regression

**November 13, 2026 — hidden, review-only. Nothing live or deployed.**

## Reason for this pass

V13 froze synthetic four-equipment-tier threat profiles. That is **not** the
five-player-Combat-Power-bracket release policy. Region changes and equipment
scaling can change a player's effective power, and no authentic owner-bound
population cohort has been approved yet. Setting launch bounds based only on
T1–T4 fixture numbers would silently produce unfair player matchmaking.

V14 adds `backend/src/server/combat/world-boss-bracket-audit-v14.ts` to examine
a **caller-supplied offline export of server-owned account-level CP data**.
The module itself does not read a DB, validate a JWT or accept any client API.
A production integration must authenticate the account state and prove each
entry is trustworthy before using it. No export is provided or read by this PR.

## Audit rules

- 100–20,000 individual eligible account samples, **one per owner**.
- Combat Power must be finite, positive, and within the 100,000,000 review ceiling.
- Each sample must be from the last 7 days, with no future timestamp.
- Sort by server-calculated CP and seek 20/40/60/80 percent splits.
- Do not split two equal-CP players between brackets. If CP ties make distinct
  bands infeasible, fail closed instead of guessing or introducing fake spread.
- Every proposed group holds at least 10% of sampled accounts. Report five
  cohort sizes, CP ranges and Tank/Damage/Support counts **without account IDs**.
- Missing roles are warnings; the report remains explicitly `approved: false`
  even when all coverage checks pass.
- The proposed policy version is event/time-specific. It does not change the
  live matchmaking thresholds or replace the V13 four-tier encounter profiles.

**The audit result is not a server-authorized profile, a replay commitment, a
combat balance approval, or a player-data source.** Real deployment needs a
signed/versioned server policy and an authenticated durable store.

## Echo fairness regression

The existing V7 allocator already uses a twofold normalization for its legacy
`CombatRng.next` half-range. This is intentional and must remain replay-stable.
New regression coverage checks fair rotation across **eight** equal-priority
eligible Support Echoes (not only two) and verifies input catalog ordering
cannot affect a fixed-seed squad. The selection formula's behavior was
preserved; only explanatory comments and tests were added.

## Verification / non-goals

- New synthetic V14 fixture: five groups of 30, all roles represented, consistent
  with the V12 CP-to-bracket lookup. Exercises stale/future/duplicate/nonfinite
  inputs, insufficient samples, tied-power population and role-gap warnings.
- Focused CI workflow adds the V14 test and the broader V7 Echo regression alongside
  existing V9–V13 suites. CI outcomes must be read from the pull request run.
- **No** Supabase migration/RPC/Edge change, World Sigil wallet, item transaction,
  World Boss activation, UI/shop, live player loadout read, release-flag change,
  or production balance change.

## Next engineering gates

1. Obtain *consented, privacy-restricted, authenticated owner-bound* real CP
   cohort data, covering tank/damage/support classes, relevant regional gear,
   gem/enchantment/Faith/companion combinations and meaningful power spread.
2. Review five proposed CP bounds against both typical and worst-case players,
   low-vs-high/mixed-tier Echo groups, NPC fallback and 14-round battle replay.
3. Decide an explicit server mapping from five CP brackets to **approved**
   boss/phase encounter threat profiles; V13 four synthetic gear bands do not
   establish this mapping.
4. Implement durable PostgreSQL transactions/receipts and idempotent attempts,
   War Camp debit/rollback, event settlement and reward-wallet grants only after
   staging security/economy review. Preserve the three attempts per event and
   hard cap of 100 theoretical World Sigils.

**World Bosses remain hidden and unlaunched after V14.**
