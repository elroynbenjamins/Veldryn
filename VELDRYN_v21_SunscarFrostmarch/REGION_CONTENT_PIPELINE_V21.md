# v21 Region Content Pipeline

v20 made published region content immutable. v21 adds the missing live routing layer.

## Lifecycle
1. Author content bundle in code/data.
2. Validate references and mechanics.
3. Generate deterministic SHA-256 content hash.
4. Stage manifest + records as draft.
5. Publish immutable version.
6. Activate that published version for its region.
7. Clients/server query the active pointer.
8. If a release has a problem, activate a previous published version. Do not edit the live payload.

Initial v21 versions:
- `sunscar-v21.0.0`
- `frostmarch-v21.0.0`

## New record types
v21 extends the existing region registry with:
- `side_quest`
- `activity`
- `achievement`
- `collection_book`
- `weather_rule`
- `region_contract`
- `boss_mastery`

## Control Center
The schema-driven Control Center gains two high-risk Owner commands:
- Activate region version
- Roll back active region version

Both require a human reason/confirmation/approval through the existing admin-command architecture. Neither command edits published content.

## Safety
- Drafts may be replaced before publish.
- Published/retired records remain immutable under v20 triggers.
- Only a published manifest matching the requested region can become active.
- Historical published versions remain available for rollback unless deliberately retired.
- No raw SQL control is exposed to the browser.
