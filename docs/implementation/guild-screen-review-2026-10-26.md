# Guild screen review — 26 October 2026

The review captures the existing Home, activity board, Hall, Skills and Token Shop presentation components with isolated sample data. The chat issue comes from the supplied Android screenshot. These are not live guild account captures. Source: `BoardExperienceReview`, using `EXPO_PUBLIC_VISUAL_QA=1`, `EXPO_PUBLIC_VISUAL_QA_SCREEN=boards` and `?screen=guild-home&capture&shell` (also `guild`, `hall`, `skills`, `shop`).

Interactive proposals are in `output/guild-concepts.html`; the existing-screen gallery is in `output/guild-current-screens.html`. Daily board prioritizes participation, the next activity milestone and destinations. Guild lodge gives guild identity more space and brings destinations immediately below it. Both retain quests, automatic Muster/Rally, projects, encounters, Hall subsections, members, management and chat. Sample interactions affect only local demo state. The simulated keyboard illustrates input placement; it does not verify native keyboard behavior. These proposals have not replaced the live Guild layout.

Implemented fixes:

- Omit the app's Back/Guild bar on the Guild destination.
- Embedded Guild Chat reports its current guild name/tag to the overlay header and hides its internal header. Standalone Guild Chat retains its identity header.
- Put keyboard avoidance around the full-screen modal, apply the safe-area inset inside it, release navigation clearance when typing, and let channel containers and message history shrink while preserving the composer.

Validation: TypeScript check; Guild UI suite; chat dock/emote contract; chat usability and authoritative Guild Chat validators; interaction regression for Android modal keyboard events, header identity, restored clearance and listener cleanup. Both concept variants were checked in a browser at 320, 390 and 736 pixels, including navigation, member search, sample message sending and composer/keyboard geometry.

Native Android/Samsung keyboard verification remains required: no device was connected. Check World, Guild and Party with the keyboard open, a long draft, large text, and repeated open/close cycles.

## Channel dropdown and role visibility follow-up

The chat overlay now uses a channel dropdown in its header instead of the icon rail. It preserves mounted channel views/drafts, unread and mention badges, and the World language picker. Guild is offered only to joined members; Party remains subject to the existing current-member gate. Menus follow measured header height for larger text.

The interactive concepts include a shared **Preview as** selector for No guild, Member, Officer and Leader. This is a review control outside the product UI. Members see activities, members, Hall progression, shop, chat and their own membership settings; appearance and recruitment administration are hidden. Officers and leaders retain appearance, applications, outgoing invitations and recruitment for their own guild. Transfer and disband remain leader-only. Guild discovery and seeking a guild belong to the No guild view.

Runtime changes follow those rules: the guild home gates Customize from confirmed membership roles; the appearance panel also declines to render for ordinary members; member rosters omit Requests; joined rosters omit invitations from other guilds. Social filters recruitment by context and current guild, including owned adverts and match alerts. Joined ordinary members see a My Guild entry in place of recruitment. Leadership can browse players seeking a guild and manage their own guild's advert. Party recruitment remains available, including when guild membership cannot be confirmed. Existing server-side mutation permissions remain authoritative.

Follow-up checks passed: TypeScript, the Guild UI suite, recruitment/invitation/chat contracts, guild/party discovery routing across all roles and failed membership reads, and the interactive role/dropdown preview. All 6,431 catalog rows passed the five-language completeness/placeholder check. The broader localization runner subsequently failed on the pre-existing missing account translation `What's New & Updates` referenced in `SettingsScreen.tsx`; neither that screen nor the account catalog was changed here.

## Approved layout implementation

The Daily board direction is now wired into the member Guild screen: persistent Home/Raid/Activities/Hall/Chat navigation, an artwork-backed identity header with real member counts and role-gated management, the private notice board, automatic Muster entry, activity milestones and a two-column destination grid. The management overview separates appearance editing, requests, own-guild recruitment and membership safety. Quests, raid encounters, Hall subsections, shop purchases and appearance mutations retain their existing authoritative components. Guild Chat entry opens the shared overlay on the Guild channel; recruitment entry opens the Social Guild tab.

Expanded chat uses the height remaining above the keyboard instead of stopping the message history at 260 pixels. Context-scoped layout preserves the compact height in standalone panels, while expanded World/Guild/Party/System logs fill their window. Short histories align above the composer, message rows use less decoration while preserving 44-pixel profile targets, and near-bottom readers follow the latest message when the viewport resizes. Scrolled history stays in place. This does not impose a three-message cap or alter the saved collapsed dock preference.

Visual QA uses real presentation components in the developer-only `guild-layout` entry. At 390×844, 390×524 and 320×400, three sample messages and the draft input fit; the reduced heights simulate space remaining with a keyboard. Captures: `output/guild-implemented-member.png`, `output/guild-implemented-officer.png`, and `output/guild-implemented-chat-390x524.png`. Browser geometry is not native Samsung keyboard verification. No Android device was connected.

Follow-up: the overlay now opens in a compact, bottom-anchored reading window (62% of available height, capped at 480 points). Only opening the keyboard expands it to all remaining space above the keys; dismissing the keyboard restores the reading height and navigation clearance. Narrow screens no longer trigger the typing expansion on their own. The expanded message layout and three-message checks above remain unchanged.

## Final density pass and combat pacing

The member identity banner now uses a 52-point crest, a smaller name, single-line motto and lightweight Members/Manage links with 44-point targets. Home uses a compact notice board, one-row Muster entry, condensed activity disclosure and smaller destination cards. The guildless welcome removes repeated headings and brings Find/Create forward. The chat header shortens its guild eyebrow while keeping the private-audience accessibility label. Updated captures use the shared app presentation components with sample data, rather than a live account.

The user reported reaching combat level 17 in about three days without a companion, with their initial cooked food still remaining. Character hunt XP now scales by enemy tier: levels 1–3 unchanged, 4–6 at 85%, 7–9 at 75%, and 10+ at 60%. Boss payouts retain their authored XP. The same helper feeds reward settlement, champion/momentum bonuses, runtime estimates and the dashboard. Earned XP, level thresholds, class/profession XP, gold and drops retain their existing values. This changes future settlement, including unclaimed activity settled after the update, rather than migrating saved levels.

Minimum incoming attrition in Greenfields/Silverbrook/Ironwood rises from 60/80/115 to 80/120/180 HP per hour. Food healing and recipe output stay intact. Prepared local-food sustain is approximately 3.3/4.6/4.5 food per hour respectively; starting HP reduces actual consumption early in a session. In four-hour level-17 Ironwood fixtures without a companion, all nine classes consume 13–15 trout and receive 34,190–44,889 character XP, about 60% of the old reward for the same kills. These are controlled balance fixtures, not a prediction of calendar days for a particular player.

Validation for this pass: mobile TypeScript; Guild UI and role/keyboard regressions; chat lifecycle; actual-component browser geometry at 390×844, 390×524 and 320×400; focused progression pacing, balance projections, regional preparation/sustain and timed-buff boundary tests. The shared gameplay and co-op function bundles were rebuilt. Native Android keyboard checks remain pending because no device is connected. These source and generated-bundle changes have not been deployed.

Backend online TypeScript and gameplay/auth/replay, co-op entry/loadout, event currency, seasonal expedition, queue/ready, regional combat and guild shop checks passed. The unrelated 9,600-run published co-op balance sweep was stopped before completion; the full backend test command is therefore not reported as passed.
