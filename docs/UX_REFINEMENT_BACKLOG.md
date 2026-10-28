# VELDRYN — UX Refinement Backlog
**Review date:** 2026-10-28 · **Base:** `main@eb70bb3` · **Source review only; no screenshots, device exploration or code changes.**  
Read alongside [DEEP_QUALITY_AUDIT.md](DEEP_QUALITY_AUDIT.md) (Q01–Q20) and [OPTIMIZATION_BACKLOG.md](OPTIMIZATION_BACKLOG.md). **No feature removal is proposed.**

## UX principles for a mobile-first idle MMORPG
1. The current action and next meaningful decision should be obvious without scrolling through every feature.
2. Important context (resources, limits, rarity, role, current activity, locked state) remains accessible; simplify grouping, not information.
3. Prefer **inline feedback** after filtering/navigation, and explicit result celebration only after a deliberate reward claim or significant unlock.
4. An icon is only better than text when its meaning is established; every icon-only actionable control needs an accessible name.
5. Distinguish **available online configuration**, **live connectivity**, **stale local display**, **server-confirmed transaction**, and **pending request**. Never fake status.
6. Keep pixel-art style, runtime rarity borders, existing navigation, 3 themes and reduced-motion support. Avoid globally scaling art or replacing visual language.

## Ranked UX work (cross-reference to main audit)
| Rank | UX ID | Priority | Source / screen | Problem or investigation | Expected benefit | Effort / risk |
|---:|---|:---:|---|---|---|---|
| 1 | U01 / Q16 | P2 | Skills: cooking/smelting / inventory | Explain total ingredients and reservable batches | Prevent resource-count confusion | S / Low |
| 2 | U02 / Q14 | P2 | Chat header | Configured `ONLINE` badge can misrepresent disconnected status | Honest connectivity feedback | S–M / Low |
| 3 | U03 / Q13 | P2 | World: Frostmarch | Silent fallback after server fetch failure | Trustworthy progress display | S–M / Low |
| 4 | U04 / Q10 | P2 | Inventory/Co-op/network action | Parser errors can surface instead of helpful retry | Faster recovery | S / Low |
| 5 | U05 / Q17 | P2 | Chat/social icon labels, all themes | 7–9px metadata is hard to read | Accessibility/readability | M / Medium |
| 6 | U06 / Q19 | P2 | Rewards/events/profile/chat | Audit all interruptive popups and notice transitions | Less unwanted interruption | M / Low |
| 7 | U07 / Q15 | P2 | World/Guild/Party chat | Test hidden reads, switching and unread semantics | More reliable chat UX | M / Low |
| 8 | U08 / Q08 | P1 | Guest→verified account→Google | Trust-preserving account status and recovery | Reduce apparent account loss | M / Medium |
| 9 | U09 / Q09 | P1 | Bank/craft/dungeon actions | Make pending/retry states explicit through ambiguous failure | Confidence in transactions | M / Medium |
| 10 | U10 / Q06 | P1 | Home/Combat activity clock | Optimize perceived responsiveness after profiling | Smoother core loop | M / Medium |
| 11 | U11 | P2 | Inventory and bank | Preserve list, selection, quantity, status and loading clarity | Faster bulk management | M / Medium |
| 12 | U12 | P2 | Home activity queue | Clarify handoff timing and next queued activity | Lower planning mistakes | M / Medium |
| 13 | U13 | P2 | Co-op Q-Mode / Echo | Explain real Echo vs NPC, eligibility and recovery | Lower dungeon confusion | M / Low |
| 14 | U14 | P2 | Profile customization | Reduce repeat fetch/re-render and surprise navigation | Faster cosmetics | M / Medium |
| 15 | U15 | P2 | Guild screens | Consolidate consistent labels and information density | Easier guild management | M / Medium |
| 16 | U16 | P2 | Tutorial/new feature unlocks | Guide once at the right moment; allow revisit | Better onboarding without nuisance | M / Low |
| 17 | U17 | P2 | Events | Date/level-aware announcements and display | Timely, non-spammy discovery | M / Medium |
| 18 | U18 | P2 | Navigation/top/activity bar | Audit selected state, badges, return behavior | Quicker task switching | M / Low |
| 19 | U19 | P2 | Store/VIP/benefits | Validate clear cosmetic benefit copy and purchase recovery | Higher trust | M / Medium |
| 20 | U20 | P3 | Small icons/empty states across screens | Consistent accessible microcopy, progress and contrast | Cumulative polish | S–M / Low |

**Meaning of status:** Q-linked rows identify observed code evidence in the main audit; U11–U20 are **targeted UX review/test hypotheses** based on present screen and component architecture, **not** proof of an existing visible defect.

## Acceptance-ready UX finding records

### U01 — Ingredients and AFK processing
**Source:** `apps/mobile/src/core/processing.ts` (`processingAvailability`, `maxBatches`, `startProcessingUntilLimited`); Skills and Inventory views. **Problem:** users can see one partial stack but recipes legitimately draw from the sum of all inventory and bank stacks. **Design:** one compact row: `Available: 86 (Inventory 46 · Bank 40) · Uses: 3 / batch · Can run: 28 batches`, plus AFK/Gold cap reason when lower. Keep bank availability explicit; do not change resource math. **Effort S · regression Low · benefit Medium–High.** **Test:** three stacks of same fish, bank-only stock, wood fuel, time cap, zero Gold; all labels agree with reserved amount and completed cycles.

### U02 — Chat connected/reconnecting/offline status
**Source:** `apps/mobile/src/components/ChatOverlay.tsx` shows `ONLINE` whenever `onlineConfigured` is true; `useChatFeed.ts` already owns subscribed/fallback state. **Problem:** configured capability looks like verified live connection. **Design:** neutral `Chat` or `Connecting…/Connected/Offline` with last-retry affordance; keep cached history while disconnected. **Effort S–M · risk Low · benefit Medium.** **Test:** airplane mode during chat, reconnect, private guild membership loss and account switching; no fabricated presence.

### U03 — World regional sync confidence
**Source:** `apps/mobile/src/screens/WorldScreen.tsx` ignores fetch error and falls back to state-derived Frostmarch progress. **Design:** inline source/status banner only when stale or reconnecting, `Showing saved progress · Retry`; avoid global blocking modal and preserve offline-readable region cards. **Effort S–M · risk Low · benefit Medium.** **Test:** service timeout, mismatched content version and recovery; completion shown only when confirmed.

### U04 — Action errors players can act on
**Source:** `apps/mobile/src/online/{gameplay.ts,coop-client.ts}` parse JSON unconditionally; `GameButton.tsx` handles busy state but catches rejected promises by console warning if caller owns no message. **Problem:** low-level parsing errors may replace contextual assistance; an unexpected async failure may be invisible if no caller feedback exists. **Design:** consistent inline component with plain-language failure, `Retry pending action`, `Reconnect` or `Try later`, tied to authoritative request state. **Effort S–M · risk Low · benefit High for unstable networks.** **Test:** JSON/HTML 503, timeout, repeated tap and successful replay without duplicate sell/claim.

### U05 — Text and touch legibility
**Source:** `ChatOverlay.tsx` uses `onlineText: fontSize 7`, unread `badgeText: fontSize 9`; `GameButton.tsx` uses shared touch-size constants. **Design:** typography floor for functional badges, account/guild name readability, icon labels for screen readers, compact multi-line handling on 320dp width and 1.5x font. **Effort M · risk Medium · benefit Medium.** **Test:** all themes (standard/dark HC/light HC), portrait 320/360/414dp, font 1.0/1.3/1.5, TalkBack/VoiceOver, reduced motion. Do not blindly enlarge every decorative pixel glyph.

### U06 — Popup interruption budget
**Source:** `apps/mobile/src/core/command-progress-feedback.ts` deliberately only opens claim reward modal for explicit claims; `App.tsx` also queues mastery, preparation, new customization, feature unlocks and event-start popups. **Problem:** several independent notice mechanisms can collide with current context, though no live collision is proven. **Design:** decision table: explicit claim → result modal; important unlock → one-time dismissible modal; background informational change → inline notification; chat switch/profile tab/filter → no reward modal. **Effort M · risk Low if test-first · benefit Medium.** **Test:** profile save, chat channel switch, forge claim, successful event start, guild invite, startup activity and resume; no duplicate/unrelated modal, legitimate claim moment preserved.

### U07 — Chat context, unread and 25 recent messages
**Source:** `ChatOverlay.tsx` retains visited panes and resets opening channel to World; `useChatFeed.ts` uses cache and reconnect; `ChatLog.tsx` tracks unread divider and scroll state. **Design:** keep current deliberate 25-message limit; check channel labels, sender identity, emote tray/send placement, unread divider, per-channel retention and accessible badge announcements. Change initial-channel behavior only after confirming whether default World is intended. **Effort M · risk Low for tests · benefit High.** **Test:** send→switch→return, mixed 25 rows, blocked player while in-flight refresh, party removal, guild exit, same-height chat viewport, app restart and account switch.

### U08 — Auth state communicates exact account identity
**Source:** `online/account.ts`, `core/auth-account-link.ts`, `online/AuthSessionProvider.tsx` contain sequencing/verification logic. **Design:** display clear `Guest`, `Check email`, `Set password`, `Linked` statuses; preserve account ID across guest upgrade; if verification callback fails, offer refresh/resend without suggesting new-account creation. **Effort M · risk Medium · benefit High.** **Test:** initial guest, verified link, password, relaunch, resend, invalid old link, Google link, signed-out sign-in, revoked auth; state never looks linked before verified.

### U09 — Bank / inventory / claims pending and retry visibility
**Source:** `InventoryScreen.tsx` has explicit inventory busy guard and inline feedback, `coop-command-journal.ts` persists pending actions, online gameplay repository has pending commands. **Design:** consistent waiting, retry, definitive failure, and saved-success feedback while preserving selection/quantity; do not show simultaneous contradictory success and error. **Effort M · risk Medium · benefit High.** **Test:** slow bank sell/withdraw, sell multiple identical items, craft all, co-op claim, double click, app kill; confirm exact mutation count and feedback order.

### U10 — Home/Combat perceived performance
**Source:** `App.tsx` drives Home/Combat clock every 2 seconds and computes preview and badges in root. **Design:** preserve responsive progress animation but reduce unrelated UI movement; optimize only after capturing render timings and scroll FPS. **Effort M · risk Medium · benefit potentially High, unmeasured.** **Test:** 10-minute active combat and return from background at multiple font scales; no stale timer or missing notification.

### U11 — Inventory and bank hierarchy
**Source:** `apps/mobile/src/screens/InventoryScreen.tsx` uses `FlatList`, search, location tabs, bulk selection (up to 100 stacks), busy and feedback states. **Design investigation:** ensure inventory/bank/overflow labels explain source and capacity; keep filters visible but not taller than necessary; surface `Selected N · Total value · Confirm` during bulk mode. **Effort M · risk Medium · benefit Medium.** **Test:** 100+ stacks, empty bank, clipped equipment icon, long names, repeated filter shifts, quantity validation and cancel/reopen state.

### U12 — Home queue handoff communication
**Source:** `App.tsx` handles queue changes and routes to Home; `src/core/activity-queue.ts` validates readiness and location/goal. **Design investigation:** show current activity, next queued action, switching condition and time window on one compact command panel. A disabled queue action should state the exact reason; do not silently auto-travel unless enabled. **Effort M · risk Medium · benefit Medium.** **Test:** 30-minute handoff preference, insufficient resources, unsupported region, combat-vs-crafting handoff, stop/start race and restart.

### U13 — Co-op NPC/Echo clarity
**Source:** `backend/online/qmode-runtime.ts`, `backend/src/server/coop/echo-recruitment.ts`, `apps/mobile/src/core/coop-qmode.ts`, `screens/CoopExpeditionScreen.tsx`, `docs/implementation/qmode-npc-fallback.md`. **Design:** visible `Real Echo`, `NPC Ally`, own character role, loadout readiness, role requirements, request pending and reward settlement distinction. Do not imply NPCs are other users or that an Echo requires a second equipped character. **Effort M · risk Low · benefit High.** **Test:** zero, partial, full Echo donor pools; invalid loadout, class conflict, offline resume and end reward.

### U14 — Profile customization flow
**Source:** `screens/ProfileCustomizeScreen.tsx` holds section/dirty state; `App.tsx` manages attention keys and pending notifications. **Design investigation:** keep one clear Save/Discard affordance, prevent loss of changes, avoid re-querying every tab change; use cached previews with explicit refresh, not fake live icons. **Effort M · risk Medium · benefit Medium.** **Test:** switch category repeatedly, preview multiple backgrounds/icons, save then back, discard confirmation, slow network, relaunch.

### U15 — Guild information density and consistency
**Source:** `screens/GuildScreen.tsx` routing in `App.tsx`, guild roster/activity/projects and chat components; recent main commits explicitly improve small font legibility. **Design investigation:** player rank, guild tag, participation, project progress, donation and available action should be discoverable without a full-screen wall of panels. Preserve guild permissions and cooldown text. **Effort M · risk Medium · benefit Medium.** **Test:** leader/officer/member, empty and full guild, expired invite, pending application, 110% project overfill, new and long guild names, low-level lock.

### U16 — Tutorials and newly unlocked systems
**Source:** `FirstSessionTutorialPopup.tsx`, `MainScreenTourPopup.tsx`, `src/core/feature-unlocks.ts`, App notice queues. **Design investigation:** keep short contextual guidance with spotlight/one decision; offer replay in Settings; skip repetitive prompt when already learned; never conceal a necessary feature. **Effort M · risk Low · benefit Medium.** **Test:** first play, guest restart, character switch, level threshold, reduced motion, repeated dismiss/replay, post-update return.

### U17 — Seasonal event eligibility and startup art
**Source:** `App.tsx` uses `fetchActiveEventRuntime`, `canAnnounceLiveEventStart`, `eventAnnouncementStore.claim`; `app.json` splash remains a general branded static image. **Design investigation:** distinguish general startup artwork from event artwork and date/level gating; show event announcement only when eligible and truly active, with one-time semantics. **Effort M · risk Medium · benefit Medium.** **Test:** UTC event day boundary, timezone differences, new level-1 player, returning eligible player, foreground after event ends, event currency claim.

### U18 — Navigation and quick actions
**Source:** `App.tsx` routes Home, Combat, World, Quests, Skills, Inventory, Character, Guild, Account and Chat; `PrimaryNavigation` and `GameTopBar` own presentation. **Design investigation:** ensure active tab, back stack, notification badges and quick-access shortcuts identify where they go and return appropriately; preserve the activity bar's Stop/Flee action clarity. **Effort M · risk Low · benefit Medium.** **Test:** deep navigation through task, back hardware/swipe, switching character mid-route, multiple quick shortcuts, badge count after claim.

### U19 — Store / VIP / billing trust
**Source:** `expo-iap` dependency, `SettingsScreen.tsx` commerce refresh callback, CI billing contract tests and `App.tsx` commerce state. **Design investigation:** item descriptions, one-time versus subscription status, restore, active bonuses, and non-pay-to-win cosmetic policy must be clearly communicated; purchase wait/error must not imply success early. **Effort M · risk Medium · benefit Medium.** **Test:** purchase cancelled, paid then app killed, restore on second install, store unavailable, already-owned and subscription expiry.

### U20 — Consistency pass for small-state polish
**Source:** `GameButton.tsx`, `EmptyState`, `ActionFeedback`, `GameModalSurface`, themed colors, core screens. **Design:** audit disabled-state explanation, skeleton/progress, no-results and long-label handling, contrast, consistent rarity border sizing and icon alignment. Change only observed exceptions; preserve existing good custom styling. **Effort S–M · risk Low · benefit Medium.** **Test:** three themes, different device sizes, narrow screens, 1.5x text, reduced motion.

## Screen-by-screen review checklist (test matrix)
| Journey | What player needs to see | Static evidence / status | Target QA |
|---|---|---|---|
| Cold launch/account welcome | connection vs update vs maintenance, guest/linked status | `App.tsx` has gates and recovery; not run | offline, update required, auth callback |
| Character creation | class, body choice, name validation, no accidental default | `ClassSelectScreen` routed; detailed input not re-verified | blank name, duplicate name, cancel/relaunch |
| Home/activity overview | current action, reward, next action, stop | `HomeScreen`, `ActionQueuePanel`; clock in root | long activity, goal handoff |
| Skills / cooking / smelting | materials total, output, cycle count, time cap | `processing.ts` verified, screen visual untested | multi-stack fish, bank fuel |
| Combat | current enemy, tactics, HP/food, results | `CombatScreen` routed | no food, flee, resume |
| World | travel locks, region progress and activity choices | `WorldScreen.tsx` verified silent fallback | stale server and travel denial |
| Inventory / bank / overflow | items, quantity, location, favorite, bulk | `InventoryScreen` FlatList and guards | 100+ stacks, quick repeated transfers |
| Character/equipment | stats, set bonuses, gear compare, cosmetics | `CharacterScreen` routed | tiny icon, long stat, rare gear |
| Companions/pets | equipped versus expedition/trial, bonuses | `CompanionsScreen` routed | duplicates, role restrictions |
| Quests/contracts | progress, reward claim, blocked reason | `QuestScreen` routed | claim exactly once |
| Guild | permissions, projects, roster, chat, token shop | recent guild legibility work; no screenshot QA | rank variants, long names |
| Party/social | real online status, invites, unread | social provider and chat | invite expiration/reconnect |
| Co-op dungeon | readiness, role composition, turn, rewards | Q-Mode runtime, screen source | 0 Echo + NPC fallback, conflict |
| Profile customization | preview, dirty state, saved identity | `ProfileCustomizeScreen`, App notices | rapid changes and navigation |
| Events | active dates, eligible announcements and currency | runtime fetch/claim guard exists | UTC start/end, low level |
| VIP/store | owned benefits, paid/restore status | app billing tests exist | interrupted purchase |
| Settings | language, theme, accessibility, backup/recovery | `SettingsScreen` and local backup | text scale, reset confirmation |

## Popup and loading-state contract
| Trigger | Preferred feedback | Should interrupt? |
|---|---|---|
| Click Claim / Claim All | results/reward summary | Yes, once |
| Change chat channel | retained history + loading/error inline | No |
| Change profile preview | instant preview, pending Save indicator | No |
| Set inventory filter/sort | immediate list change | No |
| Bank transfer/sell | disabled pending action + success/error | No full-screen reward modal |
| Event becomes active while app backgrounded | event badge or eligibility-gated announcement | At most once; respect active context |
| Rare item crafting claim | controlled rare-result reveal | Yes if explicitly claimed |
| Network loss | inline Offline/Retry with cached data | No repeated alert |
| Account switch | clear old private content; scoped loading | Yes only if confirmation necessary |

## Low-risk quick wins
- Add Inventory + Bank totals and per-cycle cost to cooking preview (U01).
- Replace misleading chat ONLINE badge or bind connection state (U02).
- Add nonblocking World stale-progress indicator with Retry (U03).
- Normalize HTTP 502/503 message and pending-retry button (U04).
- Raise chat metadata font to shared legibility floor (U05), visually recheck layout.
- Add a single popup suppression regression for chat channel/profile navigation (U06).
- Assert screen reader labels on compact chat/guild quick-action buttons (U05/U20).
- Add a screenshot baseline for 320/360dp at maximum supported font scaling.

## Explicitly **do not** do in this pass
- Do not remove useful stat rows, activity details, equipment rarity, guild permission explanations, or class/role constraints to make screens look empty.
- Do not replace readable text with unexplained icons, decorative animation or excessive overlay panels.
- Do not add a mandatory tutorial to every reopened screen or an intrusive reward popup to background updates.
- Do not change recipe/resource mathematics because one inventory stack appears small; test aggregated ownership.
- Do not downgrade existing high-quality sprite/pixel-art work or flatten runtime rarity borders.
- Do not remake the whole navigation hierarchy or force a general UI redesign without task and usability evidence.
- Do not grow chat retention/polling just for visual completeness.
- Do not overhaul the store economy or monetization while doing a quality-only audit.

## Recommended UX validation session
Use representative player personas: brand-new guest, level-10 guild member, midgame crafter with 3 partial material stacks and bank resources, returning event player, paid VIP, and experienced co-op controller. Run 5 primary tasks (start/queue/claim, cook all possible, bank bulk transfer, send world/guild chat, launch Q-Mode), record tap count, errors, first-success time, confusion moments and accessibility violations. Only approve a refinement if it removes a real obstacle or measurably improves comprehension without hiding meaningful game mechanics.

**Completion rule:** each U-item closes only after screenshot/device evidence, exact reproduction/acceptance steps, and regression proof. This document prepares work; it does not assert those tests have passed.