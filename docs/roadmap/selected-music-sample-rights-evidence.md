# Veldryn selected soundtrack — sample-rights evidence and outreach

**Reviewed:** 20 November 2026. **Release status:** five TimGM6mb-based tracks uncleared. This is an engineering provenance record, **not legal advice or a grant of rights**.

## Per-track source and status

| Selected runtime ID | Source musical concept | Rendering source | SHA-256 of staged in-game MP3 | Status |
| --- | --- | --- | --- | --- |
| `town` | Lanterns at Hearth | Original synthesized voices; no SoundFont | `a9f8db961ba798e3e8ccdf30204357f83d10e8065a36c35a8bc02f95c8429537` | No third-party samples identified |
| `asterfall` | First Light | Original synthesized voices; no SoundFont | `5627d558c2dcefd16c28c809272fcccee8e86703b87b3e38095fddf910839324` | No third-party samples identified |
| `sunscar` | Evening Oasis V3 | TimGM6mb.sf2 (GPL-2.0) | `361c0171d42bdc6a9865d4446f6bbabe1b42ce6d9ed7476f3f1d02f15de0dd8d` | Sample rights review required |
| `frostmarch` | Soft Snowfall V2 | TimGM6mb.sf2 (GPL-2.0) | `f27c92bf4ff1e4b4267d0a098d8d8420177e1df4f0baa30d282a985533bc567` | Sample rights review required |
| `dungeon` | Midnight Machinery V9 extended | TimGM6mb.sf2 (GPL-2.0) | `308be7f00ada99b1d4be29ef8d58057bc65dc2d1bbabcae8d36af6f1ba` | Sample rights review required |
| `boss` | Break the Sigil V9 extended | TimGM6mb.sf2 (GPL-2.0) | `e2e04d00b45f5521398104be09105bac01d8e56fb860e0cb02a6718d8df3faae` | Sample rights review required |
| `world_boss` | Eclipse Protocol V9 extended | TimGM6mb.sf2 (GPL-2.0) | `3c7be7c5fb5bbcf5708fc33881c810a383eaebe6f302853fbe02c7840170874a` | Sample rights review required |

Source inspection:
- The original concept zip `veldryn_alternative_music_concepts.zip` states there are no third-party audio samples or SoundFonts for the Town/Asterfall compositions. Its `generate_concepts.py` performs synthesized rendering.
- `veldryn_sunscar_frostmarch_4_new_versions.zip`, in `generate_2026_concepts.py`, uses `/usr/share/sounds/sf2/TimGM6mb.sf2`.
- `veldryn_jrpg_fantasy_rock_three_concepts.zip`, in `generate_jrpg_concepts.py`, also uses TimGM6mb. The extended tracks repeat the original MIDI performance and render using the same bank.
- MP3 re-encoding and seam crossfades do not change the source-sample copyright situation.

## External license evidence

- Original TimGM6mb notice: https://github.com/arbruijn/TimGM6mb/blob/master/COPYING.txt . Copyright notices list **Tim Brechbill (2004)** and **David Bolton (2010)**, with GPL version 2. The notice quotes Tim as stating that samples are self-created, public domain, or GPL-licensed.
- MuseScore's handbook independently lists TimGM6mb as GPL-2.0: https://musescore.org/en/handbook/3/soundfonts-and-sfz-files .
- GPL-2.0 allows commercial activity but does **not** itself offer an explicit output-recording exception for sample-based audio. Whether the embedded sample portions of commercial MP3 recordings can be distributed under Veldryn's intended license needs qualified review or a written permission covering the recordings. The GPL cannot be assumed irrelevant simply because the SF2 file is not itself shipped.
- FluidR3Mono is an alternative with published MIT terms and an official SF3 release, documented in the same MuseScore handbook and https://github.com/musescore/MuseScore/blob/main/share/sound/FluidR3Mono_License.md . Any replacement must use the actual FluidR3Mono bank, not an unverified derivative, and keep required notices.

## Written rights request — ready to send, NOT sent

**Suggested addressees:** SoundFont rightsholders / authorized representatives indicated in the original TimGM6mb COPYING notice and official Tim Brechbill website. Confirm authority to license samples that originated from third parties.

**Subject:** TimGM6mb — permission for rendered music in commercial mobile game Veldryn

Hello,

I'm contacting you regarding TimGM6mb, credited in its license notice to Tim Brechbill and David Bolton. We have composed five original fantasy-RPG tracks that were rendered using TimGM6mb instrument samples. These are our own melodies and MIDI arrangements, not recordings of any existing game music.

We would like to release these five rendered MP3 soundtrack files inside **Veldryn**, a commercial-capable mobile game distributed via Google Play and potentially other storefronts worldwide. The soundfont itself would not be bundled, and the audio has been edited to add crossfades and repeating sections. The files would play as background music and may be updated or replaced in future game versions.

Could you please clarify in writing whether the current license permits distributing **rendered audio containing TimGM6mb samples** in this manner without imposing GPL licensing on Veldryn's game code or the original compositions? If additional permission is needed, can you provide a direct commercial recording/output license or put us in touch with the appropriate sample copyright holders? Please also specify any attribution, notice, redistribution, modification or fee requirements, and whether you can authorize the samples contributed by others.

We can provide a list of the five rendered tracks and relevant MIDI files for your review. We would like to retain the exact existing instrument sound where legally possible.

Thank you for your help.

Best regards,
Veldryn development

## Decision and release gate

- [x] Verify selected seven track sources and recording provenance.
- [x] Separate two original-synthesis tracks into draft PR #1492 (not merged).
- [ ] Send the above request via an authorized communication account; retain the sent-message ID, date and reply.
- [ ] Receive written permission from appropriate rightsholders **or** record a legal review explaining an existing-license compliant release method.
- [ ] If clearance cannot be achieved, obtain a genuine MIT-licensed FluidR3Mono asset (archive, hash, license), render from the exact original MIDI files and present A/B previews for explicit approval.
- [ ] Review notices and package attribution as required.
- [ ] Verify game playback, MP3 gapless transitions, tests and Android export.
- [ ] Only then remove draft status and merge the five sample-dependent tracks.

No clearance has been received. This document must not be treated as release approval.
