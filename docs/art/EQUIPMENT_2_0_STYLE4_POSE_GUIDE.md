# Equipment 2.0 — Style 4 pose, facing and composition lock

**Status:** Visual direction **approved by user on 2026-11-19**; production reference-sheet and ten cropped slot masters **not yet archived or calibrated**. This document is the slot-level pose authority for all *new* Veldryn 2.0 craft, dungeon, Party Event and World Boss gear. The chosen illustration in the project conversation is a design reference, **not** a production-ready atlas. Do not interpret the illustration's mock checkerboard as a background to draw into final assets.

**Style:** **Style 4: grounded dark-fantasy storybook inventory painting** — appealing traditional painted gear, slightly rough brushes, painterly edge highlights, believable worn leather, matte metal, layered cloth and visible real-world joins. **Not** coarse/rough pixel-cluster art, vector-flat, hyperreal PBR, photographic concept art, anime, high-saturation mobile gacha, or softly blurred airbrush.

**Stable renderer:** `veldryn-eq2-storybook-v1`. Existing 192×192 / 5×2 960×384 canvas and 26px alpha-gutter contracts remain unchanged. A versioned source-of-truth JSON lives in [equipment-2-0-pose-lock.json](equipment-2-0-pose-lock.json). A style choice changes the rendering contract, **not** item IDs, class equipment restrictions, recipes, drops or asset availability.

## 1. Shared composition and camera

- **Virtual object view, not character pose:** single disembodied equipment piece, or precisely two matching pieces for gloves/boots/legs; no wearer, limbs, stand, floor, cast floor shadow, UI border, legend, or platform.
- **Canvas:** 192×192 transparent square; use actual object silhouette inside **x,y=26..165**. Center near **(96,96)** visually, not by forcing every item to fill the same square. Do not enlarge endgame items: same-slot perceived weight remains stable.
- **Camera:** icon-oriented product illustration, about 10–15° elevated to show selective top surfaces, mostly frontal with about 10–20° side reveal where natural. The exact shape depends on the slot; **a global fixed yaw is wrong** for rings, bows, swords and capes. Never draw a bird's-eye or side/profile-only view.
- **Light:** *viewer upper-left*, ~10–11 o'clock, warm neutral. Brightest edges on upper-left planes; subdued neutral/cool shadow lower-right and undersides. One lighting system regardless of Sunscar/Frostmarch/event theme. No glow or rarity VFX baked in.
- **Canvas axis:** `x` goes to the viewer's **right**, `y` goes **down**. All "left", "right", "upper", "lower", "toward" and diagonal instructions refer to what the player sees on-screen, **not** the item's anatomical left/right.
- **No auto-mirroring or rotation:** a prior-generation candidate can be a pose reference only when it already faces the approved way. Flipping a shield or weapon typically also reverses light and creates wrong construction.
- **Centered visual mass:** keep small rings and amulets deliberately smaller than breastplates; maintain consistent weight within the same slot across every tier/class/source. A pair must fit together inside one cell.
- **One item, no cropping:** include full extremities, blade tip, straps, hem, handles and buckles. Reject clipped candidates rather than stretching/squeezing or 'fixing' with empty-padding.
- **Painterly but sharp:** crisp silhouette and readable material planes at 32/40/48/64px. Brushgrain is allowed but must not create blur, wispy stray pixels or microfiligree at 40px.

## 2. One canonical view for each slot

**Read as the standard default, not a command to make every design a copy.** Special weapon families follow the variants below. Angle tolerances are **visual review guides**, not output of the geometry validator; match the signed-off slot master over a numerical interpretation.

| Slot | Facing / orientation (relative to viewer) | Stance / visible construction | Forbidden drift |
| --- | --- | --- | --- |
| **Helmet** | Upright, opening/visor toward camera, turn **10–15° toward viewer-right**; crown/top lightly visible | Slight side shell visible on **image-right**; brim roughly horizontal, ear/cheek guards balanced | Full side view, open rear as primary, turned left, dramatic tilt |
| **Chest** | Upright, torso front faces camera; **10–15° toward viewer-right**, matching helmet | Broad shoulders; front closure visible; only subtle image-right side seam; no head/arms or character | Flat unshaded front, back armor, sideways chest, attached exposed body |
| **Gloves** | **Two** complete gauntlets side by side; palms/backs present matching approved master, **knuckles on top**, fingertips hang mostly **down-left** | Image-left glove slightly above/behind image-right by a small controlled offset; cuffs toward upper center | One glove, crossover, fingertips pointing up or random opposing directions |
| **Legs** | Upright *front of garment* toward camera, near-symmetric leg opening, subtle viewer-right three-quarter | Waistband roughly horizontal; both legs hang down naturally; no feet; one knee may be lightly behind | One leg only, wide splayed animation stance, long boots/soles |
| **Boots** | **Two** boots upright with openings up; toes advance gently toward **image-left** | Image-left boot sits slightly behind/higher than image-right boot; toe caps visible; coherent pair, same yaw | One boot, contradictory toe directions, toes directly upward |
| **Weapon (swords/daggers)** | **Hilt/grip upper-right, blade/tip lower-left**; diagonal axis about **35–50° to image vertical** | Front/flat blade face readable, crossguard upper-right of center; consistent metal highlights from upper-left | Inverted handle down-left/tip upper-right; horizontal sword; arbitrary flipped icon |
| **Weapon (axes/maces)** | Grip generally **lower-right**, striking head **upper-left**, so functional head silhouette reads clearly | Blade/hammer face shown front-three-quarter; shaft not fully horizontal; respect same-family anchor | Axe as a diagonal sword with head at bottom; hidden striking face |
| **Weapon (staves/spears)** | Tall shaft rises toward **upper-right**, lower end **lower-left**; about **15–25°** from vertical | Distinct head/tip visible, plausible shaft and material length; slight three-quarter | Flat diagonal across full frame, impossible shaft bowing, cropped top |
| **Weapon (bows)** | Mostly vertical, bow stave arcs toward **image-left** and string runs down **image-right** | Readable taut string and single stave, full ends; keep silhouette within safe inset | Horizontal bow, reversed arc/string, invisible bowstring, nonsensical grip |
| **Offhand (shield)** | Face toward viewer, mild **10–15° turn toward viewer-right** | Outer rim, center boss/crest and hint of image-right thickness; vertically upright | Back straps as primary, full profile, mirror-flipped crest |
| **Offhand (book/focus)** | Front cover/focal face toward viewer, 10–20° top/side visible | Book upright with spine on **image-left**; focus has one unmistakable central form | Reverse-spine randomization, book pages facing away |
| **Offhand (dagger)** | One distinct offhand blade; hilt **upper-right**, tip **lower-left** but with **more vertical** axis than main dagger | Smaller, compact outline; differs in blade silhouette from main dagger | Duplication/mirroring of main weapon, two blades in one slot |
| **Cape** | **Back-facing** garment (the one major view exception): collar at top, outer fabric faces viewer | Folds descend downward, broad hem, one side pulled slightly image-right; partial inner lining allowed at edge | Front of wearer, floating hood/head, sweeping cape fan covering entire canvas |
| **Amulet** | Nearly frontal: pendant upright facing camera; cord/chain forms a gentle open **U** | Pendant hangs low at center; side loop balanced; small forward tilt for thickness | Huge ring-like necklace, sideways pendant, separate floating beads |
| **Ring** | Single ring at **three-quarter angle**, band through-hole clearly visible; front/top edge tipped **upper-left** | Elliptical hole + material band have believable depth; small rotational tilt toward image-right | Coin-like front circle, dead-flat side profile, multiple rings or detached gem |

### Crucial view exceptions

The helmet, chest and shield should share a **front three-quarter viewer-right** family, but the **cape is shown from behind** and jewelry has its own product angle. The selected Style 4 illustration also points the **starter sword down-left**; therefore the earlier guide's blanket “handle lower-left / point upper-right” is explicitly **superseded** for straight blades in this style. For axes, maces, bows and staves **use the family-specific axis**, not the sword's.

**Two-piece equipment:** gloves and boots show exactly two full objects. Keep the same back/front offset for every tier instead of rerolling spacing, overlap and front-most side. Legs are a single garment with two legs, not two separate trousers.

**Class specificity:** a bow remains a bow, a staff remains a staff, and an offhand dagger remains one smaller dagger. Do not turn every weapon into a sword to satisfy a universal sword diagonal.

## 3. Numeric composition *guides* and actual constraints

- **Canvas and gutters are machine-enforced:** 192×192 canvas, 26px alpha inset; total allowed alpha rectangle is x/y from 26 through 165 (exclusive bound 166).
- **Visual target center:** approximate (96,96); allow shape-dependent perceptual offsets (e.g. sword mass is diagonal; boots' paired toes are left-heavy), but compare centroid with the **matching-slot signed-off reference**.
- **Object size:** compare longest occupied dimension with accepted prior-tier same-slot icon; automated optional tolerance ±20% is an exception-catching gate, not an ideal range. For full sets, target much closer to reference: **roughly ±8–10%** in visual review.
- **Camera yaw:** +10–15° “toward viewer-right” *for armor only*; avoid rigid reinterpretation on jewelry, capes, paired items and non-sword weapons.
- **Object lean:** armor waist/torso should remain essentially upright (≤5° from vertical), but cloth folds/sword axis reflect their own natural pose.
- **Pair offset:** match the accepted slot master; keep difference in top-edge y position subtle, no dramatic action pose.
- **Light:** upper-left 10–11 o'clock for **every piece**, including weapons diagonally rotated.
- **Material identity:** reveal enough of the flat/front face to identify material/crest, but also a restrained side thickness so it reads as a dimensional object.
- **Detail frequency:** first communicate “helmet/boot/ring/sword”, then silhouette and primary material, then joins/straps, then tiny wear. Anything invisible at 40px should not carry important identity.

The numbers are **art direction**, not measurable yaw from rendered PNG. Do not claim CI verifies view direction or a 3D angle without a learned reference/image review pipeline.

## 4. Set continuity and progression

For every *named set*, hold the camera and position for each slot constant from T1 to T9, and across special chest rewards. Power progression comes from craftsmanship, bulk distribution within a fixed silhouette, more durable materials, distinctive joints, resource-derived trims, and restrained motifs—**not bigger icons, different camera angles or ever-brighter effects**.

Every set has an identity card: 1–2 material sources, dominant dark/mid/light palette, metal finish, fastener language, cloak hem geometry, helmet brow profile, and weapon/offhand family. A chest drop can have a powerful story and ornate composition without departing from the same visual rules.

**Do not paint rarity** on the actual item: game UI supplies the rarity border, effects, quality, gems, and stat roll affordances.

## 5. Source/reference approval sequence

1. Mark Style 4's *direction* approved: complete for this decision.
2. Archive an **actual reference copy** of the user's fourth example in review storage, then record source SHA256 and label it **style-direction-only**. It is **not** a finished transparent ten-slot icon set and may have imperfect silhouettes or sample background.
3. Redraw/generate one **real T1 armor-plus-weapon calibration set**, each item individually with transparent edges and a correct Style 4 slot pose. Capture actual 192px approved cropped masters; build a ten-slot comparison sheet. Human-review direction, shadows and legibility at 40px.
4. Review a contrasting cloth class and a T5 equivalent; confirm the visual model holds across materials, tiers and different weapon axes.
5. Approve ten slot masters **individually** and record reference-kit version + hash. Only then allow production batch generation. `direction_approved` **is not the same** as `referenceKit.status=approved`.

**Reviewer checklist:** adjacent items upright, sword direction consistent, axe/staff/bow exceptions correct, fronts/backs deliberate, every glove/boot pair facing the same way, camera elevation constant, no mirrored light, no cropping, readable 40px comparison, validated compression and pixel-accurate alpha.

## 6. Per-item generation instruction block

Copy this with the canonical slot/weapon subtype resolved from the pose-lock JSON, and append to the existing identity/material packet:

> STYLE 4 / `veldryn-eq2-storybook-v1`: grounded painterly dark-fantasy inventory item, warm upper-left key, hand-painted wear, crisp edge silhouette, soft but controlled form shading, matte iron/leather/cloth as appropriate, no pixel-cluster renderer. **POSE LOCK:** [slot pose sentence and weapon-family override], viewer-relative coordinates, match signed-off reference item *facing, lean, camera elevation and visual scale*. One isolated gear object (or required paired items), no human/mannequin, no table, ground, cast shadow, frame, background or extra pieces. Entire object inside the 192px canvas's 26px transparent gutter. Source resource forms and palette match active game assets. Export isolated transparent lossless master; final mobile delivery is measured/optimized WebP.

**Do not use this prose as a substitute for the actual reference images.** Stable generation demands both the written lock and fixed cropped visual masters.
