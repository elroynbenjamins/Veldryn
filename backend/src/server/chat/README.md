# Chat moderation flow

Recommended order for every message:

1. Trim and validate max length (300 characters).
2. Check account mute/sanctions.
3. Check channel membership/permission.
4. Load enabled filter rules + allowlist from server-side cache/DB.
5. Normalize message for matching (case, Unicode accents, repeated characters, simple leetspeak, punctuation/spacing separators).
6. Apply severity action: allow, mask, block, or mute/review.
7. Apply burst/minute/duplicate-spam rate limits.
8. Log moderation using a cryptographic hash for the message in persistence; avoid retaining rejected raw text longer than operationally necessary.
9. Only then insert/broadcast an allowed or masked message.

The starter SQL only seeds a tiny English list. Production should use curated locale lists (for example English and Dutch), category/severity metadata, an allowlist, admin review, and semantic moderation for threats/harassment. A word list alone should never be treated as complete moderation.
