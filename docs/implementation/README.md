# Implementation documents

This folder contains active contracts and current system notes. Superseded phase-by-phase reports are retained in Git history rather than kept beside the live documentation.

## Core contracts

- `TEST_CONTRACT.md` — required verification and regression boundaries.
- `UI_DESIGN_TOKENS.md` — semantic UI and accessibility rules.
- `PROTOTYPE_OVERRIDES.md` — intentional differences from the design workbook.
- `DEBUG_TOOLS.md` and `LOCAL_TELEMETRY.md` — development-only diagnostics.

## Current systems

- `PARTIES_CONTRACTS_GUILD_SEEKERS_V1.md` — persistent Parties, Contracts, Recruitment, Guild seekers and server authority.
- `V16_IMPLEMENTATION_REPORT.md` — exact v16 merge inventory, applied migrations, verification results and remaining limits.
- `ONLINE_GAMEPLAY_STATUS.md` — deployed server-owned gameplay, account flow, hosted verification and remaining release work.
- `CHAT_ACCOUNT_RELIABILITY_20261004.md` — chat delivery, retained channel state, guest verification, inline composer and 25-message history, combat/UI validation recovery, production migration evidence, and remaining device checks.
- `CHAT_ACCOUNT_RECOVERY_20261005.md` — latency-safe refresh, retry receipts, exact read cursors, resumable recovery, ordered auth operations, and migration/test evidence.
- `APP_BUILD_IDENTITY.md` — installed version/build diagnostics, shared update-policy version source, and current native release verification limits.
- `PROFILE_IDENTITY_SURFACES.md` — selected profile icons across social, Guild, Live and Echo dungeon identities, including the cosmetic projection and privacy/lifecycle contract.
- `COOP_CURRENT_STATUS.md` — consolidated co-op functionality, acceptance evidence, release boundaries, and next passes.
- `SEASONS_AND_WEATHER.md` — authoritative mobile season/weather behavior.
- `NOVICE_CHARACTER_SYSTEM.md` — novice crafting and class-set progression.
- `CHARACTER_RUNTIME_INTEGRATION.md` — compatibility notes for the active character runtime mapping.

## Active refinement notes

- `CHARACTER_REFINEMENT_BATCH_1.md`
- `PLAYABILITY_REFINEMENT_BATCH_2.md`
- `INVENTORY_REFINEMENT_BATCH_3.md`
- `JOURNAL_REFINEMENT_BATCH_4.md`

These notes remain because they document current behavior and unresolved device/accessibility validation, not because they represent alternate versions of the design authority.
