# Pet Luck Event Shop offer — backend rollout requirement

## Observed mismatch

- The mobile Event Shop displays the prestige offer `prestige_candy_pet` (two prestige currency, five purchases per event).
- Canonical shared gameplay code and `apps/mobile/tests/event-prestige-supplies.ts` recognize and purchase this ID; the Pet Luck candy is stored as `<event-id>:candy:pet`.
- On 2026-11-02, production Supabase `gameplay` function metadata identified deployment version 37 with an update timestamp of **2026-10-26 19:30:37 UTC**, predating the 2026-10-30 Pet Luck offer code. Staging function was also an older deployment.
- The resulting server response `Unknown event-shop offer.` indicates the authoritative backend does not recognize the requested offer ID. The client cannot repair this by renaming the offer or charging currency locally.

## Safe correction

1. Confirm minimum supported Android version and current production migrations are compatible with the latest gameplay runtime. **Do not deploy the current bundle until compatibility checks are green.**
2. Regenerate/verify the canonical bundle with `pnpm --dir backend build:online` and `node tools/verify-gameplay-edge.mjs`. Run the mobile and backend online/event tests, including `event-prestige-supplies`.
3. Deploy the vetted `backend/supabase/functions/gameplay/index.ts` to **isolated staging** using the existing authenticated release process. Keep the production function's existing JWT setting and secrets behavior.
4. Using dedicated staging accounts, purchase `prestige_candy_pet` once through the real gameplay command path. Verify exactly one 2-prestige deduction, exactly one `<event-id>:candy:pet` charge, one increment to `eventShopPurchaseCounts`, idempotent replay of the same request ID, rejection of a sixth purchase, and no change to other players' accounts. Verify a purchase of a previously supported offer as well.
5. After approval of the staging result and a rollback path, deploy the **same verified bundle** to production. Confirm function version updated and repeat a read-only production health check; validate a normal purchase only using a dedicated authorized test account.
6. Record the new deployed function version, exact repository commit and production release date. The UI-only purchased-status update requires a new Android build; a deployed compatible gameplay backend can fix the offer for existing clients that already show it.

**Do not update purchase totals, wallets or candy charges with direct SQL to work around this error.** An unrecognized offer should reject before any wallet mutation. Repeated uncertain requests must retain their original idempotency receipt; do not bypass the gameplay endpoint.

## UI behavior until rollout

The shop now displays an account-scoped **OWNED** or **LIMIT REACHED** badge and a purchased count, rather than implying global stock is sold out. A server `Unknown event-shop offer` rejection is explained as a temporarily unsupported gameplay-server offer; it does not claim a successful purchase.
