# Guild UI refinement concepts — 18 October 2026

The concept sheet records the proposed layouts. The selected direction is now implemented in mobile; the implementation and verification record below describes the result. Illustrative balances and guild states in mockups and development previews are not player data.

Concept sheet: `apps/mobile/art-review/guild-ui-refinement-v2/guild-refinement-concepts.png`. Generated with the built-in image-generation tool from the existing shop and guild-board captures. Exact shipped creature artwork and theme tokens remain authoritative; the mockup is a layout proposal, not an asset replacement or catalogue rebalance.

## Keep the existing visual language

Use the Blackout palette from `theme.ts`, existing detailed pixel art, compact scenery headers, silver selection borders, mint progress, and shared board components. Ember and Paper Mint must remain supported by theme tokens. Avoid wood, parchment, gold ornament and oversized art headers.

## Priorities

| Surface | Current state | Recommended refinement |
| --- | --- | --- |
| Guild Token Shop | Art and category filters are integrated, but earning text and claims precede a dense catalogue; purchases execute directly from the list. | Highest priority. Separate Browse and Earn, add affordability/ownership filters and inspect review with Balance/Cost/After, preserve server-defined level/release gates and explicit pending/error feedback. |
| Home | Activity summary is useful; introductory blocks and destination tiles repeat navigation already available above. | Show guild identity, shared activity and one useful next action. Short secondary action rows replace repeated descriptive tiles. |
| Activities | Recently refined quest postings, personal/shared progress and compact Activity meter. | Retain the board; improve consistency and tap sizes where necessary. Keep Quests, Muster and Projects. |
| Hall | Recently refined Facilities, Skills and Trophies; Shop sits behind another navigation layer. | Retain progression cards. Make the path to Shop clearer and avoid redundant headings. Keep Skills informational where live allocations are unavailable. Hall Progress is never spent. |
| PvE | Uses the newer Raid Gate and illustrated encounter presentation. | Retain the encounter cards; align header/navigation styling. Address hosted RPC lint findings before declaring release-clear. |
| Roster | Combines member list, invitation/application administration, leadership safety and departure controls in one panel. | Members first, role-appropriate Applications/Invites views, profile details on demand, and management controls away from routine browsing. Do not invent presence or weekly activity data that the live projection does not supply. |
| Manage | Directory/creation and appearance controls are stacked; member administration is elsewhere. | Clear Identity and Recruitment groups. Keep leadership/departure controls together in a permissioned management section. |
| Chat | Existing focused chat flow with identity and emotes. | Keep composition and message space; reuse the shared navigation treatment without adding a large board banner. |

## Shop behavior

- Browse starts near the top, following a compact balance and weekly-cap strip.
- Earn holds the existing daily, weekly and event-bonus claim actions and cap explanations.
- Inspect shows actual account-wide reward ownership, canonical name/art, category/role, price, required guild level and release state. Purchase review shows the resulting balance and leaves the server authoritative.
- Future guild levels remain explicitly locked. The release switch does not raise the existing Guild level cap.
- Construction stays separate from reward shopping; unreleased projects remain visibly unavailable and cannot spend resources.
- Retain usable loading, retry, empty-filter, insufficient-token, owned and purchase-pending states; target at least 44px controls and readable text at 320px widths.

## Implemented and refined

- `GuildTokenShopView` starts with a compact token wallet/weekly earning strip and separates Browse, Earn and construction Projects. Browsing has category, affordability and ownership filters; canonical reward names; shipped pixel artwork; explicit ownership, release and Guild-level states; and an inline Inspect review with Balance / Cost / After or Missing before purchase.
- `OnlineGuildTokenShopPanel` preserves the authenticated purchase/claim adapters. A synchronous shared guard serializes requests. If a confirmed purchase is followed by a failed balance or collection refresh, the confirmation remains visible, further mutations stop, and explicit refresh retries both synchronization paths. No client token balances or entitlements are persisted optimistically.
- Guild Home uses real online guild identity, the existing live Activity meter, direct Muster/Quest/Shop routes, short secondary action rows and the member Notice Board. No fabricated presence, completion counts or next-action eligibility are shown.
- Hall now shares a single Facilities / Skills / Trophies / Shop navigation row. Facilities have larger existing activity art and less nested framing. Shop remains reachable during Hall loading/error states. Existing Hall level/progress rules and the informational live Skill guide are preserved.
- Roster separates Members, Requests and Membership. Member search works on the loaded authoritative names. Request review remains role-gated; departure controls are isolated, with their existing confirmation flow. Manage groups Identity and Recruitment and links directly to Membership.
- The second pass removed repeated inspection art, reduced framing/navigation layers, made leadership metadata readable, aligned headers to each destination, used the real token art on Home, and aligned companion descriptions with the gargoyle, lynx and songbird portraits.

## Verification evidence

- Full mobile `npm run typecheck` passed after implementation and refinement.
- `npm run test:guild-ui` covers request serialization, confirmed-purchase sync recovery, roster search/permissions/deep links, plus the existing Guild management, project/chat, notice-board, Muster and Hall contracts.
- Guild Shop art and active-event release graph validators passed.
- Browser checks exercised purchase settlement (2,400 → 400), rejected purchase preserving balance, retry, owned inspection, affordability filtering, recoverable empty results, Home → Shop and Hall Skills/Trophies/Shop routing. All mutations ran only in memory fixtures.
- Eighteen initial layouts across Blackout, Ember and Paper Mint at 320 and approximately 390 CSS pixels had no document-level horizontal overflow and no missing artwork. Actual measured sizes are stored in `output/guild-ui-refinement/layout-checks.json`.
- Screenshots: `output/guild-ui-refinement/shop-inspect.png`, `guild-home.png`, `guild-hall.png`.
- Preview: `EXPO_PUBLIC_VISUAL_QA=1 EXPO_PUBLIC_VISUAL_QA_SCREEN=boards`, using query `screen=shop`, `screen=guild-home` or `screen=hall`, optionally `capture=1&shell=1`.

The fixture uses actual presentation components, a memory-only shop adapter and a reduced app shell; it does not replace full-app/native-device testing. No backend deployment or live purchase was performed in this UI pass. The separate hosted database lint findings in the release report remain a separate repair task.
