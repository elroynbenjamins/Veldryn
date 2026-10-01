# Ironwarden T1 equipment icon candidates

The three `-v2` transparent 5 x 2 sheets were accepted as the Ironwarden T1
equipment icon designs. Runtime copies are bound in
`../../assets/equipment-t1-ironwarden/` and cropped by the inventory renderer.
The `-v2`
sheets revise each shield to match the approved
T1 three-path [character concept](../t1-t9-visual-previews/ironwarden-t1-three-paths-concept-v2.png).
The original sheets remain beside them for comparison.

Read each sheet left to right: helmet, chest, gloves, legs, boots on the top
row; weapon, off-hand, cape, amulet, ring on the bottom row. Set and piece
IDs follow the live `equipment_catalog_t1_t9_v33.json` catalog.

| Accepted sheet | Set | Piece IDs in grid order |
| --- | --- | --- |
| `T1_001-oathbound-rampart-icon-sheet-v2.png` | `T1_001` Oathbound Rampart | `T1P_001`-`T1P_007`, `T1X_001`-`T1X_003` |
| `T1_002-chainmarshal-plate-icon-sheet-v2.png` | `T1_002` Chainmarshal Plate | `T1P_008`-`T1P_014`, `T1X_004`-`T1X_006` |
| `T1_003-emberwatch-reprisal-icon-sheet-v2.png` | `T1_003` Emberwatch Reprisal | `T1P_015`-`T1P_021`, `T1X_007`-`T1X_009` |

Each candidate is a 1774 x 887 RGBA PNG with transparent outer pixels.
All 30 pieces are registered for in-game inventory artwork. The original
review sheets remain unmodified.

## Bastion T1 accepted icons

These sheets follow the accepted Bastion T1 three-path concept board. The v2
review sheets center each hammer haft at the midpoint of the head and keep
the handle visible below the grip. Runtime copies are bound in
`../../assets/equipment-t1-bastion/`. Each sheet uses the same row-major slot
order above.

| Normalized review sheet | Set | Piece IDs in grid order |
| --- | --- | --- |
| `T1_004-first-citadel-icon-sheet-v2-1774x887.png` | `T1_004` First Citadel | `T1P_022`-`T1P_028`, `T1X_010`-`T1X_012` |
| `T1_005-sigil-aegis-icon-sheet-v2-1774x887.png` | `T1_005` Sigil Aegis | `T1P_029`-`T1P_035`, `T1X_013`-`T1X_015` |
| `T1_006-last-gate-icon-sheet-v3-1774x887.png` | `T1_006` Last Gate | `T1P_036`-`T1P_042`, `T1X_016`-`T1X_018` |

All three normalized Bastion sheets and all three accepted Ironwarden review
sheets use the inventory renderer's 1774 x 887 canvas and fixed 5 x 2 grid.
Each slot therefore has the same crop geometry across both classes. Sigil
Aegis and Last Gate were fitted cell by cell with proportions preserved; their
original generated sheets remain alongside the normalized review versions.
Ironwarden's runtime sheets already match this canvas and remain unchanged.

## Dreadguard T1 accepted icons

These three review sheets follow the
[Dreadguard T1 concept](../t1-t9-visual-previews/dreadguard-t1-three-paths-concept-v1.png).
They use the same transparent 1774 x 887 canvas and 5 x 2 slot order above.
The broad rounded Pact shield, notched Vanguard shield, and rectangular Doom
shield remain distinct; their chained weapon heads are respectively a mace,
gravehook, and short blade. All three sheets are accepted. Runtime copies are
bound in `../../assets/equipment-t1-dreadguard/`.

| Review sheet | Set | Piece IDs in grid order |
| --- | --- | --- |
| `T1_007-blood-iron-pact-icon-sheet-v1.png` | `T1_007` Blood-Iron Pact | `T1P_043`-`T1P_049`, `T1X_019`-`T1X_021` |
| `T1_008-grave-vanguard-icon-sheet-v1.png` | `T1_008` Grave Vanguard | `T1P_050`-`T1P_056`, `T1X_022`-`T1X_024` |
| `T1_009-doom-bastion-icon-sheet-v1.png` | `T1_009` Doom Bastion | `T1P_057`-`T1P_063`, `T1X_025`-`T1X_027` |

## Wayfinder T1 review candidates

These first-pass sheets use the accepted transparent 5 x 2 atlas canvas and
fixed slot order. They cover the next class pass: Falcon Mark's balanced
falcon-brow hood, Greenstride Skirmisher's split mobility cloak, and
Startracker's long precise sight-line silhouette. Runtime copies are bound in
`../../assets/equipment-t1-wayfinder/`.

| Review sheet | Set | Piece IDs in grid order |
| --- | --- | --- |
| `T1_010-falcon-mark-icon-sheet-v1.png` | `T1_010` Falcon Mark | `T1P_064`-`T1P_070`, `T1X_028`-`T1X_030` |
| `T1_011-greenstride-skirmisher-icon-sheet-v1.png` | `T1_011` Greenstride Skirmisher | `T1P_071`-`T1P_077`, `T1X_031`-`T1X_033` |
| `T1_012-startracker-icon-sheet-v1.png` | `T1_012` Startracker | `T1P_078`-`T1P_084`, `T1X_034`-`T1X_036` |

## Ravager T1 review candidates

These beginner-tier sheets use the same transparent 5 x 2 atlas and fixed
slot order. The visual language is intentionally fieldborn: patched cloth,
worn leather, rough bindings, and only a few mismatched dull-iron plates.
Each set now has a distinct silhouette and repeating construction details:
Goremaw uses a jagged bite-blade and tooth/jaw marks, Warhowl uses a hooked
greataxe and howl-vent details, and Sundering uses wedge/breaker geometry.
Sundering's wearable war charm is a separate piece from its round neck
amulet.
Runtime copies are bound in `../../assets/equipment-t1-ravager/`.

| Review sheet | Set | Piece IDs in grid order |
| --- | --- | --- |
| `T1_013-goremaw-assault-icon-sheet-v1.png` | `T1_013` Goremaw Assault | `T1P_085`-`T1P_091`, `T1X_037`-`T1X_039` |
| `T1_014-warhowl-frenzy-icon-sheet-v1.png` | `T1_014` Warhowl Frenzy | `T1P_092`-`T1P_098`, `T1X_040`-`T1X_042` |
| `T1_015-sundering-colossus-icon-sheet-v1.png` | `T1_015` Sundering Colossus | `T1P_099`-`T1P_105`, `T1X_043`-`T1X_045` |
