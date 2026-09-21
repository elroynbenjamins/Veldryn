import type {GemEffectId,GemStat} from '../core/types';
import {EFFECT_GEM_FAMILIES_V34,GEM_GRADE_META_V34,STAT_GEM_FAMILIES_V34,gemItemIdV34,type GemGradeV34} from '../core/gem-system-v34';

type Rarity='common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
export interface GemItemDefinitionV34{
 id:string;name:string;type:'gem'|'material';value:number;rarity:Rarity;
 gemStat?:GemStat;gemPercent?:number;gemTier?:GemGradeV34;gemGrade?:GemGradeV34;gemKind?:'stat'|'effect';gemEffect?:GemEffectId;gemEffectValue?:number;gemFamilyId?:string;passive?:string;
}
const grades:readonly GemGradeV34[]=[1,2,3,4,5];
const rarity:Record<GemGradeV34,Rarity>={1:'uncommon',2:'rare',3:'epic',4:'legendary',5:'mythic'};
const value:Record<GemGradeV34,number>={1:300,2:750,3:1800,4:4500,5:12000};
const pct=(v:number)=>v<.01?(v*100).toFixed(2):(v*100).toFixed(1);

export const GEM_MATERIAL_ITEMS_V34:readonly GemItemDefinitionV34[]=[
 {id:'RAW_GEM',name:'Raw Gem',type:'material',value:90,rarity:'uncommon'},
 {id:'GEM_DUST',name:'Gem Dust',type:'material',value:35,rarity:'uncommon'},
 {id:'REGIONAL_CATALYST',name:'Regional Catalyst',type:'material',value:900,rarity:'epic'},
 {id:'RADIANT_CATALYST',name:'Radiant Catalyst',type:'material',value:5000,rarity:'mythic'},
];
export const STAT_GEM_ITEMS_V34:readonly GemItemDefinitionV34[]=STAT_GEM_FAMILIES_V34.flatMap(family=>grades.map(grade=>({
 id:gemItemIdV34('stat',family.id,grade),name:`${GEM_GRADE_META_V34[grade].name} ${family.name} Gem`,type:'gem' as const,value:value[grade],rarity:rarity[grade],
 gemStat:family.stat,gemPercent:family.values[grade-1],gemTier:grade,gemGrade:grade,gemKind:'stat' as const,gemFamilyId:family.id,
 passive:`+${pct(family.values[grade-1])}% ${family.name} specialization`,
})));
export const EFFECT_GEM_ITEMS_V34:readonly GemItemDefinitionV34[]=EFFECT_GEM_FAMILIES_V34.flatMap(family=>grades.map(grade=>({
 id:gemItemIdV34('effect',family.id,grade),name:`${GEM_GRADE_META_V34[grade].name} ${family.name} Gem`,type:'gem' as const,value:value[grade],rarity:rarity[grade],
 gemEffect:family.id,gemEffectValue:family.values[grade-1],gemTier:grade,gemGrade:grade,gemKind:'effect' as const,gemFamilyId:family.id,passive:family.base,
})));
export const GEM_ITEMS_V34:readonly GemItemDefinitionV34[]=[...GEM_MATERIAL_ITEMS_V34,...STAT_GEM_ITEMS_V34,...EFFECT_GEM_ITEMS_V34];
