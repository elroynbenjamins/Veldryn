# VELDRYN Discord announcement bot

The repository includes a small REST-based Discord bot publisher in `backend/src/server/discord`. It posts official embeds for:

- event start and end;
- patch releases;
- scheduled maintenance;
- new regions, dungeons, systems, and other content.

## Discord Developer Portal

1. Create an application at the Discord Developer Portal.
2. Add a bot user and copy the token into the deployment secret store as `DISCORD_BOT_TOKEN`.
3. Invite it with the `bot` scope and only these permissions in the announcement channels:
   - View Channel
   - Send Messages
   - Embed Links
4. Create the announcement channels and record their IDs with Developer Mode enabled.

The bot does not need administrator, moderation, message history, or member-list access. Role mentions are disabled by default and are only allowed for an explicitly supplied role ID.

## Environment

Start from `backend/discord-bot.env.example`:

```text
DISCORD_BOT_TOKEN=secret
DISCORD_ANNOUNCEMENTS_CHANNEL_ID=general-announcements-id
DISCORD_EVENT_CHANNEL_ID=event-news-id
DISCORD_RELEASE_CHANNEL_ID=patch-notes-id
DISCORD_MAINTENANCE_CHANNEL_ID=maintenance-id
DISCORD_CONTENT_CHANNEL_ID=new-content-id
DISCORD_DRY_RUN=false
```

Unset channel-specific values fall back to `DISCORD_ANNOUNCEMENTS_CHANNEL_ID`.

## Publishing

The CLI is intended for the trusted backend/control-center or release pipeline, never the mobile client. Examples are documented in `backend/README.md`. Every announcement has a deterministic idempotency key, so retrying the same event or release in one process does not post duplicates.

Use `DISCORD_DRY_RUN=true` for previews. Keep the token in the hosting provider's secret manager and rotate it immediately if it is ever logged or committed.
