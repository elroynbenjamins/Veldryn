# Google Play Billing v1

VELDRYN uses Google Play Billing for Android purchases. Prices are owned by Google Play Console and are never hardcoded in the app.

## Product catalog

Create these products exactly:

| Play product ID | Type | VELDRYN behavior |
| --- | --- | --- |
| `vip` | One-time / non-consumable | Permanent VIP entitlement |
| `vip_plus` | One-time / non-consumable | VIP + VIP+ combined purchase; includes both permanent tiers |
| `vip_plus_upgrade` | One-time / non-consumable | Permanent upgrade for accounts that already own `vip` |
| `supporter_monthly` | Subscription | Supporter entitlement while the paid subscription remains active |

For `supporter_monthly`, create the auto-renewing base plan with base plan ID `monthly`.

Set the default and per-country prices entirely in Play Console. The mobile app queries Google Play and displays the localized `displayPrice` / subscription offer price returned for the signed-in Play account.

Agreed EUR reference prices (configure in Play Console, not in client code):

| Product | EUR reference | Frequency |
| --- | --- | --- |
| VIP (`vip`) | 4.99 | Once |
| VIP+ Upgrade (`vip_plus_upgrade`) | 9.99 | Once, requires purchased VIP |
| VIP + VIP+ (`vip_plus`) | 14.98 | Once, for players owning neither tier |
| Supporter (`supporter_monthly`, base plan `monthly`) | 2.99 | Monthly |

Keep the existing `vip_plus` product ID: changing its display name to the combined purchase preserves restores for existing owners. Do not create a second full-tier SKU. Existing VIP+ owners retain both tiers. VIP owners see only the incremental upgrade; all owned tiers are disabled. Complimentary test VIP access is not a verified Google Play VIP purchase and does not satisfy the existing database upgrade prerequisite.

These are desired catalog settings, not evidence that Play Console has been configured. Confirm each localized checkout price on-device before accepting purchases.

There are no ad products, no ad-removal product, no paid premium currency, and no paid PvP/ranking power.

## Security model

- A recoverable VELDRYN account is required before checkout. Anonymous guest accounts cannot purchase.
- Before checkout, the server creates a SHA-256 obfuscated account ID and registers it to the VELDRYN account.
- The `prepare` action refreshes known purchases and checks ownership/prerequisites before opening checkout. Deploy the updated `play-billing` function before the updated mobile build. This preflight is not a replacement for post-purchase verification or database enforcement.
- That ID is passed to Play Billing as `obfuscatedAccountId`.
- The client sends only the purchase token/product identity to the `play-billing` Edge Function.
- The server calls Google Play Developer API and grants access only from Google's authoritative purchase state.
- Purchase tokens are the database primary key. Order IDs are stored only as metadata.
- The verified Google purchase must contain the expected obfuscated VELDRYN account ID before a client verification/restore can bind it.
- VIP/VIP+ are permanent only while their one-time Google purchase remains valid; refunds/revocations can revoke them.
- A `vip_plus_upgrade` purchase grants VIP+ only while the same account still has verified `vip`.
- Restore processes VIP before its upgrade, regardless of the order returned by Play. Pending purchases are not counted as restored access. Status refresh fails visibly on upstream errors rather than reporting a successful refresh of stale ownership.
- Supporter is active only for valid paid subscription states and a future expiry timestamp.
- Purchase acknowledgement is performed server-side after entitlement grant.
- RTDN is authenticated with Google Pub/Sub OIDC and then revalidated against Google Play Developer API.
- Successful Pub/Sub message IDs are retained to suppress duplicate RTDN work.
- Voided purchase RTDNs revoke/refetch the affected entitlement.

## Google Play Developer API service account

1. Create or select a Google Cloud project.
2. Enable **Google Play Android Developer API**.
3. Create a service account.
4. In Play Console **Users and permissions**, invite that service account.
5. Grant the billing API permissions required by Google:
   - **View financial data, orders, and cancellation survey responses**
   - **Manage orders and subscriptions**
6. Create a JSON key for the service account and store it only as a Supabase secret. Do not commit it.

Required Supabase secrets:

```text
GOOGLE_PLAY_PACKAGE_NAME=com.elroybenjamins.veldryn
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<complete service-account JSON>
GOOGLE_PLAY_RTDN_AUDIENCE=https://nyjwigipamnvpdvpauuv.supabase.co/functions/v1/play-billing-rtdn
GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL=<Pub/Sub push service-account email>
```

The Edge Functions also use the normal Supabase server secrets (`SUPABASE_URL` and a service-role/secret key) and public/publishable key supplied by the Supabase runtime.

## Real-time Developer Notifications

In Google Play Console, configure RTDN to publish **subscriptions and one-time products** to a Google Cloud Pub/Sub topic.

Create a Pub/Sub push subscription targeting:

```text
https://nyjwigipamnvpdvpauuv.supabase.co/functions/v1/play-billing-rtdn
```

Configure authenticated push delivery with a dedicated service account:

- OIDC token enabled.
- Audience set exactly to the Edge Function URL above.
- The service-account email must match `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`.

The RTDN handler accepts subscription, one-time product, voided-purchase, and Play test notifications. It does not trust the notification as the purchase state; normal purchase/subscription events are re-fetched from Google.

## Deployment order

The billing migration depends on the existing VIP/Supporter entitlement migration. Deploy repository migrations in their normal timestamp order, including:

```text
20261028000010_vip_supporter_name_styles.sql
20261028000020_google_play_billing_v1.sql
```

Then deploy:

```text
play-billing
play-billing-rtdn
```

Do not deploy the billing functions before the database functions/tables they call are present.

## Android build

The app uses `expo-iap` 5.6.3 and its Expo config plugin. Native Play Billing is not available in Expo Go. Test with an EAS development/internal build installed through a Play testing track when validating real products.

## Required Play test pass

Use Play license testers and an internal testing track. Verify at minimum:

1. VIP purchase: localized price -> purchase -> server verification -> permanent entitlement -> restore after reinstall.
2. VIP + VIP+ combined purchase for a non-VIP account; confirm the combined price and both permanent tiers.
3. VIP -> `vip_plus_upgrade` path, including rejection if the account lacks VIP.
4. Supporter purchase on the `monthly` base plan.
5. Supporter renewal RTDN keeps entitlement active.
6. User cancellation keeps Supporter until paid expiry.
7. Grace period stays active.
8. Account hold / pause / expiry removes Supporter.
9. Pending payment grants no entitlement until Play reports PURCHASED.
10. One-time refund/revocation removes VIP/VIP+ entitlement.
11. Restore on the correct VELDRYN account succeeds.
12. Restore on a different VELDRYN account is rejected by the obfuscated-account binding.
13. Duplicate RTDN message IDs are harmless/idempotent.
14. RTDN test notification returns successfully.
15. VIP+ owners cannot repurchase either tier; VIP owners see the upgrade instead of the combined product.
16. Cancel checkout: no entitlement, neutral cancellation notice, checkout can be retried.
17. Close the app during a pending payment; reopen the Account purchase panel after approval and verify recovery. Also check payment decline.
18. Switch VELDRYN accounts while a refresh/restore is in flight: no ownership or result from the previous account may appear on the new account.
19. Expired/cancelled Supporter can still open Manage Supporter. Active access shows an access-until date, not a claimed renewal date.
20. Restore with upgrade returned before VIP; refund VIP afterward and verify the dependent upgrade stops granting access.

## Local readiness pass (2026-09-27)

- `node tools/test-play-billing.mjs` runs the real Edge handler and Google response parser with in-memory database and HTTP fakes. Covers preflight, restore order, pending completion, acknowledgement, repeated restores, refunds, account binding, failed upstream refreshes and subscription states. It does not validate live SQL, credentials, RTDN delivery or real Play checkout.
- `node tools/run-mobile-tests.mjs commerce-purchase-readiness vip-supporter-entitlements player-badges queue-continuation` covers client purchase rules, presentation, benefits, badge contracts and offline queue behavior.
- Real-device Play testing and production deployment have not been performed in this pass. No Play Console prices were changed.
- Use registered license testers and test payment methods before the planned user reset. An internal test track alone does not prevent real charges. Keep test accounts separate from real paid accounts and confirm the reset policy before accepting real payments.
- Official test procedure: https://developer.android.com/google/play/billing/test
- Official billing integration/lifecycle guidance: https://developer.android.com/google/play/billing/integrate

## Privacy/data note

Google Play handles the payment transaction and localized price/currency. VELDRYN's backend stores the minimum purchase state needed to operate entitlements: purchase token, product ID/type, Google state, order ID when present, account binding hash, expiry/renewal/acknowledgement metadata, and test/region/offer metadata. It does not store Play payment-card details.
