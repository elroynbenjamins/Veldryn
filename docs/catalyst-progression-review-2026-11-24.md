# Catalyst progression correction — 2026-11-24

Source review found that the inventory inspector omits dynamic gem recipes: Regional Catalyst is required at Enchanting 40 for Grade III → IV merging, Radiant Catalyst at 60 for Grade IV → V and 62 for Grade V refining. Existing synthesis unlocks are 70 and 90. Moving the existing items entirely to levels 75/90 would break their earlier uses.

This first pass removes Regional Catalyst from COP_004/005, substitutes 3 Gem Dust at the previous 15% roll, and scales COP_006–009 to 3/3/4/5%. It mirrors those rates in the material-source catalog and adds actual gem-use details to item inspection. Existing inventory and existing synthesis costs are unchanged.

Remaining review: verify active dungeon IDs against deployment, review weekly Resonance Cache, party contracts, and regional boss acquisition; assess whether separate Lesser/Greater Catalysts are worth introducing as a coordinated recipe, catalog, assets, and economy migration. Do not introduce new mandatory combat gates for professions. No production deployment is authorized by this draft.
