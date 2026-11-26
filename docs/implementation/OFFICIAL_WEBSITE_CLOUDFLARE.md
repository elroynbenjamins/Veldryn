# Official Veldryn website

First release: static marketing website for playveldryn.com. No game API, authentication, trackers, cookies set by site code, database connection, or separate server. The site uses the real Android app icon from the existing mobile repository and original illustrative SVG landscapes (not screenshots). The app version, future 2.0 content, live counts and availability are intentionally not advertised.

## Cloudflare Pages setup

In Workers & Pages select Create application, Pages, Connect to Git, and choose elroynbenjamins/Veldryn. Configure:
- Production branch: main (after this PR is merged)
- Framework preset: None
- Root directory: leave blank (repository root)
- Build command: mkdir -p website/assets && cp apps/mobile/assets/app-icon-v1/icon-1024.png website/assets/icon.png
- Build output directory: website
- Environment variables: none
- Disable preview deployments if not needed; optionally configure build watch paths for website/* and apps/mobile/assets/app-icon-v1/icon-1024.png.

Do not publish the repository root: the output directory is website only. Do not set a Supabase key or any other secret. Do not use a Worker or a paid plan for this static site.

After successful deployment, check the pages.dev URL and add playveldryn.com as a custom domain using the Pages project's Custom domains tab. The domain must be active in the same Cloudflare account. Do not overwrite or remove Resend DNS records; mail.playveldryn.com is separate. Add www and redirect it to the apex later if desired.

## Pre-publication checks

- Android store link uses the app's current package com.elroybenjamins.veldryn. Check listing opens for intended countries.
- Discord and privacy policy links are sourced from the existing app's documented Settings links (#423); check they remain valid.
- Confirm desktop/mobile layout and all navigation, FAQ toggles, footer links, image, 404 and sitemap.
- Confirm HTTPS, custom domain and security headers.
- Website is static and does not expose game APIs or unpublished gameplay systems. Do not replace the existing privacy policy or production auth redirect settings as part of this release.

## Rollback

Use Cloudflare Pages deployments to roll back to the previous working deployment, or revert the website-only commit. Game release and Supabase remain unaffected.
