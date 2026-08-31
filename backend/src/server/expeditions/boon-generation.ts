import { LAUNCH_BOON_IDS } from './content/launch-content';
import { deterministicShuffle } from './rng';

export interface BoonOfferInput {
  secret: string;
  runId: string;
  characterId: string;
  nodeIndex: number;
  contentVersion: string;
  ownedBoonIds: string[];
  choiceCount?: 3 | 4;
  eligibleBoonIds?: string[];
}

export function generateBoonOffer(input: BoonOfferInput): string[] {
  const pool = (input.eligibleBoonIds ?? LAUNCH_BOON_IDS).filter((id) => !input.ownedBoonIds.includes(id));
  const shuffled = deterministicShuffle(input.secret, pool, input.runId, input.characterId, input.nodeIndex, input.contentVersion, 'boon-offer');
  return shuffled.slice(0, input.choiceCount ?? 3);
}
