# Pass 7B — type and authority reconciliation

Pinned inputs: #1847 365930b5e578f9197b1a678d6e41a89fa6001ff1; #1848 6954b04e01bb11e37c7bec615f6aec07cccae816. Four formerly overlapping paths are already byte-identical: equipment-trait-engine-runtime.ts, equipment-trait-exact-copy-adapter.ts, ability-counterplay-strategies.ts and equipment-frozen-forge-handoff-audit.ts. No copy necessary.

This Forge-lane stage retains all Forge equipment effect fields and dungeon reward event, adds Combat's optional Totem, emergency shielding, periodic and timed-modifier provenance fields. No engine behavior enabled by these declarations. Ports fresh trait authority snapshot immutability and mixed nonzero ability-damage rejection plus Combat's existing regression tests. Cross-actor copy uniqueness now explicitly checked at the fresh authority boundary. Persisted-party issuance stays on the Combat lane until ready-roster and encounter contracts are reconciled; no fresh authority can accept carried state.

Both live Edge shim allowlists and leak-test cases are combined, preserving stricter Forge rejection of V2 actor payloads and adding the same rejection to Synchronization shim. No private runtime imported; no generated bundle changed. Remaining semantic overlap: engine, unified encounter, boss matrix, persisted-party issuer. Never merge by choosing one whole engine.

## Observed CI
- #1847 Combat 2.0 skills workflow 45808999180 passed. Mobile core failures include gold-economy-costs, gathering-tools and balance-projection; no economic change attempted here.
- #1848 job 139871857527: 216 ordinary pair cases + 3 targeted cases, all 18 links now observed (15 ordinary + Mystic Harmony, Sanctified Hunt and Twilight Accord); next gate failed at persisted-party damage ratio 0.8429306526262472 (Bastion/Ravager/Knife Dancer/Stonecaller, Bellbeast, spec 1). Retain 0.85 floor and investigate during power calibration; not a release certification.
- #1848 mobile UX, gem/dungeon runtime and merge regression passed. Generated Edge parity remains failing. Exact-head checks for this stage pending.
