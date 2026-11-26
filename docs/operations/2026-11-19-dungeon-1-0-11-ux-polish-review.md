# Veldryn 1.0.11 — Dungeon UI/UX implementation and release review
Date: 2026-11-19 · Draft PR #1468 · Base: `release/1.0.11-feature-integration-20261119`

> **RELEASE HOLD.** Source review and code changes are not production verification. No production migration, rollout, publication, merge to `main`, or final Android acceptance is authorized by this document. All unknown statuses remain incomplete.

## Scope and boundaries
Five existing candidate surfaces: Dungeon Hub, dedicated weekly challenge, Solo/Echo friend-and-guild party picker, seven-room Endurance route/room choices, and pre-run Loadout. All remain connected to the existing entry/claim/vote/start callbacks. No manual Echo sharing switch, no new quest currency, no alternative backend matchmaker, no release activation, no merchant gear unlock.

### Refinement pass 1 — information hierarchy and compactness
- **Hub:** reduced header/card visual density; quest remains above Finder and event dungeon previews remain before regional catalog; Solo/Live switch, Shop, Quick Match and locked regions preserved.
- **Weekly Quest:** one rotating challenge; inline progress and +25 Expedition Marks always visible, ready reward claim does not require expanding long-form explanation; account/week notes in disclosure.
- **Echo:** four distinct role slots, selected count, optional friend/guild filtering and search; compact candidates show class portraits, role sprite, level, relationship or invalid eligibility reason.
- **Endurance:** seven-room progress segment with checkpoint index and localized next-boss legend; boss path looks distinct from further-depth choices; no hard-coded run duration on regional card.
- **Loadout:** compact character portrait, tier labeled T1/T2/T3 (not player level), redundant 'ready' result card omitted when no blockers; important failures, companion/potion and collapsible stats remain.

### Refinement pass 2 — interaction and accessibility
- Keep existing 1 tank / 2 different-damage / 1 support requirement, no duplicate accounts, missing roles automatically filled by server Echo/NPC; server rechecks selected IDs.
- Candidate filters and search >=44 point high; per-slot screen reader names; unavailable candidate reasons visible and announced; quest header accessible with expanded state and localized name.
- **Live boss option is a vote**, not immediate combat: use distinct localized action from Solo boss entry. Keep true server-owned vote counts, decision IDs and tap handler.
- Room-card reveal animations stop on unmount and honor Android's reduced-motion preference; other timing and server settlement is unchanged.
- Eight-language UI microcopy (EN, DE, ES, NL, IT, FR, RU, TR), including localized status, reset, week-progress placeholders, vote/finish action and Endurance legends.

### Refinement pass 3 — regression and risk review
- New `apps/mobile/tests/dungeon-ui-refinement.cjs`: execute weekly target-bound validator for weekly targets 1/3/15; validate compact behavior, eight-language text coverage and interpolation, boss vote/finish distinction and reduced-motion wiring, existing server action contracts and auto-fill.
- Dungeon mechanics CI adds focused source contract tests, UI regressions and TypeScript check. Existing dungeon guide, social Echo and route contract suites remain.
- **Validator correction:** candidate source already used `progress <= quest.target`. A redundant comparator had looked suspicious but is not a hard-coded one. Retain exact shared-source/generated Edge parity until the next deliberate backend regeneration; regression tests verify target-level acceptance.
- Existing candidate already has a failing automatic social-Echo backend fixture test. This predates PR #1468; added fail-only diagnostics for investigation, without weakening contact authorization.
- Legacy route state, published boss 50/50, combat Marks 25 cap, currency wallet writes, Live vote resolution, recipient privacy, role eligibility, and quest per-account claim RPC are unchanged by the UI work.

## Verification matrix

| Area | Source implementation | Automated verification | Android/manual verification |
| --- | --- | --- | --- |
| Hub / events / Shop / Quick Match | Updated in PR #1468 | Re-run source and UI suite on exact final SHA | **NOT VERIFIED** |
| Weekly quest, 1/3/15 progress, claim | Updated; server-owned claim unchanged | New validator and existing claim/rotation checks; exact-head CI pending | **NOT VERIFIED** |
| Echo friends/guild selection and NPC fallback | Updated client, server authorization unchanged | Picker regression added; **baseline backend auto-Echo fixture currently failing** | **NOT VERIFIED** |
| Endurance room choices, Live votes, reduced motion | Updated client, server choice unchanged | Route contract and a11y assertions; exact-head CI pending | **NOT VERIFIED** |
| Loadout, companion/potions, readiness | Updated client with blockers intact | Source contract, TypeScript and runtime smoke; exact-head CI pending | **NOT VERIFIED** |
| Eight-language copy, Russian and German overflow | New keyed translations and interpolation assertions | Localization CI on exact final SHA pending | **NOT VERIFIED** |

### Android acceptance checklist before GO
- Real 320/360/393/420dp Android widths, default and 1.3x/1.5x/2x system font. Verify header overflow, 4-slot roster, selected friend cards, role badges, quest claim and sticky start; no clipped actions.
- TalkBack: collapsed/expanded quest and each of four role slots, progress bar value, invalid candidate reasons, nonselectable room cards, Live boss vote, reward claim, focus after navigation and opening the keyboard.
- Android Reduce animations ON and OFF; confirm no forced reveal and no blocked route decision when on.
- Search keyboard and back gesture / safe-area inset; 0/1/6/7/64 candidates, delayed error, retry, selection invalidation after removal or blocking, long player names and localized Russian/German text.
- Solo vs Live boss checkpoint at depths 7,14,21,28,35 and safety final forced 42/43; no double vote, no premature boss settlement or reward. Reconnect/resume, older short-graph save and disconnect fallback.
- Weekly task rotation, same-run elite count and depth 15 progress, UTC week rollover, multiple characters on same account, double-claim and stale claim; no normal quest points.
- Install a correctly signed **staging** Android build and test 1.0.10 data upgrade against the exact candidate SHA. Production rollout still needs explicit GO and rollback sign-off.

## CI provenance
- Baseline 1.0.11 release-candidate SHA `8394f811bc4d28bd65c798e8f70db1b4673ff154` already had failed Dungeon mechanics, Mobile UX, Mobile core, Russian localization and other workflows. The existing automatic social-Echo failure is independently confirmed on that baseline.
- CI runs on intermediate UI commits are not acceptable final-head sign-off. Investigate all final-sha failures and build/visual QA separately. No automatic merge.

## Release decision
**NO-GO / draft.** Functional source integration and three polish passes are delivered; final CI, server-only Echo failure triage, staging/backend parity and small Android device QA remain open.
