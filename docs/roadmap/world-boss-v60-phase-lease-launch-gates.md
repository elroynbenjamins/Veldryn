# World Boss V60 — trusted UTC phase and event lease, hidden update preparation

**18 November 2026. Review-only. World Boss gameplay, current-cycle HTTP
transport, donations, attempts, claims, SQL deployment and private erasure
worker remain OFF.** This pass does not approve a launch.

## Defect closed in the hidden status path

The V51 read-only status service sampled trusted time before its private
event lookup, database status read and final account-privacy check. If one of
those awaits crossed a Saturday 00:00 UTC raid start, Monday 00:00 UTC raid
end, or fortnight rotation boundary, the service could return an already
out-of-phase V41 packet within its original two-minute read lease. The V46
client decoder similarly accepted a packet for up to 120 seconds based on
the packet's own read time, without checking whether the device's current
time had crossed the phase boundary.

This matters when a UI says “Preparation” during a live battle or shows a
former boss just after a global rotation. It never authorized a gameplay
write: the server route is unmounted and controls are disabled, but launch
readiness requires consistent phase guidance.

## Fix

- V51 re-samples **trusted server UTC after all awaited private operations**.
- Reject backwards/invalid server clocks, expired/future snapshots,
  **changed phase** and **changed 14-day global boss cycle**. Private
  selection, Auth ownership, erasure checks and read-only projection remain
  unchanged.
- V46 rejects a leased packet if its projected phase from `readAtUtcMs`
  differs from its phase at the device display clock. No fallback to a
  guessed boss, no ability to begin combat/donate/claim. Existing QA route
  refresh/error state handles a null decoder result.
- Both server and mobile tests now cover **preparation→raid** and
  **cooldown→next cycle**; server also covers post-read staleness,
  clock regression and a successful read inside the same phase.
- The dedicated World Boss test workflow additionally runs the independent
  `world-boss-readonly-snapshot.cjs` UI/protocol safety suite.

The device clock is used **only to hide an obsolete read-only packet**; it
cannot authorize any action. A bad device clock may temporarily hide status
until refresh and must never be used for the server's authoritative windows.

## What this does not prove

A green synthetic CI fixture is not a real 48-hour weekend raid, server
Auth integration or device validation. Before launch:

1. Resolve privacy/retention and account-erasure policy in issue #1348.
   V56 deletion runtime remains hard-disabled, V58 and V59 draft only.
2. Approve and install the reviewed private World Boss schema in staging
   (the latest read-only check found no World Boss tables).
3. Mount an Auth-derived, privacy-fenced **read-only** overview transport
   with a trusted server launch Monday and request bounds; test failure,
   revoked Auth and race behavior.
4. Validate 1–3 current characters **plus grandfathered 4/5**, one
   account-wide three-attempt budget, two account-wide War Camp donations,
   immutable replays, frozen bonuses, idempotent claims and replay erasure,
   against approved synthetic multi-account staging fixtures.
5. Finish role/Combat Power fairness and World Sigil payout review, localized
   pixel-art UI, Android accessibility, background/resume and post-weekend
   reward reconciliation; check exact branch-head CI and document rollback.
6. After explicit approval, schedule exactly one canonical global boss per
   14-day cycle (Hollowroot → Solbrand → Rimewarden). Do not launch from
   local time, device-derived boss selection or a client-provided event ID.

**This PR is safe to review as hidden code, but not sufficient to enable
World Bosses in the next public build.**
