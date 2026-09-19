# VELDRYN — GitHub + Control Center access workflow

## How you access VELDRYN Control after deployment

Deploy the v17.3 Control Center as a separate private web project. Cloudflare Pages assigns a URL such as:

`https://veldryn-control.pages.dev`

You open that address in a normal browser and sign in with the configured admin account. A custom subdomain can be attached later, for example `control.yourdomain.com`.

Recommended repository split:

- Main private VELDRYN repository: mobile game + authoritative backend/Supabase code.
- Separate private `veldryn-control` repository: Control Center frontend + Cloudflare Pages Functions.

The Control Center still talks only to trusted/admin backend surfaces and the same VELDRYN Supabase project. Never place a Supabase service-role key in browser code.

## Do NOT upload v16 -> v17 -> v17.1 -> v17.2 -> v17.3 -> v18 one by one

The ZIPs are implementation/reference packs, not Git history.

Recommended flow:

1. Treat the current LOCAL VELDRYN repository as authoritative because it contains unpushed work.
2. Run `git status` and make a safety commit/branch before the merge, e.g. `backup/pre-v18`.
3. Give Codex the latest v18 ZIP. It contains the dependency chain back through v17.3/v17/v16.1.
4. Codex inspects which systems/migrations already exist and merges only what is missing into the current local repository.
5. Run the full current build/tests and real Supabase forward migrations.
6. Review the diff.
7. Commit the resulting actual source code.
8. Push that resulting repository state to GitHub.

Do not commit all implementation ZIPs into the main source repository unless you intentionally want a separate archive folder. They are not needed at runtime.

## Suggested Git safety sequence

```bash
git status
git switch -c backup/pre-v18
git add -A
git commit -m "Backup local VELDRYN state before v18 merge"
# return/create the branch you use for implementation
git switch -c feature/v18-guild-projects
```

After Codex merges and tests:

```bash
git add -A
git commit -m "Implement v18 guild projects and guild social systems"
git push -u origin feature/v18-guild-projects
```

Merge to your normal production/main branch only after the real current-repository and Supabase tests pass.

## Control Center deployment workflow

The separate `veldryn-control` repository can be connected to Cloudflare Pages. Once Git integration is enabled, pushes to the selected production branch can deploy automatically. Use preview branches before production when changing dangerous admin functionality.

The Control Center does not need a new deployment merely because you create a normal event through the site; deployments are for changes to the Control Center code itself.
