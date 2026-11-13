# Turning of the Age — New Year 2026/27 · implementation pass 1

Status: **preview and calendar integration implemented in branch; gameplay NOT released, event NOT enabled, and production schedule NOT changed**.

## 1. Theme and identity

- **Turning of the Age** is the recurring New Year celebration, distinct from Frostfall.
- Fantasy: preserve the closing year's stories, gather fragments of time, and face **The Last Hour** as the First Dawn begins.
- Festival currencies: **Age Tokens** (ordinary) and **First Dawn Seals** (prestige).
- Signature: **Chronicle Rite**. Each player chooses a focus — **combat**, **gathering**, **crafting**, or **bosses** — that increases Age Token earnings in that activity by **20%**. It is a personal choice, not a paid perk.
- Chronicle Vault is the existing authored expedition concept, with chapters **Chronicle the Closing Age → Recover the Broken Hours → Guard the First Dawn**.
- Keep the festival accessible to new players; do not impose a level gate on ordinary event activity. Boss/expedition eligibility may have progression requirements.

## 2. Existing authored progression and rewards (not yet released)

| Source | Reward |
| --- | --- |
| 400 reputation | Witness of the Turning title |
| 1,000 reputation | First Dawn emote |
| 4,000 reputation | Chronicle Wisp pet |
| 6,500 reputation | Agebound title |
| 10,000 reputation | Keeper of First Dawn combat companion |
| 900 Age Tokens | Turning Wave emote |
| 1,800 Age Tokens | Child of the New Age title |
| 10 First Dawn Seals | Gilded Hourling pet |

Daily gifts run on a repeating seven-day sequence. There are daily and weekly event objectives and four rare discoveries. Existing definitions are in `apps/mobile/src/content/annual-events-v3.ts`; the Year-Turning collectibles and their current art live under `apps/mobile/assets/event_collectibles/turning_of_the_age/`.

The milestone numbers are **existing authored values**, not validated final earnings calibration. Simulate a low-playtime and a high-playtime account before activating; make sure the last companion is achievable through a mix of supported activity types without requiring 24/7 play.

## 3. Implemented in this pass

1. **Read-only teaser**, visible exactly **14 days before the server-published start**; reveal Chronicle Wisp and the Chronicle Vault at **7 days before start**. The boss remains a launch reveal.
2. Dedicated compact artwork, first-dawn copy, UTC countdown, responsive cards, and localized strings in **EN, NL, DE, ES, FR, IT, RU, TR**. Existing Chronicle badge and Wisp artwork are reused.
3. Calendar integration for disabled-but-scheduled events through `public_event_calendar`; in-game upcoming preview only uses an enabled server runtime. The same shared Event screen clock drives both.
4. January annual collection and December event start are presented as one **cross-year season**, fixing the upcoming-event ordering and missing Turning festival hero artwork.
5. Prepared **source-only** visual bundle in `live-event-visuals-future.ts` for badge, both currencies, two pets and the companion. It is deliberately not imported by `live-event-visuals-active.ts`.
6. Preview clock boundary and UI-contract tests.

No currency, collectible, server activation, migrations, reward command or player entitlement is changed in this pass.

## 4. Launch blocker: Frostfall overlap

The original Turning planning window is **Dec 29, 2026 – Jan 4, 2027**, but the currently-authored Frostfall window runs **Dec 3–29** with a **claim-only period ending Jan 3, 2027 at 00:00 UTC**.

`enforce_single_visible_live_event` forbids *any* overlapping enabled player-event windows, **including grace/claim-only time**. Turning cannot be enabled Dec 29 while Frostfall remains enabled for outstanding claims. Moreover, the client currently presents one active/claimable event.

**Safe default:** preserve Frostfall's promised claims. Do not publish a definitive Turning start or auto-enable either event from this branch. An option that fits today's server architecture is **Jan 3–10, 2027 UTC** (the season guard permits the existing 2026 Turning ID for a Jan 1–7 restart), or else explicitly design multi-event claim UI and server visibility before returning to a Dec 29 start.

The name and fantasy can stay New Year-themed, but the exact dates must be decided as a separate Live-Ops release change and verified in staging. Avoid silently shortening Frostfall claim grace.

## 5. Next implementation passes

- Finalize dates and add a **disabled** server schedule only after the overlap is resolved; verify 14-day teaser and that no reward is claimable early.
- Release the existing `TURNING_OF_THE_AGE_EVENT` into `LIVE_EVENT_CATALOG` and its dedicated visual bundle **together**; never add one without the other. Check all reward IDs, server-owned currency receipts, pre-existing account ownership, and event-series inheritance.
- Connect Chronicle Vault stages, encounter balance, and The Last Hour boss to the actual event runtime; verify chapter progression, rewards, and anti-replay/cap rules.
- Add polished discovery art, event enemies, and a unique First Dawn transition moment; keep them cosmetic until server settlement and economy checks are complete.
- Run economy simulations for 7-day drop rates, daily/weekly contract completion, 10k reputation, 10 prestige, companion/pet acquisition, and relative reward values.
- Run test and mobile build checks on the branch, validate on Android at small widths/high font scaling, deploy staging migrations, and only then approve a production launch.

## 6. Rollback and safety

The branch contains only presentation and tests, plus a parked visual bundle. With no approved published schedule, the new preview remains invisible; the existing Frostfall UI and reward flow are untouched. Revert the client commits to remove the preview. Do not enable live-event rows or apply server migrations as a side effect of merging this branch.
