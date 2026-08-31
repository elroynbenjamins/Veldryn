# Local Balance Telemetry Contract

During offline testing, telemetry remains local and contains no external analytics dependency.

Recommended events:
- session_started / session_ended
- activity_started / activity_claimed
- monster_unlocked
- item_dropped / item_equipped / item_sold / item_salvaged
- skill_action_claimed / recipe_crafted
- quest_completed / quest_claimed
- level_reached
- boss_attempted / boss_defeated

Useful fields:
`eventId`, `eventName`, `occurredAtMs`, `saveVersion`, `characterClass`, `characterLevel`, `activityId`, `elapsedSeconds`, `xpDelta`, `goldDelta`, `itemId`, `quantity`.

Do not log chat, personal data or device identifiers for this offline balance pass. Provide a dev-only export/clear action later.
