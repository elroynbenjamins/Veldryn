# v17.2 cost & maintenance notes

The Control website remains a small private static/admin application on Cloudflare Pages with serverless Pages Functions. It does not require a permanently running web server.

Expected admin-site traffic is tiny. The game backend/database/player traffic will dominate infrastructure usage long before the Control site does.

Routine maintenance:
- normal remote-config changes, kill switches, reset visibility and support cases require no redeploy;
- adding a brand-new remote-config key or reset handler requires code/migration review;
- adding a fundamentally new game mechanic may require new telemetry and Control UI;
- review open alerts/dead letters and audit logs periodically;
- periodically test emergency switches and restore paths in staging.

Do not treat the primary Supabase database as a long-term high-volume analytics warehouse. v17.2 uses bounded aggregated metric buckets intentionally. If VELDRYN later needs detailed product analytics at scale, ship those events to a dedicated analytics system while keeping the Control dashboard on summarized metrics.
