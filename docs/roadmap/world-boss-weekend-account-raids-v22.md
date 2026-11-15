# World Boss V22 — Five-day War Camp and weekend full-account raids

**Decision: 15 November 2026. Status: hidden, prototype only; NOT released.** V22 **supersedes the older seven unrestricted attack days and mandatory 1-Tank/2-Damage/1-Support four-account Echo squad** described in v1/v2. V20/V21 Echo consent remains historically documented, disabled and not a requirement for the new mode.

## Worldwide schedule (UTC, 14 days)

- **Monday 00:00 UTC through Friday 23:59:59:** Five preparation days. Global War Camp donations to Fortifications, Field Provisions and Siegecraft, optional account-character raid preparation, boss preview. Lock the global War Camp effects at **Saturday 00:00 UTC**, before any attacks.
- **Saturday:** Attack windows **00:00–00:30, 08:00–08:30, 16:00–16:30 UTC**.
- **Sunday:** Identical attack windows **00:00–00:30, 08:00–08:30, 16:00–16:30 UTC**.
- **The next seven days:** Cooldown / claim / next boss preview. A new event starts on the next 14-day Monday boundary. Hollowroot, Sunscar and Frostmarch rotate.
- The launch Monday is an explicit server-only UTC epoch; render the same six global slots in each player's **local time** with the UTC reference retained. No local DST shift of the global slots.
- Exactly **3 attacks total per account per event**, not per character and not per window. Players may use all three in the same window, sequentially. An attack must be reserved while a window is open; already accepted attacks may settle afterward with bounded grace. Network retries and replay do not consume attempts.

## One Account Raid: all unlocked characters together

Each player independently fights the *same globally shared boss* using **1 to 5 eligible unlocked characters belonging to their own account** in one combat instance. Default: all eligible owned characters participate; selection toggles can come later. No external Echoes, no NPC fillers, no role requirement, and no need to be online simultaneously with another player. Multiple characters of the same class or role may participate.

Every character contributes with its own verified gear, class skills, companion and stats. Tanks protect members of the same account roster, Support heals and wards them, and Damage builds deal DPS. The boss can target several of these characters in the same deterministic replay. All real characters' actions remain visible; no invented damage numbers. Up to five small portraits/HP bars share the compact combat HUD. Replays show each character's real damage, healing, interrupts and survival.

The server must read and verify each character's authoritative owner GameState, level, equipment and revision; no client-provided combat stats, ownership, bonus, actor or damage. Freeze one account-wide ordered roster, snapshot digest, boss phase, War Camp effects, seed and server rules at reservation. **One request ID and one account-wide ordinal for the entire raid.** The private settlement worker atomically credits each individual raid against the same global boss HP pool. Many accounts may raid concurrently without sharing a lobby or overwriting one another's HP contributions.

## Balance and reward principles

The V22 **test-only** world damage policy sorts actual character damage descending and credits 100% / 12% / 7% / 5% / 4%. For equal-damage fighters, 1 character gets 100% of one fighter's damage, and 5 get 128%, not 500%. Adding a weaker character never subtracts the strongest fighter's contribution. **These weights are provisional, not approved production balance.** Role-normalized World Impact also credits effective survival, heals, protection, cleanses and other verifiable utility rather than only damage.

Global boss HP is fixed at event start. Server-owned event row locks and exactly-once settlement allow simultaneous worldwide attacks. Once the global boss dies, later accepted fights use a Residual Echo with **zero extra global HP credit**, while still qualifying for personal rewards. No new boss HP scaling after the event begins.

The existing **100 World Sigils theoretical account cap**, three attempts, optional two account-wide War Supply bundles and boss-themed shop prices remain unchanged. Rewards are never paid per character or per teammate.

## Files and readiness

- Pure UTC calendar: backend/src/server/combat/world-boss-weekend-v22.ts
- 1–5 verified-character freeze, same-fight simulation and bounded world impact: backend/src/server/combat/world-boss-account-raid-v22.ts
- Draft private PostgreSQL weekend and ownership reservation gate: docs/roadmap/world-boss-weekend-reservation-v22.sql
- TypeScript and disposable PostgreSQL regression tests are included in the focused CI workflow.

**Launch blockers:** Actual authenticated multi-character state reader; V22-specific transactional worker (V19 still expects the old four-Echo packet); final three-boss 14-round kit integration and balance across account sizes; War Camp inventory transactions/freeze; real replay persistence and recovery; account-wide 100-Sigil payout ledger; new mobile roster and countdown UI. No route, real event, SQL migration, player inventory debit, reward grant or gameplay release is activated. Do **not** merge to the Android 1.0.10 candidate or deploy draft SQL without separate authorization.
