# Party Event V51 / World Boss V58 — shared chest progression, hidden first implementation

**18 November 2026 — HIDDEN / NOT ENABLED / NOT MERGED.** Draft content catalog and non-paying reward-policy preview only. No game economy, inventory, ItemDef, database migration, mobile UI, Day 8 claim, artwork, gold wallet, Sigil payout, market escrow or entitlement has been changed.

This is a separate review branch based on **main** and is deliberately independent from the in-progress Party Events V43–V50 trust-bridge draft PR #1388. The contracts must be reconciled before enabling.

## Party Events: 8 sets, 20 earnable pieces

Four families now each have the same **five universal slots** — Boots, Gloves, Cape, Ring, Amulet — and exactly two exclusive sets. These are future Equipment 2.0 identities, **not existing gear inventory IDs**.

| Event | 3-piece signature (2pc / 3pc) | 2-piece accessory (2pc) |
| --- | --- | --- |
| The Broken Caravan | Wayfarer's Pact — Haste / post-ability temporary Ability Damage | Smuggler's Guile — Critical Rate + Penetration |
| The Nightfall Hunt | Moonfang Pursuit — Critical Damage / elite-boss execute below 30% enemy HP | Predator's Mark — Ability Damage + Penetration |
| The Broken Wards | Runebound Vigil — Maximum HP / cooldown-limited skill barrier | Warden's Seal — Healing Power + Maximum HP |
| The Lost Reliquary | Echoheart Vestment — Ability Damage / server-RNG cooldown refund | Curator's Oath — Critical Rate + Ability Damage |

- Total **8 sets**, **20 slot pieces**. All universal, but future server-owned equipment compatibility, tier/unlock and slot availability still apply.
- V51 defines authored 2/3-piece thresholds, basis-point coefficients, duration/ICD conditions and effect names as **balance hypotheses**. Equipment 2.0 must implement actual server ability triggers, power tags, cooldown scheduling, deterministic proc RNG, snapshot replay, stat caps, role differences and anti-double-dip testing before any effect can activate.
- **No new base stats or class-restricted weapon** are introduced here. Rarity, quality, bonus % affixes, gear tier, item instance and market tradability remain delegated to the finalized Equipment 2.0 item-generation and escrow system.

## Party Events: three chests per account per seven-day event

This adds on top of, not instead of, the existing Day 8 Warrior/Artisan/Companion choice preview and Party Renown design.

| Chest | Verified evidence | Standard equipment chance | Party Sigils | Gold / Gem Dust / Companion Essence |
| --- | --- | ---: | ---: | --- |
| Adventure Chest | >=15 personal Event Points | **12%** | 8 | 200 / 2 / 4 |
| Preparation Chest | >=15 EP, own verified preparation contribution, completed optional party preparation | **16%** | 10 | 300 / 3 / 5 |
| Victory Chest | >=15 EP, verified finale victory | **24%** | 16 | 500 / 5 / 8 |

- At most **3 distinct account-week source IDs**. The server owns week, account, roster, source, tier, contributions, goal completion and boss result. Nothing may be awarded from UI/client booleans.
- Veteran adds +2/+2/+3 percentage points respectively; Heroic +4/+4/+5 percentage points. This is a proposed initial drop calibration; difficulty does **not** change player equipment tier.
- After a successful gear roll, prioritize a missing piece from **that event's five-item pool**; once all five pieces are owned, allow duplicates again for higher rarity/quality/bonus rolls. Missing-piece protection does not change the actual chest hit chance.
- **Party Sigils** are a proposed future account-wide event currency. Quote **60 Party Sigils** for a targeted piece, **max one exchange per account per event week**. No currency is currently minted/debited; the exchange/preview is explicitly nonpaying.
- Existing Day 8 combat/skill XP, choice and Renown preview remains separate to avoid silently doubling those rewards. Small chest Gold/materials are draft numbers pending economy simulations.
- Equipment 2.0 full rarity/quality/bonus/instance rolls must be computed **after** successful private chest settlement. A displayed quote cannot generate a gear item.

## World Bosses: reuse collection features, DO NOT alter gathering gear

Preserve the existing proposed **10 pieces per boss** with only that boss's gathering-speed stat and gathering-only affix rolls:
- Hollowroot: **Woodcutting**
- Solbrand (internal ID `sunscar`): **Mining**
- Rimewarden (internal ID `frostmarch`): **Fishing**

World Boss gear's existing tier, rarity, quality, rolled stats and item identities are **not replaced, renamed or recreated** by V58. Only a 10-slot target **selection** is modeled until the canonical boss gear catalog and Equipment 2.0 renderer are available.

| Chest | Server-verified requirement | Gear chance |
| --- | --- | --- |
| War Camp Chest | Community donation/preparation goal + own committed supply donation | **1%** |
| Warrior Chest | Three committed account attacks, never reservations/voids | **1%** |
| Realm Victory Chest | Community damage goal reached + at least one personally replay-proven committed attack | **1%** |

- Maximum **3 per boss event and account**, across all characters. Each source key is stable, and no chest credits additional World Sigils (the existing private V28 World Sigil ledger and its max-100/event rule must be preserved).
- A successful 1% hit prioritizes a missing equipment **slot** for the **specific boss**, without increasing the base chance. Once 10 slots are collected, duplicate high-roll pieces are possible.
- An optional **World Sigil** exchange quote offers a selected gear slot for **80 existing World Sigils**, maximum one such exchange per World Boss event. Quote and ownership check only, no real currency debit, new currency type, extra earning source or payout. The original V28 currently has a separately locked 30-Sigil personal Impact source; this proposal does not unlock it.
- Current global boss rotation, 5+2+7-day cadence, three attacks, donation limits, per-account ownership and all combat outcomes remain untouched.

## Shared integrity/UX launch contract

- A future unified **Rewards** panel can show three chest cards, unlocked/locked status, true percent chance, guaranteed resources, the **five Party Event pieces / ten boss pieces**, missing pieces, and one targeted exchange quote. The existing Party Event Day 8 choice stays a separate row.
- Each chest open requires exactly one **server-owned ledger source**, a cryptographically derived committed roll, a deterministic selection of missing piece on the **first** gear hit, a committed inventory/equipment instance with proper tier+rarity+quality+affix, and an atomic claim+wallet+Inbox receipt. V1 `backend/src/server/loot/event-chest-server-roll-v1.ts` now provides **server-secret HMAC-SHA256**, domain-separated, unbiased 0–9,999 pairs from a trusted canonical chest source ID, with retry-stable replay. **No secret is stored in code.** The first real resolution must be persisted atomically so secret rotation, failure or repeated claim cannot reroll gear. Pure V51/V58 still do **not** grant entitlements or items.
- Do not derive reward eligibility, personal source ID, owned collection state, roll RNG, wallet balance, tier, world boss IDs or shop budget from mobile input. Do not permit cross-account, cross-event, cross-boss replay or a second character to earn a duplicate chest.
- Marketplace rules for tradeable event gear, guild/party rewards per account, profile display, rollover/expiration and protection against item-selling/erasure exploits need explicit 2.0 and ledger validation.
- Current isolated TypeScript assertions validate set parity, 3 maximum chests, chance odds, missing gear prioritization, role/account source keys, World Sigil conservation and release gates. The focused GitHub Actions job must pass before this becomes an integration candidate.

## Next dependent passes

1. Add real 2.0 item catalog entries and icon/assets for 20 Party Event pieces; integrate set bonuses into the **server authoritative** ability/gear calculation with seeded tests for all nine classes.
2. Connect Party Event V43–V50 trusted credit/Day 8 settlement, then a **private account-week** chest entitlement and exactly-once claim transaction with wallet/inventory/Inbox. Complete late-stage credit policy first.
3. Connect World Boss V18/V26/V28 authenticated committed donation/attack/world-impact evidence, plus private account-event chest entitlements. Keep World Sigils independent from chest grants.
4. Connect existing gathering gear catalog, tiered rolled instance creation and boss-specific shop, validate rarity/quality/affix parity. **Do not replace or rebalance current World Boss equipment.**
5. Add preview and claim screens with drop rates, missing-piece indicator, confirmation, secure server result, receipts, small-phone UX and accessibility; then test staging, mobile regression, concurrency, crash after grant, 2/3/4-character accounts and launch/no-go.

**No production changes. No event chest has been granted.**
