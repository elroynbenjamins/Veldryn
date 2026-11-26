# Pass 7C — assembly and engine boundary preparation

Pinned Forge #1849 fd01101b97b738feb3e666d76403ddd163bfdf94; Combat #1848 6954b04e01bb11e37c7bec615f6aec07cccae816; ancestor 8342be1cedcff2d735df9517e667bd2a78d30bd2. Both engines reserve the fourth positional parameter for different authorities (Dungeon Reward versus Synchronization); the fifth is Private Hit versus AI policy. Do not union by positional substitution.

This step extracts shared query helpers into combat-state-query.ts, preserving Forge DoT-only targeting until actual V2 debuff cleanse behavior is ported, and ports allocation-free modifier and threatened-target selection. Adds a named server-only authority handoff for new assembly callers; existing positional API stays compatible. Unknown channels are rejected, and Synchronization remains deliberately unavailable in this wrapper until its genuine issuer/runtime is integrated.

Ports common actor assembly, rejecting duplicate characters/actors/item copies. Personal-stat stages, final ceilings and marginal contributions are reconciled with Combat's implementation. Candidate weighted attribution uses the trained after-skills baseline, requires explicit weights, and remains QA-only. Dungeon reward overlay remains separate from personal stats; no scaling or balance coefficients changed. Regression tests cover final ceilings, reconstruction, duplicate custody, named-channel rejection and unchanged replay. Class-only solo persistence fixture adjusted.

Prior #1849 skills, trait engine, private expanded integration, private conditional and dungeon reward QA passed. Combat #1848 observed all 18 links, but persisted-party damage ratio 0.8429306526262472 remains below 0.85. No threshold relaxation.

Still required: merge actual tactical AI, Sync, Forge/dungeon hook ordering and persisted-party authorities; port debuff resolution and matching query behavior together; reconcile exact-copy boss matrix and all caller contracts; verify both generated Edge bundles and mobile regression. Do not call this a unified engine yet. No main merge, SQL, production flags, deployment or CP approval.
