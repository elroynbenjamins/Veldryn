import {GEM_GRADES_V34,type GemGradeV34,type GemKindV34} from './gem-system-v34';

export const GEM_MATERIAL_IDS_V34={
 dust:'GEM_DUST',raw:'RAW_GEM',regionalCatalyst:'REGIONAL_CATALYST',radiantCatalyst:'RADIANT_CATALYST',
} as const;

export interface GemCombineCostV34{from:GemGradeV34;to:GemGradeV34;copies:number;dust:number;regionalCatalyst:number;radiantCatalyst:number;gold:number;seconds:number;}
export const GEM_COMBINE_COSTS_V34:readonly GemCombineCostV34[]=[
 {from:1,to:2,copies:3,dust:0,regionalCatalyst:0,radiantCatalyst:0,gold:1500,seconds:300},
 {from:2,to:3,copies:3,dust:5,regionalCatalyst:0,radiantCatalyst:0,gold:5000,seconds:900},
 {from:3,to:4,copies:3,dust:15,regionalCatalyst:1,radiantCatalyst:0,gold:18000,seconds:2700},
 {from:4,to:5,copies:3,dust:40,regionalCatalyst:0,radiantCatalyst:1,gold:60000,seconds:7200},
] as const;

export const GEM_DISMANTLE_DUST_V34:Readonly<Record<GemGradeV34,number>>={1:1,2:3,3:8,4:22,5:60};
export const GEM_UNSOCKET_COSTS_V34:Readonly<Record<GemGradeV34,{gold:number;dust:number}>>={
 1:{gold:0,dust:0},2:{gold:0,dust:0},3:{gold:500,dust:0},4:{gold:1500,dust:1},5:{gold:5000,dust:3},
};

export function gemItemIdV34(kind:GemKindV34,familyId:string,grade:GemGradeV34):string{
 const prefix=kind==='stat'?'stat_':'effect_';
 if(!familyId.startsWith(prefix))throw new Error('gem_family_kind_mismatch');
 return `GEM_${kind.toUpperCase()}_${familyId.slice(prefix.length).toUpperCase()}_G${grade}`;
}
export function gemRecipeIdV34(familyId:string):string{return `recipe_gem_${familyId.replace(/^effect_/,'')}`;}
export function combineCostV34(grade:GemGradeV34):GemCombineCostV34{
 const row=GEM_COMBINE_COSTS_V34.find(v=>v.from===grade);if(!row)throw new Error('radiant_gem_max_grade');return row;
}
export function gemGradeNameV34(grade:GemGradeV34):string{return GEM_GRADES_V34[grade].name;}
export function dismantleDustV34(grade:GemGradeV34):number{return GEM_DISMANTLE_DUST_V34[grade];}
export function unsocketCostV34(grade:GemGradeV34){return GEM_UNSOCKET_COSTS_V34[grade];}
