# Equipment UI asset gaps

The first Equipment-screen implementation uses live native borders, text, selection states and clearly labeled `ART PENDING` tiles where an item has no registered icon. It does not treat those fallbacks as final artwork.

| Required filename or family | Dimensions | Purpose |
|---|---:|---|
| `assets/ui/veldryn/panel/{top-left,top,top-right,right,bottom-right,bottom,bottom-left,left}.png` | corners 24×24 px; horizontal edges 8×24 px; vertical edges 24×8 px | Approved gold nine-slice panel trim with matching join pixels. |
| `assets/ui/veldryn/equipment-selection-frame.png` | 96×96 px, transparent | Non-color selected-slot treatment over rarity frames. |
| `assets/items/equipment/basic_sword.png` | 96×96 px, transparent | Canonical Basic Sword icon. The live slot is currently labeled `ART PENDING`; recruit-set weapon art is not reused under a different item identity. |
| `assets/ui/veldryn/empty-slots/{helmet,chest,legs,gloves,boots,weapon,offhand,cape,ring,amulet}.png` | 48×48 px each, transparent | Slot-specific silhouettes for empty equipment positions. |
| `assets/ui/veldryn/stats/{hp,current-hp,defense,attack,power,readiness}.png` | 24×24 px each, transparent | Approved pixel icons for the live stat rows. |
| `assets/navigation/more_24.png` | 24×24 px, transparent | Dedicated More/menu icon; the current approved Settings icon remains the temporary fallback. |
| `assets/character-runtime/equipment-starting/<class>/<male-or-female>-front.png` | 128×160 logical canvas per character; density variants allowed | Starting-skin equipment preview with class weapon/off-hand visible. Until supplied, the screen uses an approved class showcase skin while preserving the saved body presentation. |

All character canvases must retain a common ground line and padding. Item art should remain unframed so rarity, selection and status stay live UI layers.

## Resource icon status

The regional gathering set is complete at `apps/mobile/assets/items/resources/` as ten unframed, transparent 256×256 PNGs: Copper Ore, Aster-Iron Ore, Oathstone Ore, Echo Quartz, Greenwood Log, Ironwood Log, Crownwood Log, Silverfin, River Eel, and Oathscale Pike. Their borders, quantities, rarity treatment, disabled states, and labels remain live UI.

The complete environment-status set is also available at `apps/mobile/assets/environment/` as four season and nine weather icons. The generated symbols are unframed transparent 128×128 PNGs; their top-bar button, labels, timers, and effect details remain live UI.

The following non-gathering inventory art is still missing and is not represented by a misleading substitute:

| Required filename or family | Dimensions | Purpose |
|---|---:|---|
| `assets/items/resources/{copper_ingot,aster_iron_ingot,oathstone_ingot,reinforced_fitting}.png` | 256×256 px each, transparent | Crafted smithing materials in Inventory and recipe requirements. |
| `assets/items/resources/{moss_fiber,wisp_dust,boar_hide,wolf_pelt,ironwood_fang,thorn_sap,troll_hide,oathglass_shard,echo_touched_pelt,torn_oathcloth,lanternsteel_shard,banner_ash,fallen_rivet,oathglass_fragment,gloam_dust,runebound_core,echo_bat_wing}.png` | 256×256 px each, transparent | Combat drops and salvage materials. |
| `assets/items/resources/{sunstone_ore,amberglass,astral_script,frostiron,rimeglass,choir_bloom}.png` | 256×256 px each, transparent | Later-region and set-progression materials. |
| `assets/items/food/{travel_ration,cooked_silverfin,seared_river_eel,ironwood_hunter_stew,roasted_oathscale_pike}.png` | 256×256 px each, transparent | Food inventory and auto-eat selection. |
| `assets/items/quest/fallen_knight_sigil.png` | 256×256 px, transparent | Fallen Knight quest reward. |
