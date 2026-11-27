# Journal 2.0 atomic integration gate — review only

The account online save revision is the serialization boundary. The Journal must not use a character-local revision or independent post-save contribution RPC. No production table, migration or public handler is introduced by this document.

## Transaction order

1. Authenticate account and load current online save under the existing account lock. Validate request ID and canonical command fingerprint. Return a previously committed response only if its fingerprint matches.
2. Resolve the source character from the locked save before processing a roster switch. Use the canonical command resolver; never accept progress, reward amounts or entitlement scope from the client.
3. Derive staged evidence from trusted settlement results. Use one stable child ID per source receipt and item/action segment. Keep character ownership on each child. Other commands still advance the account revision even with no journal events.
4. For a quest claim, re-read immutable quest definition version, activation, evidence, migration lane, prerequisite claims and versioned reward policy inside the same lock. Verify entitlement uniqueness independently of request ID. Reject pending boss bindings and unresolved scopes.
5. Commit save, wallet, inventory/overflow, journal activation and claim records, progress counters, child evidence receipts and request response together. Any failure rolls all writes back. Do not settle journal progress from an uncommitted packet.
6. Replays return the original persisted result without applying XP, materials, gold, titles or progress again. Character deletion must not reopen an account reward entitlement.

## Storage and retention

Account request receipt identity: (account_id, request_id). Character quest entitlement: (account_id, character_id, stable_quest_id). Account discovery reward identity: existing Exploration collection entitlement, not a second journal claim. Policy version and reward hash are audit attributes, never a new entitlement key.

Use bounded per-objective counters plus durable deduplication keys; do not indefinitely grow online JSON save arrays with every kill. Keep activation revision and immutable migration lane in the authoritative quest record. Preserve partially completed legacy quests in the legacy lane until cutover. Initial character creation, deletion and parked-character claim behavior require explicit tests before schema selection.

## Exploration

Account creditedDiscoveryIds and character discoveredRouteIds are distinct. Ironwood onboarding requires both actual account discovery and this character's actual route discovery. Retained region/area access is not a discovery, nor does a timer or uncollected assignment prove one. Exact scouting assignment route IDs/status and cross-owner revision binding require the Exploration server contract to be finalized.

## Gate

Actual transactional store and rollback/retry/concurrency integration tests; authoritative source-character binding including character creation/deletion; final boss definitions and economy policy; finalized Exploration settlement; bounded persistence and retention strategy; verified mobile and backend CI. No public activation or deployment until all are met.

## Consolidated review path (passes 32–33)

Use `compileJournalCatalogueReview` for the three books plus side catalogues, `activateCatalogueQuestReview` / `applyQuestEvidenceReview` / `claimCatalogueQuestReview` for bounded state transitions, and `journalCompactViewReview` for the Journal host. Keep previous raw-event projections as independent regression references only, not a second production quest engine.

The compiled catalogue contains 45 executable story definitions and 31 side definitions, including one evidence-only account map objective. Two pending regional solo finales remain non-executable and included in displayed totals. Frostmarch story entry is deliberately blocked in this review path until Sunscar's finale is bound. Independent profession access remains with canonical skill/activity eligibility, not combat chapter completion.

The end-to-end source fixture rehearses real Asterfall content through activation, settled kill evidence, ready state, claim proposal and next objective. It also tests legacy-completed Sunscar entry, pending Frostmarch gate, and character-scoped navigation. This is not a production integration test.

Outstanding: version/hash pinning of catalogue and policy, persisted eligibility, canonical server facts across separate Exploration revisions, atomic wallet/inventory and receipt storage, full regional combat/equipment gates, mounted UI and complete CI.
