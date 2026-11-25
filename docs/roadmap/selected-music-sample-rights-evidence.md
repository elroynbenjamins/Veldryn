# Veldryn selected soundtrack — provenance and permission

Updated 25 November 2026. Engineering record, not a legal opinion.

Tim Brechbill replied on 25 November 2026 to the 20 November inquiry explicitly describing the five original compositions, commercial/proprietary worldwide distribution of rendered MP3s, looping/processing and no SoundFont redistribution. He granted permission to use the SoundFont and identified its samples as his own and public-domain/GPL-licensed contributions by others. David Bolton had referred the inquiry to Tim. The original email is retained in the maintainer's mailbox; no private contact details are reproduced here.

The maintainer explicitly approved use of the existing recordings as-is on 25 November 2026. The manifest status `creator-permission-received-owner-approved` records this decision, not an unconditional waiver of third-party GPL obligations. Tim's reply did not expressly address every third-party sample right, output-license condition or attribution requirement. Preserve this limitation; the GPL obligations for third-party samples remain a legal uncertainty. Only rendered MP3s are shipped, not the SF2 bank. No re-render or substitute instrumentation.

## Attribution

Five Veldryn original MIDI compositions rendered using TimGM6mb SoundFont — Tim Brechbill (2004), David Bolton (2010), and contributing sample authors; original bank distributed under GPL-2.0. See [upstream license and notices](https://github.com/arbruijn/TimGM6mb/blob/master/COPYING.txt). The two historical original-synthesis compositions do not use the bank; Town is now retired and only Asterfall remains bundled. This acknowledgment does not relicense Veldryn or the recordings.

## Source recording inventory

| Selected runtime ID | Source musical concept | Rendering source | SHA-256 of staged in-game MP3 | Status |
| --- | --- | --- | --- | --- |
| `town` | Lanterns at Hearth | Original synthesized voices; no SoundFont | `a9f8db961ba798e3e8ccdf30204357f83d10e8065a36c35a8bc02f95c8429537` | No third-party samples identified |
| `asterfall` | First Light | Original synthesized voices; no SoundFont | `5627d558c2dcefd16c28c809272fcccee8e86703b87b3e38095fddf910839324` | No third-party samples identified |
| `sunscar` | Evening Oasis V3 | TimGM6mb.sf2 (GPL-2.0) | `361c0171d42bdc6a9865d4446f6bbabe1b42ce6d9ed7476f3f1d02f15de0dd8d` | Creator permission received; owner approved; third-party uncertainty documented |
| `frostmarch` | Soft Snowfall V2 | TimGM6mb.sf2 (GPL-2.0) | `f27c92bf4ff1e4b4267d0a098d8d8420177e1df4f0baa30d282a985533bc567` | Creator permission received; owner approved; third-party uncertainty documented |
| `dungeon` | Midnight Machinery V9 extended | TimGM6mb.sf2 (GPL-2.0) | `308be7f00ada99b1d4be29ef8d58057bc65dc2d1bbabcae8d36af6f1ba` | Creator permission received; owner approved; third-party uncertainty documented |
| `boss` | Break the Sigil V9 extended | TimGM6mb.sf2 (GPL-2.0) | `e2e04d00b45f5521398104be09105bac01d8e56fb860e0cb02a6718d8df3faae` | Creator permission received; owner approved; third-party uncertainty documented |
| `world_boss` | Eclipse Protocol V9 extended | TimGM6mb.sf2 (GPL-2.0) | `3c7be7c5fb5bbcf5708fc33881c810a383eaebe6f302853fbe02c7840170874a` | Creator permission received; owner approved; third-party uncertainty documented |

Source inspection:
- The original concept zip `veldryn_alternative_music_concepts.zip` states there are no third-party audio samples or SoundFonts for the Town/Asterfall compositions. Its `generate_concepts.py` performs synthesized rendering.
- `veldryn_sunscar_frostmarch_4_new_versions.zip`, in `generate_2026_concepts.py`, uses `/usr/share/sounds/sf2/TimGM6mb.sf2`.
- `veldryn_jrpg_fantasy_rock_three_concepts.zip`, in `generate_jrpg_concepts.py`, also uses TimGM6mb. The extended tracks repeat the original MIDI performance and render using the same bank.
- MP3 re-encoding and seam crossfades do not change the source-sample copyright situation.


Historical staging: [PR #1489](https://github.com/elroynbenjamins/Veldryn/pull/1489). Retain exact staged MP3 blobs. Android speaker/headphone listening, loop seam behavior and app export remain release QA tasks.
