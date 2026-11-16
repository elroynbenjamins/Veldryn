# Veldryn privacy policy addendum — manual chat translation

**Publication status:** Draft for the hosted Privacy Policy. This repository file does not update the public policy. Publish before enabling the chat translation release flag.

## Manual chat translation

Veldryn offers optional, on-demand translation of a selected World, Guild, Party or Live Dungeon chat message. When a player presses **Translate**, the selected message text and requested target language are sent to DeepL, a third-party translation provider. No translation request is made merely because a player opens chat or sends a message.

DeepL may process the chat content under its applicable terms and privacy notice: https://www.deepl.com/privacy. Because players can include personal information in chat, please avoid sharing sensitive details such as passwords or contact information. DeepL's own retention and international data processing practices should be reviewed separately.

Veldryn retains the original chat message and does not store the translated text in its database. Translation results may be held temporarily in device memory, not persistent on-device storage. To limit costs and prevent abuse, the service stores the requesting account ID, request count and timestamps in a private quota table, without storing any message content or translated text. Current limits are 60 requests per 24-hour account window and at least 3 seconds between requests.

Players can select **Show original** to restore the original message or avoid translation altogether by not pressing Translate.

**Release checklist:** Publish this copy on the actual Privacy Policy website linked in Settings, verify the provider agreement and privacy terms, configure and test DeepL in staging, and only then enable the app feature flag.
