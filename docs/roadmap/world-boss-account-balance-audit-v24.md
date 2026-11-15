# World Boss V24 — Account Raid fairness audit and role-utility integrity

**Decision/date:** 15 November 2026. **Status: hidden, test-only; NOT released.** Builds on the V22 48-hour uninterrupted Saturday–Sunday battle period, five-day preparation, three attempts/account, and V23 private settlement prototype. No live World Boss, migrations, rewards, routes, inventory debits, or balance changes.

## What the audit measures

- **90 authentic-stat synthetic fights** covering two equipment tiers (T2, T4), two distinct five-character class combinations together spanning all nine classes, three current World Boss prototypes (Hollowroot, Sunscar, Frostmarch), all three global phases (Armored, Exposed, Enraged), and 1/2/3/4/5 owned-character rosters.
- Each combat is generated from **real V12 online equipment, skill and companion derivation** using synthetic GameStates from the region fixture generator. This is **not a sampled live player population** or approved benchmark. Boss attack/defense figures in these tests are deliberately *synthetic*.
- A read-only `auditWorldBossAccountReplayV24` compares each character's engine-determined damage, effective healing, interrupts, damage received and survival against the frozen V22 ledger. A mismatch is rejected. The proposed World HP damage is independently recalculated from the rank-weighted ledger.
- Extra characters use the existing **100/12/7/5/4% damage shares**, giving a maximum extra 28% beyond the highest individual damage fighter when all five are equally effective. This baseline is **provisional** and requires human approval, real loadout distributions and an economy simulation; it has not been changed in V24.
- For each fight, the audit records raw total party damage, credited world-damage preview, strongest individual damage, diminishing-returns fraction, effective heals, interrupts, survivors, and any observed times where a larger party's best fighter deals less damage than the same character alone. No scoreboard or currency is awarded.
- `unattributedShieldAbsorbed` and `uncreditedShieldApplied` are **observations only**. Current shared-engine combat events do not sufficiently link damage prevention to the specific Tank/Support protector; assigning role-normalized World Impact or World Sigils from these values would create unearned rewards. **Do not pay or rank until authoritative owner-attributed prevention, cleanse and amplification evidence is available.**
- Test rejects tampered character healing, an altered account HP result, duplicated roster ledger, and other inconsistencies before any contribution is considered.

## Fairness questions remaining before final numerical tuning

1. **One vs five characters:** Report real per-tier per-boss raid performance distribution, not only the mathematical 128% ceiling. More fighters change targeting, survival and healer effectiveness; the same strongest character might deal *less* damage in a larger raid under different conditions.
2. **Class and role parity:** Test all nine classes as solo and in representative 1–5-member layouts, especially heavy Tank or Support accounts versus Damage-heavy accounts. Evaluate actual shields consumed, interrupts, mitigation and healing; don't award unused shields, pointless overheal, or intentionally farmable damage soaking.
3. **Boss kits:** V22's generic World Sweep/World Cast time-driven boss is not the final authored 14-round three-boss combat. Re-run calibration on the final Hollowroot/Sunscar/Frostmarch mechanics, phases and Guards (Pass 3).
4. **Economy:** Keep three account-wide attacks and the theoretical maximum 100 Sigils per event. Rewards must not multiply with character count. Global HP, milestones and War Camp donations need population-aware modelling using actual consented eligible activity.
5. **Security/production:** V23 settlement, recovery and worker lease validation need dedicated green CI plus two-real-worker PostgreSQL tests, runtime Auth, verified owned-state and War Camp readers, durable replays, private DB transactions, abuse bounds, and staged migration review. All flags remain off.

## Evidence and verification

- Pure audit helper: `backend/src/server/combat/world-boss-account-balance-v24.ts`
- Real GameState, V12 snapshot, V22 engine audit: `apps/mobile/tests/world-boss-account-balance-v24.ts`
- Focused CI workflow: `.github/workflows/world-boss-v12-validation.yml`

**Pre-review requirement:** the focused World Boss v10–v24 workflow must pass. Synthetic output is descriptive, not a production balancing decision. CI results may take time and are not assumed green just because files were committed.
