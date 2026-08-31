# Expedition server security rules

1. Never accept final Marks, XP, loot, damage totals, clear status, or boon pools from the mobile client.
2. Snapshot loadout/stats when the run is created. Mid-run equipment changes do not alter the snapshot.
3. Store `content_version` and deterministic server seed proof on every run.
4. Every reward path needs an idempotency key or database unique constraint.
5. Lock reward counters and the run row during a reward claim.
6. Daily limits are convenience accelerators; the weekly pool is the canonical high-value budget.
7. Shop costs and purchase caps are looked up server-side; client values are display-only.
8. Q-Mode resolves against frozen Echo Profile versions, never a mutable live profile.
9. Do not expose the raw HMAC secret or deterministic RNG source to clients.
10. Telemetry is append-only and cannot grant gameplay rewards by itself.
