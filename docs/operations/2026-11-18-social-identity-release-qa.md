# Account-wide Social Name and character showcases — guarded release QA

**Candidate:** merged release integration PR #1453 (draft design provenance #1384) · **Status:** integrated in main; production OFF; internal staging QA opt-in ON · **Target:** Android 1.0.11 or later.
**Do not enable production Social Names**, deploy production migrations, or move Android minimum-version policy until all release gates pass.

## Internal staging QA build profile

- `eas build --platform android --profile staging` builds an **internal staging APK** with Social Names and three-hero showcases enabled against the staging Supabase backend only. Creating this APK still requires EAS access/signing; a GitHub CI AAB/emulator smoke is not an EAS staging build.
- The app gate requires all three literal build-time conditions: `EXPO_PUBLIC_RELEASE_CHANNEL=staging`, the exact staging Supabase URL, and `EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW=true`. If any is absent or mismatched, the new RPC/UI path remains disabled; production profile explicitly sets the preview opt-in to false.
- Android QA must use the actual signed/staging APK and collect build hash, screenshots, logs and tested account cases. Do not treat the green generic Android CI smoke as proof that the feature-ON staging scenario passed.
- Before player rollout, run the release permission SQL gate, confirm migrations and old v43 RPC coexistence, complete manual QA and then prepare a separate, explicit production feature-activation change. Never infer production readiness from this staging-only opt-in.


## Release-readiness audit — 19 November 2026

- **GitHub integration:** PR #1453 was merged into `main` at `5a2644491f240e923171bc270fb96f5aeecb5025`; the feature is still hidden behind `ACCOUNT_SOCIAL_IDENTITY_RELEASED=false`.
- **Staging:** Re-ran the rollback-only `backend/supabase/tests/account_social_identity_character_showcases_v1.sql` and received **PASS** on 2026-11-19. All seven social-identity migrations exist in the staging migration history. Checked `character_profile_showcases_v1`: RLS enabled; `anon` and `authenticated` have no direct table SELECT/UPDATE privileges.
- **RPC grants:** Checked staging: `anon` cannot execute the identity/name/showcase public API functions, while `authenticated` can execute designated functions. Trigger helper `protect_social_name_v1` is not callable by either role. These catalog checks complement, but do not replace, Android authenticated/blocked-user testing.
- **Production:** None of the seven new social-identity migrations are present, and the expected `social_name` columns and new showcase table are absent. No migration or feature flag was activated in production during this audit.
- **Android CI blocker:** Merged `main` run `44569715600` failed at `expo-doctor`: required peer `expo-asset` was missing from the app's declared dependencies. Release-readiness branch `codex/social-identity-1-0-11-release-readiness` adds the existing lockfile-resolved `expo-asset@58.0.21` as a direct dependency. **Do not mark this fixed until fresh PR Android AAB + emulator smoke jobs pass.**
- **Release status:** **NO-GO for production activation** while Android signoff, final security review, and Play internal-track QA remain unverified.

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
