# Party Events V65–V66 — designated Party Sigils source and event equipment templates

**19 November 2026 · stacked hidden draft only, no deploy, no production/staging DDL.**

## V65: one Party Sigils wallet, one source of truth

- Added review-only SQL `docs/roadmap/party-events/hidden-migrations/20261119094500_party_sigils_account_ledger_v65.sql`.
- Private, account-scoped wallet `private.party_sigils_wallet_v65` stores nonnegative Sigils (maximum 2,147,483,647), never a replacement for Gold, Guild Tokens or Expedition Marks. No second per-character balance. Review any existing currency store before promoting; if a Party Sigils wallet already exists at rollout, migrate/reconcile it rather than duplicating.
- Private, append-only `party_sigils_ledger_v65` references the **existing V61 reward source**. Unique source key forbids spending or granting twice. Source derives **8/10/16** Sigils for the three V51 chests and **−60** once for the missing-piece exchange; no arbitrary amount is accepted.
- `private.apply_party_sigils_from_receipt_v65(account, source)` uses *invoker* rights, locks V61 evidence, denies second application, inserts the wallet on first use, locks/updates the balance, prevents negative spend or overflow, and appends the exactly matching ledger. This function has **zero EXECUTE grants** to `anon`, `authenticated` or `service_role` in the review-only SQL.
- An unmounted `weekly-party-sigils-ledger-v65.ts` adapter plugs into the **same V63 transaction connection**, never a separate REST call. It validates account/week/source and matches stored SQL delta and balance to the expected V51 amounts.
- Disposable PGlite integration tests exercise the **actual V61 + V65 draft SQL**, duplicate source denial, all three chest kinds, insufficient exchange, aggregate across event weeks, exact 60-Sigil spend, rollback, ownership, erasure cascade and private privilege fences. TypeScript adapter tests exercise no forged source/delta and production-off behavior.

## V66: honest 20-piece × nine-tier Party Event catalog

- Added `weekly-party-equipment-templates-v66.ts`: exact 180 stable keys (all 20 existing V51 event pieces at T1–T9), preserving four story families, eight unique sets, each three signature + two support pieces, slot names and universal class use.
- Sets retain 2/3-equipped combat effects from V51/V59; no new weapons. The event gear has **one or two base-stat profiles** per slot in the same vocabulary as Equipment 2.0 (attack/defense/health and pairings).
- `partyEventTemplateV66(pieceId,tier)` resolves an immutable event-only template descriptor `PE_*:Tn`. No recipe, craft cost, fake `EQ2_` item, unrelated-market entry or pre-rolled rarity/quality/affix numbers.
- V64 issuance plans now expose the corresponding V66 candidate key, but **still fail closed**: numeric T1–T9 budget, full EQ2 affix policy, physical item custody, Bank/Inventory capacity, character switching, rolled stat snapshot and server combat compatibility must be implemented and approved first.
- Focused V64/V66 tests exercise all 180 identities, tier mappings, class freedom, lack of invented numbers, descriptor parity and fail-closed issuer.

## Review and release gates

1. **No production/staging DDL performed.** V65 isn't deployed and the `service_role` cannot mutate the review wallet/ledger or call the grant function.
2. V63 account/week transaction still depends on a **real** private source-of-truth V61 proof, audited server grants for Gold/Gem Dust/Companion Essence and Inventory/Inbox, source ledgers, session identity and serializable retry/backoff. V65 is one piece of the transaction, not a standalone live payout.
3. V66 is not registered with Equipment/Crafting 2.0 (#1382). Its current implementation is on another unmerged branch and T1–T4-only. Coordinate a shared item catalog and author actual T5–T9 combat/stat budgets, rarity and quality rolls without double-counting set bonuses.
4. Run exact-head CI and disposable Postgres tests; ensure all dependent parent PRs and shared World Boss tests pass. Then staging 2-session fault/concurrency, Android narrow-screen/reduced-motion accessibility, localization and joint major-release approval.

**Do not merge this branch into main, mount claim endpoints, issue gear or enable Party Events based on this review-only change.**
