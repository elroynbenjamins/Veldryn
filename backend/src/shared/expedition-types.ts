import type { ExpeditionTier } from '../server/expeditions/constants';

export type ExpeditionStatus = 'active' | 'completed' | 'failed' | 'abandoned';
export type ExpeditionNodeType = 'battle'|'elite'|'boss'|'event'|'forge'|'shrine'|'camp'|'treasure'|'echo'|'risk'|'merchant'|'secret';

export interface ExpeditionRunSnapshot {
  id: string;
  expeditionId: string;
  tier: ExpeditionTier;
  contentVersion: string;
  status: ExpeditionStatus;
  nodeIndex: number;
  routeProgress: number;
  regionalMeter: number;
  wipeCount: number;
  stateVersion: number;
}

export interface ExpeditionBoonOffer {
  offerId: string;
  nodeIndex: number;
  choices: string[];
}
