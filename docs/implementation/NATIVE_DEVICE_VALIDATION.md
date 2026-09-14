# Samsung S24+ validation

Status: the internal APK passed emulator installation, sign-in, restart and native expired-link feedback. Physical Samsung results and Android version are not yet confirmed. This checklist is not a physical test result.

APK: [VELDRYN internal test build](<C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn/output/android/VELDRYN-internal-20260912.apk>) (207 MB). [SHA-256](<C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn/output/android/VELDRYN-internal-20260912.apk.sha256>).

The internal build uses the existing Veldryn production account/gameplay service. Co-op remains disabled pending its separate release gates. It is signed for internal testing, not a Play Store release.

1. Install the supplied APK on the Samsung S24+ and launch VELDRYN. Record the Android version and any install/startup error.
2. For the account used in the email-delivery test, first enter that email and use **Need help signing in? → Forgot password** to choose your own password through the latest email on this phone. Then sign in if needed. Confirm that the keyboard leaves the submit button usable and that Back behaves normally. Do not share a password, email link or verification code.
3. If the account is new, create a character. Close the app completely and reopen it; verify the same character is restored.
4. Start a short hunt. Background the app, return, collect once, and check that the reward is credited once. Relaunch and confirm the balance remains the same.
5. Briefly interrupt connectivity during a save. Reconnect and retry the pending action; check that it is not paid twice.
6. If recovery was not already completed in step 2, trigger it from this installed app. Open the latest recovery email on the same phone and verify that it returns to VELDRYN and offers password update. Email receipt alone does not pass this check.
7. Test with larger system text and TalkBack, including login, character creation, collection and settings. Restore your preferred settings afterward.

Report each result as PASS or describe the visible problem. Current emulator evidence is recorded separately in `online-verification/native-android.json`; it does not count as Samsung testing.
