# Veldryn release-note writing standard (1.0.14 onward)

Every request to prepare What's New or Google Play release notes follows this standard. Prepare all three outputs together from one verified, version-specific change inventory. The signed release commit and deployed server changes are authoritative, not open PRs, roadmap ideas or previous draft claims. Distinguish client changes, deployed backend changes and scheduled event availability; never announce hidden 2.0 features or private entitlements.

## Update Highlights (in-game What's New)
- 5–8 short, player-friendly bullets, each ideally one sentence and no more than 200 characters. Lead with meaningful new content, then gameplay, QoL, fixes and performance.
- Readable in 30–60 seconds; avoid internal implementation jargon, PR numbers, exhaustive balance tables, and repeated items.
- Use concrete benefits and exact event dates when verified. Clearly mark upcoming events.
- This remains the automatic post-update announcement. Do not claim unpublished changes are live.

## Detailed Patch Notes (in-game)
- Include every verified player-relevant change, grouped under applicable categories in this order: Loot & Drop Rates; Economy & Gold; Combat & Skills; Crafting & Gathering; Equipment & Companions; Content & Events; UI & Quality of Life; Server & Performance; Bug Fixes.
- Use explicit affected item/skill/monster/tier and old → new values with units for numeric changes: drop probabilities, sell prices, reward gold, costs, XP, cooldowns, stats, caps and timers. Separate percentage-point changes from relative percentages; do not confuse a 5% → 3% chance with a 2% relative decrease.
- State the old and new values only when verified from the actual previous and new configurations. If a number cannot be verified, describe the confirmed qualitative change and flag the missing value in the internal review, not as invented public detail.
- List individual meaningful server optimizations and fixes in plain language; do not claim benchmark improvements without evidence. Distinguish pending deployment from shipped behavior. Do not disclose exploitable internals, credentials, or personal data.
- Use concise standalone bullets (maximum 500 characters each), no empty categories, no duplicate entries; split long entries. Historical releases without detailed notes fall back to their original highlights. No fabricated retroactive notes.

## Google Play (en-US)
- Plain text, player-facing, maximum 500 characters including spaces and line breaks. Count the exact output before delivery; do not include the count inside the copyable text.
- Prioritize the most important new features and benefits; keep short bullets or concise sentences, no Markdown syntax, unsupported superlatives, exhaustive numerical changes, or internal engineering terms.
- Event dates and availability must match the verified release schedule. Keep the same facts as the in-game notes.
- When returning notes to the owner, provide three separately labeled copy-ready outputs and report the Google Play character count outside the text. When requested for Discord, use Discord-compatible Markdown separately.

## Publication format
Keep one public `app_release_notes` row per platform/version. Its existing JSONB `highlights` array remains backward compatible: 5–8 string highlights, followed by exactly one tagged object containing the detailed categories. Older clients already filter non-string entries; newer clients parse the tagged object independently. Do not replace the array with an object or add fake notes to live records. Example shape (illustrative values only):

```json
[
  "Improved material rewards and economy balancing.",
  {
    "kind": "detailed-patch-notes-v1",
    "sections": [
      {"category": "Loot & Drop Rates", "entries": ["Example material: 5% → 3% drop chance."]},
      {"category": "Economy & Gold", "entries": ["Example material: 250 → 150 gold sell value."]}
    ]
  }
]
```

Draft notes remain unpublished until the exact version is approved; preserve publication gating and existing RLS. Review source evidence and test legacy and new clients before publishing. Do not modify previous published records simply to add the new format.
