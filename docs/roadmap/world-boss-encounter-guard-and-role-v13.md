# Veldryn World Bosses — V13 Equipment-Band Guard & Defensive-Role Calibration

**November 11, 2026. Hidden test-only engineering candidate, not approved production balance.** Follow-on to [V12 game-rule fixtures](world-boss-real-loadout-supply-v12.md) and [V11 War Camp/encounter stress](world-boss-war-camp-and-fixed-threat-v11.md).

## Problem confirmed by V12 focused CI

The prior single fixed **T2** enemy profile was held against T1–T4 players. Its Frostmarch Armored Guard prevented the **T1 squad from scoring even one point of boss HP damage**, while T4 scored >143k. Every cohort averaged four surviving actors. This is unsuitable as a released balance model; it also shows why simply increasing boss Attack/HP or replacing the 14-round script with a generic fight would hide the real problem.

## Validation evidence — focused CI passed

[GitHub focused run 43042396232](https://github.com/elroynbenjamins/Veldryn/actions/runs/43042396232) completed successfully on November 11, 2026. [36-cohort result CSV](spreadsheets/world-boss-v13-guard-role-calibration-test-only.csv) retains boss/phase/T1–T4 numbers with provenance and approval=false.

- The baseline matrix completed **216 ordinary fights** (six per boss/phase/band cohort). All three T1 Armored profiles now cause **positive boss HP damage**; T1 Frostmarch averaged **7,670.96** versus zero under V12's globally fixed T2 Guard.
- Additional **1,728 deliberately stressed test fights** cover 576 controlled class/role counterfactual groupings. Stress factors of 1–12 are **not production multipliers**. With a full team, at least one actor fell in **104** cases; the first sampled deaths appeared at stress factor **6**. All ordinary baseline cohorts still had four survivors, so final launch difficulty remains unresolved.
- The complete squad had more survivors than a counterfactual that removed Support recovery in **294/576** comparisons and more than removing Tank interception in **39/576** comparisons. These are *paired descriptive test counts*, not unbiased estimates of causal class effects, because ability differences can advance the deterministic combat RNG cursor.
- **Tank telegraph response refined:** for V13 server-frozen profiles only, a living Tank now intercepts up to **25% of eligible telegraphed boss spike damage** to non-Tanks versus the original **10% on ordinary attacks**. Only actual HP prevented after shield/HP caps is recorded as Tank Impact. The new V13 tests detected **3,382** genuinely ledger-backed telegraphed ward instances. There are no free attacks or invented role rewards.
- Prior V13 stress data before this prototype improvement showed Tank survival wins in **16** comparisons. The targeted ward refinement increased that to **39** and reduced full-squad downed outcomes from **113 to 104**, while Support comparisons stayed near 293–294. The exact tactical tuning and class fairness are **not approved**.

### Validated class-kit counterplay addendum

[Focused run 43043117614](https://github.com/elroynbenjamins/Veldryn/actions/runs/43043117614) passed an additional **216 role-kit comparisons** across all three bosses, phases and T1–T4 synthetic equipped bands, checking every combination of **Ironwarden, Bastion and Dreadguard** with **Dawnkeeper and Stonecaller** against identical band-specific enemy profiles at test-only stress factor 6.

Observed mean surviving allies out of four: Ironwarden **3.44**, Bastion **3.47**, Dreadguard **3.57**; Dawnkeeper **3.60** versus Stonecaller **3.39**. The source [five-class data table](spreadsheets/world-boss-v13-tank-support-kits-test-only.csv) separately reports genuinely consumed shields, effective recovery, Tank HP prevented and personal damage. Stonecaller generated shields that were actually consumed; Dawnkeeper contributed more total effective recovery in this sample. Different class abilities interact with the deterministic action RNG, so the averages **are not proof of superiority or an invitation to nerf/buff a class**. No Ward/recovery rewards have been minted.

**Next balance gate:** use server-authenticated live-owned equipment/gem/faith/companion snapshots, true five-bracket power quantiles and mixed-tier Echo teams to verify class parity, then decide whether any Tank or Support changes should proceed beyond this hidden test prototype. Do not equate stress-test outcomes with live matchmaking odds.

## V13 engineering implementation

- **Per-equipment-band threat profiles:** one versioned server-frozen profile per **boss × global phase × equipment reference band** (four synthetic bands in the current fixture). The profile fixes the boss's Attack, Defense and local Guard, with a deterministic SHA256 integrity digest, version, event ID and phase. The **event** chooses and seals this profile before combat; it is never taken from untrusted client JSON.
- **Reference-driven guard budget:** the offline proposer first measures a reference equipped squad's actual 14-round ungarded HP damage using the existing Veldryn class/equipment engine. It then sets candidate local Guard at **16% Hollowroot / 21% Sunscar / 28% Frostmarch** of that verified **reference** damage, rounded consistently. These percentages are **unapproved test hypotheses**. The current 14-round simulator still has its original non-profile fallback; no live combat mode or dungeon stats change.
- **Balanced identity:** Hollowroot remains attrition/regrowth-oriented, Sunscar keeps its solar armor/heat, and Frostmarch has the highest relative Guard/control demand without forcing T1 armored matches to zero HP damage. Starting Guard remains phase-aware; Regrowth and Aegis restoration still count only toward **local Guard**, never global community boss HP.
- **Gear rewards effort:** a stronger individual inside the same server-derived encounter band gets better gear stats, but cannot silently raise boss Attack, Defense or Guard. Profile **selection** must be based on a separately audited Combat Power bracket policy, not client level/gear strings. Four reference equipment tiers are *not* the final five live power brackets.
- **Exact replay safety:** the disabled V10 reservation model now freezes the profile alongside verified roster digest, War Camp snapshot, seed and phase. The internal reservation also requires a **separate server-verified initiator equipment band** matching the candidate profile, rather than trusting a client-selected bracket. Retries return the original threat profile; settlement binds the immutable profile digest into the replay commitment. Tampered or foreign profiles are rejected, including attempts to settle by a stale worker. A SHA256 digest is an **integrity check, not an authorization signature**.
- **Role sensitivity diagnostics:** an isolated `testOnlyStressMultiplier` (1–12) requires a valid server encounter profile and is unavailable to any live interface. It explores survival thresholds by comparing original squad to one with Support recovery/cleansing disabled, and one with the existing Tank interception disabled. It reports actual downed fighters, healing/shields consumed, prevented HP and personal boss damage; **matched RNG seeds do not guarantee exact causal comparisons when skill action order diverges**.

### Test matrix

`apps/mobile/tests/world-boss-guard-role-v13.ts` builds nine class kits across T1–T4 with the existing co-op stat/equipment pipeline, then evaluates:

- All three bosses, all three phases, all four equipment bands, all three War Orders, two seeds: **216 ordinary fights**.
- Four equipment bands × three bosses × three phases × eight stress points × two seeds × three variants (full squad, without Support recovery, without Tank interception) = **1,728 stress fights**.
- V10 replay/worker tests additionally prove that a reserved T1 profile cannot silently change to T2 when retried and that tampering with frozen Guard cannot settle.
- No player database reads, no HP debits, rewards, supply consumption, migration, server endpoint or app screen are created by V13.

### Guardrails and future calibration

1. **Release quality bar:** every intended eligible low band must have a meaningful path to positive personal HP damage in every boss/phase, especially Frostmarch Armored. However, earned preparation and the War Order choice should continue to matter.
2. Do **not** count stronger NPC/Echo damage as the initiating player's role contribution; World Impact remains initiator-only with class-specific benchmark comparison, ledger-based healing/shield/guard attribution and exact receipt IDs.
3. A good boss pattern offers Support choices (real heal vs consumed shields vs cleanses), Tank value on telegraphed burst, and Damage value on local Guard windows. Measure actual survival changes near high-pressure thresholds; do not claim Tank/Support are meaningful based only on numerically positive mitigation.
4. Uncalibrated stress levels and zero-death or universal-wipe ranges are **diagnostic observations**, not justification for changing live monster balance. Before final numbers, use authentic owner-bound loadouts plus companion/gem/faith modifiers and verify 14-round replay timing.
5. Further engineering work: bracket thresholds and role fairness, a durable server profile source keyed by event/boss/phase/band, PostgreSQL reservations and replay receipts, War Supplies inventory transaction, and Inbox/World Sigil wallet **only after separate staging security and economy approval**.

**Everything above is hidden in draft PR #1038. No World Boss content is activated.**
