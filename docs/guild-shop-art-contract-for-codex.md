# VELDRYN Guild Shop & Construction — Codex artwork contract

User is generating the artwork in Codex. **Do not rename these IDs**; they already
exist in the transaction catalogue, GameState ownership and UI. Match the
current VELDRYN mobile pixel-art style, static render pipeline and existing
`runtime_96`/profile-border conventions. Do not introduce animation.

## Assets Codex still needs to author

| Identity / asset | GameState or Guild key | Existing content name / role | Registration target |
|---|---|---|---|
| Guild Pet 1 | `GUILD_PET_001` | Stormwatch Fox (Rare pet) | `masterPetSourceById` / shared pet-art resolver |
| Guild Pet 2 | `GUILD_PET_002` | Oathwood Wyrmling (Epic *pet*) | `masterPetSourceById` / shared pet-art resolver |
| Guild Companion 1 | `GUILD_UNIT_001` | Stormwatch Sentinel, **Elite** tank | `companionArtSource` via companion art registry |
| Guild Companion 2 | `GUILD_UNIT_002` | Oathbound Seeker, **Elite** damage | `companionArtSource` via companion art registry |
| Guild Companion 3 | `GUILD_UNIT_003` | Dawncall Herald, **Elite** support | `companionArtSource` via companion art registry |
| Guild Token Profile Border 1 | `guild-border-silver` | Fellowship Silver | Existing profile collection border-art resolver |
| Guild Token Profile Border 2 | `guild-border-emerald` | Verdant Covenant | Existing profile collection border-art resolver |
| Guild Token Profile Border 3 | `guild-border-royal` | Royal Concord | Existing profile collection border-art resolver |
| Guild Token Profile Icon | `guild:stormwatch-crest` | Stormwatch Crest | Existing profile-icon art resolver; set artwork-ready only after mapping |
| Construction banner | `guild_banner_stormwatch` | Stormwatch Banner | `guildBannerSourceByKey` with exact key **`banner_guild_stormwatch`** |
| Construction frame | `guild_frame_verdant` | Verdant Fellowship | `guildBorderSourceByKey` with exact key **`border_guild_verdant`** |
| Guild Hall decoration | `guild_decoration_fellowship_statue` | Fellowship Statue | Guild Hall decoration presentation/placement, without stat bonuses |

Pet and companion IDs must remain the same in authoring and in both runtime
collectible/companion registrations; do **not** substitute existing art under
different IDs. Follow current neighboring asset formats and resolutions rather
than adding a custom incompatible image loader. Existing companion definitions
use `visual.portraitId` and `pixelSize:'96x96'`.

## Assets that are ALREADY available

The three five-emote packs intentionally reuse the existing approved art:
`emotes_fellowship` = `pet_set_a_01..05`,
`emotes_adventure` = `pet_set_a_06..10`, and
`emotes_legends` = `pet_set_b_01..05`.
**No extra 15 emote sprites need to be generated.** The ownership logic and
chat message anti-spoof checks already exist.

## Release sequence

1. Add and visually verify each asset and register its exact ID/key.
2. Run current mobile/companion/profile art coverage validators; verify borders
   are not clipped, pet/companion art resolves on compact mobile screens, and
   profile icon marks `artworkReady=true` only when an asset exists.
3. Run backend Guild Shop PR CI and a dedicated staging migration/deployment.
4. Release ONLY the approved store SKUs via
   `guild_shop_reward_catalogue.enabled`. **Never expose legacy purchase RPCs.**
   Once verified, selectively enable service-role execution of
   `guild_shop_purchase_server_v4` (atomic permanent GameState unlock).
5. Enable completed construction art in
   `guild_construction_cosmetic_releases.released`; verify ownership and
   officer-only selection using `update_guild_appearance_with_construction_v1`.
6. Finally enable approved construction project templates and
   `guild_construction_donate_server_v2` in staging, then controlled production.

The current **Guild level cap is 10**. Future level 14–20 items and the level-14
Fellowship Statue must remain unreleased until Guild progression is expanded.
Construction cosmetic **ownership**, **artwork release**, and **donation
availability** are deliberately three separate gates.
