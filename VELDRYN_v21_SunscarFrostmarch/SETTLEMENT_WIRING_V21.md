# v21 Settlement / Runtime Wiring

## Regional activities
`SUNSCAR_ACTIVITIES_V21` and `FROSTMARCH_ACTIVITIES_V21` are content definitions. Wire them into the existing authoritative activity settlement service rather than trusting timers or rewards from the client.

Each settlement should continue to emit the existing standardized social contribution receipt where eligible. Party Contracts, Guild Projects, Party Events and Regional Crises may consume that receipt independently under their own caps/eligibility rules.

## Weather
Resolve weather/season on the server. Weather modifies registered activity/combat inputs only. Never let the client submit the multiplier that was applied.

Weather cannot block region/story/boss access and does not create a persistent Condition system.

## Side quests / achievements / collection
Use current quest, achievement and collection ownership tables/services where they exist. Do not create duplicate progression ledgers merely because the definitions are versioned in the region registry.

## Dungeon rewards
Whitepine Hunt, Shiverlake Descent and Choir Caverns use the v20 Live Dungeon/Q-Mode settlement paths. Reward eligibility is participation-based and idempotent. Equipment hooks remain generic until the gear rework.

## Boss mastery
Mastery checks should be derived from authoritative encounter events (telegraph hit/avoid, prison break, phase completion), not client booleans. Mastery rewards are prestige/cosmetic/collection-progress oriented and are not a hidden permanent power ladder.

## Content versions
A run/activity/quest should snapshot or record the active content version when it starts if later resolution could depend on content payload. Never allow an activation/rollback mid-run to reinterpret an already-started run under a different definition.
