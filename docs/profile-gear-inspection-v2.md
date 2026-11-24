# Current-version profile equipment inspection

Release independently of Equipment 2.0. The read-only inspector displays item-only stats after rarity, quality and enhancement, actual rolled bonuses, trait, and sockets. No set progression, original catalogue breakdown, gear actions or balance changes.

- Exact-copy and selected-character checks, no stale or duplicate fallback.
- Old RPC compatibility: only show modified stats if old payload includes valid rarity and enhancement; omit unverifiable rolled bonuses and gem effects. Explicit unresolved data remains unavailable.
- Reuses existing inventory scaling and gem descriptions.
- Future innate/Equipment 2.0 snapshot UI and schema are excluded from this current-version change; previous draft commit f5c12ec59afd5ad637a2a7ec0d3e997500b9fd37 retains the proposed adapter for future integration.

Backend: candidate SQL is additive to the existing two privacy-gated profile RPCs. Staging rollback rehearsal compiled both replacements and anonymous denial passed. Register/apply the migration through the normal release pipeline before the new client is released for full remote rolls. No production changes made. Device testing and authenticated selected-character privacy tests remain necessary.
