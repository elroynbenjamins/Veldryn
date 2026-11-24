# Current-version profile equipment inspection

Release independently of Equipment 2.0. The read-only inspector displays item-only stats after rarity, quality and enhancement, actual rolled bonuses, trait, and sockets. No set progression, original catalogue breakdown, gear actions or balance changes.

- Exact-copy and selected-character checks, no stale or duplicate fallback.
- Old RPC compatibility: only show modified stats if old payload includes valid rarity and enhancement; omit unverifiable rolled bonuses and gem effects. Explicit unresolved data remains unavailable.
- Reuses existing inventory scaling and gem descriptions.
- Future innate/Equipment 2.0 snapshot UI and schema are excluded from this current-version change; previous draft commit f5c12ec59afd5ad637a2a7ec0d3e997500b9fd37 retains the proposed adapter for future integration.

Backend: additive migration `20261124122914_profile_gear_inspection_current_v2.sql` was registered and applied on staging. Both privacy-gated RPCs compiled in a rollback rehearsal; anonymous denial, authenticated self inspection, omitted private identifiers and additive field presence passed. Read-back confirms authenticated execute only. Production migration remains unapplied; run it through the normal controlled release pipeline before distributing the updated mobile client. Device testing and broader cross-character and blocked-viewer verification remain necessary.
