# Online compatibility contract

Rarity is currently definition-based in the offline prototype. The online migration must make each dropped gear copy an immutable server-owned item instance.

- The server chooses rarity with a cryptographically secure roll using the published odds.
- The client may preview tables and colors, but must never decide or accept a client-provided reward.
- Persist `instanceId`, `itemId`, `rarity`, rolled stats, passive ID, source activity, and created timestamp.
- Reconcile offline claims with an idempotency key; the server returns authoritative item instances.
- Keep materials stackable, but migrate gear to quantity-one instances before trading, salvage, or an auction house.
- Legendary/Mythic passives must be allow-listed passive IDs; online combat settlement remains server-authoritative.
