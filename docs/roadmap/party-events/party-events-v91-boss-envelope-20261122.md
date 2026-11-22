# Party Events V91 — hidden boss encounter envelope

**22 November 2026. Development/QA only; no live changes or numeric balance approval.**

## What changed

V90 introduced four authored, family-specific boss kits with 70% and 35% HP phases. Its 16 deterministic engine smoke scenarios and kit-shape guards cannot establish whether a party of two performs similarly to a party of four, whether tiers 1–12 scale acceptably, or whether Standard/Veteran/Heroic behave predictably.

V91 adds `backend/src/server/party/__tests__/weekly-party-boss-envelope-v91.ts` and registers it in the hidden chest CI and strict TypeScript target. The regression covers **4 families × 3 difficulties × 3 party sizes (2/3/4) × 4 representative tiers (1/4/8/12) = 144 deterministic baseline simulations**. Every scenario is replayed with an identical seed and checks for consistent outcomes, finite combat results, phase ordering/one-time phase triggers, time bounds, correct boss identity, interruptible special casts, absence of true-damage cast and boss-reflection loops. A machine-readable summary reports victory/wipe/timeout totals, 70% and 35% phase exposure, aggregate damage taken and interrupts by family/difficulty.

**Important limitations:** This explicitly uses the old `launchPlayer` character fixtures at level 25 and a mirrored provisional V4 Party boss scale; it does **not** use authenticated, equipped Equipment 2.0 item instances, the 17-affix/28-trait owner-approved catalog, nine classes × two specs, gems, companions, saved preparation, actual party loadout custody or player-observed win rates. A 25-second window tests encounter shape, **not** the final 90-second escalating Day 8 tier curve. The test outputs observations, not a pass/fail victory-rate tune.

No combat numbers or tier scale were modified. V90 remains an **optional review-only kit**; the live boss keeps its original factory. No migrations, flags, UI, themes, loot, payout writers, production/staging data or public routes were changed.

## Next actions before balance approval

1. **Exact-head CI:** Check hidden TypeScript and V91 job results. Fix any failures before claiming coverage.
2. **Build-authoritative contract:** Acquire owner-validated ten-slot T1–T4 equipped instances, stat effects, up to two signature traits, gems, companions, class specialization and preparation. Capture a versioned immutable encounter seed and digest per **new** 2.0 run. No user-selected boss identity and no post-fight rebuild from the current inventory.
3. **Full balance sweep:** Test nine classes, 18 specs, boss families, 2/3/4-player formations, difficulties and tiers; replace baseline fixtures with real server-owned builds and the true 90-second combat timer. Record P50/P95 fight time, defeat/timeout, phase opportunities, role contribution, healing, shields, interrupts, Reflection (shared max 0.1% boss HP / 5s), DoT and affix proc budgets. Avoid mandatory class/rare signature requirements.
4. **Independent boss and reward proof:** Authoritative server-generated victory and tier certificates must be joined to V87 source, V69/V70 atomic claims and real V86/Equipment 2.0 custody. Ephemeral PostgreSQL 17.6 tests do not prove a production-source victory.
5. **Release gate:** Keep #1416 draft/private-to-release, staged migration parity unresolved, and all feature flags OFF. Do not merge into main, deploy, or change UI appearance without the user's theme/mockup approval.

**Decision: HOLD** until audited integration, exact-head CI, staged security/replay tests, Android QA and coordinated Equipment/Combat/World Boss/Party Event 2.0 release approval.
