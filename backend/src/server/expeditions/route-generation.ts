import type { ExpeditionNodeType } from '../../shared/expedition-types';
import { EXPEDITIONS } from './content/launch-content';
import { deterministicInt, deterministicUnit } from './rng';

export interface RouteNode { index: number; type: ExpeditionNodeType; depth: number; risk: number; }

function weightedNode(secret: string, expeditionId: string, index: number): ExpeditionNodeType {
  const def = EXPEDITIONS[expeditionId];
  if (!def) throw new Error('unknown_expedition');
  const entries = Object.entries(def.nodeWeights) as Array<[ExpeditionNodeType, number]>;
  const total = entries.reduce((s,[,w]) => s + w, 0);
  let roll = deterministicUnit(secret, expeditionId, 'node', index) * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'battle';
}

export function generateRoute(secret: string, expeditionId: string, runId: string): RouteNode[] {
  const def = EXPEDITIONS[expeditionId];
  if (!def) throw new Error('unknown_expedition');
  const count = deterministicInt(secret, def.minNodes, def.maxNodes, runId, expeditionId, 'length');
  const nodes: RouteNode[] = [];
  for (let i=0;i<count;i++) {
    let type: ExpeditionNodeType = weightedNode(secret, expeditionId, i);
    if (i === 0 && ['boss','secret','merchant','forge'].includes(type)) type = 'battle';
    if (i === count - 1) type = 'boss';
    nodes.push({ index:i, type, depth:i, risk:type === 'risk' ? 1.15 : type === 'elite' ? 1.08 : 1.0 });
  }
  return nodes;
}
