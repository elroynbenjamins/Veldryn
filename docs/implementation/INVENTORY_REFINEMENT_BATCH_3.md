# Inventory refinement batch 3

Ten implemented improvements:

1. Inventory/Bank tabs with used-slot counts and free capacity.
2. Case-insensitive item-name search with clear-filter empty states.
3. All/gear/food/material category filters. Quest items remain visible under All.
4. Name, descending quantity and descending unit-value sorting without mutating save order.
5. Transfer quantity controls: 1, 10 or all, clamped to the owned amount. Sales/salvage remain one item at a time.
6. Capacity-aware transfer previews using the same pure deposit/withdraw operations; disabled actions explain why and suggest smaller quantities or more space. Synchronous action failures appear inline.
7. Recovery overview, carried auto-eat count, actual capped healing previews and disabled eating at full health.
8. Warnings when selling or depositing selected auto-eat food; redundant auto-eat selection disabled.
9. Overflow item listing, recorded expiry, transferable quantity preview and remainder count. This does not introduce a new expiry-enforcement rule.
10. Equipment comparisons no longer falsely label negative stats as gains against an empty slot.

Validation includes full TypeScript checks and all core suites, including new tests for search, category matching, stable input order, quantity bounds, transfer failures and capped healing. Android export is checked separately; physical-device UI testing remains outstanding. No save schema, balance, or storage capacity changes.
