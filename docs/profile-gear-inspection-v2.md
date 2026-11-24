# Profile gear inspection redesign (draft)

Approved layout: item-only base stats after rarity, quality and rank; exact random bonuses; applicable trait and sockets; no original catalog stat breakdown or equipment set progression. Read-only, no player-private identifiers. Existing visibility and selected-character checks preserved.

The two existing profile gear RPCs need the additive candidate SQL in backend/supabase/ops/profile-gear-inspection-v2-candidate.sql promoted through a CLI-generated migration, verified on staging with authenticated, blocked, private and alternate-character cases before rollout. No live DB changes. Older RPC payloads fail closed for effective stats and exact gem effects. The new 2.0 catalogue/immutable snapshot and innate affix adapter must be wired on the hidden Equipment 2.0 integration branch; main does not contain those item definitions. Do not enable release flags.

Run existing profile-equipped-gear test and mobile typecheck, verify narrow Android sheet scrolling and localization; test SQL via rollback rehearsal before migration registration.

## Five refinement passes
1. Fail closed on stale/duplicate copy IDs and invalid rarity/quality/rank; compare public stats to inventory exact-copy calculation.
2. Add bounded, allowlisted V2 presentation snapshot for the eventual trusted server projection. Already-modified raw item stats and separate innate and rolled percentages. No receipt IDs or set data in snapshot. Hidden branch result model confirms percent units and one/two base stats. Producer and V2 gem adapter still required; no guessed V2 gem effects.
3. Rarity-colored title; accurate precision; unavailable states explicit; hide empty bonuses; fallback gem art.
4. Scroll indicator, wrapping labels, localized sections, readable values, screen reader stats. Fix invalid useGameplayText destructuring.
5. Tighten candidate SQL allowlist and stale-copy fallback; add parity, malformed payload, duplicate ownership, V2 normalization and precision checks.

Remaining: CI/device verification, RU/TR native localization coverage for new copy, CLI-generated migration and SQL privacy rehearsal, hidden EQ2 producer/actual gem effects and authored innate bonuses. Snapshot is a proposed integration contract, not a deployed API. No live migration or release flags changed.
