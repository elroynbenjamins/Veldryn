# Hosted Veldryn screen review (sandbox)

The separate browser preview is deployed to **https://veldryn-review.pages.dev**.

## Scope

- The browser selector contains 63 direct entries across Game, Equipment, Dungeon, Guild, Social, Account, and QA.
- Production React Native components are rendered using synthetic, in-memory fixture data. Many screens contain further internal tabs and interactions.
- Direct linking: `https://veldryn-review.pages.dev/?view=guild-projects`, `?view=companions`, `?view=character`, etc.
- The selector is optimized for desktop (sidebar + mobile-size preview) and mobile (collapsible section browser).
- The character, equipment, world, combat, dungeon, guild, companion, cooking, crafting and account previews are for design/interaction review. **A review screen is not evidence a server feature is released**.
- Account authentication, player saves, billing, rewards, chat delivery and matchmaking are not connected to production. QA actions do not affect player accounts.

## Build and deployment

Workflow: `.github/workflows/deploy-browser-review.yml` — **Deploy Veldryn Browser Screen Review**.

Run manually with **Actions → Deploy Veldryn Browser Screen Review → Run workflow** when non-review production UI components change.

The workflow also triggers automatically for changes to the browser review entry, fixtures and workflow.

Steps:
1. Install locked backend/mobile dependencies.
2. Check `apps/mobile/tests/browser-review-host.cjs`.
3. Typecheck the real mobile app.
4. Export Expo web with `EXPO_PUBLIC_BROWSER_REVIEW=1` and explicit empty public Supabase settings.
5. Deploy static assets to a **separate** Cloudflare Pages project, `veldryn-review`.
6. Check that the deployed URL responds with HTML.

Deployment uses the existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets; no tokens are stored in source.

The web review entry is restricted by `Platform.OS==='web'`. Production Android and iOS entrypoints remain unchanged.

## Caveats

- The Pages URL is public by default. Configure Cloudflare Access in front of `veldryn-review.pages.dev` if unreleased UI previews should be private.
- Some production-only screens and interactions depend on an authenticated live service; they cannot be fully exercised in this offline fixture host. Those flows require staging/multi-device QA rather than pretending mock data proves production readiness.
- Review state resets on page reload. A browser preview is not a substitute for validating real Android builds or client/server authorization.
- If a fixture screen crashes, check the browser console and add a focused regression before treating the route as reviewed.
