# Support activity recovery — production integration gate

## Scope and known defect
The current account save is one row with a selected character and inactive roster snapshots. The standard roster-switch command settles the **previous** character before selecting the new one. The existing commit function calls party settlement using the response's selected character ID. A roster-switch recovery therefore cannot guarantee correct character attribution or an untouched previous activity. Do not dispatch roster_switch through this tool, even after operator approval. Inactive previews are nonmutating.

## Active-character worker binding (next integration)
- Register the four progression support keys disabled initially, high risk, explicit approval and mandatory reason. The target must be an owned character and its account; verify the exact revision in a fresh read. Recheck operator role, claimed row, immutable approval and co-op/account reservations at execution time.
- Use the existing authoritative gameplay command engine and load/commit RPC selection, including verified entitlement/guild projections, server time and wallet CAS. Never set adminQa on recovery: normal earned contributions must be preserved.
- Reserve the support_ request namespace in the ordinary authenticated player endpoint before enabling this worker. Internal worker dispatch must not impersonate a player session or mint a JWT, expose a public route, accept a player save or arbitrary command, or bypass version checks.
- Persist the exact prepared step (including resolved highest node), its canonical command hash, operator, target account and character, original revision and approval in a service-only journal keyed by command UUID. Enforce immutable identity, unique key, RLS/no browser grants, atomic preparation and durable outcome. A repeat with changed parameters fails, while an exact repeat recovers the original gameplay receipt before checking current revision.
- Read a matching receipt from the appropriate normal or grant-aware RPC. Verify request hash, account ID, version, selected character and activity/region. Do not treat matching current state as proof of past success.
- One reviewed step per approved command. If travel precedes start, read the new revision and approve the next step. Do not silently repeat travel or chain another write.

## Inactive-character transaction requirements
Do not use the active-character commit on a temporarily switched response. Add a dedicated server-side transaction that:
1. Locks the account and relevant character wallets in consistent order; validates ownership, current active ID, expected save revision, target wallet and co-op reservations, checks exact prior receipt before stale-state checks.
2. Resolves the inactive character from the authoritative roster, not the caller's payload. Project the proper per-character skill levels, queue, quests, world flags, timestamps, fractional rewards and class training; preserve the selected character's exact gameplay fields and wallet. The existing roster snapshot omits top-level rewardRemainders and outOfCombatSinceMs, so their ownership/migration must be resolved rather than assuming ordinary switch is lossless.
3. Runs the same normal command engine on the target view with verified account-wide effects, target wallet, clock and event inputs. Restores the selected character and legacy personal-quest projection without settling it. Account-wide inventory/bank, entitlements, companions and seasonal ledgers must not be copied from stale data or overwritten.
4. Persists target snapshot, target character projection and target wallet, account revision and verified shared effects atomically. Party activity attribution must explicitly use the target character ID, guild intervals and event contribution deltas must use normal calculation paths; no duplicate credits. Do not change player_profiles.active_character_id.
5. Commits exact receipt and audit linkage; returns only scoped summary to Control. Retry after a lost response must recover receipt without running the engine again. Conflicting online mutations fail closed. Keep existing gameplay state readable by old clients.

## Verification before activation
- Focused compilation and regression; full Mobile Core and Edge bundle parity.
- Rollback database fixtures for active/inactive claims, travel, start, inventory overflow, wallet divergence, role revocation, stale versions, conflicting IDs, no selected-character change, receipt replay after a newer action, guild/party/event attribution, co-op lock and concurrent retries.
- No changes to player state, registration, SQL migration or deployment until these pass.

The initial use case is an inactive herbalism character switching to the highest available woodcutting node (Crownwood at woodcutting 18). This is a regression fixture, not proof of a production action.
