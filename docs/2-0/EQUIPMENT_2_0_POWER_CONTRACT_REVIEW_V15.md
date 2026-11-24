# Equipment 2.0 V15 — partial power contract and mixed hand review

24 November 2026. Extension to V14 canonical review, not a competing economy catalogue. No new approval or runtime dependency. All C12 and D1–D10 gates remain enforced/open. V14's 21 source pins are unchanged.

## Candidate power contract

Use V5 slot budgets and existing profile splits, V4 rarity/quality/range and shared-channel caps, V6 independent hand lanes and V7 exact permanent innate mappings. Base-equivalent points = attack + defense + HP/4. Candidate partial index = base-equivalent × (1 + sum(capped permanent gear fraction × V5 channel weight)). No scaling of affixes or innate percentages by quality/rarity. Ten budget lanes: four one-hand classes have ten physical pieces, five two/dual classes nine physical pieces and two independent lanes on one combined weapon. Weapon/offhand budgets 9/10. Each lane has its own grade and quality base multiplier; same slot-budget total regardless of physical item count. Distinct identities within each lane; duplicates across independent lanes contribute to one shared cap. This is a scalar equipment budget, NOT player CP, skill effectiveness, encounter outcome or legal item mint. Current fixtures use signature class hand types only; shared weapon-family legal builds and mixed-grade display/mint semantics remain open.

9,720 homogeneous-grade cases = 45 class-tier fixtures × 6 rarities ×3 quality values ×4 focused stat patterns ×3 affix magnitude endpoints. 4,860 mixed hand-grade cases =45 ×36 primary/secondary grade pairs ×3 quality pairs (other slots follow primary grade). Independent connector arithmetic reproduced matched-grade mean index and hand-group gap across 1,080 groups. Exact arithmetic yields zero hand-group gap because lane budgets and roll patterns match, not because combat performance is equal. Actual attack/defense/HP splits vary. No random population or real player sampling.

| Tier | Common Q50 | Rare Q50 | Epic Q50 | Legendary Q50 | Mythic Q50 |
|---|---:|---:|---:|---:|---:|
| T1 | 83.43 |108.23|124.52|162.64|185.13|
| T2 |175.49|228.26|262.86|358.28|407.96|
| T3 |275.93|360.13|495.27|587.39|794.90|
| T4 |385.59|503.69|716.34|849.42|1175.78|
| T5 |505.37|659.99|966.77|1145.69|1615.54|

Means at uniform-mid fixture rolls. Extreme lower-tier Mythic Q100/high versus adjacent Common Q0/low exceeds next tier in all 36 matched-class comparisons. This is whole homogeneous fixture comparison, not drop odds or individual equipment superiority. T3 Mythic/Epic roll-count jumps contribute to increased rarity separation; compare more realistic mixed-rarity builds before adjusting the source bands. T6–T9 not extrapolated.

## Scope and exclusions

233/554 items have V5 authored profile records; 321 lack coverage. The 45 V5 loadouts include zero premium entries from V7. V7 separate audit has 99 innate lines (71 exact shared channels, 28 unpriced/unmapped), 27 signature traits, 34 source sets, 61 sets outside numerical source audit. Missing semantics explicitly unpriced, never interpreted as zero power or guessed. Unresolved stat names attack_pct, evasion_pp, haste_pct, healing_power_pct, crit_chance_pp must receive distinct source/semantic decisions; Potency stays quarantined. Sets, gems, class progression, skills, companions and temporary effects excluded from the partial score and require explicit pricing; no automatic prose-to-runtime mapping.

## Next pass

Extend source-backed base profiles to remaining exact items, preserving retired and boss-only restrictions. Author stat-semantic decision packet for unresolved innate channels and D1/D2, then calibrate D3 CP weights against legal mixed builds and actual Skills/Combat encounters with D4/D5 set semantics. Do not use current partial index to gate matchmaking, enemies, Market, equips or grants. Source-ready economic materials do not authorize item issuance. Node tests added and public-import fence extended; exact-head CI not confirmed. No main merge, production writes, public UI, flags or gameplay changes.
