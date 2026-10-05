# App version and build diagnostics

## Runtime source of truth

`apps/mobile/src/app-build.ts` is shared by Settings and the app update gate.
For a native binary whose application ID exactly matches Veldryn's Android
package or iOS bundle identifier, it reads the installed user-facing version
and native build number from `expo-application`. Expo Go and web use
`apps/mobile/app.json`'s `expo.version` and omit the native build number. This
avoids identifying Expo Go's host version as a Veldryn release.

Settings displays selectable, wrapping version/build and release-channel text
in all six supported languages. It includes no account identifiers, tokens or
other player data. The existing `EXPO_PUBLIC_RELEASE_CHANNEL` setting remains
the channel source, defaulting to production.

The duplicated `EXPO_PUBLIC_APP_VERSION` values in `eas.json` were removed.
`app.json` remains at `0.1.0`; this implementation does not select or publish a
new store release. The new dependency is `expo-application ~6.1.5`, the version
range declared by the installed Expo 53.0.27 SDK's bundled module manifest.

## Release version policy

The current EAS configuration uses remote build versions and increments the
production build code automatically. That build code is useful for identifying
which installed binary a player is using. EAS does not automatically advance
the user-facing `expo.version` with this configuration.

The server's existing minimum/latest-version policy compares semantic app
versions, not build codes. Set `expo.version` deliberately when preparing a
new version for store release. Incrementing only the build code while keeping
all binaries at `0.1.0` cannot make that policy distinguish the binaries.

The app currently has no `expo-updates` dependency or update delivery
configuration. These mobile changes require a new native build to reach an
installed app.

## Verification and release capability — 2026-10-05

Focused verification:

- `node tools/validate-app-build.mjs` passed all five groups. It exercises the actual metadata helper and
  version gate with native/network fakes. It covers installed native versions,
  Android/iOS app identity, stale environment values, Expo Go/web fallback,
  missing native values, semantic version policy, legacy channel policy,
  disconnected operation, and all six language catalogs.
- The lockfile change preserves every existing dependency and snapshot and
  adds only the generated importer, package and snapshot for
  `expo-application 6.1.5`. The complete pass's frozen install and typecheck
  results belong in its implementation report.

At inspection, `main` commit
`12a00f5eda9d3ee477d6de750d8015c379447a29` passed
[Mobile core validation](https://github.com/elroynbenjamins/Veldryn/actions/runs/37271376855).
That workflow runs TypeScript and regression suites; it has no native Android
Gradle build step.

The existing
[asset optimization workflow](https://github.com/elroynbenjamins/Veldryn/actions/runs/37268874835)
completed both Expo Android exports successfully. Its logged exported asset
size decreased from 280,670,506 to 203,926,852 bytes. These measurements describe
exported assets, not a signed AAB or Play Store download size. The separate
[artwork PR #551](https://github.com/elroynbenjamins/Veldryn/pull/551) was still a
draft, and its newest core-validation run was `action_required` with no jobs.
That pending PR needs its own current-head checks before merging.

The inspected local environment has a Java 17 runtime, but no Java compiler,
Gradle, Android SDK/NDK, Android emulator or `adb`; no EAS CLI or `EXPO_TOKEN` was
available. The repository's existing workflows do not build or sign an Android
app bundle. No native build, physical-device test, Play submission, purchase or
live email flow was performed for this diagnostics change. Current Google Play
RTDN credential/configuration readiness was not revalidated by this pass.

To complete native release verification, use a configured EAS account with the
existing project's signing credentials, or a configured Android toolchain and
the appropriate release signing. Build the final merged commit, verify its
version/build display, and exercise the chat/account lifecycle fixes on the
resulting Android app. Native compilation and device checks remain distinct
from the passing TypeScript, mocked interaction, and Expo export checks.

## Official references

- [Expo application metadata](https://docs.expo.dev/versions/latest/sdk/application/)
- [Expo app version management](https://docs.expo.dev/build-reference/app-versions/)
- [EAS local build requirements](https://docs.expo.dev/build-reference/local-builds/)
- [EAS builds from CI](https://docs.expo.dev/build/building-on-ci/)
