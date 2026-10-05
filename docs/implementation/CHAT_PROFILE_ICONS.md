# Chat sender profile icons

## Correction — 2026-10-05

`ChatMessageRow` now passes its sender's `accountId` to the shared
`IdentityArtwork` component. World, Guild, and Party chat already supply that
account ID, so the correction applies to all three message logs.

Previously the row supplied only a display name. The shared artwork component
therefore could not resolve a sender profile and always displayed the neutral
account icon.

The existing identity provider resolves the selected profile icon and class
through `guild_identities_v3`, then renders the existing profile artwork. Its
batched account lookup, refresh cadence, privacy rules, and fallback behaviour
are preserved. The change adds no per-message profile request and does not
change message history, composition, delivery, or moderation.

## Validation

- Full mobile TypeScript check: passed.
- `node tools/validate-chat-usability.mjs`: passed.
- `node tools/validate-guild-chat.mjs`: passed.
- `node tools/validate-chat-attention.mjs`: passed.
- `git diff --check`: passed.

No new artwork or database migration is required. This mobile component change
needs a new Android build; an installed-device check is still required after
installing that build.
