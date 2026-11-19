# Party Events V77: verified canonical chest source (hidden)

**19 November 2026. Draft only; no production/schema activation.**

- Adapt a **DB-fetched** V61 settled Party/week/roster/V14 activity/optional preparation/finale/eligible-tier proof into the shared V69 `TrustedChestSourceV69` contract. It uses the V51 source key for one of three individually earned chests and the existing V68 table for its four guarantees and original 12/16/24% base gear chances.
- Reject unearned, forged or foreign account/week/kind keys; it does not authorize the exchange key. No client-supplied activity count, party ID, odds or recipient character is trusted.
- Use the proof's **frozen character** as a *potential* equipment destination. V69 validates that character against account ownership in the current SERIALIZABLE transaction, then freezes **null** custody for an equipment miss. Previously misses incorrectly failed when the trusted source had a character destination. A hit freezes the approved character; World Boss gear retains account-unclaimed custody. Existing receipt replay happens before source lookup and remains immutable.
- V69 receipt validation additionally rejects impossible non-equipment deliveries with non-null equipment custody.
- Added V77 source denial tests and V69 guaranteed-on-miss/replay cases; wired into hidden chest CI and TypeScript project.

**Not yet delivered:** real SQL-only `readCanonicalSource` loader from installed V11/V61 tables, source receipt writers (#1388), authorized wallet/material/Party Sigil/Inbox and EQ2 item issuance, approved migrations, account erasure, PG16 two-session tests, staging and Android end-to-end QA. The V70 adapter stays unmounted; no live reward writer or production flag is enabled.
