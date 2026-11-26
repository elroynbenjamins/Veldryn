# Effect gem trigger pass 4 — damage windows and one-shot actions

Parent #1888 dde420070dd15c434d657c47a3839419104c29d1 private job 140017824664 failed strict TypeScript before tests, Flow optional abilityId not narrowed through fail helper. Correct assignment after existing guard; previous 72 cases green on #1886. Add 36 scenarios (144 total), Execution, Opening Strike, Ruin, Retaliation. Explicit candidate scope:
- Execution pre-hit HP strict below 30/35%, rank 3 +25% strength below 15%, excludes dead target/nonqualifying output.
- Opening Strike 8/10s half-open encounter window; one flagged boss phase refresh at rank 3, no overlap stacking.
- Ruin distinct authored qualifying categories, source/target scoping, fresh explicitly identified Mark counts twice for <4s at rank 3; cap 2/3.
- Retaliation actual HP damage threshold 12/10%, 8s window/ICD, one successful authored direct damaging ability consumes, not basic attack/periodic/proc, rank 3 1% max HP self-heal with existing 10s heal cooldown and no recursion.
Review decisions: half-open windows and explicit category/eligibility; future engine must provide authoritative pre-hit HP, phase flags, status identity, damage provenance and alive state. No active runtime change. Remaining four families Last Stand, Benediction, Renewal, Battle Rhythm, cross-family tests then private combat integration. CI pending, existing broader checks red; no deployment or main merge.
