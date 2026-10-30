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
