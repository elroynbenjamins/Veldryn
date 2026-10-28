# Veldryn — decision-first mobile information audit

**2026-10-28 | Draft PR #624 | Baseline: GitHub main cb975ec | Unmerged**

## Principle

When a player opens a screen, the top viewport should answer: **Where am I? What can I do? What will I get/cost? Why is the action locked?** Only retain a filter, dropdown, separate tab or detail sheet when it affects a real choice; otherwise hide it or remove it. No in-game functionality may be removed merely for fewer visible words.

## Changes made in code

| Area | Removed / delayed | Retained in plain view | Reason |
| --- | --- | --- | --- |
| Event Overview | Detailed per-unit rate table, base/boost comparison and rare discovery odds collapsed behind a single accessible “How to earn [currency] · Rates & discoveries” entry | Current event progress, daily claim, candy actions, featured activities, weekly activity button and reward trail | Drop chances matter to optimizers, not to everyday event participation |
| Inventory Crafting | Repeated authoritative-recipe/bank explanation; second “Sort” button that opened the *same* filter sheet as “Filters” | Search, recipe results, count, craft action; one combined filters/sort entry | One control per destination instead of two apparent menus with identical behavior |
| World | “Travel” kicker and explanatory paragraph stating that region determines activities; long instructional objective-route sentence | Current region art/name, Combat/Gathering buttons, route target, next-unlock requirements, travel destinations and Dungeon tab | Strong visual hierarchy and concise progress instead of repeated guidance |
| Guild | A section introduction above online Activities/Hall/Roster/Manage that repeated the tab and nested content labels | Guild navigation, roster and permissions, activities, Hall shop/facilities and Manage actions | Prevent stacking a main tab title, section title and subtab title before reaching content |
| Party | Passive weekly-contract explanation above contracts that already display personal minimum and contribution | Member controls, Party Chat, Contracts, weekly rewards, Find More and recruitment filters | Actual contract values tell players more than an explanatory paragraph |

## Why we did NOT eliminate more navigation

- Guild’s five top destinations serve distinct tasks (home, raid, weekly activities, Hall, chat). Removing a tab now would move an important action deeper.
- Party’s “My party / Find more” and “Parties recruiting / Players seeking” represent distinct states, not duplicate menus; Filters is already collapsed.
- World’s Current Region / Dungeon switch is a real gameplay destination choice, not cosmetic.
- Crafting needs the full sorting/filter controls on demand, but only one visible entry into the sheet.
- Event discovery odds must remain inspectable for experienced players even though they no longer occupy the first viewport.
- Inventory’s richer search, favorites, bulk management and status indicators need a dedicated journey-focused QA pass before structural removal, due to risk of losing core workflows.
- Companion-specific decisions are separately implemented in stacked draft PR [#623](https://github.com/elroynbenjamins/Veldryn/pull/623) atop [#619](https://github.com/elroynbenjamins/Veldryn/pull/619); do not merge it blindly with the present branch.

## Verification & release gates

- **10/10** direct source-level checks of the changed live components passed.
- New `apps/mobile/tests/core-screen-simplicity-ui-contract.cjs` (16 source assertions including one `assert.equal`) registered in `tools/mobile-core-tests.json`. A passed source check is not a passed mobile or Android end-to-end test.
- Existing baseline Guild/Chat mobile TS issues on `main` and core `starter-companion-choice.ts` mismatch may block full GitHub Actions on this branch. The separate Guild/Chat compatibility fix is in [#621](https://github.com/elroynbenjamins/Veldryn/pull/621). **Do not bypass tests to make this appear release-ready.**
- **Native QA pending:** narrow screens (320dp), fontScale 1.5–2.0, TalkBack, opening/closing event detail on status change, eligible/ineligible recipes, Guild leader vs member roles, online/local navigation, seasonal rollovers. No game-rule changes, database writes, Android build, merge or deployment performed.
