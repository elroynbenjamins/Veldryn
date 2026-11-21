# World Boss V85 — active-character ownership guard (21 Nov 2026)

**Hidden draft only. Do not merge to main, deploy SQL, activate World Bosses, or treat this as a completed payout integration.**

## Finding
V83 locks the account's online game-state row and verifies that its embedded character ID matches the row's `character_id`, but a bad cross-account state binding could still identify a **foreign** character. Without a separate authoritative ownership check, the V83 guarantee writer would credit that foreign character's real Gold wallet while treating the World Boss chest as earned by the original account.

## Change
- Before the first Gold, Essence, dust, or Inbox grant, V83 verifies that the active character has a matching `public.characters(id, account_id)` row on **the same V70 transaction** using `FOR KEY SHARE`. Missing or foreign ownership fails closed.
- The disposable PostgreSQL fixture now puts a foreign character into both the active row and embedded JSON, proves the payout is rejected, and checks the foreign wallet/receipt/audit remain unchanged.
- Account-wide World Boss participation and three-attempt rules are unchanged. The character ownership check only controls the destination for a **fresh** V83 wallet credit. Historical replays intentionally verify immutable source-linked audit receipts rather than require a character that may since have been removed or switched.
- No mobile screens, live routes, migrations, admin actions, feature flags, event activation, player payouts or account deletion behavior change.

## Validation and remaining gates
Run the hidden `event-chest-catalog-hidden.yml` workflow on this PR's exact head: TypeScript compile, `backend/tests/world-boss-real-reward-ports-v83.mjs`, V70 receipt/rollback tests and release-off fences. Green CI is **not** a substitute for production Auth/storage ownership schema review, two-connection PostgreSQL race coverage, full live EQ2 entitlement delivery, reward-economy approval or Android QA. No staging rehearsal or production switch is authorized by this change.
