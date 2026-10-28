# VELDRYN — Guild/Chat Mobile TypeScript Recovery

**Date:** 28 October 2026  
**Branch:** `fix/mobile-guild-chat-typecheck-20261028`; **Draft PR [#621](https://github.com/elroynbenjamins/Veldryn/pull/621)**  
**Base:** `main` `cb975ecb0ea5ba85c7aaeb3d8b5b740172a06290`  
**Status:** In review; NOT merged, deployed or native-accepted.

## Root causes from actual GitHub Actions logs

The companion layout branch [#619](https://github.com/elroynbenjamins/Veldryn/pull/619) is blocked by unrelated baseline failures:

- The initial `main`/PR #619 Mobile TypeScript check reported **16** TS errors: App requested `ChatOverlay.initialChannel` but the prop was absent; `canManageGuild` and `guildRecruitmentVisible` imports were missing; an obsolete `ChatWindow` import in a dev-only fixture; missing typed social translation keys; and `GuildHomeActions.canManage` mismatch.
- Mobile core TS separately reports **11** errors from `apps/mobile/tests/starter-companion-choice.ts` referencing **nonexistent** selection APIs/account fields. The existing unlock flow uses automatic quest/progression reconciliation. **Do not remove or falsify this test or implement a new starter choice merely to make CI green; A01 requires a separate gameplay/compatibility decision.**
- Backend/SQL integrity remains independent of the mobile TypeScript issues.

## Implemented, behavior-preserving compatibility changes

1. `apps/mobile/src/components/ChatOverlay.tsx`: accept the app-provided `initialChannel?:'world'|'guild'`. A request to open Guild Chat now waits for the existing Guild membership check if the local membership is not yet available. Explicit channel selection cancels the pending request; closing chat clears it. World Chat remains the default on normal opening. No chat persistence protocol change.
2. `apps/mobile/src/core/social-management.ts`: restore strict leader/officer management check and a pure Guild vs Party recruitment post-type filter; server RPC remains the authorization/visibility authority. Existing `guildMemberManagement` and `partyMemberManagement` remain unchanged.
3. `apps/mobile/src/components/GuildHomeActions.tsx`: declare `canManage?:boolean` and hide Manage Guild link when explicitly false; other call sites retain default behavior. Existing routes/callbacks unchanged.
4. `apps/mobile/src/dev/GuildLayoutReview.tsx`: replace a removed `ChatWindow` import in the isolated **dev-only** fixture with its own themed View; preserve GuildChatView and ChatViewport.
5. `apps/mobile/src/i18n/social.ts`: add ten missing localized Guild/Chat labels/messages in EN source and DE/ES/NL/IT/FR translations; preserve typed translator contract.
6. `apps/mobile/tests/guild-social-permissions.ts` + `tools/mobile-core-tests.json`: add regression test for management roles, context-specific recruitment post types, and existing promote/demote/removal permissions. Test cannot run in normal core pipeline until A01 is addressed.

## Verification (precise, not inflated)

- **First PR #621 compiler run** [Guild Shop #40675228729](https://github.com/elroynbenjamins/Veldryn/actions/runs/40675228729) showed that **none of the original 16 baseline TS errors remained**. It reported just **2 introduced TS2300 duplicate identifiers** in `social-management.ts`, from accidentally re-declaring the existing `GuildManagementRole` alias. The duplicate declaration has since been removed in commit `72426519`; this fix requires a new run to verify full compilation.
- Same run's **backend/SQL integrity job passed**. No server logic or SQL migration changed.
- Subsequent CI runs on newer commits were pending/in progress at the time of this note. No claim of full mobile TypeScript or app/test success until a run for the **latest SHA** confirms it.
- **Native UI not tested:** Guild membership resolving during ChatOverlay open, chat persistence/unread, role changes, and isolated preview at Android font scales require QA.
- **11 starter-companion API/test mismatches** remain, explicitly outside the scope of PR #621. They block the default core TS test runner, including the new regression test. Do not mask the failures in tsconfig or remove tests as a shortcut.

## Next

Verify latest GitHub Actions Mobile TypeScript compile. On success, review #621 separately from #619; integrate the fix into a current release branch only through an approved merge/rebase. Resolve A01 contract as its own game-rule and save-migration task, then execute full mobile core tests and native Android companion flows. **Do not deploy or merge without approval.**
