# Sakura Spirit Fox — standalone artwork and idle atlas candidate

## Export
Original standalone RGBA illustration, 1254×1254, facing inward toward right-side identity. Removed disconnected low-alpha noise using main connected silhouette, cropped to source bounds and fitted to a square with grounded bottom and generous cell padding. Separate static portrait, showcase and icon textures. Artwork reviewed on a dark background at 256, 96 and 74 px. Final native visual parity remains open.

| Path under apps/mobile/assets/ascendant/sakura/ | Dimensions | Bytes | SHA-256 |
|---|---|---:|---|
| spirit_fox_512.webp | 512×512 | 82020 | 478fa94be496602bdb96f9bb68caacf6532d6298c5f788ced49f579ff8128813 |
| spirit_fox_showcase.webp | 256×256 | 28470 | c1ced2fa925b198211ce95304c1f61a2fad56e1219ae560ba98fccbb3ed754f0 |
| spirit_fox_96.webp | 96×96 | 6762 | 9ca7008b53aa1cb2b7f24a35835fd4ee49811cc86481c18b7a3ec26afe4e623e |
| spirit_fox_idle_atlas.webp | 768×768 | 249976 | 2d2b8ec3e7acaef94e9057cf98880a140b3113d04d0fb3bf78caf164e2ea0f92 |

Total 367,228 bytes. Offline overlay contains these four exact assets and sakura-pet-manifest.json. ZIP CRC checked. Not uploaded or registered yet.

## Motion verification
36 unique decoded RGBA cells, 128×128 each, 6×6 grid, 12 FPS, 3s loop. Localized continuous tail/ear deformation of one authored still; not hand-authored independent poses or blink/sit animations. Paws remain grounded; no baked aura or platform. Initial six-pixel alpha padding check failed in one pose; widened source margin and regenerated all assets. Final 36/36 decoded cells pass six-pixel padding even for alpha>0. Global cell bounds x0 8–10, y0 12–13, x1 119, y1 119. Native atlas motion should use the existing 24s parent clock and fallback static art; device QA needed. Outer transform should stay subtle and not double-amplify local deformation.

## Remaining
Stormforged standalone generation attempts still returned collection sheets; rejected. Static badges also remain pending. No production imports, no grant/store/monetization changes, no merge or activation. After upload verify actual binaries and manifest before registering review-only assets. Final visual parity requires same-size native comparison with all existing Ultra Luxe pets.
