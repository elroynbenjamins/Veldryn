# Veldryn mobile app icon

Gold V and sapphire emblem based on the existing Veldryn wordmark, on navy `#101C2C`.
Generated with the built-in ImageGen tool on 2026-09-28. The complete generation
prompt is in `generation-prompt.txt`; the original transparent output is preserved.

| File | Format | Purpose |
| --- | --- | --- |
| `icon-1024.png` | 1024 × 1024, 8-bit RGB PNG, no alpha | Expo default icon, iOS/App Store, legacy Android |
| `android-foreground-1024.png` | 1024 × 1024, RGBA PNG | Android adaptive foreground; transparent padding |
| `android-monochrome-1024.png` | 1024 × 1024, white silhouette with alpha | Android themed icon |
| `google-play-512.png` | 512 × 512, 32-bit RGBA PNG, opaque pixels | Google Play listing; below the 1 MB limit |
| `emblem-source.png` | Original 1254 × 1254 RGBA PNG | Editable source artwork |
| `launcher-preview.png` | 960 × 300 RGB-preview content in RGBA PNG | Mask and small-size visual check only |

`../../app.json` (the mobile app config) references the production icon assets.
Expo's native build generates the device-specific icon sizes. A new native build
and installation are required to change the installed home-screen icon; an OTA
JavaScript update does not replace it. No native build was produced in this task.

The production images have square corners. The OS applies its own mask. Android's
background is configured separately, and the entire nontransparent foreground
fits within the central 66dp safe circle of the 108dp adaptive canvas.

Preview columns: iPhone-style mask, Android circle, Android squircle, Android
themed circle. The top row shows 160px previews; the lower row shows 60px and 48px.
These are simulated masks, not device screenshots. Theme colors are illustrative.

Re-export from the repository root after installing the mobile pnpm dependencies:

```sh
node tools/export-mobile-app-icons.cjs
```

The exporter validates PNG sizes/color types, the Android safe area, and Play's
file-size limit. Expo SDK 53's resolved public config was checked successfully.

Specifications checked:
- https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
- https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
- https://developer.android.com/distribute/google-play/resources/icon-design-specifications
- https://developer.apple.com/library/archive/qa/qa1686/_index.html
