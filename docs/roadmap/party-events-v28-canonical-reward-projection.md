# Party Events v28 — canonical, nonpaying GameState reward projection

**15 November 2026 | Draft only | Feature hidden | No claim/payout.** Built on the existing v6–v27 draft Party Events branch and PR #1045. No SQL migrations have been applied to staging or production.

## Implemented in this branch

- `apps/mobile/src/core/types.ts`: optional, account-wide `account.partyRenown` counter. **This is nonspendable lifetime Party Renown**, distinct from Expedition Marks, Guild Tokens, Player Market currency, and temporary event currencies.
- `apps/mobile/src/core/game.ts`: new accounts begin with `partyRenown: 0`.
- `apps/mobile/src/core/save-normalization.ts`: old accounts normalize the missing field to `0`; safe existing nonnegative integers survive save normalization. Companion Essence and Bondstones remain in their existing canonical account fields.
- `backend/online/party-event-save-projection-v28.ts`: returns an **immutable before/after preview** using an authenticated, reconciled v27 evidence object and the *trusted* live state, version and gold projections.
- `backend/online/tests/party-event-save-projection-v28.ts`: deterministic rewards across all three difficulties, six bands and four reward types (72 combinations) plus targeted identity, overflow, inventory and XP/currency cap regressions.
- `backend/package.json` and `.github/workflows/party-weekly-v2-validation.yml`: include the new test and relevant changed source paths in the hidden weekly validation suite.

## Actual game-state compatibility

- **Gold:** updates only a *proposed* new `state.character.gold`, after equality checks against the separately supplied locked wallet and character-row projections. Real payment must also update `public.characters.gold`, `public.character_wallets.gold`, the online save and the online revision **within one server-owned DB transaction**.
- **Warrior Combat XP:** uses Veldryn's `awardClassSkillXp` and the active character's canonical `trainingFocus`. It distributes experience across two class disciplines with fractional carry, recalculating level by the *class combat skill* curve. It does not add XP to `character.xp`. At level-100 cap, silent XP loss causes the preview to reject.
- **Artisan Skill XP:** requires a verified target profession that is already present in `state.skills`, then derives its new level via the *profession* `levelFromXp` curve. At cap, rejects rather than silently truncating.
- **Companion Essence and Bondstones:** propose increments to the existing `state.account.companionEssence` and `state.account.bondstones`; no extra SQL wallet is invented.
- **Party Renown:** proposes an account-wide lifetime total in `state.account.partyRenown`. No shop or spending mechanic exists. This is a proposed canonical save location, **not yet an independently audited spendable economy ledger**.
- **GEM_DUST:** existing ordinary material item, real `itemStackCap` is **99,999**. Matching reward routing, the preview merges into the first current GEM_DUST stack before creating a new inventory slot. If no room exists, **rejects** rather than making an implicit Bank/Overflow transfer. Other inventory stacks are untouched. Capacity uses `entitlementStorageCapacity`, including active legitimate slot benefits.
- **Participation rewards:** gold only. Warrior, Artisan and Companion choices cannot be selected after a participation result.

## Trust and release boundaries

The preview checks v27 proof flags and trusted account/character identity, current `onlineRevision`, exact deterministic reward model, Gold projections, integer overflow, material topology/capacity, and skill curve caps. The returned state is a **detached proposal**, not an authorized credit, write operation or receipt:

```text
previewOnly = true
economyApplied = false
claimed = false
claimable = false
inboxDelivered = false
```

`PARTY_EVENT_SAVE_PROJECTION_V28_RELEASED=false` stays unchanged; `claimPartyEventSaveV28()` always rejects. The public mobile app has no Party Event claim UI or reward route. The new account field by itself cannot credit renown.

## What still prevents a real claim

1. A single account-serialized atomic SQL commit, with the same `party-account:` advisory lock and row-level concurrency rules as regular gameplay, *revalidating after locking*. An app-side pure preview is not sufficient.
2. An independently persisted unique *paid* claim receipt, keyed by event/account/offer, and complete legal ownership/replay verification. All three v25 snapshots and v27 reconciliation must agree.
3. A native, durable private Inbox delivery record committed **in the same DB transaction**. Read-only v25 preview Inbox responses must not be mistaken for mail delivery.
4. Verification that the future paid Party Renown field remains synchronized with every normal save/character switch and that untrusted gameplay requests cannot grant themselves Renown. Do **not** accept arbitrary client state.
5. Proper transfer of all currency/XP/stack quantities, leveling, wallet projections, event receipt and Inbox. If **any** destination fails, rollback *all* changes, including the unique paid receipt.
6. Dry-run staging tests and a fresh GitHub CI run on this branch; the latest previously seen successful Party Events validation predates v27/v28.
7. No deployment, merge, release-gate enablement or actual payment until the complete atomic settlement is reviewed and passes the above tests.

This v28 pass intentionally stops at the **pure projection boundary** and does **not** introduce a SQL grant path. Its output must never be written to the online save directly without the completed server-owned all-or-nothing transaction.
