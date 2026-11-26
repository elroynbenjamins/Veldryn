# Hidden profile cosmetics tester access

The global Store and animated-cosmetics release flags remain false. A single account may opt into unreleased profile-cosmetic rendering with the account entitlement `profile_cosmetics_tester_v1=true`. The entitlement is a visibility/rendering gate only; every border, effect, background, icon and pet must still be present in the account's authoritative ownership arrays, and badges remain server-owned collectible badges.

The four standard sets remain future Cosmetics Store products and are sold as complete sets only. The four Ascendant collections are not registered in the Store. Tester-only premium IDs use unique ownership identities; existing dungeon/event/guild art may be used only as temporary visual fallback and never as the owned ID.

Production verification on 2026-11-24 confirmed the entitled test account owns all standard borders/effects/eight portrait IDs and all four Ascendant borders/effects/backgrounds/pets/badges. Public profile projection exposes `effectId` and a server-derived `cosmeticsPreview` boolean so other clients on this branch can render the tester's unreleased cosmetics without globally releasing them.

The eight approved standard portrait concepts are now bundled in a shared production atlas and use their reserved ownership IDs. Final Ascendant border/background/pet/badge binary art can replace the premium tester fallbacks without changing ownership IDs or saves.
