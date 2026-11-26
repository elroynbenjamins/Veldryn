# Wave 2 transparent portrait and projection hardening pass

All six CI workflows passed on 9d8c848074504346ccb8b871cc97618b92332c38 before this pass.

New candidate overlay Wave2-transparent-portrait-refinement-overlay.zip SHA-256 9b1c480050f4263ff2f4a32d96a00cd7e58d168db4ee353844dec2820d5d52dc (760056 bytes). Six regenerated portraits, not exact cutouts: recognizable identities and palettes retained, pose, costume and composition details revised. Borderless transparent bust treatment matches original four sets and Crimson Oath. All 256x256 RGBA, zero-alpha area 29.9–38.4%; visually reviewed against original crops on dark/light backgrounds at 90px. No new frames, effects, items, runtime changes or entitlement changes. Three corresponding manifests updated; archive CRC and original source manifest hashes checked. Import exact nine files on this branch, not main; preserve newer manifest edits if any. Expected Git blobs:
| relative to apps/mobile/assets/profile-cosmetics-wave2 | blob |
|---|---|
| tideborne/siren.png | 81e76ef3e00b5eac16d2b66ab1974b90c3fffde0 |
| tideborne/corsair.png | b4310a0c3325b5f2dc2ecaec5260e397db1acb00 |
| clockwork/artificer.png | 421259974f4418d7cbeefbdac24f9bd94a8e912f |
| clockwork/engineer.png | aac8c30ff07dad8eee52c0898308335369741f57 |
| stormforged/tempest.png | 6b02bcc70cba3f703f2958d09604334da76022ad |
| stormforged/sentinel.png | e54a8e23b816ac1b1bc90a3e8b10681f3edb77bb |
| tideborne/manifest.json | 2dadf52ac668cd0a8787e566b498404255a7c6e2 |
| clockwork/manifest.json | 4ce03a6b0550f00ad183422473e96420035f5dc1 |
| stormforged/manifest.json | 1a82e868b6921c558565f487a019d1360195e6ff |

SQL draft hardening d428b17: fixed malformed dollar quoting in the previous drift preflight; added exact cross-slot reserved ID rejection. Read-back pure ownership expression evaluated against 128 SQL fixtures (16 IDs x 8 cases: missing, object, scalar, nested, owned, wrong, wrong slot, null kind); all passed. No function installed, no production changes. Read-only target lookup still uniquely resolves IScaredMeAHat to a revisioned valid account state; do not grant before release. Native screenshots/performance and authenticated RPC tests remain necessary, no device available in this connector session. Final CI must use exact imported head. Existing three-tier hierarchy and separate profile scene frames unchanged.
