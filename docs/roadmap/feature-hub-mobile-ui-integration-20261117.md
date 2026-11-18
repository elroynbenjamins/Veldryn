# World Boss, Party Events and Player Market — mobile feature hub integration

**17 November 2026 · UI engineering draft · no public activation**

## Scope

This branch implements *native*, developer-only preview routes for World Bosses, Party Events and Player Market. The previews demonstrate real in-app navigation and the approved game interactions without claiming to operate private economy services.

- Account → Feature Hub QA appears only in `__DEV__`.
- The parent top bar and bottom navigation remain available.
- The activity strip and global World chat dock disappear on all three preview routes.
- Party Events replaces the global dock with a compact Party dock. This opens the **existing authenticated Party channel** in a party-only modal. It does not show World, Guild or System tabs, fetch the World chat feed or reveal the online-player roster in this context.
- Back navigation, manual `?` guides, selected tabs, family/region selection and the Market calculator work locally.
- Existing seasonal Events, guild PvE and Party Contracts remain unchanged.

## UI quality decisions

| Screen | Design details | Authoritative work still needed |
| --- | --- | --- |
| World Boss | Three preview boss areas backed by Veldryn's regional pixel panoramas; 5-day War Camp, continuous 48-hour battle, 3 shared attempts, 14-round mechanics, reward and rankings states | Server-owned War Camp snapshot, validated roster, idempotent attempts, HP settlement, contribution ledger, wallet and claims |
| Party Events | Four distinct themed landscapes and story families, three preparation stages, separate Stage 2 and Stage 3 route ballots, connected real Party roster and Party-only chat | Verified event week, supplies, votes, receipts, stages, finale, Day 8 settlement and player-facing original art |
| Player Market | Search/filterable mock catalog with illustrative equipment level gate, sample price history, 5% seller tax calculator, listings and Inbox empty states | Authenticated browse, ownership/provenance, min/max prices, equipment rules, escrow, purchase/return/relist, real historical sales |

All market items, numbers, progress bars, dates and sale history are **examples**, not a service response. No purchases, listings, donations, event points, world-boss attacks, wallet mutations or reward claims are available.

## QA / manual review

1. Open Account → Feature Hub QA on a developer build, visit all three routes and verify bottom navigation and Back.
2. Confirm **no activity bar** and **no global chat dock** on all three screens.
3. On Party Events, with a signed-in Party, tap the dock: only Party chat can render and send messages; unread badges stay scoped to the current Party. Leave/disband the Party while a modal is open and verify it closes cleanly.
4. Repeat with global World chat disabled: Party chat should still work.
5. Change boss and event families, confirm regional art and accent colors change; inspect all tabs without real action availability.
6. In Market, search, filter, inspect the sample equipment requirement and example history, try the price calculator, and verify buttons cannot move gold or items.
7. Check small Android widths, font scaling, text truncation, TalkBack labels, keyboard overlap and reduced-motion setting.
8. Confirm release-build source and flags: no QA navigation, Market trading flags false, World Boss and Party Event route/wallet endpoints still unmounted.

## Integration plan (not release authorization)

- Hold this PR as draft until exact-head Mobile UX TypeScript and native Android validation pass.
- Merge or port **only** reviewed UI code to its eventual gated client branch, after current main is reconciled.
- Implement server snapshot adapters and typed loading/error/retry views first; add writes only after dedicated staging migration/security/idempotency and reward/market custody tests are green.
- Replace the temporary landscape illustrations with approved boss/market/event key art before player-facing activation, and localize all UI copy for supported languages.
- Never treat a graphical button, local simulated vote, sample ranking or preview item as authoritative player progression.

**Existing hidden backend work remains separate:** World Boss PR #1346, Party Events PR #1347, Player Market PR #1055. UI development here does not approve those services to launch.


## 17 November follow-up polish

- All native ScrollViews hide both indicators; scrolling stays enabled.
- Switching content tabs returns the main content viewport to the top. Nested filters and the guide remain independently scrollable.
- Small devices (under 360 dp, or large font scale) use shorter hero artwork and wrapped metric cards.
- Back/World/Party/Event/Market graphics reuse the approved Veldryn UI icon family rather than Unicode placeholder icons.
- Regional hero art and status accents follow the selected boss or event story.
- Each Party story now has three *family-specific* authored descriptions, with separate Stage 2 and Stage 3 sample ballots.
- The **Results** tab explains server-owned Day 8 payout and shows a locked/unavailable claim state. The actual authenticated Party roster is read-only and the compact Party Chat dock opens the existing authenticated party channel.
- Market Browse supports price-per-unit or total-lot example sorting. Selecting an item opens the detail card in place. Seller tax examples remain clearly marked as demo values. The new **History** tab contains an honest empty state for future immutable trade receipts, not fabricated purchases.
- Guide modals respect reduced motion; screen headings, sorted sample items, calculator values and sample route choices receive clearer accessibility labels and updates.

### Acceptance conditions before staging

- **No placeholder snapshots are displayed as live events.** The War Camp example percentage, sample Market listings and historical price bars must never enter actual gameplay claims, ranking calculations or accounting.
- **No data writes from preview flows.** Server APIs and reward services must expose separate explicitly enabled auth-backed routes before real CTA actions are implemented.
- **No duplicate chat or activity bars.** The Party Event dock is the only chat entry on its route; World Boss and Market do not render chat. Dungeon behavior remains independently tested.
- **No live activation.** World Boss #1346, Party Events #1347 and Player Market #1055 still need their own integration/security approval, migrations, auth/stock verification and settlement QA.
- **Known CI dependency.** Newly introduced Dungeon tonic text has a typed-catalog fix in draft #1351. The UI PR predates that fix on its base branch, so top-level typecheck can fail without a UI code error. Treat Android/Expo compatibility as a separate pre-existing problem; do not mislabel it a successful release build.

## QA refinement — developer preview interactivity

- Market sample seller quote uses a pure display-only validator: positive integer quantity and unit price, capped demo bounds, exact integer 5% fee rounding, and user-facing invalid-input messaging. The review action cannot proceed on invalid input. No server economic API is called.
- Mobile feature guides use four short interactive steps (Previous/Next, progress bar, hardware Back/Escape and reduced-motion support) rather than an overlong scroll list.
- The tab scroll reset uses React Native 0.88's inferred `ComponentRef<typeof ScrollView>` ref type; this fixes the feature code's TypeScript error on the prior CI run.
- New automated unit tests exercise Market fee rounding and malformed/extreme inputs; feature-hub source-contract tests cover guided help and safety.
- Separate CI cleanup: Dungeon tonic typed translation fix PR #1351 and Equipment Pouch async button loading fix PR #1354 are independent drafts. They do not authorize World Boss, Party Events or Market release.

## 17 November continued UI refinement — safer, more distinct previews

- Each of the three World Boss regions now displays unique **illustrative** War Camp supply prompts, combat warning/counterplay cues, and a threat briefing. These descriptions are not a combat simulation, server schedule, donation record or claim.
- Party Events' four story families now show different preparation supply descriptions and a unique finale threat description, while preserving the local-only ballots, the actual read-only Party roster and the authenticated Party-only chat dock.
- Player Market Browse adds a second example equipment item (T3 weapon, explicitly not verified), sortable name ordering alongside unit/lot price, query matches on category/rarity/slot, and a one-tap search/filter reset after an empty result.
- Equipment inspections reveal example tier, slot, rarity and bonus-stat status, plus the **design policy** that socketed gems may be replaced but not removed/extracted. Server-owned item, protections, exact stats, price corridors, and tradability remain unknown until authenticated inventory/market integration.
- Sell explains lock/favorite and bank/bag ownership checks as prerequisites; the only live element remains a read-only calculator, not a listing or escrow transaction.
- Added source-contract regression coverage for distinct encounter/story cues, browse sorting/reset, example level limits and replace-only gem presentation.
- Still hidden in `__DEV__`; do not make any Market/World Boss/Party Event feature public on the strength of this UI refinement.

## 17 November follow-up — navigation, performance and accessibility

- Fixed a QA navigation bug: when the host reuses the preview shell to show a different hub, an invalid tab from the previous feature can no longer render a wrong default screen. A route change resets the active tab, guide step and scroll position; tab changes reject unknown IDs.
- Moved the Party social context subscription out of the shared preview shell. Only **Party Events** mounts Party-specific roster and dock consumers. World Boss and Market do not rerender when Party membership changes.
- Extracted pure, non-mutating Market sample filtering/sorting to `apps/mobile/src/core/market-preview-filter.ts`. Local browsing now supports normalized category/rarity/slot/tier searches; unit price ascending or descending, total lot price and name, with deterministic tie-breaking.
- Memoized Market sample search and the read-only quote, preventing unnecessary recomputation when unrelated visual state changes.
- Added inline search clearing, search-friendly keyboard behavior, accurate result singular/plural, and 44 dp tap targets for guide, category and sort controls.
- Replaced remaining World Boss / Party finale / Market empty-state Unicode symbols with existing Veldryn `UiIcon` assets.
- Added isolated filter unit tests and strengthened preview source-contract checks for route state, performance boundaries, and interactive control hit targets. These are source/unit-level validations, **not** an Android visual QA pass.
- **Release remains blocked** by the separate Expo SDK dependency compatibility failure in Mobile Core / Android native validation and by the outstanding authoritative World Boss, Party Events and Market backend gates. No server read/write integration or transaction logic was enabled.

## 17 November Party Events V33 — three-pass hidden continuation

1. **Private status contract (backend sibling PR #1347):** typed,
   owner-scoped one-statement event status projection for frozen roster size,
   current stage, personal objectives, aggregate supply orders and locked
   votes. No route, schema deployment or reward permissions.
2. **Mobile integration:** a separate, Party-only decode/visualization path
   using `party-event-readonly-snapshot.ts`. It distinguishes the current
   live Party Social roster from the frozen event roster. Stage actions,
   required supply meters, own ballot acknowledgements and context are shown
   only when a recognized authenticated private payload is supplied. The
   `App.tsx` entry deliberately supplies **no event status** because the
   authenticated backend read service is not approved/deployed.
3. **Safety and polish:** malformed stage/vote/action/order shapes and any
   apparent claim/contribution/fight permissions are rejected; missing data
   remains explicitly unavailable. The source contract and direct decoder
   tests run within the feature-hub validation command. Proposed family buffs
   never display as activated; local sample ballots are never persisted.

The backend PGlite isolation fixture checks that two separate parties cannot
read each other's supply counts or personal ballots. Full Android review,
localization, authenticated refresh lifecycle, private migration promotion,
source/receipt idempotency and Day 8 settlement are still blockers.

**Keep this UI PR draft, developer-only and unmerged.** No online Party Event
RPC or paid claim exists here.

## V46 hidden World Boss read-only bridge (18 November 2026)

- `apps/mobile/src/core/world-boss-readonly-snapshot.ts` decodes the *versioned* V41 `world-boss-overview-v41` projection. It refuses wrong account identity, missing version, invalid seven-day Monday-UTC calendar, stale or future data, inconsistent attempts, implausible HP, forged War Camp counters/tiers and out-of-range Sigil balances.
- Developer-only World Boss cards can **optionally** show a verified-format server-provided boss HP/phase, attempts remaining, War Camp track totals and the distinction between event-earned and currently spendable Sigils. Changing the preview boss clears mismatched regional data. Empty, expired, invalid or missing data falls back to explicit **No verified World Boss loaded** rather than manufactured live status.
- The normal `apps/mobile/App.tsx` intentionally passes **neither** `worldBossStatus` nor `worldBossAccountId`: no HTTP/Supabase route or live authenticated provider currently exists. The preview is unmounted outside the existing `__DEV__` QA feature route.
- Donate, battle, claim and market actions **remain disabled** regardless of the snapshot's phase or counts. The decoder is for UI integrity, **not** identity proof: the future authenticated backend must derive account ID from Auth and verify replay ownership.
- New runtime/source regression `apps/mobile/tests/world-boss-readonly-snapshot.cjs` is included in `pnpm test:feature-hubs`, and the separate hidden backend V41 contract has been version-tagged to match. No feature flag, database table, real currency or production screen was enabled.
- Launch still blocked by #1348 (retention/account erasure), prior baseline Expo/core/bundle drifts, staging migrations, real 3–5 character raid fixtures and reviewed authenticated endpoints.
