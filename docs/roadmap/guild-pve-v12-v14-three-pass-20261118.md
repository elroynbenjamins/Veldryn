# Guild Expeditions — V12, V13, V14 consecutive engineering passes

**18 November 2026 · HIDDEN development-only branch · NO deployment, route, release, migration, guild currency or inventory write.**

These passes follow merged V9–V11 transaction and PostgreSQL test doubles, preserving the existing weekly Guild Hunt. The three contributions are **not** a production-ready Guild Expeditions system. Full release still needs an authenticated transport, durable normalized SQL integration with engine, reviewed boss effects, claim transaction/outbox, UX, balance, translations and staging/device verification.

## V12 — server-owned, current GameState adapter

- `GuildPveV12VerifiedActorLoader` adapts a strictly **server-owned** `readOwnedState` result to the V9 trusted loader.
- Fail closed when the account, character or revision disagrees. Revalidate exact equipped gear-copy ownership, class/level slot rules, current co-op loadout, companion eligibility and canonical saved-state revision.
- Convert real equipment/set/socket/companion/skill stats through the existing co-op snapshot pipeline. Store only the source hash and authoritative actor for deterministic V7 simulation.
- **Boundary still missing:** the host must authenticate with server-owned identity and perform account-filtered PostgreSQL reads (plus rollback-safe, under-lock version validation). A mocked reader by itself proves neither identity nor atomicity.

## V13 — 36 authored telegraphs and ordered phase notices

- Nine phases × four cues indexed by boss, phase and cue ID (namespaced to avoid ambiguous reused identifiers).
- Enforce the twelve serious cue warning→resolve pairs. Scout/Veteran/Mythic display warning suggestions remain positive and readable.
- Only project a phase-local cue script from a **committed V9 engine receipt**. Damage and HP credit are copied from real saved engine values; phases crossed are ordered and announced, but no next-phase lethal hit is invented.
- **Mechanics still not fully integrated:** scripted armour, Sunder, affinity, finite Shrine boons, supply charges and optional-node defensive counters must be reimplemented in authoritative combat before launch. The presentation cues must never be used to apply stats.

## V14 — nonpaying reward eligibility and role evidence

- Read an existing frozen roster and binding, all seven mandatory boss nodes, one per-account/cycle request ledger and only previously committed real-engine receipts.
- Candidate proof totals authoritative HP removal, effective healing, absorbed damage and actual cleanses; capped role fairness is a **provisional nonmonetary comparison**. Does not offer a last-hit bonus.
- Reject foreign guild bindings, tampered receipts, stale target charges and altered proof nonce. A private in-memory journal demonstrates same-nonce replay, but is **not a durable claim lock**.
- Explicit `finalizationVerified=false`, `canClaim=false`, `proposedTokenAmount=null` and `rewardGranted=false`: no approved weekly Hunt baseline or settlement timestamp exists here. No free, partially-complete or fake rewards are issued.

## Validation / next required work

- Targeted `guild-pve-v12-v14-validation.yml` tests with fake accounts and the real Veldryn combat loadout path.
- Independently gate merging on a green exact-head run, examine TypeScript/baseline failures and verify no route/flag/SQL migration was altered.
- Next passes: authenticated online GameState read from **current** canonical schema, V13 effect interpreter integrated with real combat and authoritative replay, V14 PostgreSQL exactly-once outbox/claims with agreed token/cosmetic economics and calibrated small-guild balancing.
- Current V11 SQL accepts a caller's synthetic damage and timestamp; **never** deploy it as a Supabase function or attach it to user commands.
