# Four-collection Ultra Luxe integration — review gate

## Pass 1 — ownership
Combined the three independently green draft branches into a single integration branch based on main dd7683d32e87c8fdef8e8f340781d980e5a3ec0e. Existing production grant projection still recognizes only Celestial and Draconic. New Abyssal and Paradox identifiers are explicitly review candidates, not production grants. The combined adapter takes an explicit authenticated account-scoped projection, rejects a missing/mismatched account or character scope, and remains disabled by default. Production metadata inspection found the private commerce entitlement table contains VIP/supporter data, not collection grants. Do not use that as proof of collection ownership. Actual authoritative collection source and server save validation must be located and reviewed before production integration; no migration or grant executed.

## Pass 2 — equipment
A pure quick-set draft contract works with the existing WardrobeEquipped structure. Rechecks account/character scope and latest collection projection before applying the draft. Uses exact dedicated scene/frame/pet/title identifiers, clears an incompatible separately equipped effect so the dedicated signature can run without inventing a legacy effect grant, preserves portrait and independently selected account badge/name style. No persistent write or live Quick Set Equip UI import; existing live behavior is unchanged. Mixed pieces and missing badge/title preserve the correct visual tier.

## Pass 3 — unified QA
Single isolated native review adapter composes all four existing showcase renderers. Mobile UX runs both dedicated art/motion suites and the cross-collection grant/scope/mixed-set test; prior quick-equip workflow preserved. Static shared badges from #1825 included. Review-only JPEG and duplicate text instructions excluded from the combined tree (all production WebPs included). Before release:
- Upload and register Celestial V2, calibrate new ornament anchors; existing Celestial border remains in this branch.
- Validate actual server-owned grants, revocation, save sanitization, title/badge projection, public profile privacy, cache invalidation and rollback. No new name style or portrait grant invented.
- Wire trusted production self/public projection and real wardrobe integration only after server authority has been verified. Ensure legacy aliases cannot authorize saves.
- Device QA at 320–480 logical px, reduced motion, background/resume, mixed equipment and repeated taps; compare all four native animations and measure frame time/memory. No physical-device measurements yet.
- Final CI on combined head; do not merge individual drafts on top without reconciling overlaps.


## Server authority pass — staging rollback validated
- Located original authority in #1724: `backend/online/gameplay.ts` and `docs/roadmap/ultra-luxe-grant-schema-candidate.sql`. The production switch is still off and the service-only grant relation is not deployed. The candidate catalogue explicitly adds Abyssal and Paradox only on the enabled authority route. New icon/name-style IDs are deliberately not invented.
- Extended SQL grant constraints, hero/account/roster sanitation, exact verified public titles and showcase filtering, badge unlocks and revocation. Removed the former two-set name/badge fallthrough. The existing privacy and character checks remain guarded.
- Ran the actual candidate DDL and `ultra-luxe-four-set-rollback-test.sql` in a single transaction on Veldryn Staging 20260924, with the candidate COMMIT removed and ROLLBACK appended. All four grant/revoke paths, duplicate no-op, public spoof filtering, hero/account projection, badge/preset mapping, ACL restrictions, audit counts and authenticated profile/foreign-character routes passed. The first attempt had an incorrect fixture assertion for the text[] badge result; corrected assertion and reran. Returned rolled_back=true. No production migration/grant/write.
- Remaining: four-collection load/receipt/stale-commit and revocation concurrency test, actual wardrobe/asset/public rendering wiring, v3 social identity parity and device QA. No production authority activation. Branch reconciled with main 282912060c47d1dfa86c454ac3ca5f98204ea518.
