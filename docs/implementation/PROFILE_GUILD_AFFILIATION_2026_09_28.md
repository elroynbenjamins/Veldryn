# Profile guild affiliation

- Public and audience-preview cards show a compact clickable `Guild: [TAG]` box fixed to the artwork's bottom-left, aligned with Player Showcase at top-left. Its visual height is 28px with an expanded touch area. Offline guilds without a tag show simply `Guild`.
- Personal/editor cards have no guild button or separate details footer: name, title and level/class appear in a top-left Player Showcase panel over the artwork. The online self-profile also explicitly hides the guild button.
- Clicking loads the full guild identity card using the existing guild directory/detail reader. Local previews use explicit fixture data; online failures show a retry state, not invented guild cosmetics. Closing discards late responses.
- Signed-in guild identity comes from the existing identity RPC and signed-in guild directory, not local account cosmetics. Unknown/deleted guilds are hidden. Failed detail lookups preserve only a known tag, with no invented banner.
- Offline mode uses its actual fixed Bloomwardens guild. Online previews do not fall back to that offline membership.
- Guild reads happen only after profile visibility is authorized; no permissions are expanded. Self-preview loading is session-keyed and refreshed on foreground.
- New/renamed guild names are limited to 21 characters, including spaces, with the same existing normalization rules. Input counter, client validation and a separate database trigger enforce this. Existing names are not rewritten; unrelated updates remain valid. Guild-card names use one line with ellipsis when needed.
- Migration `20260928204145_guild_name_display_limit.sql` is prepared but not deployed. It is independent of the existing identity-name hardening migration and was tested in both application orders.
- Existing 320×180 pixel-art sources use crisp web scaling. Both personal and public cards cap at 480px, preventing unconstrained desktop stretching. No artwork regeneration or artificial detail was added.

## Verification

TypeScript noEmit, existing profile/guild regression tests, and the new `profile-guild-affiliation.cjs` tests cover the projection, lookup errors, hidden profiles, deleted guilds, and no-guild state.
Browser QA uses the memory-only `?storeScreen=profile-identity` fixture and real card components, with 288px, 400px and 720px containers, long names, and guild/no-guild controls.

`tools/test-guild-name-limit-db.mjs` uses isolated PGlite PostgreSQL to verify accepted/rejected lengths, renames, unchanged older names, existing safety rules and restricted trigger-function access. Card-loader tests cover local cards, direct IDs, tag-only fallback, complete cosmetic mapping and missing guilds.

A live read-only query using the configured public key returned PostgreSQL 42501 (insufficient privilege without a signed-in session). No access controls were changed. An authenticated live-account end-to-end check and native-device visual check remain unverified.
