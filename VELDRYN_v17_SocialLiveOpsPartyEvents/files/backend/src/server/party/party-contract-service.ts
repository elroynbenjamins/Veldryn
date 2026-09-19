import {
  creditContribution,
  evaluatePartyContract,
  scoreContribution,
  type AuthoritativeContributionProfile,
  type ContributionCategory,
  type PartyContractDefinition,
  type PartyContractEvaluation,
  type PartyContractMemberProgress,
} from './party-contracts';

export interface ContractContributionContext {
  contractInstanceId: string;
  accountId: string;
  sourceEventId: string;
  dateKey: string;
  profile: AuthoritativeContributionProfile;
  units: number;
  /** Trusted server snapshot for delayed outbox processing. */
  partyIdAtSettlement?: string;
}

/** Operations used while holding one (contract_instance_id, account_id) contribution lock. */
export interface LockedPartyContractRepository {
  getDefinitionForInstance(contractInstanceId: string): Promise<PartyContractDefinition | null>;
  accountIsCurrentPartyMember(contractInstanceId: string, accountId: string): Promise<boolean>;
  /** Optional v17 adapter: lets delayed settlement validate the snapshotted Party instead of current membership. */
  contractPartyId?(contractInstanceId: string): Promise<string | null>;
  contributionReceiptExists(contractInstanceId: string, accountId: string, sourceEventId: string): Promise<boolean>;
  pointsCreditedToday(contractInstanceId: string, accountId: string, dateKey: string): Promise<number>;
  progressForAccount(contractInstanceId: string, accountId: string): Promise<PartyContractMemberProgress | null>;
  allProgress(contractInstanceId: string): Promise<PartyContractMemberProgress[]>;
  /** Insert receipt + update member progress atomically in the same DB transaction. */
  commitContribution(input: {
    contractInstanceId: string;
    accountId: string;
    sourceEventId: string;
    dateKey: string;
    category: ContributionCategory;
    rawPoints: number;
    creditedPoints: number;
    completionCreditedPoints: number;
  }): Promise<'inserted' | 'duplicate'>;
  /** Must be idempotent if two different member transactions discover completion at nearly the same time. */
  markComplete(contractInstanceId: string, evaluation: PartyContractEvaluation): Promise<void>;
}

export interface PartyContractRepository {
  /**
   * Execute under a DB transaction/advisory-or-row lock that serializes contribution updates for this
   * account+contract. This is required so concurrent idle/combat settlements cannot overrun daily/share caps.
   */
  withContributionLock<T>(
    contractInstanceId: string,
    accountId: string,
    work: (locked: LockedPartyContractRepository) => Promise<T>,
  ): Promise<T>;
}

export type RecordContributionResult =
  | { ok: true; duplicate: true; evaluation: PartyContractEvaluation }
  | { ok: true; duplicate: false; rawPoints: number; creditedPoints: number; completionCreditedPoints: number; evaluation: PartyContractEvaluation }
  | { ok: false; code: 'contract_not_found' | 'not_party_member' };

/**
 * Called only from trusted server settlement paths after an authoritative combat/skill event is known.
 * The client must never be allowed to submit expectedSecondsPerUnit, difficulty, raw points, or completion points.
 */
export async function recordPartyContractContribution(
  repo: PartyContractRepository,
  input: ContractContributionContext,
): Promise<RecordContributionResult> {
  return repo.withContributionLock(input.contractInstanceId, input.accountId, async (locked) => {
    const definition = await locked.getDefinitionForInstance(input.contractInstanceId);
    if (!definition) return { ok: false, code: 'contract_not_found' } as const;
    if (input.partyIdAtSettlement && locked.contractPartyId) {
      const contractPartyId = await locked.contractPartyId(input.contractInstanceId);
      if (!contractPartyId || contractPartyId !== input.partyIdAtSettlement) return { ok: false, code: 'not_party_member' } as const;
    } else if (!await locked.accountIsCurrentPartyMember(input.contractInstanceId, input.accountId)) {
      return { ok: false, code: 'not_party_member' } as const;
    }
    if (await locked.contributionReceiptExists(input.contractInstanceId, input.accountId, input.sourceEventId)) {
      return {
        ok: true,
        duplicate: true,
        evaluation: evaluatePartyContract(definition, await locked.allProgress(input.contractInstanceId)),
      } as const;
    }

    const rawPoints = scoreContribution({ profile: input.profile, units: input.units });
    const today = await locked.pointsCreditedToday(input.contractInstanceId, input.accountId, input.dateKey);
    const existing = await locked.progressForAccount(input.contractInstanceId, input.accountId);
    const credit = creditContribution({
      rawEventPoints: rawPoints,
      pointsCreditedToday: today,
      pointsCreditedForCompletionByAccount: existing?.completionPoints ?? 0,
      contractTargetPoints: definition.targetPoints,
    });

    const committed = await locked.commitContribution({
      contractInstanceId: input.contractInstanceId,
      accountId: input.accountId,
      sourceEventId: input.sourceEventId,
      dateKey: input.dateKey,
      category: input.profile.category,
      rawPoints: credit.rawPoints,
      creditedPoints: credit.dailyCreditedPoints,
      completionCreditedPoints: credit.completionCreditedPoints,
    });
    if (committed === 'duplicate') {
      return {
        ok: true,
        duplicate: true,
        evaluation: evaluatePartyContract(definition, await locked.allProgress(input.contractInstanceId)),
      } as const;
    }

    const evaluation = evaluatePartyContract(definition, await locked.allProgress(input.contractInstanceId));
    if (evaluation.complete) await locked.markComplete(input.contractInstanceId, evaluation);
    return {
      ok: true,
      duplicate: false,
      rawPoints: credit.rawPoints,
      creditedPoints: credit.dailyCreditedPoints,
      completionCreditedPoints: credit.completionCreditedPoints,
      evaluation,
    } as const;
  });
}
