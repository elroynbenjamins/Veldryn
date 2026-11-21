# Veldryn Enemies & Bosses 2.0 — trait mechanics and counterplay contract

Date: 21 November 2026. Draft child PR #1430 of Combat 2.0 foundation #1377.
**This is a hidden, versioned, unapproved 2.0 boss prototype. Not merged or live.**

## Design

Each of the six regional bosses gets **one boss-exclusive, authored trait identity** and specific effects already executable by the server combat engine. They are **not random Enemy V2 trait rolls** or item-affix payloads. Each is an immutable part of a server-authored boss kit.

| Boss | Exclusive trait | Executable attacks / phases | Counterplay, with no mandatory class |
| --- | --- | --- | --- |
| Rootbound Heart (Asterfall) | Reflective Bark | Living Bark 4% boss-HP shield reflects 8% of damage absorbed; 70% Bark Awakens 4% shield reflects 6%; 35% exposes the heart as before | Chip the finite shield instead of dumping burst into reflection; recover and use the exposed window |
| Bell-Warden (Asterfall) | Weakening Hex | Soul Curse adds a 10% received-heal penalty for 4s to its existing shadow attack and 7% outgoing-damage weakness; 70% Echoing Toll adds a short shadow echo DoT | Use magical ward and time major heals after the 4s penalty expires; shadow DoT can be cleansed |
| Buried Heliarch (Sunscar) | Searing Exposure | Interruptible Sunfall adds 4% damage-taken exposure for 4s alongside its original short burn; 70% phase adds a six-second 4% damage buff, refreshed by the later 35% 8% phase buff | Interrupt the flare or ward/guard the burn; the phase aggression does **not** permanently stack |
| Veiled Sphinx (Sunscar) | Mirage Reflection | Mirage Veil 3.5% boss-HP shield reflects 9% of absorbed damage; 70% Three Reflections 3% shield reflects 7% | Wear down the finite shield with smaller hits; spend burst when its veil is gone |
| Bellbeast of Shiverlake (Frostmarch) | Rending Frost | Interruptible Glacial Shatter adds a 4s physical bleed (two 2s ticks) to its existing hit; 70% Resonant Ice keeps its shield and gains a six-second 6% defense modifier | Interrupt the telegraphed blow or guard the hit, heal/cleanse bleed, and use penetration against temporary defense |
| Frozen Cantor (Frostmarch) | Chilling Dissonance | 70% Broken Harmony adds a five-second 5% haste reduction to its existing ice DoT; interruptible Deep Dissonance still weakens outgoing damage | Ward the ice, time cooldowns and wait out the short slow; counter the cast with an interrupt or defensive fallback |

**Important:** the initial target is not a final DPS target. Values above are isolated **mechanic magnitudes** in hidden authored prototypes. We will rebalance them against approved Equipment 2.0 stat/trait rolls, class builds, gems, companions, potions and encounter durations before enabling anything.

## Runtime safeguards and trait semantics

- Uses existing engine primitives only: `shieldReflectPct` (bounded, nonrecursive), `dot`, `debuff` `damage_done`, `healing_received`, `damage_taken`, `haste`, and `buff` `defense_pct`. No unimplemented normal-enemy trait is silently enabled.
- Enemy V2 authority still caps total enemy shield at 10% max HP; new reflective shields are smaller (3–4%); reflection only applies to the shield's **actual absorbed damage**. The reflective damage percentage cannot loop recursively.
- Enemy V2 applies same-source status refreshes rather than indefinitely stacking identical debuffs; bleed has its source stack limit. The 70% and 35% phases each trigger at most once, with readable casts retained.
- Ward reduces nonphysical elemental damage; it does **not** universally negate physical bleed. Current cleanse removes DoTs, not the healing-reduction debuff; the Bell-Warden counter text deliberately says to **time heals**, not to cleanse that effect.
- The current engine emits internal reflected damage under the historical ability ID `COMPANION_REFLECT` even for a boss. This is a **presentation/naming issue** to resolve in a separate, backward-compatible V2-only event adapter before a live UI review; do not change legacy combat event IDs here.
- Profile marker is now `enemy-v2:boss-profile:asterfall-2` / `regional-2`, with server receipt preview `[region]-boss-v2`. This is **not** an in-place upgrade of an already persisted v1 encounter. An older or forged profile marker fails closed; no automatic migration of saved snapshots.
- Boss trait previews return exactly one signed, display-safe trait identity, mechanic summary and counter, alongside existing cast tells and phase names. They never send raw coefficients, seed, internal RNG, enemy budget or loot.
- Existing dungeon/World Boss/Party Event/live/Q-Mode flows do not import these prototypes; 2.0 remains disabled. A stored validated Solo 2.0 encounter requires a separate authenticated ownership/receipt/snapshot proof.

## Automated verification

`boss-counterplay-contract.ts` now checks all six trait identities, their bounded effect definitions, cast durations, phase order, counter text, original legacy replay unchanged, altered reflection rejection, removed signed trait rejection and old profile-marker rejection.

`boss-trait-runtime.ts` exercises each mechanic using real snapshot-authorized combat, deterministic replay and event receipts: reflected shield damage, healing suppression, burn plus exposure, short bleed and slowed ice phase. Tests and versioned data remain synthetic-only.

`boss-full-gear-pacing-matrix.ts` compares 216 three-slot class/spec/boss encounters for low/high gear profiles, including **observed** boss trait status/reflection events. A missing trait in a short fight is a diagnostic, not an unconditional test failure or boss invulnerability.

## Equipment 2.0 balance gate — next development pass

1. Finalize actual T1–T5 item stat and rarity/quality budgets, 10-slot distribution, set breakpoints, approved socket-gem effects, companion contribution, and unique gear traits.
2. Expand each boss's test samples to several independent server seeds, nine classes/two specs, common and rare/high-roll builds, tank/damage/support, and player defensive versus offensive trait mixes.
3. For every matchup record P10/P50/P90 win duration and remaining HP; cast/phase reachability; trait effect exposure; reflected damage as a **fraction of player max HP**; DoT/healing-loss impact; status uptime; recovery windows; uncounterable wipes and timeouts.
4. Propose explicit per-region boss target envelopes **after** inspecting numbers. Normal enemies may die quickly with upgraded gear; bosses should preserve at least one meaningful tell and viable response without hard immunity, arbitrary damage walls or mandatory interrupt classes.
5. Validate long dungeon runs and Party Event bosses separately; do not transfer these six single-boss trial numbers directly to event/world bosses.
6. Complete hidden replay/mobile accessibility and localization review. Changes to actual Boss UI/theme appearance require explicit user design approval before integration to live app.

## CI and release disclaimer

Exact-head focused CI remains the authority for new tests. Earlier backend/540-case tests passed, but that success does **not** approve this newly authored six-boss mechanic pass. Existing broader Expo dependency and generated Edge-bundle parity failures remain separate integration work. **No merge to main, deployment, reward changes or UI activation.**
