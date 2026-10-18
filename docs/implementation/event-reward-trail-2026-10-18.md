# Event reward trail

Implemented the approved Reward trail design in Events → Rewards using existing live-event definitions, class-specific milestones, reputation, artwork and claim IDs. Reward values and unlock rules were not changed.

## Presentation and request handling

- Compact event hero on the Rewards tab.
- Season edition from the event's scheduled start year; progress toward the next personal reward.
- Chronological connected milestones with Claimed, Ready to claim, Up next and Locked states.
- Shared seasonal artwork resolver for the shop and trail. Ready rewards alone expose claim actions.
- Claim buttons show loading and disable during requests. The existing synchronous submission guard remains; local saves are now awaited and failed online confirmation never produces success feedback.
- During claim grace, the screen shows the deadline and states that reputation earning has ended. Full-unlock and full-claim states are distinct.
- Guild cosmetics remain separate, with directions to Guild → PvE.
- New trail messages have six supported languages. Narrow event navigation now allows room for its gap so it forms two columns rather than four full-width rows; selected text and borders work in light themes.

## Verification

- Added projection and UI source-contract tests for exact thresholds, chronological order, class variants, personal/guild separation, claim-once behavior, grace/expiry, progress clamping, completion, artwork and translated placeholders.
- Browser-reviewed real production components with memory-only fixture data: confirmed pending/disabled claim state, one successful claim, rejected confirmation remaining retryable, zero-progress state, fully claimed state and post-event claim window.
- Phone-sized dark view and 321-CSS-pixel Dutch/light view checked. No horizontal overflow or escaping buttons in the narrow view.
- Full mobile TypeScript check passed.
- 203 test entries passed when rerun separately from the one failing shared accessibility contract. The full runner stopped at `Quest filter controls must use tab semantics`, concerning pre-existing/in-progress QuestScreen changes outside this task. That Quest work was not modified.
- Targeted reward-trail and shared UI-density contracts passed after final refinements.

Normal app remains on local port 8083. Isolated event preview is on 8086; it never calls online gameplay endpoints or saves accounts. No deployment, push or AAB build was performed. Physical-device font scaling/native rendering are not verified by these browser checks.
