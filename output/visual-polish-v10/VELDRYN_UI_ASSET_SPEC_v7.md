# VELDRYN Journal rewards v7

QuestReward is a native layout component with props gold, optional xp, optional itemId, quantity (default 1), and label (default Rewards). ItemArtwork resolves the existing transparent PNG/atlas assets at 40dp. Keep the item name and quantity as native text, allow them to wrap, and preserve the image aspect ratio. Currency text wraps within its row. The reward preview is not an action.

Use a quiet navy inset surface, 12dp padding, 12dp image-to-text spacing and the shared medium radius. Gold uses the established warm accent; XP uses the information blue. Completed chapter panels use the shared green accent with a subdued dark background. Status remains explicit in text.

Contract heading rows wrap and allow names a 180dp basis. Do not force rarity badges into the name's text line. Claim/navigation controls retain the existing GameButton behavior.

For earlier asset densities, transparency, slicing and generation prompts, see the versioned v4–v6 specifications. No new PNG assets or fonts are added by v7.
