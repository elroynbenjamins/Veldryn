# Veldryn 2.0 — career/equipment/crafting integration gates
**22 November 2026 — HIDDEN, review-only. No production or staging writes.**

## Source of truth
- **Overall Character Level**: separate overall Character XP bank from verified gameplay work, including combat or standalone professions. Not an equipment/encounter power source.
- **Combat Level**: existing combat-only level/XP; continues to gate wearable combat gear, class skills, dungeons and enemy scaling. Never infer it from overall Character Level.
- **Profession Level**: per-skill XP; only the profession relevant to a recipe/node/tool may gate that operation. Combat Lv1 specialists may craft high-tier gear and obtain combat-only ingredients through future verified market/commission transfers. Buying equipment still does not waive its Combat wearing gate.
- Current numerical tier floors in hidden independent-careers preview: **1 / 12 / 24 / 36 / 48 / 60 / 72 / 84 / 96** (provisional).
- Hidden gathering-tool policy (#1615) uses real T1–T4 tool floors **1 / 10 / 22 / 35** and keeps existing owner/blueprint/copy gates. These floors disagree with the new preview by **0 / 2 / 2 / 1 levels** respectively; choose one versioned, migration-safe authority before combining branches. Do not remove already earned tool access or silently retier existing copies.
- Older Combat 2.0 profession policy also treated Character Level as Combat Level and proposed T9=90, inconsistent with the new three-track semantics. No automatic definition merging.

## Boundary order (each gate must independently pass)
1. **Canonical authoring and source definitions.** Freeze user-reviewed profession licenses and T1–T9 item/recipe definitions. Preserve the 169 pinned ordinary Forge IDs and the distinction from 204 proposed set members. The 48 T1–T4 set families and 746 proposed craft routes in #1598 remain review-only. All 14 newly proposed ingredients require real registered source grants; do not disable the existing server projection's EQ2_-stack safeguard prematurely.
2. **One authoritative completion envelope.** Use the original server-simulated command/queue, same character/account/request hash and commit revision, and the actual original segment ordinal across gathering and combat. Pending proofs from two nested projections must describe the identical queue; mismatch is a hard denial (guard in the independent-careers hidden branch, with expanded negative tests in this child review).
3. **Atomic XP and ownership.** Verify service-owned original completion and source receipt, character ownership, cutoff timestamp and account revision *inside* the same transaction that inserts the globally unique career receipt and increments the overall XP bank. A retry must return its prior result without item, Gold, profession XP or Character XP duplication. Unverified old response blobs are not proof of new rewards.
4. **Real inventory/market custody.** Differentiate unique equipment copies and stackable components by an authoritative registered item type, not an `EQ2_` prefix or client ID. One transaction reserves character inventory + account Bank + Gold + blueprint/recipe, then delivers an exact-owned output instance after completion. Future market/commission escrow transfers source-verified combat ingredients, with anti-alt/self-trade checks and no XP from buying, relisting or cancelled jobs.
5. **Combined combat regression.** Verify nine classes, 18 specs, 13 implemented advanced affix channels, approved traits, counter-builds and six regional boss profiles from *one* versioned compiled build, checking both deterministic replay and runtime ownership. Unissued set concepts must not grant set bonuses.
6. **Migration and product gates.** Read-only per-character migration dry-run; preserve saved combat/skill levels and previously unlocked account character slots; run disposable PG17 concurrent/retry tests plus staging readbacks; obtain actual UI/theme approval before any mobile navigation/runtime code or live flags.

## Non-negotiable QA scenarios
| Scenario | Expected outcome |
|---|---|
| Combat Lv1, Smithing sufficiently licensed, materials/blueprint verified | May craft appropriate tool or equipment; no combat training gate |
| Combat Lv1, Mining sufficiently licensed, owns correct copy | May equip a qualifying mining tool, not combat armor |
| Combat Lv1 specialist, rare monster material bought through verified escrow | May use legitimately transferred input, but no XP for the purchase |
| Smith with missing unrelated Fishing skill | Smithing recipe stays available if its own inputs and level are met |
| Two proofs disagree on queue length, target, elapsed time, reward XP or claim timestamp | Hard rejection; no Career XP issuance |
| Concurrent duplicate request or cross-character replay | Exactly one original claim; wrong owner has no credit |
| T4 Glassbound Dust has only an imagined battle drop | Release blocked until profession-accessible source or verified trade is authored |
| T5–T9 tool/set ID without approved authored catalogue | Not issuable, craftable, equippable or market-listable |
| User only accepts the data model, not the screen | Backend previews stay unmounted; no mobile UI change |

## Status
These are integration checks and review requirements, **not evidence of production readiness**. The separate hidden #1615 Skills suite passed all six exact-head jobs at run 45030446177, while broad inherited mobile tests still have unrelated failures. The #1619 mixed-proof guard is a code change in a child draft of independent-careers #1603; it requires its own exact-head CI check. **No merge to main, SQL execution, feature flag activation, market release or live XP write.**
