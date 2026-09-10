export type CoopErrorCode =
  | 'wrong_mode' | 'missing_role' | 'invalid_loadout_revision' | 'below_minimum'
  | 'stale_state' | 'stale_decision' | 'vote_closed' | 'invalid_option'
  | 'not_participant' | 'already_claimed' | 'idempotency_conflict' | 'reservation_conflict';

export class CoopDomainError extends Error {
  constructor(readonly code: CoopErrorCode, readonly details: Record<string, unknown> = {}) {
    super(code);
    this.name = 'CoopDomainError';
  }
}
