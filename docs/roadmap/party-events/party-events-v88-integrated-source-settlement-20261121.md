# Party Events V88 — single-connection canonical source + real-resource chain

**21 Nov 2026. HIDDEN DEVELOPMENT / DRAFT. No main merge, staging/production migration, live payout or UI change.**

## Integration

V87's independently certified DB-source reader and V86's four physical Party Event reward writers are now composed through the small `createPartyEventAtomicPortsV88(true)` QA-only factory. It returns exactly the V70 `readCanonicalSource`, `creditGuaranteed`, `grantDrop`, `grantInbox` and `verifyPhysical` ports and has **no transaction creator, network call, public RPC or standalone reward writer**.

When a trusted worker eventually supplies an authenticated account and private entropy to the existing V69 gateway, the hidden V70 store guarantees:
1. One SERIALIZABLE account/source database session and account-wide fence;
2. Immutable existing-receipt replay, before any fresh source roll;
3. **V87 SQL** validation of the settled V11 party/week, V14 recorded activity, V16 donation and completed stage-3 optional orders, V17 supply seal, V18 frozen character/loadout, V23 replay attestation, AND separate immutable V87 independent victory and tier certificates. **V23 by itself is not a win or reward entitlement**;
4. V69 frozen HMAC chest result using original V51/V68 odds, deterministic on first claim;
5. For a legitimate **equipment miss only**, V86 inserts the matching V61 receipt and physically applies existing V65 Sigils (+8/+10/+16), existing Gold wallet, GameState Gem Dust and Companion Essence, writes four V86 audit rows and inert V80 already-paid Inbox history, and V70 independently verifies all immutable grant legs;
6. Any incomplete source, absent tier certificate, missing independent victory (Finale), partial optional orders (Preparation), full Inventory+Bank, invalid account/character, corrupt receipt, SQL error or unsupported EQ2 hit causes a failed/rolled-back claim. A committed replay does NOT reroll or grant a second set.

The per-account/source keys are unchanged, and the V63/V60 legacy prototype MUST NOT be mounted as a competing payout system. No Equipment 2.0 issuance has been faked or enabled.

## QA/regression change

The pre-existing disposable `backend/tests/party-event-real-rewards-v86.mjs` has been upgraded to **V88 integration**. It now creates the real review-only V87 certificate schema and a synthetic V11/V14/V16/V17/V18/V23 chain, and uses the production-shape V87 joined SQL query instead of feeding a mocked proof to the physical payout gateway. It still exercises V70+V61+V65+V86+V80 in one pinned PGlite connection, including:

- No V87 settlement certificate => **no V70 receipt or payout**, then fixture-only certificate reinsertion.
- Original Adventure Chest miss => exact +8 Party Sigils, +200 Gold, +2 Gem Dust, +4 Companion Essence and already-claimed Inbox history;
- Receipt replay after later resource spending without a second payout;
- Incomplete optional stage-3 order => Preparation Chest refused before new receipts/Sigils;
- Full inventory and bank => rollback of V61/V65/V70, immutable audits, wallet, account GameState and Inbox; safe retry succeeds;
- Equipment hit without authoritative PE_/EQ2 custody => no committed Finale receipt and no Sigils payout;
- Wrong authenticated account => blocked.

A separate strict TypeScript `weekly-party-event-atomic-ports-v88.ts` test verifies the released=false flags, the five exact ports, and production-mode construction refusal. The hidden CI now compiles V88, executes its assembly regression and the integrated V88 PGlite test.

**All tests are authored but not certified green** until exact-head workflow execution. No independent physical PostgreSQL 17.6 session test was run. The V87 certificate rows in PGlite are synthetic DBA fixture insertions, **not** evidence of a real independent combat verifier or tier issuer.

## Remaining release blockers

1. An audited real V87 independent victory validator and frozen character-level-to-reward-tier certificate creator. Existing V23 worker attestation intentionally claims no independent victory and cannot be promoted by itself.
2. Real Postgres 17.6 two-connection SERIALIZABLE races, retries, lock timeouts, time-of-check/time-of-use, rollback, account erasure and event end boundary cases. PGlite on one connection is insufficient.
3. All reviewed hidden Party SQL dependencies deployed **only after** staging parity, threat modeling and user approval; staging lacks `private.reward_inbox_v1` even though production has it.
4. Verified `GEM_DUST` real item mapping, exact active-character Gold mirror and multi-character account state on Android, and Inventory/Bank capacity/overflow rules; don't assume synthetic QA fixtures match every production save.
5. PE_ Equipment 2.0 registered templates, T1–T9 tier policy, real item mint/custody and post-payout history Inbox category.
6. Full exact-head CI and authorized UI/UX review (no new themes/screens have been implemented).

**Release status: HOLD.** The V88 bundler remains unmounted and private, all feature flags false, no API or mobile changes, no staging/production data writes.
