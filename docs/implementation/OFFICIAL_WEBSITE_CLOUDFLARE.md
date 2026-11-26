# Official Veldryn website

First release: static marketing website for playveldryn.com. No game API, authentication, trackers, cookies set by site code, database connection, or separate server. The site uses the real Android app icon from the existing mobile repository and actual game artwork, including the original Veldryn logo, kingdom hero and three regional scenes (not gameplay screenshots). The app version, future 2.0 content, live counts and availability are intentionally not advertised.

## Cloudflare Workers setup (existing veldryn project; preferred if already created)

The root wrangler.jsonc config serves only ./website as static assets with custom 404 handling. No Worker runtime script, secrets, or Supabase bindings. The website/.assetsignore excludes the build script. Existing _headers are applied to static responses.

In the existing Worker, Settings > Builds: production branch main after merge, root /, build command `bash website/build-assets.sh`, deploy command `npx wrangler deploy`. For non-production builds use `npx wrangler versions upload` if enabled, or disable preview builds. No environment variables needed. Retry a new main deployment only once the PR is merged and the files are present. Verify the workers.dev URL before adding playveldryn.com in Domains & Routes. Preserve all Resend DNS records; do not replace authentication settings.

## Cloudflare Pages setup (alternative)

In Workers & Pages select Create application, Pages, Connect to Git, and choose elroynbenjamins/Veldryn. Configure:
- Production branch: main (after this PR is merged)
- Framework preset: None
- Root directory: leave blank (repository root)
- Build command: bash website/build-assets.sh
- Build output directory: website
- Environment variables: none
- Disable preview deployments if not needed; optionally configure build watch paths for website/* and the exact mobile artwork paths listed in website/build-assets.sh.

Do not publish the repository root: the output directory is website only. Do not set a Supabase key or any other secret. Do not use a Worker or a paid plan for this static site.

After successful deployment, check the pages.dev URL and add playveldryn.com as a custom domain using the Pages project's Custom domains tab. The domain must be active in the same Cloudflare account. Do not overwrite or remove Resend DNS records; mail.playveldryn.com is separate. Add www and redirect it to the apex later if desired.

## Pre-publication checks

- Android store link uses the app's current package com.elroybenjamins.veldryn. Check listing opens for intended countries.
- Discord and privacy policy links are sourced from the existing app's documented Settings links (#423); check they remain valid.
- Confirm desktop/mobile layout and all navigation, FAQ toggles, footer links, responsive hero/region art, 404 and sitemap.
- Confirm HTTPS, custom domain and security headers.
- Website is static and does not expose game APIs or unpublished gameplay systems. Do not replace the existing privacy policy or production auth redirect settings as part of this release.

## Rollback

Use Cloudflare Pages deployments to roll back to the previous working deployment, or revert the website-only commit. Game release and Supabase remain unaffected.

## Store branding

The English Google Play badge at `website/brand/google-play-en.svg` is an unchanged copy of the January 2025 SVG export mirrored at https://github.com/pioug/google-play-badges/blob/main/svg/en.svg (blob `f01a95012743eac5ed291e433a8117565dd294b8`). The mirror documents trimming the outer border. The current Google branding reference is https://partnermarketinghub.withgoogle.com/brands/google-play/google-play/lockups-icons-badges/ ; replace the mirrored export with a direct official download if available. Keep the badge colors and artwork unchanged, preserve clear space, and use only for the existing Play listing. The website hosts the badge locally and makes no additional third-party request. Discord CTAs retain Blurple and the white Clyde mark.
