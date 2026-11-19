# Account-wide Social Name and character showcases — guarded release QA

**Candidate:** draft PR #1384 · **Status:** hidden, not enabled · **Target:** coordinated Android 1.0.11 or later.
**Do not set** `ACCOUNT_SOCIAL_IDENTITY_RELEASED=true`, deploy production migrations, or move the Android version policy until all release gates pass.

## Verified on 18 November 2026

- Transactional Veldryn Staging regression `backend/supabase/tests/account_social_identity_character_showcases_v1.sql` **PASSED** through the connected Supabase project. It tests name uniqueness and 30-day cooldown, owner-only updates, exact three-character gallery, each character's isolated showcase, private profile/gear invisibility, and active gameplay character isolation. Fixture transaction ends in `ROLLBACK`.
- New backend tables/functions are present in staging and are absent from production. A released 1.0.10 client must continue using `profile_public_v43`, `profile_equipped_gear_v1`, `profile_extension_self_v43`, and `profile_extension_update_v43` while the feature flag is OFF.
- Code regression contracts now check old RPC fallbacks, no unauthorised V2 UI, account/character separation, safe tab-scoped Revert, stale async account-switch protection, and legacy featured-character picker continuity.
- Latest GitHub mobile, UX, translation and Android validation remain **not certified** until complete on the final head.

## Required mobile QA matrix (Android staging build)

1. **Legacy, flag OFF**: Open an existing 1.0.10-compatible account. Customize Profile: Look/Identity/Showcase continue to load and save using v43; selecting a featured hero remains possible; the Social Name input, per-hero gallery and V2 buttons do not appear.
2. **Flag ON only after backend deployment**: First Social Name (2–20 letters), duplicate/case-insensitive collision, moderation filter, 30-day lock, same-name no-op and visible cooldown date. Test Unicode accents and input feedback across EN/DE/ES/NL/IT/FR/RU/TR.
3. **Three heroes**: Edit hero A's favorite skill/companion, achievements/records/collections and skills; then hero B; return to A and confirm saved values. Publishing hero B must not switch the active gameplay hero. Do not assume five character slots.
4. **Account identity**: Change privacy, world feed opt-out and account bio while browsing heroes. Revert Identity without discarding unsaved Showcase, then reverse. Confirm switching accounts while a request is in flight does not show or save another account's identity.
5. **Audience and ownership**: Public/guild/private visibility; blocked player and inactive-owner permissions; an owner cannot select unlocked art/skills from another hero or another account; private gear read returns no data.
6. **Social surfaces**: World/Party/Guild chat, invitations, friends and public profile sheets show the single account Social Name. Inspect hero-specific public showcase and separate hero name. Existing badges/name styles remain attached to account identity.
7. **Android UX**: 320–360 dp and standard phone widths, large font, portrait, screen-reader labels/roles, keyboard, back navigation, modal dismissal, loading/retry/empty states, dark/light themes, and eight localized strings. Capture screenshots and attach them to the PR.
8. **Session resilience**: Fresh login, guest account, Google linking, account A→B→A, network drop before Save and successful retry. No prior account details may remain after logout.

## Production staging sequence and recovery

- Complete and review all seven dated Social Name/showcase migrations in their declared order; re-run authenticated/anonymous role and RLS audits. Only apply to production after final mobile regressions, Android staging APK/emulator tests and human device QA pass.
- Keep the client flag OFF until the new functions are available and a signed Android build can reach players. Old clients must continue working against the old v43 RPCs throughout coexistence.
- Approve uniqueness/cooldown policy, signed build versionCode, and Play internal-track release. Change app minimum-version policy separately; no premature forced update.
- Prefer a forward-compatible disable-new-writes rollback: never erase account Social Names, character showcases, or profile privacy settings to revert a client UI bug.
- Record per-check owner, timestamp, exact APK/AAB hash, screenshots, logs and the final go/no-go. An unverified item is **incomplete**, not passed.
