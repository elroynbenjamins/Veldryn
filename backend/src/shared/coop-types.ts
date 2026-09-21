import type { ExpeditionNodeType } from './expedition-types';
import type { ExpeditionTier } from '../server/expeditions/constants';

export type CoopMode = 'qmode' | 'live';
export type CoopRole = 'tank' | 'damage' | 'support';
export type CoopRunPhase = 'awaiting_choice' | 'resolving_node' | 'completed' | 'failed' | 'abandoned';

export const COOP_ROLE_REQUIREMENT: Readonly<Record<CoopRole, number>> = Object.freeze({
  tank: 1,
  damage: 2,
  support: 1,
});

export interface CoopMemberIdentity {
  accountId: string;
  characterId: string;
  role: CoopRole;
}

export interface CoopRouteNode {
  nodeId: string;
  depth: number;
  kind: ExpeditionNodeType | 'entry';
  contentId: string;
  modifierId: string;
  risk: number;
  rewardTag: string;
  nextNodeIds: string[];
  /** Optional server-authored label for themed/event rooms. */
  title?: string;
  /** Optional event-meter delta applied after a successful room resolution. */
  mechanicDelta?: number;
  previewHidden?: boolean;
}

export interface CoopRouteGraph {
  schemaVersion: 1;
  generatorVersion: string;
  runId: string;
  expeditionId: string;
  contentVersion: string;
  balanceVersion: string;
  preBossNodeCount: number;
  entryNodeId: string;
  bossNodeId: string;
  nodes: CoopRouteNode[];
}

export interface CoopRunRequest {
  requestId: string;
  mode: CoopMode;
  dungeonId: string;
  tier: ExpeditionTier;
  characterId: string;
  loadoutId: string;
  loadoutRevision: number;
}

export interface CoopDecision {
  decisionId: string;
  revision: number;
  optionIds: string[];
  openedAtMs: number;
  closesAtMs?: number;
}

export interface CoopDecisionCommand {
  requestId:string;
  decisionId:string;
  decisionRevision:number;
  optionId:string;
}

export interface CoopReadyCommand {
  requestId:string;
  rosterRevision:number;
  accept:boolean;
}

export interface CoopChatCommand {
  requestId:string;
  text:string;
}
