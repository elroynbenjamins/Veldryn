# Equipment 2.0 — T1 expanded-set item authoring worksheet

**22 November 2026 · Hidden draft only · derived from exact Forge/Combat sources**

This worksheet carries forward all **12 T1 set families / 51 required member slots** from the intended 48-set T1–T4 launch. 18 T1 slots have a one-to-one *unapproved* compatibility suggestion in the current 169-item Forge source; **33 have no eligible unassigned source** and need individually authored definitions or explicit asset reconciliation. It is **not an item registration**.

| Family | Role | T1 set thresholds | Exact-match existing source previews (unapproved) | Missing pieces to author/reconcile |
| --- | --- | --- | --- | --- |
| oathplate | tank | 2 / 4 | None | cape, chest, helmet, legs |
| citadel | tank | 2 / 4 / 6 | cape (`EQ2_EXP_T1_TANK_CAPE`); legs (`EQ2_SOLO_FIELDBORN_STEEL_GREAVES`) | boots, chest, helmet, ring |
| bloodsteel | tank | 2 / 4 | amulet (`EQ2_EXP_T1_TANK_AMULET`); boots (`EQ2_EXP_T1_TANK_BOOTS`); gloves (`EQ2_EXP_T1_TANK_GLOVES`); ring (`EQ2_SOLO_FIELDBORN_GUARD_SIGNET`) | None |
| vigilhide | tank | 2 / 3 | None | boots, gloves, helmet |
| quickstep | damage | 2 / 3 | None | boots, cape, gloves |
| horizon | damage | 2 / 4 | None | amulet, gloves, helmet, ring |
| blackscript | damage | 2 / 4 | cape (`EQ2_SOLO_FIELDBORN_LONGSTRIDE_CAPE`); chest (`EQ2_SOLO_FIELDBORN_HUNTER_VEST`); legs (`EQ2_EXP_T1_DAMAGE_LEGS`) | boots |
| breakerforge | damage | 2 / 4 / 6 | amulet (`EQ2_EXP_T1_DAMAGE_AMULET`); helmet (`EQ2_EXP_T1_DAMAGE_HELMET`); ring (`EQ2_EXP_T1_DAMAGE_RING`) | boots, chest, legs |
| brightweave | support | 2 / 4 | chest (`EQ2_EXP_T1_SUPPORT_CHEST`); gloves (`EQ2_SOLO_FIELDBORN_MEND_GLOVES`) | amulet, cape |
| stormthread | support | 2 / 3 | None | boots, gloves, helmet |
| rootshield | support | 2 / 4 / 6 | None | boots, cape, chest, helmet, legs, ring |
| echohide | support | 2 / 4 | boots (`EQ2_EXP_T1_SUPPORT_BOOTS`); helmet (`EQ2_SOLO_FIELDBORN_PRAYER_HOOD`); legs (`EQ2_EXP_T1_SUPPORT_LEGS`); ring (`EQ2_EXP_T1_SUPPORT_RING`) | None |

## Full exact member review list

| Planned nonissuable member ID | Forge candidate (not approved) | T1 authoring state |
| --- | --- | --- |
| `EQ2_LAUNCH_T1_BLACKSCRIPT_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BLACKSCRIPT_CAPE` | `EQ2_SOLO_FIELDBORN_LONGSTRIDE_CAPE` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLACKSCRIPT_CHEST` | `EQ2_SOLO_FIELDBORN_HUNTER_VEST` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLACKSCRIPT_LEGS` | `EQ2_EXP_T1_DAMAGE_LEGS` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLOODSTEEL_AMULET` | `EQ2_EXP_T1_TANK_AMULET` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLOODSTEEL_BOOTS` | `EQ2_EXP_T1_TANK_BOOTS` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLOODSTEEL_GLOVES` | `EQ2_EXP_T1_TANK_GLOVES` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BLOODSTEEL_RING` | `EQ2_SOLO_FIELDBORN_GUARD_SIGNET` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_AMULET` | `EQ2_EXP_T1_DAMAGE_AMULET` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_CHEST` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_HELMET` | `EQ2_EXP_T1_DAMAGE_HELMET` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_LEGS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BREAKERFORGE_RING` | `EQ2_EXP_T1_DAMAGE_RING` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BRIGHTWEAVE_AMULET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BRIGHTWEAVE_CAPE` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_BRIGHTWEAVE_CHEST` | `EQ2_EXP_T1_SUPPORT_CHEST` | Source reconciliation required |
| `EQ2_LAUNCH_T1_BRIGHTWEAVE_GLOVES` | `EQ2_SOLO_FIELDBORN_MEND_GLOVES` | Source reconciliation required |
| `EQ2_LAUNCH_T1_CITADEL_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_CITADEL_CAPE` | `EQ2_EXP_T1_TANK_CAPE` | Source reconciliation required |
| `EQ2_LAUNCH_T1_CITADEL_CHEST` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_CITADEL_HELMET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_CITADEL_LEGS` | `EQ2_SOLO_FIELDBORN_STEEL_GREAVES` | Source reconciliation required |
| `EQ2_LAUNCH_T1_CITADEL_RING` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ECHOHIDE_BOOTS` | `EQ2_EXP_T1_SUPPORT_BOOTS` | Source reconciliation required |
| `EQ2_LAUNCH_T1_ECHOHIDE_HELMET` | `EQ2_SOLO_FIELDBORN_PRAYER_HOOD` | Source reconciliation required |
| `EQ2_LAUNCH_T1_ECHOHIDE_LEGS` | `EQ2_EXP_T1_SUPPORT_LEGS` | Source reconciliation required |
| `EQ2_LAUNCH_T1_ECHOHIDE_RING` | `EQ2_EXP_T1_SUPPORT_RING` | Source reconciliation required |
| `EQ2_LAUNCH_T1_HORIZON_AMULET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_HORIZON_GLOVES` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_HORIZON_HELMET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_HORIZON_RING` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_OATHPLATE_CAPE` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_OATHPLATE_CHEST` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_OATHPLATE_HELMET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_OATHPLATE_LEGS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_QUICKSTEP_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_QUICKSTEP_CAPE` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_QUICKSTEP_GLOVES` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_CAPE` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_CHEST` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_HELMET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_LEGS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_ROOTSHIELD_RING` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_STORMTHREAD_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_STORMTHREAD_GLOVES` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_STORMTHREAD_HELMET` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_VIGILHIDE_BOOTS` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_VIGILHIDE_GLOVES` | — | New source / item definition required |
| `EQ2_LAUNCH_T1_VIGILHIDE_HELMET` | — | New source / item definition required |

## Authoring rules and source dependencies

1. First verify all 51 unique T1 membership identities against exact tier, role and slot; two items must not share the same equipment instance or reuse a protected original set member without approved identity-change handling.
2. T1 starter thresholds must be attainable before any optional high-rarity/dungeon gated six-piece completion. Core crafting uses accessible gathering/refining **and a verifiable combat component**; special/rare variants may call for Fishing or Dungeon catalysts once those sources are actually available at the intended level. Prices/drop percentages are still unapproved.
3. Every new candidate needs a stable unique item ID, localized display name, slot art review, profession, recipe identity, consumed stack IDs, Gold/XP/time, source-level gates and a market-binding policy; none is invented by this worksheet.
4. Any old `EQ2_SET_...` membership remains intact unless a separately audited, explicitly reviewed conversion plan covers existing earned instances and recipe identities. The one-to-one suggestions above are strictly metadata compatibility, not reassignments.
5. Combat bonuses for 2/3/4/6 thresholds require independently signed on-server set effects; rare signature traits remain separately obtained (two active maximum). No automatic trait grants, boss retuning or public UI/theme code here.

**Release hold:** Do not merge this hidden draft to main, mount draft items, run migrations, enable crafting or loot drops, edit live inventory, change player economy, or implement player-visible designs before actual UI/theme owner approval.
