# Profile gear inspection redesign (draft)

Approved layout: item-only base stats after rarity, quality and rank; exact random bonuses; applicable trait and sockets; no original catalog stat breakdown or equipment set progression. Read-only, no player-private identifiers. Existing visibility and selected-character checks preserved.

The two existing profile gear RPCs need the additive candidate SQL in backend/supabase/ops/profile-gear-inspection-v2-candidate.sql promoted through a CLI-generated migration, verified on staging with authenticated, blocked, private and alternate-character cases before rollout. No live DB changes. Older RPC payloads fail closed for effective stats and exact gem effects. The new 2.0 catalogue/immutable snapshot and innate affix adapter must be wired on the hidden Equipment 2.0 integration branch; main does not contain those item definitions. Do not enable release flags.

Run existing profile-equipped-gear test and mobile typecheck, verify narrow Android sheet scrolling and localization; test SQL via rollback rehearsal before migration registration.
