# Google Play Billing v1

VELDRYN uses Google Play Billing for Android purchases. Google Play Console owns all prices; the app displays the localized product or subscription-offer price returned by Play. This document does not assert any configured Console price.

## Current product catalog

The application, purchase-verification function and live database use these exact IDs:

| Play product ID | Type | VELDRYN behavior |
| --- | --- | --- |
| `vip` | One-time / non-consumable | Permanent VIP access while the purchase remains valid |
| `vip_plus` | One-time / non-consumable | Permanent VIP+ access while the purchase remains valid; independent of VIP |
| `supporter_monthly` | Subscription | Supporter access while the verified subscription remains active |

For `supporter_monthly`, use the auto-renewing base plan ID `monthly`. The Android package is `com.elroybenjamins.veldryn`.

VIP and VIP+ can be bought separately and stack when both are active. Buying VIP+ does not grant VIP, and VIP is not a prerequisite for VIP+. A refund of one tier does not remove an independently owned other tier. There is no active bundle or upgrade product. The retired `vip_plus_upgrade` ID is rejected before checkout and purchase recording; do not recreate or advertise it.

Set default and regional prices in Play Console. Product metadata loading on a device proves that Play returned those products, but does not prove that VELDRYN's verification function, service account or notification delivery is configured.

There are no ad products, ad-removal product, paid premium currency, or paid PvP/ranking power.

## Owned and active benefits

The shop reads `commerce_entitlements_self_v1` directly for the signed-in account, independently of the Play billing Edge Function. This effective entitlement source combines valid Google Play purchases and redeemed promotional grants. A redeemed code does not need a Google Play purchase record to show ownership.

- VIP and VIP+ show **Owned** independently when their corresponding entitlement is active; their buy actions are disabled.
- Supporter shows **Active** for either a valid subscription or an active promotional grant, including lifetime grants.
- A finite Supporter expiry is an access-until date, not a promise of renewal. Active access with no expiry does not imply that the player has a recurring Play subscription.
- Ownership that has not yet been confirmed shows a checking/status state. A Play service failure does not replace already confirmed benefits with false values.
- Gameplay entitlement state is refreshed through its server-owned path. The shop does not submit paid flags as a generic gameplay edit.

Every entitlement/billing request pins the access token captured for its VELDRYN account. The client checks the account again after awaiting the response and rejects results that arrive after account switching or sign-out. Response validation requires actual boolean flags and valid expiry data; malformed payloads cannot create access.

## Purchase and security model

1. Checkout requires a recoverable VELDRYN account. Anonymous guests cannot purchase.
2. The server verifies the caller with Supabase Auth, creates a SHA-256 obfuscated account ID and registers the account link. The app passes that ID to Play as `obfuscatedAccountId`.
3. Billing `context` returns account entitlements and a separate `checkoutAvailable` flag. Missing or malformed Google service-account configuration leaves account benefits readable and disables checkout.
4. `prepare` validates service-account signing/OAuth, refreshes known purchases and checks ownership before the native payment sheet opens. Missing verification credentials fail closed before a new payment. This preflight does not prove Android Publisher permissions for the app and does not replace verification of the resulting purchase.
5. The client supplies purchase-token/product evidence. The server calls Google Play Developer API, checks the returned product and obfuscated account binding, then records the authoritative state. A client-supplied token alone grants nothing.
6. Purchase acknowledgement occurs server-side after recording the entitlement. Pending payments receive no active entitlement or successful-restoration count until Google reports completion.
7. Restore is independent of purchase order. Purchase tokens are unique database keys, so repeated callbacks/restores do not create duplicate purchases. A token already bound to another VELDRYN account cannot be reassigned by a client restore.

One-time refunds/revocations can remove the corresponding entitlement. Supporter requires a supported active subscription state and a future expiry; cancellation retains access only until the paid expiry. Hold, pause and expiry remove subscription access. An independent promotional grant can still provide access.

Status refresh reports upstream errors instead of claiming that stale purchase state was freshly verified. Public error messages are mapped to safe player guidance. Startup diagnostics identify missing configuration key names only; credentials, purchase tokens and arbitrary server error bodies must not be logged or displayed.

### Edge authentication configuration

Both entries in `backend/supabase/config.toml` use `verify_jwt = false` because authentication is performed inside their handlers:

- `play-billing` verifies every bearer token with Supabase Auth `getUser(jwt)` and rejects missing, invalid or anonymous users before privileged commerce work. Disabling gateway JWT verification does not make purchase APIs public.
- `play-billing-rtdn` accepts Google Pub/Sub OIDC tokens, verifies their signature, issuer, expiry, audience and approved service-account identity, and then revalidates purchase state with Google. Missing RTDN authentication configuration fails closed before downloading signing keys or accessing commerce data.

## Google Play Developer API service account

1. Create or select a Google Cloud project and enable **Google Play Android Developer API**.
2. Create a service account and invite it through Play Console **Users and permissions** for the VELDRYN app.
3. Grant the billing permissions documented by Google: **View financial data, orders, and cancellation survey responses** and **Manage orders and subscriptions**.
4. Create a JSON key and store it only as the Supabase secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Do not put it in Git, the mobile app, screenshots or diagnostic output.

Required server configuration:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<complete service-account JSON>
GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL=<Pub/Sub push service-account email>
```

`GOOGLE_PLAY_RTDN_AUDIENCE` is optional for the standard endpoint. If absent or blank, the handler derives its single expected audience from the trusted `SUPABASE_URL` origin plus `/functions/v1/play-billing-rtdn`. The base must be an HTTPS origin with no credentials, path, query or fragment; a normal trailing slash is accepted. No request URL, header or token claim can change the expected audience. A nonblank explicit override takes precedence and must exactly match the Pub/Sub subscription's audience, including any custom domain or path.

`GOOGLE_PLAY_PACKAGE_NAME` is optional and defaults to `com.elroybenjamins.veldryn`; any override must match the actual Play package. The Supabase runtime must also supply `SUPABASE_URL`, the normal service-role/secret key, and public/publishable key. Privileged keys stay on the server.

The context readiness flag checks configuration presence/shape without contacting Google. The prepare action additionally tests signing/OAuth. Neither substitutes for verifying the service account's Play app permissions and completing the authorized Play test pass below.

## Real-time Developer Notifications

Configure Google Play RTDN to publish **subscriptions and one-time products** to a Google Cloud Pub/Sub topic. Create an authenticated push subscription targeting:

```text
https://nyjwigipamnvpdvpauuv.supabase.co/functions/v1/play-billing-rtdn
```

Enable OIDC delivery with a dedicated push service account. Use the URL above as its audience, or leave the Pub/Sub audience unset so Google uses that push endpoint URL by default. Set `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` to the push account's email; it remains required. For a custom audience, also set the matching `GOOGLE_PLAY_RTDN_AUDIENCE` override in Supabase. The notification sender and Google Play Developer API service account have different responsibilities; configure each explicitly.

The handler supports subscription, one-time product, voided-purchase and Play test notifications. Ordinary purchase/subscription notifications trigger Google verification; their payload is not accepted as proof of active access. Successful Pub/Sub message IDs are retained to suppress duplicate work. Voided purchases revoke or re-fetch the affected purchase. Configure the topic's Google Play publisher permission and test authenticated push delivery using Google's documented procedure.

## Database and deployment order

The relevant migration chain includes:

```text
20261028000010_vip_supporter_name_styles.sql
20261028000020_google_play_billing_v1.sql
20261028000040_complimentary_commerce_codes.sql
20261028000070_independent_vip_plus.sql
20261028000080_remove_vip_upgrade.sql
```

Follow the repository's complete normal migration order for a new database; this list only identifies the main commerce dependencies.

The `...70_independent_vip_plus` and `...80_remove_vip_upgrade` files were recovered from already-applied production migration history on 2026-10-04. They restore the missing repository source for the live independent-tier contract. **Do not reapply them to production merely to repair a missing Edge Function.** Inspect linked migration history first. Fresh environments need the complete chain so that their catalog and entitlement rules match production.

After verifying that the required database functions/tables and secrets exist, deploy both `play-billing` and `play-billing-rtdn` with the repository authentication settings. Function deployment is separate from applying SQL migrations. Deploy the matching backend before releasing the mobile changes, then verify authenticated context, checkout readiness, and notification configuration without exposing credentials.

## Android build

The app uses pinned `expo-iap` 5.6.3 with its Expo config plugin. Native Play Billing is unavailable in Expo Go. Validate real products with an Android build installed through the appropriate Play testing track.

The owned/active shop presentation and transport changes require a new Android app build. The current app configuration has no Expo Updates delivery path. The accompanying profile-appearance fix also ships in that build: presentation-only icon/background/border/title/pet changes no longer trigger the gameplay reward-progress popup, while actual progression commands retain their feedback.

## Verification — 2026-10-04

Completed focused local checks:

- `node tools/test-play-billing.mjs` — passed. Runs both actual Edge handlers and the Google parser with isolated in-memory database/HTTP fakes. Covers credential readiness and safe errors, missing webhook authentication, independent tiers, retired-product rejection, pending completion, acknowledgement, duplicate restores, refunds, upstream outages, account binding and nine subscription lifecycle cases. Signed OIDC webhook tests also cover Play Store resubscription after expiry, ownership persistence after acknowledgement, conflicting ownership evidence, wrong callers and unknown-owner retries.
- `node tools/test-play-billing-transport.mjs` — passed all 11 groups. Runs the actual mobile transport with a Supabase fake. Covers independent entitlement reads, pinned Authorization, account switches/sign-out, same-account token refresh, strict response validation, checkout availability, safe diagnostics and purchase evidence filtering.
- Both Edge entrypoints passed a strict TypeScript check against the installed Supabase 2.115.0 types with a local declaration for Deno's runtime globals.

Production deployment to `nyjwigipamnvpdvpauuv` on 2026-10-04:

| Function | Version | Verification |
| --- | --- | --- |
| `gameplay` | 12 | Active; missing and invalid bearer tokens return 401. Generated change is limited to independent VIP calculation and the fully upgraded QA fixture. |
| `play-billing` | 1 | Active; deployed entrypoint and dependencies match reviewed source; missing and invalid bearer tokens return 401; OPTIONS returns 204. |
| `play-billing-rtdn` | 1 | Active; deployed entrypoint and dependency match reviewed source; requests fail closed because `GOOGLE_PLAY_RTDN_AUDIENCE` is not configured. |

The production database already had the billing RPCs and independent product constraints. Neither billing Edge Function was deployed before this repair. No migration replay was needed. A read-back confirmed that the tested redeemed account still has VIP, VIP+ and Supporter. The security-advisor comparison added no findings.

The initial deployment was blocked by the missing audience setting. The 2026-10-05 follow-up below supersedes that configuration finding. Do not interpret deployment or an unauthenticated probe as a successful paid-purchase or notification-delivery test.

Full mobile typecheck, the `test:pre-codex` smoke gate, backend typecheck/build and online typecheck passed. The focused ownership, entitlement, appearance feedback and name-style persistence tests passed. Both billing suites are registered in mobile CI, and the new command-progress test is registered in the core manifest. CI results are reported on the change's pull request.

The focused tests do not prove live Google credentials, Play app permissions, RTDN delivery, native checkout or real billing success. No real payment was made and no Play Console price was changed by these tests.

Useful integrated client checks include `commerce-purchase-readiness`, `vip-supporter-entitlements` and `command-progress-feedback` through `tools/run-mobile-tests.mjs`, plus the full mobile typecheck. Keep the test claims separate from any outstanding CI or device checks.

## RTDN audience follow-up — 2026-10-05

Deployed `play-billing-rtdn` version 2 to `nyjwigipamnvpdvpauuv`. Both deployed files match the reviewed source; the handler entrypoint is unchanged. The shared Google implementation now derives the standard audience when no override is set, while preserving the exact audience, Google signature, issuer, expiry and configured sender checks.

The shared module passed strict TypeScript validation. The extended `node tools/test-play-billing.mjs` suite passed default/explicit audience, invalid origin, missing sender, signed-token rejection and request-header isolation cases, alongside the existing billing/ownership tests. Configuration failures were verified to occur before network or database access.

The production probe at **2026-10-05 07:58:12 UTC** passed audience resolution and returned `Missing server secret: GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`. Startup diagnostics from that same version reported `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` as missing or invalid, without logging their values. The JSON diagnostic means the credential is absent or fails basic parsing/shape validation; it does not distinguish those cases.

**Remaining production setup:** configure the actual authenticated Pub/Sub sender email and supply a valid Google Play service-account JSON credential through Supabase Secrets, then verify the Play permissions and real notification delivery. The normal endpoint no longer requires `GOOGLE_PLAY_RTDN_AUDIENCE`. No mobile/AAB change is needed for this server repair.

## Required Play test pass

Use registered Play license testers and test payment methods; an internal track alone does not prevent real charges. Verify:

1. VIP purchase: localized price, checkout, server verification and restoration after reinstall.
2. VIP+ purchase without VIP: VIP+ active and VIP inactive; buying VIP later activates both independently.
3. Each owned permanent tier is disabled; the other tier remains purchasable when eligible. The retired upgrade cannot start checkout.
4. Redeemed VIP/VIP+/Supporter grants show Owned/Active without any Play transaction. Lifetime Supporter shows no invented renewal date.
5. Supporter purchase on the `monthly` base plan, renewal RTDN, cancellation until paid expiry, grace period, hold, pause and expiry. Also resubscribe through the Play Store after expiry: Google supplies temporary `outOfAppPurchaseContext` instead of a linked token. Both handlers resolve only verified Google identifiers against known account links, reject conflicting evidence, and record the canonical owner before acknowledgement removes that temporary context.
6. Pending approval/decline, closing the app during payment, and recovery after reopening. No pending payment grants access.
7. Refund/revocation of each permanent tier leaves the independently owned other tier intact.
8. Restore on the bound VELDRYN account succeeds; restore on a different account fails. Repeated restore and duplicate RTDN remain harmless.
9. RTDN test delivery succeeds with the configured Google identity; invalid audience, sender, signature or missing configuration is rejected.
10. Cancelled checkout shows a neutral notice and can be retried. Supporter management remains available for expired/cancelled subscriptions.
11. Switching VELDRYN accounts during load, purchase verification or restore cannot display the previous account's result.
12. A billing-service outage leaves confirmed owned/active benefits visible, explains the purchase-service problem, and prevents an unverified new checkout.
13. Profile-appearance edits do not show reward-progress popups; actual gameplay rewards still do.

## Privacy/data note

Google Play handles payments and localized prices/currencies. VELDRYN stores the purchase state required to operate entitlements: purchase token, product identity/type, Google state, order ID when present, account binding, expiry/renewal/acknowledgement state, and test/region/offer metadata. It does not store payment-card details.

## Official references

- [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started)
- [Google Play billing testing](https://developer.android.com/google/play/billing/test)
- [Google Play billing integration and lifecycle](https://developer.android.com/google/play/billing/integrate)
- [Subscription resubscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
- [Subscription purchase API and out-of-app context](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2#OutOfAppPurchaseContext)
- [Real-time Developer Notifications](https://developer.android.com/google/play/billing/rtdn-reference)
- [Pub/Sub authenticated push](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
- [Pub/Sub OIDC audience default](https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions#OidcToken)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [OpenIAP purchase request contract](https://openiap.dev/docs/apis/request-purchase)
