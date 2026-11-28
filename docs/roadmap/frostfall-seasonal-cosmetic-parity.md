# Frostfall seasonal cosmetics — art parity gate

Status: artwork replacements require review; this change restores the existing Veilbreak guild frame mapping. Do not treat this document as approval to release replacement artwork.

## Reference contract

| Reward | Existing reference | Replacement target |
| --- | --- | --- |
| Aurora Bellframe (personal) | Gloamward, 1024 × 576 PNG | 1024 × 576 transparent WebP, roughly 150–250 KiB |
| Frozen Majesty (guild) | Veil Masquerade, 1672 × 941 WebP | 1672 × 941 transparent WebP, roughly 250–350 KiB |
| Frostfall Standard (guild) | Bat Moon, 1024 × 1536 WebP | 1024 × 1536 transparent WebP; aim under 350 KiB |

File sizes are optimization targets, not a reason to degrade image quality. Use original high-resolution art, not an upscale of existing lower-resolution pixels.

- Match Veilbreak's detailed fantasy metalwork, material shading, ornament density and narrow rails; keep distinctive winter silver, deep blue, ice crystals, restrained holly and warm lanterns.
- Personal border: keep a clean transparent center, smaller centered bell and snowflake, thin side/top/bottom rails, and ornaments within the existing profile scene safe perimeter. Test segmented rendering, not only the raw artwork.
- Guild border: match the reference's wide composition and preserve ornament geometry across full-profile and swatch layouts. No opaque background, colored matte, white halo, or cutoff corners.
- Guild banner: match the existing 2:3 portrait banner's fabric shading, hanging hardware and detail. Preserve the recognizable winter snowflake heraldry and clean alpha.
- Retain Winter's Aurora background unless native preview identifies crop/readability problems; visually the current landscape composition is strong.
- Preserve all reward IDs, event visibility, milestones, entitlement checks and dates. Do not change event activation or reward issuance.
- Verify on small phones and normal phones, full profile, collection tiles, guild appearance preview and public guild profile. Check alpha on both dark and light backgrounds, file dimensions and compressed bundle size.

Current Frostfall asset findings: personal 1024 × 576 / 157258 bytes; guild border 720 × 540 / 115724 bytes; guild banner 427 × 640 / 73726 bytes. The guild border and banner need native-resolution regeneration rather than upscaling.
