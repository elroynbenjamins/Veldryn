import { deterministicDigest } from './rng';
import { simulateCombat } from '../combat/engine';
import { applyRunBuild, ExpeditionBuild } from '../combat/build-effects';
import type { CombatantDefinition, CombatResult } from '../combat/types';
export interface RunNode { id:string; kind:'battle'|'elite'|'boss'|'event'|'camp'|'treasure'; encounter?:CombatantDefinition[]; }
export interface FullRunInput { runId:string; serverSecret:string; players:CombatantDefinition[]; nodes:RunNode[]; build:ExpeditionBuild; }
export interface FullRunResult { cleared:boolean; completedNodes:number; combats:CombatResult[]; stoppedAt?:string; }
export function resolveFullExpedition(input:FullRunInput):FullRunResult { const players=input.players.map(p=>applyRunBuild(p,input.build)); const combats:CombatResult[]=[]; for(let i=0;i<input.nodes.length;i++){ const n=input.nodes[i]; if(!n.encounter?.length) continue; const c=simulateCombat({seed:deterministicDigest(input.serverSecret,input.runId,i,n.id).toString('hex'),players,enemies:n.encounter}); combats.push(c); if(!c.victory)return{cleared:false,completedNodes:i,combats,stoppedAt:n.id}; } return{cleared:true,completedNodes:input.nodes.length,combats}; }
