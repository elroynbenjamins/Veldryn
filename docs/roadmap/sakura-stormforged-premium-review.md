# Sakura Enchantment & Stormforged Sovereign — approved direction, isolated review

Status: concept approved; first layout/identity contract only. No new live cosmetics, grants, store entries, billing, blessing, migrations, or gameplay changes. Intended premium/Ascendant parity; exact release entitlement to be confirmed before wiring. Existing four-set integration is independent.

| Component | Sakura Enchantment | Stormforged Sovereign |
|---|---|---|
| Frame | Rose-gold filigree, layered pink blossoms and champagne highlights | Blackened steel, sculpted silver corners and electric-blue channels |
| Background | Moonlit sakura garden, soft lanterns, petals; quiet readable central opening | Thunderkeep silhouette, mountain storm, subtle electric-blue depth; quiet central opening |
| Effect | Gentle petal waltz, occasional tiny heart and blossom glint | Traveling perimeter lightning, engraved runes, controlled pulse |
| Pet | Pink-white spirit fox, blossom collar, curled fluffy tail | Armored charcoal direwolf, blue eyes, restrained lightning |
| Badge (static) | Gold blossom with rose gemstone | Silver wolf crest with blue gemstone |
| Profile icon (static) | Sakura flower medallion | Stormforged wolf medallion |
| Name style | Rose-pink gradient | Electric-blue/silver gradient |

## Asset and native motion contract
- Reference showcase geometry 340 x 205; support 320–480 logical px and font scale <=1.05, normal accessible profile fallback outside range. Sakura pet left / Stormforged pet right; preserve all identity text, portrait, badges and guild information.
- Produce independent 1020 x 615 showcase and 1024 x 576 standard transparent frames, matching background wide and square exports, standalone pet 512 and 96 px, showcase pose and padded idle atlas; static badge large and small exports; standalone FX textures. Optimize WebP; compare same-scale alpha coverage, rail width and protected apertures against the approved four existing sets before registration.
- Match the current six standard / eight showcase border ornament node reference. Native parent clock, 24 s coordinated showcase loop; no full-frame GIF or per-particle timers; restrained ambient motion for separately equipped pieces. Pet idle atlas cadence subject to visual and performance review. Reduced motion: static frame/background/pet, no decorative motion. Stop when offscreen or backgrounded. Keep lightning smooth and non-strobing; no full-screen flashes.
- Sakura: staggered petal travel and slow bloom crest glows. Stormforged: staggered rail electric pulses and crest glows. Use equal visual prominence, not identical palettes or brightness. Do not cross identity or interaction-safe bounds.
- Alternate pet and no-pet modes must retain profile readability. Mixed pieces use ordinary compatible rendering; no implied ownership. No animation on badges.

## Integration and acceptance
1. Generate original Veldryn artwork, inspect real alpha, asset dimensions, file sizes and decoded atlas cells. Compare both sets alongside existing premium sets at actual phone size.
2. Build native effect adapters with closed loops, geometry tests and offscreen/reduced-motion checks. Keep static fallback if art is unavailable.
3. Register exact IDs consistently in renderer, icons, badge authority, name style, account ownership and wardrobe labels. Never infer access from assets or mutable save. If private Ultra Luxe grant model is chosen, never disclose unowned items in listings or wardrobe counts; equipped public profiles remain renderable.
4. Quick Set Equip must require complete verified ownership, preserve user selections where appropriate, avoid auto-equipping on grant, support individual pieces, and use existing save flow. All genders/classes can equip.
5. Verify build/type checks and native small-screen appearance, motion parity, performance, persistence/relaunch, nonowner visibility, grants/revocation and mixed-piece fallback. No automatic grants or live rollout. Private test-account grant only after actual assets and entitlement wiring are approved.

First-pass candidate IDs/layout helpers are in apps/mobile/src/core/next-premium-set-review.ts. They are deliberately not imported by production. Additional title/icon labels, left/right layout and name gradient are proposed implementation defaults, not independently approved cosmetics. Artwork and native implementation are outstanding.
