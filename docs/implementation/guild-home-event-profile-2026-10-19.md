# Guild home identity and event profile backgrounds

Guild Home now starts with the full customized GuildIdentitySummary (banner, frame, background, tag, name color, level and motto). The existing membership-gated notice panel follows immediately, ahead of the tabs and participation/action cards. Loading and unavailable identity states retain a readable fallback. Other Guild destinations retain their compact section headings.

The released Veilbreak catalogue now offers `veilbreak_background`: `bg_veilbreak` / Veilbreak Gothic Moonruins, Epic, 1,800 Veil Shards, limit one. This is a personal profile background. Existing art has moved from the future registry into the released profile gallery; future events remain excluded. The offer also appears in the event collection through the canonical reward catalogue.

Inspecting a background shows the player's profile card with that background, ownership instructions, cost and balance. The shared profile preview now adapts its portrait and name layout at narrow widths. Owned shop offers show permanent ownership rather than a misleading currency shortfall.

Validation:

- Full mobile TypeScript check passed.
- Guild UI suite passed, including roster/shop interaction coverage and notice placement contracts.
- Live event tests passed: background discovery, exact shop source/cost, purchase, durable account ownership, collection state, duplicate rejection and profile equip.
- Profile customization and event reward trail tests passed; active event release graph passed.
- Backend authenticated gameplay HTTP/input-authority/replay suite passed.
- Browser verified card/notice order, background inspection, 3,200 → 1,400 balance after the memory-only purchase, Owned state and narrow-layout refinement in obsidian/ivory.

Production gameplay handler was deployed as version 28, ACTIVE. Downloaded source SHA-256 exactly matches the tested bundle: `fd1a10a7f3f475fa722bd72c50171e9fe34399d74186740b5e6b2b0780beef7e`. Existing handler authentication is retained; anonymous requests return HTTP 401 `auth_required`. No database migration or real player purchase was performed for this update. The mobile presentation requires the next app build.

Review captures: `output/guild-event-profile-update/guild-home.png` and `output/guild-event-profile-update/event-background.png`. These use development fixtures; no live player data is shown.
