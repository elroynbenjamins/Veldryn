# Chest V80–V81: two-pass readiness for the coordinated 2.0 release

**19 Nov 2026 — HIDDEN DRAFT. No real reward grants, Android activation,
migration, SQL deployment, Supabase writes, main merge or World Boss launch.**

## Pass 1 — durable earned status, not an early/incomplete chest claim

The approved 2.0 release contract covers Equipment, Classes/Skills and
Enemies/Bosses together, but World Boss and Party events need independent
server launch controls. It would be unsafe to drop the 1% World Boss
equipment group, substitute dust, or let a hit roll without a real item
issuer. Instead:

- Review-only private `chest_earned_entitlements_v80` has a unique account
  source record and immutable **frozen authoritative loot table**, proof
  version, 2.0 **tier at time of earning**, and boss identity.
- `recordEarnedChestEntitlementV80` locks the World Boss event and V57
  account-erasure fence *before* the shared V70 account-inventory row,
  uses the **same transaction/client**, validates the authenticated
  source, then inserts and independently reads back the one earned record.
  Party reads are expected from a trusted locked V61 settlement loader.
- Replays return the original record with the same tier and odds, without
  recomputing a new RNG roll. Earning is explicitly **not** claiming:
  no Gold/Essence/Dust/Sigils/Equipment, no Inbox message, no chest
  opening or user action is enabled.
- `backend/tests/chest-earned-entitlement-v80.mjs` runs the actual
  review-only DDL in disposable PGlite, tests unique account evidence,
  unchanged T9 tier on replay, corrupted ownership/unsupported tiers,
  immutable rows, missing grants and the production-off fence.
- Before any actual event launches early, the V80 database and its
  secure backend write must be reviewed, staged, deployed, protected by
  V57 erasure, and linked to old V61 receipts. **This branch has not
  installed any of those elements.** Never represent hidden preview
  rows as guaranteed permanent earnings without this deployment.

## Pass 2 — Equipment 2.0 T1–T5 and late-tier compatibility gate

`inspectEarnedChestReleaseV81` projects the *immutable earned chest* into
a release operator/read-only UI status. The accepted 2.0 first release
centres on **T1–T5**, whereas existing World Boss and Party chest reward
contracts allow **T1–T9**. We do not silently cap T6–T9 down to T5:

- T1–T5 are *potentially* compatible only after the real event-only PE_
  and World gathering-only 10-slot EQ2 manifests are registered, all
  applicable level/quality/rarity/affix effects are authoritative, and
  ownership, copy uniqueness and physical inventory are proven.
- An earned T6–T9 chest must remain `earned_waiting_for_future_tier`
  until the corresponding tier has a validated EQ2 issuer. The exact
  original chance, table version and intended tier persist.
- V81 requires concrete audit evidence for real V70 database migration,
  private auth-checked claim route, V61 duplicate-claim reconciliation,
  V57 privacy, physical reward wallet/inbox writer, event EQ2 templates,
  EQ2 item issuer, PG16 multi-connection checks and Android reconnect QA.
- The output is **always** `claimEnabled=false`, even if a caller
  submits all `true` release facts, because the release flag remains
  false. This guards against incomplete or invented operator readiness.
- The regression matrix checks all three World Boss and all three Party
  chest sources across **T1–T9** (54 cases), original 1% world odds,
  Party legacy odds, no payout/roll and anti-forgery checks.

## Physical writer blockers — no fake substitute

The **installed** `private.reward_inbox_v1` has source kinds
`party/guild/dungeon/gift`, not `chest`. Its current player claim
function would treat an unrecognized chest kind like a gift, which
could double-credit already-opened chest attachments if used without a
new reconciled source-specific claim flow.

The existing production `public.character_wallets` + 
`public.online_game_states` (and `private.reward_inbox_v1`) use
different locking, state-sync and claim ownership rules. The V70
physical port must be implemented against these exact installed
schemas **and tested together**, not against fake `v70_test_*` tables.
`companion_essence`, `gem_dust`, `tempering_dust`, and
`party_sigils` need individually approved canonical writers and
same-transaction physical readback, not fabricated counters or
`character_wallets` insertions masquerading as all rewards.

The full EQ2 physical issuer is likewise not ready: PR #1382 accepts
hidden EQ2_ craft templates (primarily T1–T4) but does not authorize
a PE_ Party Event template or an account-unclaimed World Boss gathering
piece. Never grant those via the legacy
`public.equipment_v24_item_instances` table or copy the T5 stat
budget to unimplemented T6–T9 tiers.

**Release decision:** 1.0.11 can stay separate; Equipment, Skills/Classes,
and Enemies/Bosses 2.0 should share one contract/release. Party Events
and World Bosses may have separate launch switches, but actual chests
must remain unopenable until *all* physical/replay/privacy gates pass.
This is compatible with a first live World Boss battle without a
gameplay rehearsal; PG16 and security regression checks remain required.
