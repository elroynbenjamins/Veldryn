# Party Events V61–V62 — reward-ledger readiness and verified mobile collection

Date: 19 November 2026. **Hidden stacked draft on #1407; zero activation, zero grants, zero staging/production DDL.**

## Pass V61 — authenticated settlement proof and DB receipt boundary

- New `weekly-party-event-proof-v61.ts` reads the future **private canonical settlement join** only. It projects V51 entitlement input from the same account/Party/UTC Monday event week: a finalized seven-day week, frozen two-to-four-human roster, V14 committed 0–40 activity EP, frozen optional preparation receipt, proven finale receipt, and Equipment 2.0 server-pinned tier.
- Source mismatches, unsettled weeks, malformed dates, invalid claim actors, fake optional preparation or boss victory, forged activity counters and client-derived equipment tier are rejected. Week status `settled` **alone** never implies finale victory.
- New review-only ledger `docs/roadmap/party-events/hidden-migrations/20261119070000_party_event_reward_ledger_v61.sql`: one globally unique canonical `party-event:<weekMs>:<accountId>:<kind>` source; explicit unique account/week/kind or exchange constraints; frozen item-instance uniqueness; exact V51 guaranteed amounts; full frozen receipt JSON/source parity; account-erasure cascade; private RLS and service-role **SELECT ONLY**, without even an INSERT grant. Trigger rejects receipt updates. No public RPC, no service claim writer.
- Disposable PGlite test runs the actual draft DDL and exercises private privileges, duplicates, cross-source keys, mismatched grants, missing receipt fields, rollback, append-only behavior.
- The earlier V60 in-memory adapter is **not** a live serializable DB integration. A real account/week locked transaction across V61 receipts, existing Party Sigil wallet, exact Equipment 2.0 inventory and existing Inbox remains mandatory.

## Pass V62 — authenticated read-only reward and collection

- New server-only `weekly-party-event-rewards-v62.ts` builds three chest statuses from validated V61 evidence + canonical V60 receipts, the existing wallet and server-owned inventory. All data must be fetched in one consistent authorized private transaction. Duplicate/foreign/forged receipts, invalid reward amounts and collection records fail closed.
- New mobile `party-event-reward-readonly-v62.ts` validates account UUID, exact event week, ≤2-minute snapshot lease (≤30-second forward skew), family, difficulty-adjusted chest odds, fixed three chest rows, five distinct gear pieces across exact 3+2 set IDs, owned counts, existing wallet, and all disabled actions.
- Developer-only `FeaturePreviewScreen` Results now uses the private V62 data when **both** the existing V33 event status and new V62 rewards agree on authenticated account, week and family. Otherwise it retains an explicit **unverified** collection/balance/claim state. No Party reward provider or action is supplied by `App.tsx`.
- All chest opening, targeted Sigil exchange and Day 8 claims stay disabled. No equipment enters inventory and no user sees a counterfeit guaranteed drop.
- Backend V61/V62 tests, disposable PGlite ledger tests, mobile decoder/UI tests and existing hidden chest/mobile workflows are wired for exact-head CI.

## Implementation prerequisites — no-go until proven

1. Bring #1388's hidden V11–V50 canonical source/roster/stage/proof stack through merge review and successful exact-head CI. Staging metadata on 19 Nov shows ordinary craft/idle source tables, **not** the Party Event private settlement schema; nothing was installed by V61/V62.
2. Author a genuinely canonical frozen preparation and finale receipt writer, Day 8 payout source and approved T1–T9 Equipment 2.0 level/tier resolver. Do not treat a week being `settled` as boss victory.
3. Implement an audited service-role-only single DB transaction that locks the correct account/week, reads V61 proof and wallet, performs V60 HMAC/item roll, appends V61 receipt + existing wallet/resource/inventory/Inbox grants or rolls them ALL back. Check two-connection races and replay after key rotation, lost ACK and failover.
4. Explicitly handle offline status expiry, character/account erasure, claim history retention, revocation of stale JWT, localized strings (EN/DE/ES/NL/IT/FR/RU/TR), Android small displays and TalkBack semantics.
5. Keep all public routes disabled. Supabase's 2026 Data API changes do **not** authorize exposing these private tables. Review current RLS/search_path/function execution privileges before any migration promotion.
6. Confirm final Equipment 2.0 and Combat 2.0 runtime interoperability and joint major-release approval. Legacy Dungeon combat stays untouched.

Do not merge into production, enable player-visible rewards, or deploy staging/production SQL based on this design-stage result alone. World Boss 1% chest gear and its gathering set are unchanged by the Party Event V61/V62 work.
