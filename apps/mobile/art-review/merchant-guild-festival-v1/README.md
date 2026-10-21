# Merchant & Guild Festival — Source Art Review

This folder contains source-only concept assets prepared for the Merchant & Guild Festival. Nothing here is imported by the app, bundled into a release, or referenced by an event definition.

## Review set

| Asset | Intended later use | Content mapping |
| --- | --- | --- |
| `guild-pavilion-shop-source.png` | Guild Pavilion / event-shop background | New presentation art for the shop surface |
| `guild-pavilion-quartermaster-source.png` | Shop host portrait | New presentation art for the shop surface |
| `emote-guild-greeting-source.png` | Reward emote | `emote_guild_greeting` |
| `emote-guild-salute-source.png` | Shop reward emote | `emote_guild_salute` |
| `emote-contract-stamp-source.png` | Discovery reward emote | `emote_contract_stamp` |

## Art direction

The shop background establishes the Guild Pavilion as a real trading place: cobalt guild cloth, antique-gold heraldry, warm lanterns, ledgers, scales, and a caravan. The quartermaster and emotes use the same blue, gold, parchment, brass, and lantern palette. The character treatment follows the existing compact, outlined collectible portraits used by the Merchant & Guild Festival pets and Caravan Sentinel.

## Before integration

1. Art-direction review and any requested paintovers.
2. Export runtime variants at the actual target dimensions and verify their alpha edges on dark and light UI cards.
3. Add the assets to the appropriate event-art source module and map them to the existing reward IDs.
4. Wire them only when the Merchant & Guild Festival is approved for release; its event schedule remains disabled during closed testing.
