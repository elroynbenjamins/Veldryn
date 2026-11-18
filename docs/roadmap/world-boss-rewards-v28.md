# World Boss V28 — private, replay-verified World Sigil rewards

**Status:** 15 November 2026, **HIDDEN REVIEW-ONLY**; not deployed, merged, migrated or exposed in the mobile app. Built on V22's 5 preparation days, full 48h Sat–Sun battle, 7 downtime days, V26 authored 14-round account encounters and V27 resource-deduction War Camp. The existing **3 battle attempts/account/event and 2 supply bundles/account/event** remain unchanged.

## Approved economy envelope (maximum per event)

| Source | Amount | Rule / authoritative evidence |
| --- | ---: | --- |
| Completed successful account battle | 10 × 3 = 30 | V18 committed attempt + immutable V26 replay + matching V28 proof |
| Completed personal defeat | 5 per unsuccessful attempt | Replaces, not adds to, a successful 10-Sigil battle payout |
| Cumulative World Impact 0.8 / 1.8 / 3.0 | 5 / 10 / 15 = 30 | **DISABLED, pending real per-role/bracket normalization** |
| Shared world HP at 70% / 30% / 0% | 5 / 10 / 15 = 30 | V18 DB milestone fact and ≥1 verified committed account battle |
| War Camp donation 1 / 2 | 5 + 5 = 10 | V27 transaction committed and own-account two-slot receipt |
| **Maximum theoretical event reward** | **100** | Never per character; all grants are per account and source key |

**Current enabled private draft reward sources max out at 70 Sigils** when all three battles succeed, all three global HP milestones are reached, and two supply receipts exist. The remaining **30 personal Impact Sigils intentionally cannot be paid** until Tank, Damage, Support bracket-normalized scores are approved and added in a later audited version. A 100-Sigil ceiling is checked in the database now, not represented as 100 currently earnable. This is a deliberate anti-exploit hold.

## V28 reward settlement sequence

1. An **authenticated** user may submit only `{eventId,requestId}` to request an account-level claim. Account ID is derived from verified server Auth; no client amount, outcome, character, role score, milestone or wallet balance is accepted.
2. V26's trusted, internal worker completes a server-owned 14-round authored battle and stores an **immutable content-addressed replay** before its V18 atomic global-HP settlement and three-attempt charge. V28's *internal* replay-proving job reads V18's committed replay digest and storage key, fetches that exact object, SHA-256 verifies the UTF-8 bytes and then submits the bytes through the private V28 SQL procedure.
3. The private SQL procedure rehashes the bytes with PostgreSQL 16 SHA-256 and matches the **committed** attempt's event/account/request, engine, source roster, locked phase, War Camp and boss profile digest. It checks 14-round structure and participant ledger consistency (role, damage, Guard, healing, shields, Tank protection, cleanses, interrupts). Duplicate proof calls are idempotent.
4. **Only after proof** does that battle count as a completed account attack for Sigils or qualify the account for global milestone Sigils. V27 committed supply receipts qualify for their own 5 Sigils even if an account never attacked. Global milestones do not pay donation-only accounts.
5. The V28 private claim transaction locks the **event first**, then the **shared account wallet**. Each source receives one immutable unique ledger key: `battle:1..3`, `supply:1..2`, `global:70/30/0`. An `ON CONFLICT DO NOTHING` inserts every new eligible source at most once, and a single wallet increment and claim receipt are committed atomically. A duplicate claim request ID returns the **historical receipt** even if other rewards became eligible afterward. A fresh request key can claim later earned sources.
6. Ledger checks enforce **≤100 Sigils per event** (with up to 11 eligible source keys reserved for a future reviewed Impact upgrade). Sigils in this prototype live in a **new PRIVATE, unmounted V28 wallet**, not the ordinary Veldryn account economy or shop.
7. A read-only private view exposes event-earned Sigils, current draft wallet balance, and source-derived role evidence. The separate pure helper sums only actual authored Tank protection, consumed shields, effective healing, interruption, local Guard and real boss HP damage; **no fake protection or overheal is awarded**. Impact status is always `pending_balance_approval` and the payout flag is false.

## Failure, retry and time rules

- **Crash after V18 battle commit but before V28 proof:** retry internal `settleAndProveWorldBossAccountV28`. V18 returns the same committed receipt; replay proof may then be recorded without a second battle or HP debit. No Sigils can be claimed for an unproved battle.
- **Crash after a Sigil claim:** retry with same `requestId`, returning the original delta and original `balanceAfter` snapshot. A new claim key sees the current ledger and credits only newly eligible sources.
- **Two simultaneous claims:** distinct keys share an event-row lock and the same account-wallet row lock, so both cannot mint a shared reward source; two-connection PostgreSQL CI exercises this behavior.
- **Zero-delta claims:** accepted, idempotent, and do not increase wallet revision. Later sources need a new request ID.
- **Cross-event:** World Sigils are an account-wide cumulative currency, but the 100-Sigil cap and reward source keys are independently scoped to each event. Private wallet row serializes claims between events as well.
- **After event close:** existing committed battle/reward proofs can still be claimed later. Previously completed events must remain immutable, and no new battle reservation is created by claiming.
- **No premature rewards:** neither reserved/voided V18 attempts nor unverified replay bytes can earn battle rewards. War Camp resource deductions and Sigil rewards are distinct transactions, so no pending/predicted donation unlocks payout.

## Code, tests and launch gates

- `docs/roadmap/world-boss-reward-ledger-v28.sql`: private replay proof, wallet, immutable ledger, claim receipts and guarded functions; all tables use RLS and **no anonymous/authenticated grants**.
- `backend/online/world-boss-rewards-v28.ts`: authenticated claim/view and internal immutable replay proof verifier.
- `backend/online/world-boss-rewards-pg-v28.ts`: parameterized private PostgreSQL adapter.
- `backend/online/world-boss-reward-runtime-v28.ts`: UNMOUNTED V26/V27/V28 internal composition and recoverable after-settle proof.
- `apps/mobile/tests/world-boss-reward-ledger-v28.ts`: service Auth, replay tamper, receipt, source-ledger, and Tank/Damage/Support evidence checks.
- `docs/roadmap/world-boss-reward-ledger-v28-smoke.sql`: **ROLLBACK-only** Postgres fixture: donations only, 3 battle receipts (2 wins/1 loss), all three global milestones, replay tamper and duplicate-proof rejection, exactly-once claims and 65-Sigil payout.
- `docs/roadmap/world-boss-v28-concurrent-claims-ci.sh`: two independent PostgreSQL sessions concurrently try to claim **one** donation source using different request keys; expected wallet 5, ledger 5, one source row and two claim receipts.
- `.github/workflows/world-boss-v12-validation.yml`: focused CI, TS typecheck, prior World Boss regressions and disposable PostgreSQL proof/claim tests.

**Before release:** all V23–V28 CI checks green; real Supabase schema and Auth review; staged real account-wallet integration; live versioned migrations and RLS/security review; one-time replay source recovery at scale; two-worker settlement/claim race and failover tests; Impact bracket/reference calibration across all nine classes and three bosses; role-safe anti-farming; event/fight timing; actual Sigil shop and inbox-claim UX; economy inflation and loss simulations; mobile accessibility/localization; explicit production launch approval. **Do not deploy any V28 SQL or enable World Boss from this draft.**
