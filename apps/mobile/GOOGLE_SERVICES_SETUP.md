# Google account + Play Games setup

VELDRYN uses two related but separate Google integrations:

1. **Continue with Google** is an account/recovery method for the VELDRYN Supabase user.
2. **Google Play Games Services v2** is the Android game-platform identity used for Play Games features. It is not the primary VELDRYN account ID.

## Current VELDRYN identifiers

- Android package: `com.elroybenjamins.veldryn`
- Play Games Services project/app ID: `1011264688445`
- Supabase production project: `nyjwigipamnvpdvpauuv`

The Play Games project ID is public configuration and is wired into EAS build profiles.

## 1. Google Auth Platform

Create or use the existing Google Cloud project `veldryn`.

All four EAS build profiles (development, preview, staging, production) now include the public Web OAuth client ID. Changing EAS configuration does **not** patch already-installed AABs: create a new Android build to deliver the button and native Google libraries.

Create a **Web application** OAuth client and place only its public client ID in EAS:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Do **not** put the Google client secret in an `EXPO_PUBLIC_*` variable.

The previously supplied OAuth JSON
`client_secret_1011264688445-fivmbv0qksr3n7n3ubpkv55b1eo84e1v.apps.googleusercontent.com.json`
is an installed-app OAuth configuration. Its client ID must not be substituted for the required Web OAuth client ID.

Also create/link the Android OAuth credential for:

- package: `com.elroybenjamins.veldryn`
- SHA-1: Google Play App Signing certificate for production
- SHA-1: development/debug signing certificate for internal development builds when those builds need Google sign-in

## 2. Supabase Auth

In the VELDRYN production Supabase project:

- enable the Google provider
- configure its Web OAuth client ID and client secret
- enable **Manual Linking**

Manual Linking is required because a guest can already own characters/progress. VELDRYN links Google to the existing Supabase UUID rather than creating a replacement account. Confirm **both production and staging** hosted Supabase projects have Google enabled, with the correct Web OAuth client ID/secret and Manual Linking turned on. The local config alone does not set the hosted projects.

The repository's local Supabase config already declares `enable_manual_linking = true`; the hosted project setting must match it.

## 3. Google Play Games Services v2

VELDRYN uses Play Games Services v2 with project ID `1011264688445`.

The Expo config plugin writes:

- `com.google.android.gms.games.APP_ID`
- `@string/game_services_project_id`
- `com.google.android.gms.games.SUPPRESS_GAME_PROFILE_CREATION=true`

Existing Play Games profiles can authenticate automatically when the game starts. Players without a Play Games profile are not forced into profile creation; the Account screen provides a manual **Connect Google Play Games** fallback.

The Account screen now checks the native Play Games status without triggering sign-in. It reports **connected** (and the player's display name), **disconnected**, **unavailable due to build/platform**, or **temporary error**, separately from the Supabase Google account identity. The user-facing Google UI can be redesigned independently of these headless functions (`inspectPlayGamesConnection` and `inspectGoogleAccountConnection`).

## Google nonce validation fix (November 2026)

Production Supabase Auth logs showed:
`invalid request: Passed nonce and nonce in id_token should either both exist or not.`

The Nitro Google Sign-In Android module uses an automatically generated hash when
`configure({ nonce })` is omitted. VELDRYN now generates a **fresh 32-byte secure
random value** for every attempt using Expo Crypto, hex-encodes that raw nonce,
and supplies its SHA-256 hexadecimal digest as
`GoogleOneTapSignIn.configure({ nonce: hashedNonce })`. The **unhashed** nonce
is supplied to Supabase for both:
- `linkIdentity({ provider: 'google', token: identity.idToken, nonce: identity.nonce })`
- `signInWithIdToken({ provider: 'google', token: identity.idToken, nonce: identity.nonce })`

Supabase validates that the Google token claim matches the hash. Do not disable
nonce checking or switch to unverified identity linking.

**Rollout:** `EXPO_PUBLIC_GOOGLE_ACCOUNT_LINKING_ENABLED` is off by default
(including production), hiding both the existing-account linking button and the
signed-out Google sign-in button. The internal `preview` EAS build sets it to
`true` for QA, while successful existing Google links remain visible regardless
of the flag. After internal device tests, explicitly enable the flag on production
and create a new **signed** Android build. An OTA-only update cannot add the new
`expo-crypto` native module to a previously installed build.

QA checklist (use a secured test account; do not risk an unrecoverable guest):
1. Confirm Google OAuth Android package and SHA-1 are configured for the preview
   signing certificate and the hosted Supabase Google provider has Manual Linking.
2. Build/install a fresh preview AAB/APK containing Nitro and Expo Crypto.
3. Link Google from a test email/password account; inspect its Supabase identities
   and verify the same user UUID and all character progress.
4. Sign out on a second device, Continue with Google, and verify recovery.
5. Verify Google Play Games stays independent; check cancellation, changing the
   current account mid-picker, and an identity already linked elsewhere.
6. Confirm Supabase Auth logs show no nonce mismatch; only then enable production
   flag and publish a newly signed AAB.

## 4. Build and test

Both integrations contain native Android code, so Expo Go cannot validate them. Use an Android development build or a Google Play AAB.

Test before release:

- installed legacy 1.0.2 build -> Google buttons may be absent; update using a new signed AAB rather than remote backend changes
- signed out -> Continue with Google
- guest with progress -> Link Google account -> same Supabase UUID remains and server identity status reports linked
- already-linked VELDRYN Google account -> no duplicate Google picker/link mutation
- change VELDRYN account during Google picker -> linking aborts before any mutation
- email/password account -> Link Google account -> same Supabase UUID remains
- Google account already linked elsewhere -> link is rejected; never auto-merge
- reinstall/second device -> Continue with Google restores the linked VELDRYN account
- Play Games status check detects an already-authenticated player without displaying a sign-in prompt
- Play Games auto-auth succeeds for a licensed tester with an existing profile
- manual Play Games connection works after declined/failed automatic authentication
- users without a Play Games profile can continue playing without a forced profile-creation prompt

A missing button in an installed version cannot prove hosted OAuth configuration. Troubleshoot the particular AAB's bundled EAS env, native libraries, Google OAuth Android package/SHA-1, and hosted Supabase Google/Manual Linking settings separately. Do **not** sign out a guest or reinstall the game before account recovery is secured.
