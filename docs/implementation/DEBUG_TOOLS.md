# Development Debug Tools

Debug features must be excluded or hard-disabled in production builds.

Required actions:
- Set character level.
- Add XP.
- Add/remove gold.
- Add item stack.
- Unlock monster.
- Advance current activity clock by 1h / 8h.
- Complete/claim quest.
- Mark Fallen Knight defeated.
- Simulate N combat kills.
- Inspect/copy current save JSON.
- Reset save.

Rules:
- Debug mutations go through pure helper functions where possible.
- A debug screen should be gated by `__DEV__`.
- No debug method should be exported by a future production server RPC.
