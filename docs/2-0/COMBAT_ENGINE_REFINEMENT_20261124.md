# Combat engine refinement — hidden 2.0, 24 November 2026

- Extracted common read-only state queries and V2 tactical AI. Exact original helper bodies verified before optimization.
- Legacy Edge isolation explicitly shims the new private module; V2-only decision calls fail closed. Pure legacy targeting retains original RNG labels and order.
- Modifier accumulation preserves left-to-right floating-point addition without intermediate arrays. Threat selection preserves original earliest-cast/boss/ID/first-tie ordering without sorting candidate rows.
- Memoized ability availability, support heal plans and whole-party forecast are scoped to one actor's read-only decision AFTER cast completion; never shared across actors or effect execution. Per-boss interrupt forecasts remain separate. Damage strength/effect lookups cached only within one tactical call.
- Isolated JS checks on fetched query bodies (type annotations removed) passed 4,000 comparisons and 60 requests with three computations. New Edge shim verified 14 blocked entrypoints and legacy role predicates. Added compiled source regression and CI wiring.
- No full build, matched combat replay, production bundle parity, device profiling or balance certification yet. No generated artifacts, formulas, coefficients, public routes, deployments or release changes. GitHub DNS unavailable locally; exact-head CI required.
