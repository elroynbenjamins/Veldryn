# Google account + Play Games setup

VELDRYN uses two related but separate Google integrations:

1. **Sign in with Google** is an account/recovery method for the VELDRYN Supabase user.
2. **Google Play Games Services v2** is the Android game-platform identity used for Play Games features. It is not the primary VELDRYN account ID.

The mobile code is safe to build before Play Games is configured. If the Play Games project ID is absent, the config plugin removes the PGS auto-init provider while leaving normal Google account sign-in available.

## 1. Google Auth Platform

Create or use a Google Cloud project for VELDRYN.

Create a **Web application** OAuth client. Put only its public client ID in the mobile/EAS environment:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Do **not** put the Google client secret in an `EXPO_PUBLIC_*` variable.

Also create an **Android** OAuth client for:

- package: `com.elroybenjamins.veldryn`
- SHA-1: add the Google Play App Signing certificate SHA-1 for production
- SHA-1: add the development/debug signing SHA-1 for development builds when needed

## 2. Supabase Auth

In the VELDRYN Supabase project:

- enable the Google provider
- configure its Web OAuth client ID and client secret
- enable **Manual Linking**

Manual Linking is required because a guest can already own characters/progress. VELDRYN calls `linkIdentity` so the Google identity is attached to the existing Supabase UUID instead of silently creating a second account.

## 3. Google Play Games Services v2

Configure Play Games Services for the VELDRYN Play Console app and link the Android credential for `com.elroybenjamins.veldryn`.

Set the numeric Play Games project ID in the EAS/build environment:

```
EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID=YOUR_PLAY_GAMES_PROJECT_ID
```

When present, the Expo config plugin writes `com.google.android.gms.games.APP_ID` and the required Android string resource. The local Expo module initializes `PlayGamesSdk` from the Android application lifecycle, after which PGS v2 performs its normal automatic platform authentication. The Account screen also exposes a manual Play Games connection action as a fallback.

## 4. Build and test

This integration contains native Android code, so Expo Go cannot test it. Use an Android development build or a Google Play build/AAB after the environment variables and console configuration are in place.

Test these account cases before release:

- signed out -> Continue with Google
- guest with progress -> Link Google account -> same Supabase user UUID remains
- email/password account -> Link Google account -> same UUID remains
- Google account already linked elsewhere -> linking is rejected; never auto-merge
- reinstall/second device -> Continue with Google restores the linked VELDRYN account
- Play Games auto sign-in succeeds for a licensed tester
- manual Play Games connection works when automatic authentication was declined or failed
