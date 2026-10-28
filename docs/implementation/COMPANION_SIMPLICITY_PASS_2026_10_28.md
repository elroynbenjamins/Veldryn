# Companion information hierarchy — simplicity pass

**28 Oct 2026 · Implementation review PR #623 (stacked on Companion UX PR #619)**

## Guiding rule

Show the next usable action, current result/reward/cost and any blocking requirement. Delay the rest. A separate control is justified only when it leads to a distinct gameplay decision, not just to explain the screen.

## Screen-by-screen decisions

| Place | Decision | Why |
| --- | --- | --- |
| Companion entry | Remove duplicated Sanctuary kicker and retain a single Companions title | The tab/navigation already identifies the feature |
| Ready-action banner | Keep one short notification line; put all attention labels into its accessibility text | Alerts stay visible without a multi-line checklist repeating tabs |
| Other character progression | Keep accessible by expandable link; remove the paragraph explaining that it exists | Account roster, exploration and monster mastery are secondary to this screen |
| Roster filters | Show only at 8+ owned companions; earlier rosters default to Owned with separate Codex discovery | A menu with six filter options is unnecessary for a handful of owned companions |
| Roster cards | Keep artwork/name/rarity/role/level/equipped or busy; remove passive “Selected” and repeated available status | Players want to choose who to train, not audit statuses on every card |
| Resource totals | Show only in Training detail or Sanctuary, rather than above every Companion destination | Essence/Bondstones/Gold do not affect the next Trial/Expedition decision |
| Individual companion detail | Keep Train, Bond, Abilities, Ascension and an optional progression roadmap | Each represents a distinct upgrade decision or necessary unlock rule |
| Trial formation | Keep visible, changeable from the first viewport | Defines role legality and power; cannot be hidden |
| Trial Start/Fight | Keep visible before tower | Primary action |
| Trial Season info | Move into Challenges & Rewards | Relevant for advanced monthly planning, not for starting a fight |
| Trial Tower and full encounter details | Remain optional; only show replay button after eligible recorded battle | Long histories/visuals are secondary; prevent dead-end replay action |
| Expedition active list | Hide if there are no active/claimable assignments | “Nothing currently active” did not advance a decision |
| Expedition mission selector | Keep visible because duration/reward/requirements vary | A real required choice, not redundant navigation |
| Expedition companion picker | Keep one focused sheet and the existing suggested team action | Eligibility, equipped status and assignment locks matter |
| Expedition supplies/rewards | Keep price/rewards/stamina visible; detailed rules under Mission Details | Spending resources must remain informed/explicit |
| Sanctuary facilities | Keep compact expandable cards; details/cost/action stay one tap away | Players can scan upgrades without full descriptions on every card |
| Mission selector chevron | Replace Unicode arrows with two native border strokes and rotation | Reliable rendering in Android themes/fonts |

## Unchanged invariants

Authoritative `onCommand` calls for level/ascend/equip/Trial start/floor/replay/Expedition send/claim/upgrade, server eligibility and resources are not modified. No new currencies, tabs, backend migrations, account save changes or auto-spending. Existing localizations are reused.

## Validation

- Direct source review: **12/12** focused invariants pass against this branch.
- Added **18** CJS source-contract assertions in `apps/mobile/tests/companion-simplicity-ui-contract.cjs` and registered them in `tools/mobile-core-tests.json`. Their execution via normal GitHub CI may be blocked by the pre-existing `starter-companion-choice.ts` mismatch; do not claim success without a completed run.
- CI mobile TypeScript and Android native UX are release gates, not assumed. Test 320dp and enlarged font, accessibility focus, Guild/Party unlock edge cases, mission costs, Trial monthly rollover, loading and server errors.
- PR remains **draft** and stacked on #619. No merge/deployment.

## Defer, rather than over-simplify

Do **not** remove mission selection, Trial formation, enhancement requirements, Sanctuary upgrade costs, Codex/Prestige exploration or the Guild/Party eligibility signals. Those are decisions and correctness information, not unnecessary text.
