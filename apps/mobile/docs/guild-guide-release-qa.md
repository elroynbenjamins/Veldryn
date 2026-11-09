# Guild guide release QA — Android

This is the manual device validation checklist for the five-step Guild onboarding
tour, SectionGuide '?' popups and the Home Guide Library. These checks are **not**
a substitute for CI: automated coverage runs in `mobile-ux-validation.yml`.

## Build and account coverage

Use a native Android development/internal test build with online services configured.
Do not test with a local-only mock while reporting server-backed Guild behavior.

- New member joining a Guild for the first time: tour auto-starts once.
- Existing Guild member receiving an app update: no forced tour; Start/Resume is available on Guild Home.
- Paused and restarted process: progress remains at the previous step for the same account.
- Replay after completion: restarts from Home without erasing gameplay or Guild progress.
- Switch accounts: no tutorial progress carries between accounts.
- Ordinary Member: Leadership guides are hidden, but Membership and leaving are documented under Roster.
- Leader and Officer: Leadership section is visible; warnings for tag retirement, leaving and disbanding are accurate.

## Devices and accessibility

| Android viewport | Text scale | Verification |
| --- | --- | --- |
| Small phone (320 x 640 dp) | 100% | Scrollable sections, no clipped close/confirm, no horizontal text overflow |
| Common phone (360 x 740 dp) | 100% | Five quick actions wrap cleanly, guide cards remain tappable |
| Large phone (412 x 915 dp) | 100% | Two-column topics read naturally |
| Small phone (320 x 640 dp) | 150% | Guide topic text scrolls; bottom action remains reachable |
| Common phone (360 x 740 dp) | 200% | Close, Back, and confirmation stay usable; no overlapping tabs |
| TalkBack on any phone | System default | Every '?' has a label, all topics are discoverable, selected topic is announced, Back/Close accessible |
| Android gesture navigation | Any | Android Back dismisses help and returns to Guild without losing tour progress |

For the chat overlay, open the Guild '?' help while a keyboard is visible.
Verify the keyboard dismisses, the inline panel is scrollable and does not
permanently cover the message composer. Confirm the close target is at least
44 dp high.

## Language coverage

Repeat one round of the home library and one SectionGuide popup for each:
English, Dutch, German, Spanish, Italian, French, Russian and Turkish.

- All 13 section titles, introductions, 38 topic headings and 38 topic bodies
  appear in the selected language (English remains the fallback source).
- No visible English paragraphs among translated guides.
- Long German, Russian and Turkish labels wrap or scroll without clipping.
- Numerals and deadlines remain correct: 5 check-in points, 25 per Rally Mark,
  35/70/100% tiers, 60% participation target, UTC reset, three-minute raids,
  65/35 role weighting, and project effort caps.
- Guild Bank copy explains permanent donations to released Construction/Skills,
  never refundable donations to weekly Projects.

## Behavior / non-regression

1. Finish the five-stop tour without sending chat, donating, fighting or purchasing.
2. Open Guide Library without a Notice Board; Home quick action must still exist.
3. Read and close every detailed topic using both the 'Got it' button and Android Back.
4. For a weekly boss, verify the current eligibility, attempt count, claim time and contribution panel remain visible after opening help.
5. For Guild Bank and Guild Appearance, verify real confirmation dialogs and permissions are unchanged.
6. Claim controls and server numbers are live values, not static example figures from guides.

## Sign-off

The CI checks validate TypeScript, topic/locale completeness, key numeric
thresholds and source-code accessibility/layout contracts. They **do not**
perform native Android rendering or TalkBack interactions. Record device model,
Android version, build number and screenshots for each failing case before
marking the device pass complete.

Status: **manual device execution still required**; no signed release or store
deployment is implied by a GitHub PR merge.
