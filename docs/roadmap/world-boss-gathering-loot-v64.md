# World Boss V64 — gathering loot and three ten-piece sets (hidden)

**18 November 2026. Design/isolated server contract only. NOT DEPLOYED, NOT GRANTING LOOT, no production flag, no inventory writes or mobile claims.** The new V64 contract sits alongside the existing V26 authored raid, V28 replay-proven World Sigils, and V50 single rotating boss. It does **not** replace or alter Sigil payouts, attempts, or boss combat.

## Themed per-boss sets

One boss per 14-day cycle; Hollowroot (Asterfall) → Solbrand (Sunscar; protocol id `sunscar`) → Rimewarden (Frostmarch; protocol id `frostmarch`). The same set returns roughly every six weeks. Each set contains exactly ten **Epic, class-neutral gathering-focused** pieces in existing equipment slots: helmet, chest, gloves, legs, boots, weapon, offhand, cape, amulet and ring. No belt/tool slot is created. Gathering implements do **not** replace the separately equipped gathering tool system, and their zero-combat-stats design must be reconciled with class weapon compatibility before enabling.

| Boss | Set | Only affected skill | Guaranteed victory materials | Bonus 20% roll | Gold per won attack |
|---|---|---|---|---|---|
| Hollowroot | Rootbound Harvester | Woodcutting | 8–16 Ironwood Logs | 1–3 Crownwood Logs | 500–900 |
| Solbrand | Sunforged Prospector | Mining | 8–14 Sunstone Ore | 1–2 Blackglass Ore | 700–1,200 |
| Rimewarden | Rimebound Angler | Fishing | 8–14 Icefin | 1–2 Bellfin Scale | 900–1,500 |

All three: 35% independently for 2–4 Companion Essence; one independent **1% chest chance per completed, replay-proven victorious account attack**. A chest holds exactly **one uniformly random piece of that boss's set** (10% of chest openings per piece; 0.1% per won attack for any *specific* piece). Failed committed attacks earn half Gold and roughly half primary materials, with the same optional side resource/Essence rolls but **no chest**. Distinct 10,000-tick random thresholds; no cosmetic/sigil/market reward is implicitly changed.

### Equipment bonus proposal (per skill only, not combat)

- Each worn piece: +0.5% XP in **its own** gathering skill (up to +5%).
- 2 pieces: additional +3% gathering XP.
- 4 pieces: +4% base resource yield.
- 6 pieces: +10% **relative** rare-resource probability (e.g. base 1.00% → 1.10%, not 11%).
- 8 pieces: −4% action time.
- 10 pieces: additional +5% gathering XP and +3% resource yield.
- Complete set: +13% skill XP, +7% gathering yield, 10% relative rare-chance uplift and 4% faster actions. No bonuses to unrelated skills, no combat CP, no duplicate-slot stacking. Existing gathering tool efficiency remains independent and must be tested for combined caps.

All bonuses and material/Gold/Essence amounts are first-pass balancing hypotheses. Server-side gathering stat sources must remain authoritative; client display alone must not enable these.

### Why a second acquisition path is essential

Three account-wide attempts each event and each boss recurring only once per six weeks means a 1% chest rate yields **0.03 expected chests per themed boss cycle**. Expected wait for a single chest is ~33 cycles (~200 weeks); finishing ten distinct pieces through RNG alone would be prohibitively slow. To preserve a meaningful rare drop *and* a viable 10-piece collection, propose a **targeted choice piece from the featured World Sigil shop for 90 Sigils**, with exact selectable slot, normal once-owned/dup ownership checks, and shop visibility only for the active boss's theme. This is a provisional shop price, **not currently purchasable**. Players may also retain/spend Sigils from other World Boss cycles, as designed by V28. Shop selections do not affect the 1% RNG.

## Honest release integration plan

1. Only run the V64 drop roll after a **V26 committed battle + V28 verified replay proof**. Derive account/event/boss and outcome from immutable private server records, not client fields. Use cryptographically secure unbiased server RNG; the exported test callback is *not* a grant authority. Set roll version once per committed attempt, never re-roll on retry, replay, chest claim, crash or account reconnect.
2. Add private immutable `event/account/attempt/loot_v64` source and transactionally consistent claim ledger. Atomic custody grants Gold, existing item IDs, Companion Essence currency, and a single account-bound unopened chest. Need bounded failure recovery; no partial double grants. If chest opened, store exact one-time chest-open source and resolved item ID in the account equipment custody system.
3. Reconcile three all-class equipment sets with v33 `ItemDef`, 10 `GearSlot` fields, 2.0 hidden equipment and crafting migration, exact owned instance custody, bank transfers between the account's **three** current character slots, equipment pouch limit, protection/favorite, cosmetics and item artwork; **do not add them to production `ITEMS` yet**. Do not allow combat stats to be forged by setting equipment IDs.
4. Server-only gathering XP/yield/rare/action-time modifiers, with cross-skill isolation and correct relative probability math; check against equipped pickaxe/hatchet/rod and cap accumulated time/yield bonuses.
5. Add read-only loot table panel and inspectable 10-slot collection in World Boss Rewards and a clearly disabled placeholder in the featured shop. Show 1.00% chest chance transparently; do not show fabricated item inventory, balances or current events. All claims, chest openings, purchases and item equip buttons remain disabled until Auth, DB migration, economy proof, device QA and security sign-off.
6. Run exactly-once concurrent settlement/open/claim tests, bad RNG/forged bonus tests, three-character fixture, full ownership, reward inflation simulations, 320dp Android accessibility and final realm balance check. Keep existing V61–V63 emergency stop gates and V57 erasure fences intact. Do not mount V64 on a route or turn on World Boss gameplay without its separate launch approval.

## Code (source-only)

- `backend/online/world-boss-gathering-loot-v64.ts` — immutable thematic catalog; ten-piece collection; independent material/Essence/Gold/chest rolls; slot-specific chest preview and skill-only set bonuses.
- `apps/mobile/tests/world-boss-gathering-loot-v64.ts` — test-only correctness/threshold, no-world-HP/no-Sigil/no-live checks.
- Hidden World Boss CI typechecks and executes the V64 focused test. Latest-head CI must pass before merge; branch/test code alone is **not** a production loot table.

**Not implemented in this PR:** migrations, private reward proof/storage/ledger integration, actual inventory or currency grants, real equip/effect activation, chest inventory art/opening UI, shop checkout, live event UI or production enablement.
