import {formatStatDeltaV24} from './equipment-v24';
export interface ComparePayloadV32{slot:string;currentItemId?:string;candidateItemId:string;rarity:string;upgradeRank:number;statDelta:Record<string,number>;setChanges:readonly {setName:string;beforeCount:number;afterCount:number;beforeThresholds:readonly number[];afterThresholds:readonly number[]}[];}
const percent=new Set(['evasion','critRate','critDamage','haste','tenacity','potency']);
export function itemCompareRowsV32(p:ComparePayloadV32){return Object.entries(p.statDelta).filter(([,v])=>Math.abs(v)>1e-9).map(([key,value])=>({key,value,label:formatStatDeltaV24(value,percent.has(key)),positive:value>0}));}
export function setChangeLinesV32(p:ComparePayloadV32){return p.setChanges.map(x=>`${x.setName}: ${x.beforeCount} → ${x.afterCount} armor pieces${x.afterThresholds.length?` (${x.afterThresholds.join('/') }pc active)`:''}`);}
export const ITEM_DETAIL_ACTIONS_V32=['Equip','Compare','Upgrade','Stat Gem','Effect Gem','Set details'] as const;
