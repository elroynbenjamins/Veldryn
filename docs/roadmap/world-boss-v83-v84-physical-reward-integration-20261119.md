# World Boss V83/V84 — real-state reward bridge and EQ2 escrow pilot

**19 Nov 2026. HIDDEN, QA-ONLY, UNMOUNTED. NOT a launch authorization.**
These passes target V69/V70 same-transaction atomic chest settlement while
preserving the user-approved 1% per chest gear chance and T1–T5 core EQ2
rollout. No first live World Boss gameplay rehearsal was performed.

## V83 — actual physical game-state destinations

Instead of inventing a Veldryn reward wallet, V83 targets these existing
authoritative relations: `public.character_wallets.gold`,
`public.online_game_states.state.account.companionEssence`, material
`inventory.stacks` / `bank.stacks` (GEM_DUST and TEMPERING_DUST), and
`private.reward_inbox_v1`. It uses one V70 pinned transaction client:

1. World Boss proof/event/erasure preflight and account-wide V70 fence
   must have been acquired before the adapter runs. For each guarantee,
   take the existing `party-account:` advisory lock, lock the online state,
   credit the active character's **real** Gold wallet via CAS, synchronise
   the character's Gold in game state, and mutate account Companion Essence
   or the exact canonical material stack.
2. Resources are never lost into expiring overflow. An existing matching
   stack is used first; otherwise Inventory then Bank capacity is checked.
   If neither can accept the new stack, **throw**, preserving the earned
   chest while rolling back all earlier Gold/Essence/ledger changes.
3. Write immutable source-linked per-resource before/after audit rows in a
   private **review-only** `world_boss_chest_resource_grants_v83` table.
   V70 independently reads all four actual resource values and compares
   each audit and grant leg before committing. On subsequent
   replays, V70 passes an explicit `replay` verification phase: the
   immutable, source-linked committed grant journal and empty Inbox
   attachment history are checked, **not** current spendable balances.
   Players may spend Gold/materials, use Essence, or switch characters
   after claiming without breaking historical idempotency.
4. Only already-paid, non-claimable **Inbox history** with
   `source_kind='gift'`, `claimed_at=now()` and empty attachments can be
   inserted into the existing Inbox schema. This is an interim transport,
   NOT a new player-facing chest claim action. It can never double-pay via
   the old gift or Party Contract claim path.
5. Every World Boss amount is compared against the V58 source-of-truth.
   Parties and any unsupported resource cannot be credited through V83.
   A 1% gear hit is **still blocked by V70**, thus no partial payout.
6. PGlite full V69+V70+V83 integration uses fixture tables with exactly
   the real game wallet, state and Inbox columns (plus our new draft audit).
   It checks no-gear physical grants, replay, full-inventory rollback,
   account isolation, tamper detection, zero-attachment Inbox, and release
   fences. It cannot substitute for a real PG16 two-session, live schema
   privilege or staging proof.

## V84 — EQ2 event item issuance in private quarantine

The existing EQ2 draft does not currently register World Boss
`WB64_` gathering gear or Party `PE_` chest pieces. V84 adds an isolated
**review-only** private T1–T5 registry and source-linked exact UUID instance
table. The server-only pilot:

- Reads the **stored V70 immutable receipt and V80 earned entitlement** on
  the supplied SQL connection, never a client-owned table/tier/roll.
- Calls V82 frozen source/odds/guarantees/custody parity before any entropy.
  Checks that the World Boss's precise 10-slot gathering template and
  frozen tier are **explicitly registered and enabled** in the isolated
  private QA manifest; unregistered T5 and T6–T9 stay blocked.
- Uses V65's existing rarity/quality/gathering-only roller and saves the
  complete exact roll, canonical digest, account ID, source, boss, tier,
  slot and unique item UUID in `quarantined_unclaimed` physical storage.
  Repeat reads return the same instance *without rerolling*.
- Independently reads the PostgreSQL item row and validates its roll,
  immutable item hash and V71 custody descriptor.
- **Does not** grant a wearable item or connect to Gear Pouch/Bank/Inventory.
  No player item conversion, affix reroll, EQ2 registration in the real
  gameplay manifest, public RPC or item trade is provided. The SQL stays
  review-only and no grant leg is written to the V70 paid chest.

## Remaining hard gates

- Get **real EQ2** canonical event templates, T1–T5 item sources,
  authoritative stat/equip effects, account-unclaimed custody, Bank/roster
  transfer, exact-copy protection and resale/market restrictions connected
  to gameplay. No temporary DB escrow may be treated as a delivered item.
- Implement/review Party Sigils V65 + Party World resource/Inbox parity
  without a duplicated currency wallet; the V80 historical Party Inbox
  port remains distinct.
- Reconcile V61/V70 paid receipts and V80 earned records without allowing
  multiple claims or re-earn after erasure.
- Audit V55/V57 erasure locks, real PG16 two-connection concurrency,
  Supabase migration privileges, source Auth/transport, mobile Android UI,
  localization and failure/reconnect/restore tests.
- Preserve World Boss event activation independent of item claiming; both
  reward writer and EQ2 quarantine paths are **production denied** today.
