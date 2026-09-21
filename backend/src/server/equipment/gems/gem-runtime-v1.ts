import type {GearStatKey} from '../equipment-types-v22';
import {findEffectGem,findStatGem,type GemGrade} from './gem-catalog-v1';

export interface SocketedGemV1{familyId:string;grade:GemGrade;}
export interface EquipmentGemSocketsV1{stat?:SocketedGemV1;effect?:SocketedGemV1;}
export interface GemLoadoutEntryV1{equipmentItemId:string;sockets:EquipmentGemSocketsV1;}
export interface EffectGemSummaryV1{familyId:string;copies:number;resonance:1|2|3;totalValue:number;grades:readonly GemGrade[];}
export interface GemLoadoutSummaryV1{statPercent:Readonly<Partial<Record<GearStatKey,number>>>;statPercentagePoints:Readonly<Partial<Record<GearStatKey,number>>>;effects:readonly EffectGemSummaryV1[];}

export function summarizeGemLoadoutV1(entries:readonly GemLoadoutEntryV1[]):GemLoadoutSummaryV1{
 const statPercent:Partial<Record<GearStatKey,number>>={},statPercentagePoints:Partial<Record<GearStatKey,number>>={},groups=new Map<string,GemGrade[]>();
 for(const entry of entries){
   if(entry.sockets.stat){const d=findStatGem(entry.sockets.stat.familyId);if(!d)throw new Error('unknown_stat_gem');const target=d.unit==='percent'?statPercent:statPercentagePoints;target[d.stat]=(target[d.stat]??0)+d.values[entry.sockets.stat.grade];}
   if(entry.sockets.effect){const g=entry.sockets.effect;const d=findEffectGem(g.familyId);if(!d)throw new Error('unknown_effect_gem');const grades=groups.get(g.familyId)??[];if(grades.length>=d.maxEquippedCopies)throw new Error('effect_gem_resonance_cap');grades.push(g.grade);groups.set(g.familyId,grades);}
 }
 const effects=[...groups.entries()].map(([familyId,grades])=>{const d=findEffectGem(familyId)!;return {familyId,copies:grades.length,resonance:Math.min(3,grades.length) as 1|2|3,totalValue:Number(grades.reduce((s,g)=>s+d.values[g],0).toFixed(6)),grades:[...grades].sort()};});
 return {statPercent,statPercentagePoints,effects};
}
export function applyStatGemsV1(base:Record<GearStatKey,number>,summary:GemLoadoutSummaryV1):Record<GearStatKey,number>{
 const next={...base};for(const k of Object.keys(next) as GearStatKey[]){const pct=summary.statPercent[k]??0,pp=summary.statPercentagePoints[k]??0;next[k]=Number((base[k]*(1+pct)+pp).toFixed(5));}return next;
}
