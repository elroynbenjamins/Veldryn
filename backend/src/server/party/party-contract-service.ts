/** Repository contract used by the v17 social contribution router. */
export type RecordContributionResult =
  | { ok: true; duplicate: boolean; rawPoints?: number; creditedPoints?: number; completionCreditedPoints?: number; evaluation?: unknown }
  | { ok: false; code: 'contract_not_found' | 'not_party_member' };
