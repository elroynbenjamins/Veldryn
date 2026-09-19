# v18 -> v17.3 Full Control Center wiring

No custom v18 admin page is required. The v17.3 Control Center renders commands from `ops_admin_command_registry`.

Migration 030 registers the v18 command schemas.

Wire `handler_key` values to trusted game-domain handlers:

- `guild.project.regenerate_board`
- `guild.project.cancel_stuck`
- `guild.project.repair_progress`
- `guild.project.force_finalize`
- `guild.decree.cancel`

Rules:

- never perform raw SQL from browser input;
- `repair_progress` must require Owner + second approval when v17.3 approvals are enabled;
- exact repair writes a new admin command/audit event and does not mutate historical contribution receipts;
- `force_finalize` re-runs normal completion evaluation and cannot set `complete=true` directly;
- cancelling a Development Project must not automatically mint refunds; any verified compensation is a separate audited reward/economy command;
- content-catalog sync should add `guild_project_template` and `guild_decree` entity types for inspection/dropdowns.

Recommended Operations metrics:

- `guild.project.started`
- `guild.project.completed`
- `guild.project.expired`
- `guild.project.completion_fraction`
- `guild.project.meaningful_contributors`
- `guild.project.donation_failed`
- `guild.project.outbox_dead_letter`
- `guild.decree.activated`
