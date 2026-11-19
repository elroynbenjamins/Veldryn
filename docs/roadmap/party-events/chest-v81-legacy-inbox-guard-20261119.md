# Party Events V81 — legacy Inbox safety guard

**Review-only SQL, never deployed.**

The existing public Inbox claim function routes all pending
`source_kind='party'` rows to a Party Contract reward claimant.
This is incompatible with new Party Event chest notifications.
V80 therefore only writes already-paid historical, inert Inbox entries.

V81 adds a private, review-only `BEFORE INSERT OR UPDATE` trigger
for the `party-event:` source namespace. It rejects:

- any `party`, `guild`, or `dungeon` source kind used for a Party Event,
- any Party Event Inbox row without an existing `claimed_at`,
- attachments of any type or quantity (preventing a second wallet grant),
- malformed account/week/source identity, wrong historical title or body,
- updates to a prior Party Event historical Inbox row, including trying
  to clear `claimed_at` or reclassify it as a legacy Party Contract.

A **DELETE is not blocked** so account deletion can later be reconciled
without an immutability trigger blocking erasure. This draft does not
create a new source kind, alter the public Inbox claim RPC, or authorize
a new grant. It is verified in PGlite with V80 and the V70 receipt draft,
but requires a staging audit of all Inbox migrations and PG16 privilege
tests before any production consideration.

**Release decision: HOLD** — the long-term Inbox needs an approved
`party_event` category and a safe acknowledgment route with no duplicate
claim of Party Contract, Gold, resources, or equipment.
