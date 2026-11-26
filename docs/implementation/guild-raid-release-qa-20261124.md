# Guild Raid Gate — release validation (passes 7–8)

Review-only. No combat balance, payouts, attempts, event activation or 2.0 integration changes.

## Functional device checks (staging account, not production)
- Start a weekly and seasonal attempt on slow Wi-Fi; verify the UI opens only after server receipt, with no second blocking board read. Drop the ACK, retry the same request after navigating away/back; confirm exactly one attempt consumed for that nonce. A process kill still relies on fresh server board on reopen; nonce recovery here is memory-only.
- Lose network after confirmed claim; confirm claim display remains, reconnect and check authoritative wallet/milestone once. Test old rotated-out and event rewards.
- Close the theater while a three-minute attempt is active; confirm server settlement refresh and no duplicate periodic poll owner. Background/foreground near deadline; verify no cosmetic attacks after expiry and no fabricated HP.
- Switch character, guild, account during warm read or settlement. Verify no old board/treasury/result is rendered; server remains sole mutation authority.
- Check narrow portrait, landscape, 1.4x and 2x font scaling, TalkBack, system and game reduced motion. Verify all eight languages for localized labels and screen-close accessibility.

## Android measurement protocol (not yet measured)
Compare identical release-mode builds at pre-PR main and candidate, same device, same staging fixture, same network. Use at least 20 repetitions per case; record median and p95, not a single run.
| Metric | Collection method | Proposed acceptance target |
|---|---|---|
| Cold Raid Gate entry | navigation tap to first usable server-confirmed card | no regression from baseline |
| Warm entry | navigation tap to usable card after Guild Home preload | p95 under 500 ms on stable network |
| Start / claim | server ACK to visible pending/claimed state | p95 under 100 ms |
| Frame rendering | Android frame timeline / Perfetto, active theater | p95 within 16.7 ms on 60 Hz target device, or report device limit |
| Network | request log during a three-minute raid and settlement | no duplicate recurring settlement polls; no treasury polling faster than configured |
| Background | CPU/render trace while app backgrounded | no recurring raid FX renders |

Record handset, OS, network, build SHA, sample count, median/p95, slow frames and request counts. Use staging or local mock data only; never enable real production writes for profiling. No actual FPS or load-time results claimed until these measurements exist.

## Release gates
Latest head: all required GitHub checks, device smoke/profile, review approval. No main merge or deployment while draft.
