# Veldryn 2.0 Guild PvE — consolidated technical baseline and V15 read-only progress

**22 November 2026 — HIDDEN DESIGN/QA ONLY. No feature activation, migration, Edge/API route, mobile UI, Guild Token payout, inventory debit, or production/staging write.**

## Consolidation audit (verified on GitHub)

| Baseline | Integration | Current scope |
| --- | --- | --- |
| V4–V7 | merged into main before V8 | Broken Forge content and phase-local combat diagnostics |
| V8 | #1215 merged | 18-node shared in-memory run, 7 required combat gates, synthetic 4+4 Seals and 3+3 Orders |
| V9–V11 | #1273 merged into main | atomic domain port; PGlite and multi-connection PostgreSQL 17 **QA fixtures only** |
| V12–V14 | #1368 merged into main | server-owned actor reader interface, 36 authored replay cues, nonpaying contribution proof |
| Release boundaries | #1389 merged | hidden release-fence regression tests |
| V15 | **this isolated draft branch; not merged** | no-pay, read-only aggregate campaign projection from the existing ledger |

The historical V9 #1220, V10 #1221 and V11 #1230 stacked PRs were closed without individual merges. Their relevant reviewed content is in #1273. Old branch names are not independent pending releases. The actual 1.x **Weekly Guild Hunt** and **Event Boss** stay unchanged.

## Product contract still retained

- One **42-day/six-week cadence**: 14 days asynchronous active campaign; 28 days downtime. One handcrafted launch expedition, **The Broken Forge**, with 3 chapters, 18 nodes, 7 mandatory combats, 2 guardians and **The Hollow Warden** final.
- Difficulty: **Scout, Veteran, Mythic**, differentiated by mechanics, not merely HP inflation. Shared HP and persistent Pressure; **4+4 Assault Seals and 3+3 Exploration Orders per account**, shared across characters, no paid attempts.
- Three combat stances: **Assault / Guard / Rally**. Meaningful Tank/Support contribution and multiple viable counters; no forced character class, specific companion, last-hit bonus or mandatory optional branch.
- Frozen membership per run; cross-guild cycle binding. Late join/leave rules remain a **draft to decide** (V8 mentions 72-hour tenure and 2+2 late allowance but neither is implemented or approved here).
- Supply donations are explicit personal-inventory approvals only, never automatic Guild Bank debits. No player trading or profession levelling is forced by this optional combat feature.
- Solo/two-member guilds should receive meaningful partial progression in the eventual reward design; **do not advertise a guaranteed full clear**. V6 study shows early Scout completion can be impossible under current synthetic minimum-four scaling. HP and economy remain unapproved.

## V15: backend-only read model

`backend/src/server/combat/guild-pve-progress-v15.ts` takes a **server-owned** committed V9-format snapshot and trusted server UTC clock. It projects:

- Campaign status (scheduled, active, completed, closed), frozen roster count and deduplicated participating account count, not character count.
- Required-path HP removed/total, seven node statuses, shared Pressure, consumed Seals/Orders, frozen difficulty and ledger revision.
- Defensive checks for missing/fake nodes, invalid HP or cleared flags, malformed clock and run boundaries, out-of-range allowances, tampered V14 receipt evidence, account-guild binding and spend totals not reconciled to committed receipts.
- **No usernames, account IDs or character loadouts** in returned progress; no client trust, no inventory or wallet writes. Hard-coded `finalizationVerified=false`, `canClaim=false`, `rewardGranted=false`, `proposedTokenAmount=null`.

V15 is a progress **projection**, not a reliable release-ready read endpoint. Its V14 proof runs over a synthetic/test ledger. A production query must be authenticated, account-filtered, use the correct current normalized schema and verify revision and membership in one consistent database snapshot before exposing any data. No UI is approved; future themes must be reviewed first.

## Next engineering passes (in order)

1. **V16 — authoritative read and epoch snapshot design.** Verify current `online_game_states` and guild membership schema under service role, transactional state revisions, frozen roster source, and cross-account privacy. Add a strictly private, read-only staging prototype only after security review; do not wire player requests.
2. **V17 — phase-effect combat authority.** Implement all 36 warning/resolve cues as engine-backed effects (Armoury armour reductions, Sunder, ailments/cleanse, finite Shrine/Rescue charges, stabilizer and optional elites), with deterministic combat receipts across phase crossings. Never derive damage from presentation cues.
3. **V18 — exact-once reward ledger proposal.** Finishable/partial campaign policy, account participation thresholds, duplicate character protection, proper Guild Token/XP/cosmetic cap and item economics, SQL outbox grants and replay/crash tests. Existing V14 proof remains **nonpaying** until reviewed real settlement.
4. **Balance and UX approval.** Simulate 1/2/3/4/8/12/20 member guilds, 50–90% attendance, multiple tiers/roles, full gear/companion mixes and counter-builds with the real engine. Review compact map, participation panels, boss replay and dark/pixel themes **before any real app implementation**.
5. **Release gate.** Exact-head isolated/full CI, current auth/RLS audit, durable real PostgreSQL concurrency, staging-only end-to-end and Android QA, explicit owner approval before any migration, flag, merge/deploy or Guild PvE activation.

## Explicit safety hold

V10/V11 SQL and especially `tools/guild-pve-v11-postgres-qa.sql` accept synthetic caller damage/identity/time. **NEVER deploy or promote those fixture functions as production RPCs**. Guild Expeditions must stay behind the hidden 2.0 gate. Weekly Guild Hunts, event bosses, World Boss, Party Events, Guild Bank, Player Market, production wallets and 1.0.11 release are untouched.
