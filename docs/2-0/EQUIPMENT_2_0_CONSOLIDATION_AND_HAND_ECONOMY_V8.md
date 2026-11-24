# Equipment 2.0 — V8 consolidated source and weapon acquisition review

HIDDEN REVIEW ONLY. All 2.0 content remains non-issuable and hidden until coordinated 2.0. No main merge, production writes, UI, gameplay, new recipes, drops or Market authorization.

## Consolidation
The V8 consolidated review index points at the corrected V2 membership (554 identities, 95 sets), V4 overlapping affix proposal, V5 equipment index, V6 hand balance, V7 innate/set audit and V8 economy. Imported six missing JSON source blobs byte-for-byte from #1686, #1598 and #1549, verified their exact Git SHA on readback, and retained two already-present exact source blobs. Regression checks recompute all eight Git blob hashes, join all 746 current T1–T4 recipe IDs, reject 20 retired routes, and join all 79 T2–T5 boss-only identities to exact pools. The old recipe and T7 source records remain historical/future evidence, not active current catalogue.

Ancestor check at previous head b2701f7: #1713 and #1635 already included. #1704, #1549, #1598, #1686, #1458 and #1665 diverged. No blind branch merges. The current branch already contains the shared weapon-family allowlist; the 45 class-signature loadouts are not exhaustive cross-class family builds. Four Hewing Axes and other branch-local items remain explicit catalogue-scope gaps, not silently added. Existing D1–D10 approval gates are unchanged. V7 isolated exact-head CI passed (#45360238923); broader mobile and v1.0.9 regression failed and remain blockers.

## V8 acquisition economy
Compare 60 same-role signature weapon versus weapon+offhand recipe pairs across T1–T5 and two routes. Current source combined weapon Gold costs are only 53.97–55.75% of the pair, queue times 54.00–55.88%. Two full affix lanes at the old cost would materially favor combined weapons.

Generate 50 review-only cost targets (five combined-weapon classes × five tiers × two routes), anchored to mean same-tier/role weapon+offhand Gold/time costs, with rounded total and 9:10 primary/secondary budget split. Do not copy unsuitable resource IDs across different weapon families; exact material costs, rare combat inputs and binder parity, profession XP and assembly overhead are still open. These targets are not crafting definitions. Boss-only equipment is excluded from crafting.

Example Ravager T4 foundation: existing 13,500 Gold and 891 seconds; Hexweaver same-role weapon+offhand benchmark 25,000 Gold and 1,650 seconds. T5: 18,900 Gold/1,520 seconds against 33,900 Gold/2,720 seconds. No resource, price or reward changes to live systems.

### Rarity opportunity
For exact Mythic probability p=.001:
- Shared single rarity draw for both weapon lanes: mean 1,000 combined crafts for both Mythic.
- Independent draws in the same one-shot combined craft: joint p²=0.000001, mean 1,000,000 attempts.
- Separate retained successful material-lane outcomes: mean 2,000 lane crafts, identical number of attempts to obtaining two independently rolled pieces separately. Conditional on equivalent lane cost, expected acquisition expenditure before assembly matches the separate piece model.

Recommend researching separate immutable material-lane receipts and one-time assembly into one physical combined weapon. Each lane rolls only once; preserve successful components; no equipment phantom offhand, no disassembly, reroll, duplicate custody, interchangeable old copy or retroactive grade modification. Quality budget must be independently recorded and aggregated once. Need owner approval of the UX, combined rarity display, resource source/price, extra assembly cost, whether components are tradeable, and real serializable source/consumption authority. Nothing minted or enabled. Expected counts are idealized independent exact-rarity geometric means, not guarantees, not telemetry or complete acquisition time.

Next: finalize candidate component and quality policy, reconcile shared weapon-family eligibility and precise material recipes, then numeric set effects and full class/companion/gem CP engine benchmarking. Keep source ancestors and diverged drafts available until actual integration and full CI are approved.
