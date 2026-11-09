# Veldryn — Roadmap & Design Spreadsheets

This directory is the version-controlled home for Veldryn's **roadmap and detailed feature-design workbooks**. These are **planning artifacts only**, not live game configuration or migrations.

## Current workbook

| Feature | Version | File | Editable Drive copy |
| --- | --- | --- | --- |
| Guild Expeditions / Guild PvE, with World Boss reference | v3, 2026-11-09 | [PvE design workbook](./Veldryn_PvE_Master_Design_v3_2026-11-09.xlsx.b64) | [Open in Google Drive](https://docs.google.com/spreadsheets/d/1ATx1WV6n9IaSQrI-omI4crbMyrZ_-1Vc/edit?usp=drivesdk&ouid=103493422424761722541&rtpof=true&sd=true) |
| World Bosses (dedicated detailed mechanics) | v1, 2026-11-09 | [World Boss design spreadsheet (CSV)](./world-bosses-design-v1.csv) | Local eight-sheet Excel workbook created; not yet in Drive |

The PvE master workbook repository copy is stored as an **exact base64 backup** of its Excel workbook because the currently connected GitHub file-writing interface only supports UTF-8 text files. That PvE master file has not been converted to CSV or otherwise altered. The dedicated World Boss v1 design is additionally available as a standard CSV that opens directly in spreadsheet software.

**Restore the real .xlsx file:**

On macOS/Linux:

```bash
base64 --decode Veldryn_PvE_Master_Design_v3_2026-11-09.xlsx.b64 > Veldryn_PvE_Master_Design_v3_2026-11-09.xlsx
```

On Windows PowerShell:

```powershell
[IO.File]::WriteAllBytes('Veldryn_PvE_Master_Design_v3_2026-11-09.xlsx', [Convert]::FromBase64String([IO.File]::ReadAllText('Veldryn_PvE_Master_Design_v3_2026-11-09.xlsx.b64').Trim()))
```

The decoded file must have **56,721 bytes** and SHA-256:
`5ed22df5bd0e0a1eaa4877c383c0b2a9dfa2c1868d8d056368a56fac4d81d92c`.

## Future roadmap spreadsheets

Place planning spreadsheets for Party Events, World Bosses, Guild PvE, Guild PvP, Arena, Leaderboards, Player Market, equipment Tier 5+, and overall refinement here as separate versioned artifacts, or use additional tabs in an existing master workbook when concepts overlap.

## Conventions

- Use `Veldryn_<Feature>_Design_vN_YYYY-MM-DD.xlsx` for normal binary files when direct binary upload is available.
- Keep an index row here with date, version, subject, and canonical reference.
- Mark **Draft / Reviewed / Approved / Implemented** inside each design.
- Keep gameplay code, database migrations, credentials and internal deployment artifacts outside this directory.
- Avoid copying outdated versions indefinitely; keep useful milestones and a link to the latest design.
