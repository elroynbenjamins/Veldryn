# Manual chat translation (1.0.10 candidate)

A player taps **Translate** on one chat message. The app sends only its UUID and the player's selected game language to the authenticated Supabase Edge Function. The function reads the existing \`public.chat_messages\` row with the **user's JWT**, so World/Guild/Party/Live party RLS continues to protect channel membership and blocks. Only then does it forward that message body to DeepL. Neither the service nor the client persists translated text server-side; original messages remain unchanged.

- All 8 in-game languages are accepted as translation targets.
- No automatic translation, channel-wide toggle, raw-text client endpoint, or translation at message send time.
- The \`private.chat_translation_quota_v1\` migration enforces 60 requests per user per 24h with a 3-second cooldown; guest Auth users count separately. Run this migration before deploying the function.
- A small per-account in-memory cache on mobile avoids repeat charges for Show original / Translate toggles.
- Edge function deployment must keep \`verify_jwt=true\` (or equivalent user authentication plus RLS forwarding). It needs a server-only \`DEEPL_API_KEY\` Supabase secret. Set \`DEEPL_API_TIER=pro\` for paid DeepL API; default is Free.
- Deploy first to staging, verify access denied for non-members, guest user translation, 8 targets, provider errors, and quota errors. **Do not enable in production without a configured provider key and a passed staging smoke test.**
- DeepL receives the message body only after the player presses Translate. Private messages are processed by DeepL for translation, so inform players in the privacy notice before release.
