# World Boss V61–V62: exactly-once chest claims and Equipment 2.0 issuance bridge

**19 November 2026 — HIDDEN / DRAFT / NO PRODUCTION OR STAGING WRITES.**
Continuation of the V58–V60 World Boss chest branch, not an activation.
Release flag: `WORLD_BOSS_CHEST_GATEWAY_V61_LIVE=false`.
No route, PostgREST claim RPC, deployed migration, game economy write, actual
inventory grant, or mobile claim button is enabled.

## Pass 1: V61 private atomic reward ledger contract

`backend/src/server/combat/world-boss-chest-settlement-v61.ts` defines a
private authenticated claim boundary with only event ID and chest kind
selected by a player. The identity comes from server-verified Auth. Every
claim uses one **database transaction** on the account+event. Inside the lock,
the future adapter must bind canonical V18 HP, V27 committed donations,
V26/V28 immutable replay proofs, existing chest receipts, account-owned
gathering collection, and permitted 2.0 equipment tier.

- Three stable sources per event/account, regardless of playable characters.
- War Camp + Warrior + Realm Victory source keys are each first-write-wins.
- A committed receipt is read before roll selection or item minting. Lost
  acknowledgement, repeat request, different character or secret rotation
  returns the original exact receipt rather than rerolling.
- Gold, Gem Dust, Tempering Dust, Companion Essence, and any equipment
  instance and Inbox receipt must commit together. No successful partial
  claim can survive a transaction rollback.
- The existing **V28 World Sigil wallet is untouched**: zero Sigils from
  every chest. The previously disabled 80-Sigil optional exchange remains
  quote-only.
- The mock single-lock transaction regression covers two concurrent claims,
  crash after resource/item/Inbox stage, key rotation, unearned sources,
  forged issued items and foreign account data. This is an **isolated unit
  fixture**, not proof of production database atomicity.
- The proposed private tables/constraints are quarantined at
  `docs/operations/sql-drafts/20261119_world_boss_chest_ledger_v61_review_only.sql`.
  **Do not run against staging or production.** The DDL design has unique
  account/event/chest kind, source-key, instance-ID and Inbox-source bounds.
  Its grants are intentionally revoked, and it cannot award resources.

## Pass 2: V62 Equipment 2.0 rolled instance bridge

`backend/src/server/combat/world-boss-gathering-instance-v62.ts` creates
a typed request for an **external future transactional equipment issuer**.
This retains the V64/V65/66 30-piece gathering catalog and V58 1% chance.

- 10 slots per boss, with validated V33 casing (Helmet, Chest, Gloves,
  Legs, Boots, Weapon, Off-hand, Cape, Amulet, Ring).
- Source-key, account, event and boss must remain bound to the immutable
  V61 reward receipt.
- Tier T1–T9 is read from the trusted server, never the client. **The actual
  level-to-tier selection algorithm and tier-adjusted gathering-speed stat
  formula are not yet approved or integrated**; V62 does not invent them.
- An issuer receipt must preserve piece ID, set ID, exact rarity, Q0–100
  quality, gathering-speed-only base stat and skill-specific affixes; no
  combat Power, no cross-skill bonus. Issuer version and item-instance UUID
  are validated and duplicates must be blocked in the real item database.
- The older V26 EquipmentItemInstance type is combat-only and cannot
  represent ten slots or Q/affix gathering rolls. A new Equipment 2.0 durable
  data shape is **still required**; this contract does not write it.

## Refinement and polish

- V61 rejects tampered replay Gold/material amounts and invalid frozen item
  provenance, not just mismatched keys. Canonical account/event UUIDs are
  normalized for receipt identity.
- V59 computes the shared 70% HP threshold with exact bounded integers,
  avoiding a floating-point boundary error.
- The developer-only World Boss Rewards preview shows the three chest
  prerequisites, exact proposed guaranteed contents, **1% gear chance per
  earned chest** and the appropriate 10-piece gathering collection.
  Actions remain disabled; it does not fabricate ownership, drop results,
  claimable balances or released content.
- The dedicated hidden CI workflow now includes V61 concurrency/failure
  regression, V62 item-source contract coverage via V61, mobile preview
  guards and checks that both new release constants remain false.
- Exact-head GitHub Actions, PostgreSQL two-connection racing, staging
  snapshots, device QA and economy tests remain **unverified** unless
  separately reported after running.

## Launch gates (still outstanding)

1. **Real private PG adapter** with V57 erasure fence and reviewed lock
   order, source receipt lookup and conditional row write; never run V61 on
   a public account/service role or mount it on gameplay routes yet.
2. **Real Equipment 2.0 issuer + durable custody**, server-defined tier
   policy, tier-adjusted gathering-speed formulas and gathering action
   integration. Unique source and instance IDs must be enforced in DB.
3. Actual wallet/stack and Inbox adapters in same database transaction.
   Confirm no resource double minting under crash/retries or erasure.
4. Postgres 16 two-worker concurrency, deletion-vs-claim, session isolation,
   lock ordering, replay tampering, rotation, rollout/rollback testing.
5. Final real mobile treasure/claim/receipt screen, accessibility and
   small-screen Android QA. Current component remains **developer-only
   design preview**.
6. Staging parity, economy/balance approvals, security/privacy sign-off,
   exact-head CI and production rollout go/no-go. Per the product direction,
   no rehearsal raid is required: first actual raid would use live operations
   plus emergency stop/hotfix procedures.

**World Boss events remain OFF.** Do not merge these changes into a
production-release activation until the gates above are verified.
