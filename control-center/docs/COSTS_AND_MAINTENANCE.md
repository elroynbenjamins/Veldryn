# v17.3 cost & maintenance notes

VELDRYN Control remains a small private static/serverless application on Cloudflare Pages + Pages Functions. It does not need a permanently running admin web server.

At one/few-admin traffic, expected hosting usage is negligible compared with the actual VELDRYN game backend/database.

Routine operations that require **no admin-site code change**:
- create/clone/schedule normal events,
- validate/select existing reward bundles,
- create/disable Redeem Codes,
- announcements,
- registered Remote Config and kill-switch changes,
- Player Support cases and registered player corrections,
- reset retries/schedule changes,
- dead-letter review/retry,
- content-catalog synchronization.

Ordinary new items/skills/currencies/companions/rewards also do not need a new Control page; sync the admin content catalog.

A genuinely new game mechanic can still require a trusted backend handler/read model. The site intentionally does not solve this by allowing arbitrary SQL or arbitrary table editing.

Keep aggregated operational metrics bounded. If detailed analytics volume becomes large, move detailed product analytics to a dedicated analytics system and keep VELDRYN Control on summarized health/economy metrics.
