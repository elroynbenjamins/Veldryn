# World Boss V43 — Nine-class / three-boss economy release review (hidden)

**No live balance change; no payout approval.**

## Current canonical class catalog
Nine actual Veldryn classes: 3 Tank, 4 Damage and 2 Support. The V29
read-only reference audit supplies 3 bosses × 5 CP brackets × 9 classes =
**135 distinct calibration cells**. Each cell requires at least **20
independent, legitimately verified accounts** rather than 20 combat runs
by the same account. The fixture's 2,700 attempts are synthetic and **do
not prove** any real-user fairness. V43 adds these release review checks:

- All 135 cells present once, correctly matched to the class's role.
- Each has 20+ independent accounts; empty and zero references warn/block.
- Within a boss/bracket/role, provisional median utility spread over 30%
  is flagged for a manual rebalance; survival-rate spread over 25 percentage
  points is separately flagged.
- No fake 3/3/3 distribution or automatic class-role normalization.
- `needsManualCalibration=true`, `approvedForPayout=false` regardless
  of synthetic CI fixture outcome. Real population sampling, role review and
  explicit launch authorization are required.

## Existing V28 account-wide World Sigil budget
Only authoritative source receipts contribute to the private review.
The current pre-Impact maximum for one account/event is **70**:

| Source | Account limit | Sigils per source | Maximum |
|---|---:|---:|---:|
| Verified battle survive/fail | 3 attempts | 10 / 5 | 30 |
| War Camp donations | 2 receipts | 5 | 10 |
| Global boss HP 70%/30%/0% | 3 milestones, only after 1 proven committed battle | 5 / 10 / 15 | 30 |
| **Current total** | | | **70** |
| Unapproved future personal Impact | | **Locked** | Reserved 30 of the 100 upper bound |

The V43 audit reconciles **exact source keys and exact amounts**, detects
duplicate ordinals/claims and missing or fabricated rows, and verifies
that 1 versus 5 owned characters in the same attack cannot multiply
any Sigil source. War Camp-only donors are not eligible for global
milestone income. Current wallet balance is intentionally separate from
lifetime event-earned totals, since a future shop could spend the wallet.

### Protection and scope
- No role Impact Sigils can be issued. No rates or coefficients are
  applied to live combat; new fairness spread thresholds are review alerts.
- The V43 reconciling helper trusts only the caller's *server-verified*
  evidence. It does NOT reverify replay signatures/ownership itself; the
  V28 private ledger/replay ownership joins remain required.
- Reconciliation is a check, **not a claim or currency-minting service**.
- This branch remains hidden/draft. None of the under-`docs/roadmap/` SQL
  is a Supabase migration, and neither staging nor production was mutated.
- Dedicated exact-head V43 TypeScript and disposable PostgreSQL CI must
  pass. Staging still has zero World Boss schema objects, and there are
  no real multi-character staging accounts to calibrate or exercise yet.

## Remaining release gates
Real nine-class combat telemetry/calibration, server-owned auth route
and mobile integration, production-safe migrations + rollback, independent
worker contention, account-erasure policy (#1348), and full CI/baseline
fixes (#1345). Retain all disabled flags until explicitly reviewed.
