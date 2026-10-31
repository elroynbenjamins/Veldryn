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

No profiling tool writes to production. The optional staging workload refuses unconfirmed project targets, limits account count and workload, and enforces an overall 90-second deadline. Never run it against production or regular player accounts. Do not include auth tokens or private account identifiers in performance reports.

## Repeatable frame + memory comparison (new)

The Windows capture tool also saves a privacy-minimal `*-summary.json` with frame p50/p95/p99, jank percentage and Android app PSS, plus three labels you choose. It excludes raw package, device serial, user data and app logs. Use the **same** phone, selected display refresh rate, test save, UI scenario and interaction sequence on both builds.

```powershell
# From the repository root. Use a label instead of any real device ID.
.\tools\profile-android-ui.ps1 -Phase Start -Scenario inventory -RefreshHz 120 -DeviceProfile phoneA -BuildLabel baseline
# Exercise Inventory for 30-60 seconds.
.\tools\profile-android-ui.ps1 -Phase Capture -Scenario inventory -RefreshHz 120 -DeviceProfile phoneA -BuildLabel baseline
```

Repeat each scenario **at least three times** on the baseline AAB and on the candidate AAB. Repeat the exact sequence for Companions, Guild, Dungeon and Home. The default `-LaunchMode Cold` force-stops the app; use `-LaunchMode Warm` on both Start and Capture to profile an already-loaded app without force-stopping it. Cold and warm samples are labeled separately and cannot be mixed in comparisons. Use `-Serial` when multiple ADB devices are connected.

```powershell
# Replace with your six actual summary paths (not the raw framestats files).
node tools/android-perf-report.mjs compare --baseline old1-summary.json --baseline old2-summary.json --baseline old3-summary.json --candidate new1-summary.json --candidate new2-summary.json --candidate new3-summary.json
```

The comparison returns per-metric medians and review flags for p95 frame time over +15%, over-budget frames over +3 percentage points, or app PSS over +15%. These thresholds indicate **review candidates**, not release gates. At least 120 valid frames per summary are required. No synthetic CI output may be interpreted as device frame rate.

## Staging database and concurrency measurement (new)

Read-only staging observations on 2026-10-31 showed little or no populated gameplay data. The biggest recorded cumulative query-time consumers were `maintain_minute_tick_v18` (8,831 calls, 15.19 ms average) and `process_online_tick_server_v1` (17,650 calls, 7.60 ms average). These measurements are historical and do not demonstrate a problem for populated player accounts. Inspect query plans against representative test fixtures before changing cron schedules or adding indexes.

`tools/profile-staging-gameplay.mjs` provides a **manual, bounded, write-enabled staging test** of the actual gameplay endpoint and PostgreSQL optimistic version fencing. It is never run by CI. It first authenticates two to four distinct test accounts and verifies all are idle; only then does it issue two competing, no-op `settings` commands per account, verify that exactly one wins and one receives `stale_state`, replay the winning receipt, and confirm unchanged Gold and bank balances. It reports sanitized p50/p95 request timings. The cap is two rounds, two contenders per account, eight seconds per request and a 90-second total deadline.

In a private terminal session, set these environment variables (do not commit credentials, console history or raw responses):

```powershell
$env:STAGING_PROFILE_CONFIRM = 'I_CONFIRM_ISOLATED_STAGING_LOAD_TEST'
$env:STAGING_PROFILE_URL = 'https://YOUR_STAGING_REF.supabase.co'
$env:STAGING_PROFILE_PROJECT_REF = 'YOUR_STAGING_REF'
$env:STAGING_PROFILE_CONFIRM_REF = 'YOUR_STAGING_REF'
$env:STAGING_PROFILE_PRODUCTION_REF = 'YOUR_PRODUCTION_REF'
$env:STAGING_PROFILE_TEST_EMAIL_MARKER = '+perf'
$env:STAGING_PROFILE_ANON_KEY = '<staging publishable / anon key>'
$env:STAGING_PROFILE_ACCOUNTS_JSON = '[{"email":"qa+perf.one@example.net","password":"private"},{"email":"qa+perf.two@example.net","password":"private"}]'
$env:STAGING_PROFILE_ROUNDS = '1'
node tools/profile-staging-gameplay.mjs
```

The dedicated test accounts must already exist in **the isolated staging project**, with test characters and no active activities. This refuses unconfirmed environments, non-Supabase hosts, the known production project ref, duplicate owners, non-test-marked emails and more than four accounts. **Never point the profiler at production** or run it from a regular player account. A failed or timed-out write may still have committed server-side; the tool deliberately does not auto-retry unknown outcomes. It also does not test live Dungeon room behavior, which requires a dedicated staged party and a separate manual playthrough.
