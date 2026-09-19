# v20 Control Center registration

Use the v17.3 schema-driven Admin Command Bus. Do not build another custom admin page.

Recommended commands:

- `live_dungeon.cancel_ready_check` — High — Owner/Editor; releases accepted members back to queue.
- `live_dungeon.recover_run_from_checkpoint` — Critical — Owner + second Owner approval; reloads canonical latest checkpoint, never accepts arbitrary run JSON from browser.
- `live_dungeon.end_stuck_run` — Critical — Owner + second Owner approval; marks terminal and calculates rewards through normal eligibility logic.
- `live_dungeon.clear_stale_ticket` — High — server verifies ticket expiry/ownership state first.
- `live_dungeon.recalculate_reward_eligibility` — High — recomputes from canonical participation receipts.

Region-content commands:

- `region_content.validate_version` — validates staged content/hash/references without publishing.
- `region_content.publish_version` — Critical — Owner approval; calls the authoritative publish service with expected hash.
- `region_content.retire_version` — Critical — Owner approval; retirement only, never in-place editing of published content.

Remote-config keys:

- `feature.live_dungeons.enabled` (existing key if already present)
- `content.sunscar.enabled`
- `live_dungeon.ready_check_seconds` — live-safe range 10–45
- `live_dungeon.route_vote_seconds` — live-safe range 5–15
- `live_dungeon.reconnect_grace_seconds` — live-safe range 15–60
- `live_dungeon.safety_ai_after_seconds` — live-safe range 20–90

Do NOT expose strict role composition, reward bundles, boss stats or Sunscar enemy stats as casually editable live config. Those are versioned content/balance definitions.
