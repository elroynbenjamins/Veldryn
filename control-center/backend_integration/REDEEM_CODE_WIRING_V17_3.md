# Redeem-code wiring — v17.3

The Control Center can create/disable high-entropy redeem codes, but **the admin website never grants their rewards**.

Wire `redeem-code-service-v17_3.ts` into the authenticated game API used by Account → Code Redemption.

Required flow:

1. Resolve the account from the authenticated server session. Never trust a client-supplied account UUID.
2. Normalize/hash the code on the trusted backend.
3. Reserve it with `reserve_ops_redeem_code_claim(code_hash, account_id)` using the service role / trusted DB connection.
4. Grant the returned reward bundle through VELDRYN's normal idempotent reward/receipt service using the returned idempotency key.
5. Mark the claim `granted`. On transient failure, preserve/retry the same reservation rather than creating a second claim.
6. Return only player-safe reward information.

The database stores only SHA-256 hashes and a small display hint. The plaintext code is returned to the Owner **once when created** in VELDRYN Control and is not stored for later retrieval.
