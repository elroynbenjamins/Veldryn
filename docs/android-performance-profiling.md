# Veldryn performance profiling — Android and synthetic CI

This is a measurement plan, not a claim that an Android device or production server has already been profiled.

## Synthetic CI safety checks

- `apps/mobile/tests/gamewide-performance-scenarios.ts` measures pure Inventory and Companion projections on oversized, locally generated fixtures. The test verifies state immutability and exact unique equipment identity, while logging per-run timings (not FPS).
- `backend/online/tests/gameplay-load.ts` uses an in-memory, account-scoped mock of the atomic gameplay commit RPC. It sends parallel, competing Bank Gold requests and reads for 24 simulated accounts. It asserts one winning write per optimistic version, non-negative/conserved Gold, independent account receipts, replay safety and no cross-account reads. Reported p50/p95 are *in-process handler timings*, **not** real network/database performance.
- Real Supabase/Postgres contention and live Dungeon room behavior must be measured separately in an isolated staging environment with test accounts. Never run synthetic pressure against production.

## Android recording on Windows

Requirements: Android Platform Tools (`adb`) and Node.js 22+, a device with USB debugging enabled, and a Veldryn Android build installed. Do not use personal account data in shared reports.

From the repository root, run:

```powershell
adb devices
.\tools\profile-android-ui.ps1 -Phase Start -Scenario inventory -RefreshHz 120
```

Exercise the **Inventory** screen with a large test inventory: switch between Inventory/Bank, search, sort, scroll through the item grid, open an exact-copy detail and return. After 30–60 seconds:

```powershell
.\tools\profile-android-ui.ps1 -Phase Capture -Scenario inventory -RefreshHz 120
```

Repeat `Start` and `Capture` with `-Scenario companions`, `guild`, `dungeon`, and `home`. Use the screen refresh rate actually configured on the device (`60`, `90`, or `120`); otherwise the jank threshold will be wrong. Capture both cold-start and warmed runs. For a live Dungeon, use a dedicated staging/test party and avoid stressing actual players.

The script saves `*-frames.txt`, `*-memory.txt`, and `*-cpu.txt` under your Windows temporary `VeldrynPerformance` directory. Those raw files can contain device or account context: inspect before sharing, never commit them to Git.

The frame analyzer reports sampled frame count, p50/p95/p99 duration, and frames exceeding one or two display-frame budgets. These are *app-wide* frame samples gathered during the chosen scenario; Android `dumpsys gfxinfo` is not a full flamegraph. For a deeper analysis, collect a Perfetto trace with Android Studio and correlate slow frames with JS/React render profiling.

## Compare runs consistently

Keep the same phone, build, refresh rate, login/test save, run duration and sequence of interactions. Record results for at least three runs per scenario, including the cold/warm distinction. Compare both frame-time tails and app memory; optimize only regressions that reproduce. A CPU simulation result does not prove a GPU/rendering improvement or increased concurrent-player capacity.

## Release safety

No profiling tool writes to production. If staged load testing is introduced later, require a dedicated staging Supabase project, a bounded concurrency budget, a hard test timeout and test accounts before sending any traffic. Do not include auth tokens or private account identifiers in performance reports.
