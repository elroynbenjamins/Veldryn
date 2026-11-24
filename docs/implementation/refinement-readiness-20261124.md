# Refinement passes 9–10 — review and release blockers (24 Nov 2026)
## Scope
Mobile-only draft #1736 on #1734, no merge or deployment. Shared motion lifecycle rejects late OS preference reads after a newer event or subscription generation. Inactive/reduced-motion decorative components use no subscription. Theater halo uses shared policy, stable interpolations/value and non-interaction animation; styled names respect system motion; tool artwork memoized. Source contracts 12/12 and seven isolated mocked lifecycle assertions passed. No native memory/FPS/power profiling.
## Branch and CI snapshot (before this documentation commit)
- #1736 d1966d6: 0 behind pinned RC head, 2 ahead; 3 workflows pending/queued.
- #1735 2a4c3bd: 0 behind #1729; 9 workflows queued.
- #1729 27d9d54: 0 behind #1728; 8 workflows queued.
- #1731 9e2c9f1: 0 behind #1717; 13 workflows queued. Equipment/Combat adapters remain separate.
- #1734 68e0236: 68 behind current main, 70 ahead; 5 success, 5 queued, 2 running, 2 failed. Reconcile safely before release. Do not assume all 68 commits are missing functionality: inspect overlap and ancestry.
## Confirmed failures
- Mobile core job 138527324716, run 45417413769: generated co-op Edge bundle differs from rebuild (2327894 vs 2329927 bytes, first difference offset 1990390). Rebuild from reconciled source in a pinned environment, verify parity and review diff; never manually edit generated output or disable check. No generated artifact changed.
- Localization job 138527323687, run 45417413808: german-party-surface-localization.cjs:48 expects obsolete minimum-level editor and old publish syntax. Actual compact editor uses useSocialText, authoritative normalized Party preferences and trimmed-title guard. Update contract on draft #1736 to assert current locale, delegated settings, localized choices, 24h expiry, no role filters, trimmed title and busy guard. Existing Party Hub level localization and Muster checks retained. Full localization execution outstanding.
## Remaining gates
Reconcile #1734 with main and independent #1697 startup/#1694 return/#1681 Forge/#1716 Guild Raid review work, preserve separate approvals. Run exact-head full CI, staging migration verification, native Android UX/performance and Edge parity. For 2.0: genuine persisted equipment/gem/party authorities, approved caps and candidate CP calibration, matched encounter results, coordinated hidden launch and UI approval. No automatic deletion of unused-looking modules/dependencies/flags; feature gates and release history are intentional. Dependency and dead-code pruning require a full checkout/import graph and successful build. No production SQL, release flag or minimum-version change.
