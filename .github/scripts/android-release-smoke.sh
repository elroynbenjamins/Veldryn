#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.elroybenjamins.veldryn"
APK="release-aab/veldryn-universal.apk"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb logcat -c
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 25
adb exec-out screencap -p > release-aab/startup-screen.png
adb logcat -d -v brief -s AndroidRuntime:E ReactNativeJS:E ReactNative:E > release-aab/startup-errors.log || true
if ! adb shell pidof "$PACKAGE"; then
  echo "::error::Veldryn is not running 25 seconds after launch"
  cat release-aab/startup-errors.log
  exit 1
fi
if grep -q 'FATAL EXCEPTION' release-aab/startup-errors.log; then
  echo "::error::Fatal Android runtime exception during startup"
  cat release-aab/startup-errors.log
  exit 1
fi
echo "Release AAB installed and Veldryn process survived Android 15 startup"
