# Party Events V80 — safe Inbox history bridge (review-only)

**19 November 2026 · PR #1416 · hidden/unmounted · NO live payout**

## Existing Inbox compatibility discovered

The real `backend/supabase/migrations/20261003202408_reward_inbox.sql`
contains `private.reward_inbox_v1` with **only** the source kinds
`party`, `guild`, `dungeon`, `gift`. Its public
`reward_inbox_claim_v1` routes **any** unclaimed `source_kind='party'`
to `claim_party_contract_reward_v16` using `source_id`.

A new **claimable** Party Event chest Inbox row under `party` would
therefore call the **wrong payout route**. This is a hard release blocker,
not simply a UI-label issue. No legacy Inbox/Party Contract migration was
changed.

## V80 staged mitigation

- `weekly-party-event-inbox-v80.ts`: an isolated, default-denied,
  single-connection SQL-only V70 Inbox port, specifically for **already
  credited** equipment-*miss* Party V51 chests.
- Independently checks exact canonical account/week/chest keys, four
  original V51 guarantees, V61 proof version, V70 frozen receipt, and
  a matching **settled** V11 roster/week from the same SQL transaction.
- Inserts into the **existing** Inbox schema using **historical / already
  claimed** (`claimed_at=now()`), `attachments=[]`, and safe,
  legacy-`gift` transport classification. The visible title and body
  identify the Party Event. This cannot trigger the old Party Contract
  claim handler or deliver duplicate attachments.
- Returns an actual durable Inbox row UUID for V70's grant ledger.
  Independently verifies the row's owner, source, identity, claimed
  status, empty attachments, and stable grant ID.
- No UPSERT, dedupe bypass, extra grant, external network, or second
  transaction. A subsequent V70 failure rolls it back along with the
  prior guaranteed rewards.
- PGlite tests use the **actual V70 ledger draft** and a constrained
  fixture of the existing Inbox shape. They cover rollback, replay
  safety, foreign sources, malformed rewards, production gates, and
  duplicated messages.

## What this does NOT solve

This is **not** a player-facing pending Inbox claim or a new Inbox
notification. The temporary `gift` transport classification is not
a correct long-term UX. A future reviewed migration must register a
distinct `party_event` source kind and safely update
`reward_inbox_claim_v1` (including its `claim_all` path) to
acknowledge already-credited chest history **without re-paying**
or calling `claim_party_contract_reward_v16`.

V80 does not enable Gold, Sigils, Gem Dust, Companion Essence, EQ2,
real canonical proof loaders, account erasure, staging/production
DDL or Android QA. The port is intentionally not wired into a live
backend composition. All release flags stay `false`.
