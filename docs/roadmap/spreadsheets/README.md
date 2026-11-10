# Veldryn — Roadmap & Feature Design Workbooks

**One major game mode or substantial feature per spreadsheet.** This folder is the version-controlled design archive, not the app's live data or production configuration.

## Active designs

| Design | Status | Workbook backup in GitHub | Normal Excel file |
| --- | --- | --- | --- |
| **Guild PvE / Guild Expeditions** | Detailed draft v3 · 2026-11-09 | [Guild PvE XLSX backup](./Veldryn_Guild_PvE_Expeditions_Design_v3_2026-11-09.xlsx.b64) | [Open in Google Drive](https://docs.google.com/spreadsheets/d/14iQJt2zBTN93EoXMBKr-TMNTgBBcCgha/edit?usp=drivesdk) |
| **World Bosses** | **Focused draft v3 · 2026-11-10** · [Hollowroot encounter + balance brief](../world-bosses-hollowroot-v3.md) · [42-round encounter CSV](./world-bosses-hollowroot-rounds-v3.csv) · [T1–T4 War Camp CSV](./world-bosses-war-supplies-v3.csv) · [population simulation CSV](./world-bosses-simulation-v3.csv) · [v2 foundation](../world-bosses-design-v2.md) | [Historical v1 XLSX backup](./Veldryn_World_Bosses_Design_v1_2026-11-09.xlsx.b64) | [Historical v1 workbook](https://docs.google.com/spreadsheets/d/1WH1auLjuEPnTjhTP8YBOuWtyUeV3ehO9/edit?usp=drivesdk) |
| **Player Market price corridors** | Draft v10 · hidden pricing foundation · 2026-11-10 | [CSV: 35 resources, 9 gear tiers](./player-market-price-corridors-v10.csv) | [Design & release gates](../player-market-price-ranges-v10.md) |

**World Bosses v3:** The latest focused pass is the Hollowroot brief plus three code-reviewable CSV files above. The standalone **23-sheet** `Veldryn_World_Bosses_Design_v3_2026-11-10.xlsx` (v2 foundation + v3 Hollowroot rounds, supply-time formulas, synthetic scenarios, power brackets, role fairness and QA) was exported as a conversation artifact; the v3 XLSX binary has **not been mirrored to GitHub or Drive**. Previous v2 and v1 remain archived in Git history, and the v1 `.xlsx.b64` backup still decodes normally. **All world-boss work remains design-only.**

The former combined PvE workbook was superseded by these two split files. The prior combined version remains available in Git history, rather than cluttering this active folder.

## Structure & naming

Keep exactly **one workbook per major feature/game mode** rather than expanding a massive all-in-one roadmap spreadsheet. Each workbook may have multiple tabs for concept, requirements, encounters, UI/UX, architecture, formulas, reward economy, QA, and release readiness.

Suggested future standalone workbooks include Party Events, Guild PvP, Arena, Leaderboards, a complete Player Market workbook, World Expansion / Equipment Tier 5+, and Gameplay Refinement. The Player Market currently has a standalone versioned CSV pricing proposal, not an approved trading workbook. Create only when the corresponding design exists; don't add empty placeholder workbooks.

Use `Veldryn_<Feature>_Design_vN_YYYY-MM-DD.xlsx`. Clearly mark `Draft`, `Reviewed`, `Approved`, or `Implemented` inside the workbook. Maintain the latest active version and preserve significant prior milestones through Git history.

## Working with the GitHub backups

The connected GitHub writing interface currently accepts **UTF-8 text files**, so the exact Excel bytes are checked in as `.xlsx.b64` backups. These are not ordinary spreadsheets until decoded. The Google Drive copies linked above are ordinary Excel files.

Recover a workbook on **macOS/Linux**:

```bash
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
| Guild PvE | 54,572 | `06721d7b3ebf451c8a3cf0a9c9ff7eb4d4cb30af67b2be86326de048cf6a23b3` |
| World Bosses | 9,502 | `67d55c4acee22c4c34c01d46b9bfbd9121a5f5bf5cd0f97a38c09245d436f4a3` |

## Safety

These files describe future features; they are **not** production rules, database migrations, backend code, or live game configuration. An `Approved` design does not mean it has been implemented. Keep API credentials and sensitive user data out of design workbooks.
