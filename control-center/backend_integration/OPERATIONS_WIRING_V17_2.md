# v17.2 backend wiring checklist

## 1. Remote config / feature gates
Instantiate one `VeldrynRemoteConfig` per backend process with a short cache (15s recommended). Enforce gates in authoritative server handlers, never only in React Native UI.

Minimum entry-point wiring:
- persistent Party create/invite/join -> `feature.parties.enabled`
- Party Contract accept/progress/claim -> `feature.party_contracts.enabled`
- Party Event contribution/claim -> `feature.party_events.enabled`
- Guild recruitment/application/invite -> `feature.guild_recruitment.enabled`
- Live Dungeon queue/run creation -> `feature.live_dungeons.enabled`
- start new craft -> `feature.crafting.enabled`; existing jobs may settle
- send chat -> `feature.chat.enabled`
- Companion Trial entry/progress -> `feature.companion_trials.enabled`
- reward grant/claim entry points -> `feature.reward_claims.enabled`
- all gameplay mutations first check `maintenance.write_actions_disabled`

For Party Event/social caps, remote config is a safety ceiling only:
`effective = Math.min(frozenDefinitionCap, remoteHardCap)`.
Never use remote config to silently increase a frozen live event cap.

Return client-safe resolved flags/tunables from the normal authenticated bootstrap/session API so mobile can hide disabled UI. Backend enforcement remains authoritative.

## 2. Economy / health telemetry
Wire `OpsMetrics` at transaction-success boundaries, not button taps. Recommended launch metrics:
- `economy.gold.created` by source
- `economy.gold.destroyed` by sink
- `economy.items.created` by source (keep itemId only if cardinality stays bounded)
- `activity.seconds` by skill
- `dungeon.completions` by mode
- `social.contribution_points` by system

Use hourly buckets. Do not use player/account IDs as metric dimensions.

## 3. Central reset worker
Run `runCentralResetTick` at least every minute from the existing scheduler/cron worker. Multiple worker instances are safe when the repository uses the supplied unique ledger and `claim_ops_reset_runs` RPC.

Handlers MUST be idempotent by `periodKey`.

Do not keep parallel feature-specific reset clocks after migration. Move each reset only after its old reset path is disabled/removed in the same deployment.

## 4. Player support index
Call `syncSupportAccount` on account login/profile-name changes/primary character changes. Use the existing public player ID if VELDRYN already has one; do not invent a second player ID system.

v17.2 originally introduced a read-mostly Support page. In v17.3, support cases/notes remain read-oriented while any actual player-state correction is routed through the audited Admin Command Bus. Do not add direct table-edit buttons to Support.

## 5. Alerts
Create/update `ops_alerts` from trusted monitoring jobs. Good first alert rules:
- worker heartbeat stale >5m
- reset run dead letter
- social contribution outbox dead letter
- gold net creation exceeds configured threshold vs trailing baseline
- reward claim error spike

## 6. Operations monitor / heartbeat
Wrap Party Live-Ops and central reset workers with `withRuntimeHeartbeat`. Run `runOperationsMonitor` on the existing scheduler (for example once per minute or every few minutes) to open/resolve stale-worker and dead-letter alerts. Keep the Gold-net threshold disabled (`0`) until a sensible baseline is observed in staging/production; then configure a conservative threshold instead of generating noisy alerts.
