# V54 Guild launch population caps

VELDRYN launches with deliberately smaller guilds so the social layer still feels active before the game has a large population.

## Launch rules

- Guild Level cap: **10**
- Starting member capacity: **12**
- Launch member capacity ceiling: **20**
- Capacity is upgraded through the existing **Open Halls** Community guild upgrade.
- Open Halls has four launch ranks:

| Open Halls rank | Guild Level required | Member capacity |
| ---: | ---: | ---: |
| 0 | 1 | 12 |
| 1 | 2 | 14 |
| 2 | 4 | 16 |
| 3 | 7 | 18 |
| 4 | 10 | 20 |

The member cap is server-authoritative through `guilds.member_cap`, so open joins, applications and invites all share the same limit.

## Why this launch shape

A 12-player starting guild is large enough to support parties, asynchronous Guild Projects and early Guild PvE without needing a large launch population. The gradual 14/16/18/20 expansion gives guild progression visible value without creating many half-empty 30–50 player guilds.

## Future expansion

Do not change historic guild IDs or reset guild progression. A later content/live-ops migration can:

1. raise the Guild Level constraint above 10;
2. add Open Halls ranks beyond 4;
3. raise the `guilds.member_cap` constraint/default as the active population justifies it.

No player Market dependency is introduced by this system.
