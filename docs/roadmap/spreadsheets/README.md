# Veldryn — Roadmap & Feature Design Workbooks

**One major game mode or substantial feature per spreadsheet.** This folder is the version-controlled design archive, not the app's live data or production configuration.

## Active designs

| Design | Status | Workbook backup in GitHub | Normal Excel file |
| --- | --- | --- | --- |
| **Guild PvE / Guild Expeditions** | Detailed draft v3 · 2026-11-09 | [Guild PvE XLSX backup](./Veldryn_Guild_PvE_Expeditions_Design_v3_2026-11-09.xlsx.b64) | [Open in Google Drive](https://docs.google.com/spreadsheets/d/14iQJt2zBTN93EoXMBKr-TMNTgBBcCgha/edit?usp=drivesdk) |
| **Party Events** | **Expanded design draft v1 (no rollout)** · 2026-11-10 · [readable design brief](../party-events-design-v1.md) · 11-sheet workbook, three-week cadence, three phases, Day 8 boss, economy, rewards and release gates | [Party Events XLSX backup](./Veldryn_Party_Events_Design_v1_2026-11-10.xlsx.b64) | [Open Excel workbook in Google Drive](https://docs.google.com/spreadsheets/d/1f7v8LJQbsGotR3q3CmdJH0ow9RuFi2Km/edit?usp=drivesdk) |
| **World Bosses** | **V9 disabled server loadout & atomic receipt foundation** · [V9 technical status](../world-boss-secure-foundation-v9.md) · [V9 private SQL proposal (never executed)](../world-boss-private-schema-proposal-v9.sql) · **v8 combat + role fairness polish (hidden)** · [v8 integrity design and tests](../world-boss-combat-polish-v8.md) · **Hidden v7 attempt + Echo settlement prototypes · 2026-11-10** · [v7 transaction and matching notes](../world-boss-transaction-prototype-v7.md) · **Disabled 14-round prototype v6 · 2026-11-10** · [v6 scheduler engineering notes](../world-boss-round-scheduler-v6.md) · [v5 three-boss encounter design](../world-bosses-three-boss-contract-v5.md) · **Three-boss encounter design v5 · 2026-11-10** · [v5 engineering contract](../world-bosses-three-boss-contract-v5.md) · [Sunscar 42 rounds](./world-bosses-sunscar-rounds-v5.csv) · [Frostmarch 42 rounds](./world-bosses-frostmarch-rounds-v5.csv) · **Test-only combat calibration v4** · [Engine findings](../world-bosses-hollowroot-engine-calibration-v4.md) · [damage/survival output](./world-bosses-hollowroot-engine-summary-v4.csv) · [role-utility output](./world-bosses-hollowroot-engine-counterplay-v4.csv) · [pressure sweep](./world-bosses-hollowroot-engine-pressure-v4.csv) · **Focused draft v3** · [Hollowroot encounter + balance brief](../world-bosses-hollowroot-v3.md) · [42-round encounter CSV](./world-bosses-hollowroot-rounds-v3.csv) · [T1–T4 War Camp CSV](./world-bosses-war-supplies-v3.csv) · [population simulation CSV](./world-bosses-simulation-v3.csv) · [v2 foundation](../world-bosses-design-v2.md) | [Historical v1 XLSX backup](./Veldryn_World_Bosses_Design_v1_2026-11-09.xlsx.b64) | [Historical v1 workbook](https://docs.google.com/spreadsheets/d/1WH1auLjuEPnTjhTP8YBOuWtyUeV3ehO9/edit?usp=drivesdk) |
| **Player Market economy** | Draft v11 · minimum lots, seller tax, review-only pricing · 2026-11-10 | [V11 economy rules CSV](./player-market-economy-v11.csv) | [V11 economy release plan](../player-market-economy-v11.md) |

**Player Market history:** [V10 starter price ranges](./player-market-price-corridors-v10.csv) and [original V10 plan](../player-market-price-ranges-v10.md) remain archived as the initial hidden pricing pass. V11 supersedes the proposed economy rules without activating trading.

**World Bosses v9 CI:** **All 343 Mobile Core checks and the complete workflow passed** in [GitHub run 42826494757](https://github.com/elroynbenjamins/Veldryn/actions/runs/42826494757). This includes server-resolved roster conversion and test-only concurrent HP receipt simulations. No actual Supabase migration or runtime event has been enabled.

**World Bosses v9:** Added a verified PvE snapshot adapter, portable SHA256 roster/seed receipt binding, server-only Echo loaders and an in-memory concurrent transaction emulator. Proposed a private PostgreSQL reservation/finalization design under `docs/roadmap/` only — **not a migration, no production database change or activation**. [V9 detailed plan](../world-boss-secure-foundation-v9.md). 

**World Bosses T1–T4 evidence:** [36-row equipped and mixed Echo calibration results](./world-boss-equipped-calibration-v8-test-only.csv), from CI run 42822807286 (1,728 combat samples). All 341 Mobile Core checks passed; overall workflow failed afterward on separate Companion validation. **All sampled squads survived, so boss difficulty is not yet tuned.**

**World Bosses v8 evidence:** [36-row pressure data](./world-boss-pressure-v8-test-only.csv), [54-row Tank/Support counterfactual data](./world-boss-role-counterfactual-v8-test-only.csv) (both extracted from CI run 42822128536, all 340 Core checks passed). The synthetic level-25 squads remained fully alive even with disabled recovery/interception; **boss difficulty is NOT calibrated**. A further 1,728 equipped/mixed-tier simulated-fight test has been added and awaits CI verification. No live feature activation.

**World Bosses v8:** Normal boss hits during warning rounds, multi-target spores, Support-first reactions, real HP-only Tank protection, shield-owner replay attribution and a benchmark-gated, non-rewarding World Impact preview are in the disabled simulator. Added a 1,620-fight Tank/Support counterfactual suite. **No World Boss live balance, player loadouts, currency, event or database configuration is enabled.** [Pass details](../world-boss-combat-polish-v8.md).

**World Bosses v7:** Test-only server-source modules now model three account-wide battle attempts, replay/idempotency, global boss HP thresholds and Residual Echo accounting, plus fair role/bracket Echo matching with NPC fallbacks. They are registered in Mobile Core CI. **This is an in-memory serial transaction model, not a safe production database settlement, and World Bosses remain disabled.** [Technical review](../world-boss-transaction-prototype-v7.md).

**World Bosses v6:** A test-only deterministic 14-round simulator now exists in the backend source, driven by 126 authored cues across the three bosses. It reuses current combat calculations/class definitions for a round-based test adapter and is registered in core CI. **Unverified until CI/typecheck results are observed, not production-accurate, and not live**; no event, reward or database backend was enabled. [Engineering scope and blockers](../world-boss-round-scheduler-v6.md).

**World Bosses v5:** Full three-boss rotation design: exact 14-round scripts across three global phases for Sunscar and Frostmarch (84 new authored rows), building on the existing 42 Hollowroot rounds. Added an authoritative ledger/telegraph contract, role counterplay and calibration/rollout gates. **All v5 numbers remain proposals, no live World Boss is activated.** The standalone nine-sheet `Veldryn_World_Bosses_Design_v5_2026-11-10.xlsx` is available as a conversation download; its .xlsx binary is not yet mirrored to GitHub/Drive, while the authoritative v5 encounter spec and individual CSV scripts are committed here.

**World Bosses v4:** The latest technical pass is a **test-only 812-run deterministic engine calibration**, with the current nine class kits, actual equipped T1–T4 game stat inputs, 36 outcome summaries, 18 role counterfactuals and 54 pressure-sweep results. It is **not** a real 14-round World Boss event or production balance change. In baseline tests every full squad survived; higher pressure shows that Support utility has a meaningful protective effect. The full findings and caveats are in the v4 brief.

**World Bosses v3:** The latest focused pass is the Hollowroot brief plus three code-reviewable CSV files above. The standalone **23-sheet** `Veldryn_World_Bosses_Design_v3_2026-11-10.xlsx` (v2 foundation + v3 Hollowroot rounds, supply-time formulas, synthetic scenarios, power brackets, role fairness and QA) was exported as a conversation artifact; the v3 XLSX binary has **not been mirrored to GitHub or Drive**. Previous v2 and v1 remain archived in Git history, and the v1 `.xlsx.b64` backup still decodes normally. **All world-boss work remains design-only.**

**Party Events v1:** Expanded design documentation builds on the merged-but-disabled hidden v2 backend prototype. The standalone **11-sheet** workbook includes the active/off cycle, twelve variations, supply budget formulas, special-objective proposals, boss scaling, exact provisional reward formulas, UX, server contracts and release QA. Its SHA-256 is `030e1fa0891b51f7ebce3e25c0c4c5fad5eedb26e95e49aecce71a804b2d8014` (35,322 decoded bytes). The Google Drive file is a normal `.xlsx` copy; GitHub contains an exact base64 backup. **No Party Events service, migration, scheduler, reward payout, UI or leaderboard was activated in this design pass.**

The former combined PvE workbook was superseded by these two split files. The prior combined version remains available in Git history, rather than cluttering this active folder.

## Structure & naming

Keep exactly **one workbook per major feature/game mode** rather than expanding a massive all-in-one roadmap spreadsheet. Each workbook may have multiple tabs for concept, requirements, encounters, UI/UX, architecture, formulas, reward economy, QA, and release readiness.

Suggested future standalone workbooks include Party Events, Guild PvP, Arena, Leaderboards, a complete Player Market workbook, World Expansion / Equipment Tier 5+, and Gameplay Refinement. The Player Market currently has a standalone versioned CSV pricing proposal, not an approved trading workbook. Create only when the corresponding design exists; don't add empty placeholder workbooks.

Use `Veldryn_<Feature>_Design_vN_YYYY-MM-DD.xlsx`. Clearly mark `Draft`, `Reviewed`, `Approved`, or `Implemented` inside the workbook. Maintain the latest active version and preserve significant prior milestones through Git history.

## Working with the GitHub backups

The connected GitHub writing interface currently accepts **UTF-8 text files**, so the exact Excel bytes are checked in as `.xlsx.b64` backups. These are not ordinary spreadsheets until decoded. The Google Drive copies linked above are ordinary Excel files.

Recover a workbook on **macOS/Linux**:

```bash
base64 --decode Veldryn_Party_Events_Design_v1_2026-11-10.xlsx.b64 > Veldryn_Party_Events_Design_v1_2026-11-10.xlsx
base64 --decode Veldryn_Guild_PvE_Expeditions_Design_v3_2026-11-09.xlsx.b64 > Veldryn_Guild_PvE_Expeditions_Design_v3_2026-11-09.xlsx
base64 --decode Veldryn_World_Bosses_Design_v1_2026-11-09.xlsx.b64 > Veldryn_World_Bosses_Design_v1_2026-11-09.xlsx
```

Recover any one on **Windows PowerShell**:

```powershell
$base='Veldryn_Guild_PvE_Expeditions_Design_v3_2026-11-09.xlsx'
[IO.File]::WriteAllBytes($base, [Convert]::FromBase64String([IO.File]::ReadAllText("$base.b64").Trim()))
```

### Integrity checks

| Design | Decoded bytes | SHA-256 of XLSX |
| --- | ---: | --- |
| Party Events | 35,322 | `030e1fa0891b51f7ebce3e25c0c4c5fad5eedb26e95e49aecce71a804b2d8014` |
| Guild PvE | 54,572 | `06721d7b3ebf451c8a3cf0a9c9ff7eb4d4cb30af67b2be86326de048cf6a23b3` |
| World Bosses | 9,502 | `67d55c4acee22c4c34c01d46b9bfbd9121a5f5bf5cd0f97a38c09245d436f4a3` |

## Safety

These files describe future features; they are **not** production rules, database migrations, backend code, or live game configuration. An `Approved` design does not mean it has been implemented. Keep API credentials and sensitive user data out of design workbooks.
