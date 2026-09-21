import type {ClassId,GemEffectId,GemStat} from '../core/types';
import type {ItemRarity} from '../core/item-rarity';

export type MobileGemGradeV1=1|2|3|4|5;
export type MobileGemKindV1='stat'|'effect';
export const GEM_GRADE_LABEL_V1:Readonly<Record<MobileGemGradeV1,string>>={1:'Cut',2:'Polished',3:'Refined',4:'Flawless',5:'Radiant'};
export const GEM_GRADE_RARITY_V1:Readonly<Record<MobileGemGradeV1,ItemRarity>>={1:'common',2:'uncommon',3:'rare',4:'epic',5:'mythic'};

export interface MobileGemFamilyV1{
 familyId:string;name:string;kind:MobileGemKindV1;category:'stat'|'damage'|'defense'|'support'|'hybrid';
 values:Readonly<Record<MobileGemGradeV1,number>>;
 unit:'percent'|'percentage_point'|'effect';
 description:string;resonance2?:string;resonance3?:string;
 recommendedClasses?:readonly ClassId[];
 legacyStat?:GemStat;legacyEffect?:GemEffectId;
 sources:readonly string[];
}
const vals=(a:number,b:number,c:number,d:number,e:number):Readonly<Record<MobileGemGradeV1,number>>=>({1:a,2:b,3:c,4:d,5:e});

export const MOBILE_GEM_FAMILIES_V1:readonly MobileGemFamilyV1[]=[
 {familyId:'stat_might',name:'Might',kind:'stat',category:'stat',values:vals(.004,.005,.0065,.008,.01),unit:'percent',description:'Increases Power.',legacyStat:'attack',sources:['Saffron Gate','Crafting']},
 {familyId:'stat_vitality',name:'Vitality',kind:'stat',category:'stat',values:vals(.006,.008,.01,.0125,.015),unit:'percent',description:'Increases Max HP.',legacyStat:'hp',sources:['Saffron Gate','Shiverlake Descent','Crafting']},
 {familyId:'stat_iron',name:'Iron',kind:'stat',category:'stat',values:vals(.005,.0065,.008,.01,.0125),unit:'percent',description:'Increases Armor.',legacyStat:'defense',sources:['Scorchwind Flats','Caravan of Glass','Crafting']},
 {familyId:'stat_ward',name:'Ward',kind:'stat',category:'stat',values:vals(.005,.0065,.008,.01,.0125),unit:'percent',description:'Increases Ward.',sources:['Buried Observatory','Crafting']},
 {familyId:'stat_precision',name:'Precision',kind:'stat',category:'stat',values:vals(.003,.004,.005,.0065,.008),unit:'percentage_point',description:'Increases Accuracy.',sources:['Mirage Basin','Mirage Well','Crafting']},
 {familyId:'stat_keen',name:'Keen',kind:'stat',category:'stat',values:vals(.002,.003,.004,.005,.006),unit:'percentage_point',description:'Increases Critical Chance.',sources:['Whitepine Hunt','Crafting']},
 {familyId:'stat_savage',name:'Savage',kind:'stat',category:'stat',values:vals(.01,.013,.016,.02,.025),unit:'percent',description:'Increases Critical Damage.',sources:['Choir Caverns','Crafting']},
 {familyId:'stat_piercing',name:'Piercing',kind:'stat',category:'stat',values:vals(.0025,.0035,.0045,.006,.0075),unit:'percentage_point',description:'Increases Penetration.',sources:['Scorchwind Flats','Crafting']},
 {familyId:'stat_swift',name:'Swift',kind:'stat',category:'stat',values:vals(.0035,.0045,.0055,.0065,.008),unit:'percent',description:'Increases Haste.',sources:['Buried Observatory','Crafting']},
 {familyId:'stat_potent',name:'Potent',kind:'stat',category:'stat',values:vals(.005,.0065,.008,.01,.012),unit:'percent',description:'Increases Potency.',sources:['Mirage Basin','Mirage Well','Crafting']},
 {familyId:'stat_elusive',name:'Elusive',kind:'stat',category:'stat',values:vals(.002,.0025,.003,.004,.005),unit:'percentage_point',description:'Increases Evasion.',sources:['Regional enemies','Crafting']},
 {familyId:'stat_resolute',name:'Resolute',kind:'stat',category:'stat',values:vals(.004,.005,.006,.0075,.009),unit:'percent',description:'Increases Tenacity.',sources:['Shiverlake Descent','Crafting']},

 {familyId:'effect_momentum',name:'Momentum',kind:'effect',category:'damage',values:vals(.0018,.0022,.0026,.0031,.0036),unit:'effect',description:'Successful direct attacks build stacking damage for 4s.',resonance2:'Maximum Momentum stacks becomes 6.',resonance3:'Momentum decays one stack at a time.',recommendedClasses:['KNIFE_DANCER','WAYFINDER','HEXWEAVER'],sources:['Whitepine Hunt','Party Contracts']},
 {familyId:'effect_execution',name:'Execution',kind:'effect',category:'damage',values:vals(.008,.01,.012,.015,.018),unit:'effect',description:'Deal more damage to enemies below 30% HP.',resonance2:'Activation threshold becomes 35% HP.',resonance3:'Execution is 25% stronger below 15% HP.',recommendedClasses:['RAVAGER','KNIFE_DANCER','DREADGUARD'],sources:["Tyrant's Crown",'Choir Caverns','Party Contracts']},
 {familyId:'effect_opening_strike',name:'Opening Strike',kind:'effect',category:'damage',values:vals(.007,.009,.011,.013,.015),unit:'effect',description:'Deal more damage during the opening 8s of combat.',resonance2:'Opening window becomes 10s.',resonance3:'Refreshes once on a flagged boss phase.',recommendedClasses:['RAVAGER','WAYFINDER','KNIFE_DANCER'],sources:['Saffron Gate','Resonance Cache']},
 {familyId:'effect_predator',name:'Predator',kind:'effect',category:'damage',values:vals(.008,.01,.012,.014,.016),unit:'effect',description:'Deal more damage to Elite and Boss enemies.',resonance2:'Also affects minibosses and Champions.',resonance3:'First hit temporarily increases Predator effectiveness.',recommendedClasses:['WAYFINDER','RAVAGER'],legacyEffect:'boss_power',sources:['Caravan of Glass','Whitepine Hunt']},
 {familyId:'effect_critical_surge',name:'Critical Surge',kind:'effect',category:'damage',values:vals(.002,.0025,.003,.0035,.004),unit:'effect',description:'Critical hits grant stacking Haste.',resonance2:'Maximum stacks becomes 4.',resonance3:'Critical hits refresh the oldest stack at cap.',recommendedClasses:['KNIFE_DANCER','WAYFINDER','RAVAGER'],sources:['Buried Observatory']},
 {familyId:'effect_ruin',name:'Ruin',kind:'effect',category:'damage',values:vals(.0025,.003,.0035,.004,.005),unit:'effect',description:'Deal more damage per different negative effect on the target.',resonance2:'Counts up to 3 negative effects.',resonance3:'A fresh player Mark counts as two effects briefly.',recommendedClasses:['HEXWEAVER','WAYFINDER'],sources:['Mirage Well','Mirage Basin']},

 {familyId:'effect_bulwark',name:'Bulwark',kind:'effect',category:'defense',values:vals(.006,.0075,.009,.0105,.012),unit:'effect',description:'Blocking or defensive abilities grant temporary damage reduction.',resonance2:'Damage-reduction duration increases.',resonance3:'Successful blocks refresh the duration.',recommendedClasses:['IRONWARDEN','BASTION'],legacyEffect:'damage_reduction',sources:['Caravan of Glass','Party Contracts']},
 {familyId:'effect_aegis',name:'Aegis',kind:'effect',category:'defense',values:vals(.01,.0125,.015,.0175,.02),unit:'effect',description:'Increase barriers generated by the player.',resonance2:'Expired barriers return a small amount as healing.',resonance3:'Maximum barrier cap increases by 5%.',recommendedClasses:['BASTION','STONECALLER'],sources:['Buried Observatory','Shiverlake Descent']},
 {familyId:'effect_last_stand',name:'Last Stand',kind:'effect',category:'defense',values:vals(.015,.019,.023,.027,.032),unit:'effect',description:'Once per combat, low HP triggers strong mitigation.',resonance2:'Activation threshold becomes 35% HP.',resonance3:'Last Stand lasts 8s.',recommendedClasses:['IRONWARDEN','DREADGUARD'],sources:["Tyrant's Crown"]},
 {familyId:'effect_retaliation',name:'Retaliation',kind:'effect',category:'defense',values:vals(.015,.019,.023,.027,.032),unit:'effect',description:'Taking a heavy hit empowers your next damaging ability.',resonance2:'Heavy-hit threshold becomes easier to trigger.',resonance3:'Consuming Retaliation restores a small amount of HP.',recommendedClasses:['DREADGUARD','IRONWARDEN'],sources:['Scorchwind Flats','Caravan of Glass']},
 {familyId:'effect_unyielding',name:'Unyielding',kind:'effect',category:'defense',values:vals(.0015,.002,.0025,.003,.0035),unit:'effect',description:'Incoming hits build temporary Armor and Ward.',resonance2:'Maximum defensive stacks becomes 5.',resonance3:'Stacks last longer.',recommendedClasses:['IRONWARDEN','BASTION','DREADGUARD'],sources:["Tyrant's Crown",'Shiverlake Descent']},

 {familyId:'effect_mercy',name:'Mercy',kind:'effect',category:'support',values:vals(.04,.05,.06,.07,.08),unit:'effect',description:'A portion of overhealing becomes a temporary barrier.',resonance2:'Mercy barrier cap increases.',resonance3:'Mercy barriers last longer.',recommendedClasses:['DAWNKEEPER'],sources:['Mirage Basin','Mirage Well','Party Contracts']},
 {familyId:'effect_benediction',name:'Benediction',kind:'effect',category:'support',values:vals(.008,.01,.012,.014,.016),unit:'effect',description:'Support abilities empower the next direct heal or barrier.',resonance2:'May hold two Benediction charges.',resonance3:'Consuming a charge briefly grants Haste.',recommendedClasses:['DAWNKEEPER','STONECALLER'],sources:['Buried Observatory']},
 {familyId:'effect_guardians_gift',name:"Guardian's Gift",kind:'effect',category:'support',values:vals(.0025,.0035,.0045,.0055,.0065),unit:'effect',description:'Barriers placed on allies also grant temporary damage reduction.',resonance2:'The damage reduction lasts longer.',resonance3:'The caster receives half of the mitigation.',recommendedClasses:['STONECALLER','BASTION'],sources:['Shiverlake Descent']},
 {familyId:'effect_renewal',name:'Renewal',kind:'effect',category:'support',values:vals(.01,.0125,.015,.0175,.02),unit:'effect',description:'Direct healing leaves a small heal-over-time effect.',resonance2:'Renewal lasts longer and heals more.',resonance3:'Two Renewals may coexist on a target.',recommendedClasses:['DAWNKEEPER'],sources:['Choir Caverns']},
 {familyId:'effect_shared_resolve',name:'Shared Resolve',kind:'effect',category:'support',values:vals(.0025,.003,.0035,.004,.005),unit:'effect',description:'Buffing or shielding another player grants temporary Potency.',resonance2:'Shared Resolve lasts longer.',resonance3:'Maximum stacks becomes 3.',recommendedClasses:['DAWNKEEPER','STONECALLER'],sources:['Choir Caverns']},

 {familyId:'effect_sustenance',name:'Sustenance',kind:'effect',category:'hybrid',values:vals(.0015,.002,.0025,.003,.0035),unit:'effect',description:'Defeating enemies restores a small amount of Max HP.',resonance2:'Elite and Champion kills restore triple.',resonance3:'Excess healing becomes a small barrier.',recommendedClasses:['DREADGUARD'],legacyEffect:'recovery',sources:['Saffron Gate','Whitepine Hunt']},
 {familyId:'effect_battle_rhythm',name:'Battle Rhythm',kind:'effect',category:'hybrid',values:vals(.005,.0065,.008,.0095,.011),unit:'effect',description:'Alternating offensive and defensive/support abilities empowers the next opposite category.',resonance2:'The alternation window becomes longer.',resonance3:'Successful alternation briefly grants Haste.',recommendedClasses:['IRONWARDEN','DAWNKEEPER'],sources:['Choir Caverns']},
 {familyId:'effect_flow',name:'Flow',kind:'effect',category:'hybrid',values:vals(.001,.0015,.002,.0025,.003),unit:'effect',description:'Using different abilities consecutively builds Haste.',resonance2:'Maximum Flow stacks becomes 4.',resonance3:'Flow decays one stack at a time.',recommendedClasses:['HEXWEAVER','KNIFE_DANCER','DAWNKEEPER'],legacyEffect:'combat_speed',sources:['Buried Observatory','Party Contracts']},
 {familyId:'effect_opportunist',name:'Opportunist',kind:'effect',category:'hybrid',values:vals(.007,.009,.011,.013,.015),unit:'effect',description:'Applying a new Mark/debuff/control effect empowers the next direct hit.',resonance2:'Per-target cooldown becomes shorter.',resonance3:'A critical empowered hit extends the triggering effect once.',recommendedClasses:['HEXWEAVER','WAYFINDER'],sources:['Mirage Basin','Mirage Well','Party Contracts']},
] as const;

export interface MobileGemItemV1{
 id:string;name:string;type:'gem';gemKind:MobileGemKindV1;gemFamilyId:string;gemGrade:MobileGemGradeV1;gemTier:MobileGemGradeV1;
 gemStat?:GemStat;gemPercent?:number;gemEffect?:GemEffectId;gemEffectValue?:number;
 value:number;rarity:ItemRarity;passive:string;
}
export const GEM_ITEMS_V1:readonly MobileGemItemV1[]=MOBILE_GEM_FAMILIES_V1.flatMap(family=>([1,2,3,4,5] as MobileGemGradeV1[]).map(grade=>({
 id:`gem:${family.familyId}:g${grade}`,name:`${GEM_GRADE_LABEL_V1[grade]} ${family.name} Gem`,type:'gem' as const,gemKind:family.kind,gemFamilyId:family.familyId,gemGrade:grade,gemTier:grade,
 gemStat:family.legacyStat,gemPercent:family.legacyStat?family.values[grade]:undefined,
 gemEffect:family.legacyEffect,gemEffectValue:family.legacyEffect?family.values[grade]:undefined,
 value:Math.round(120*Math.pow(2.25,grade-1)),rarity:GEM_GRADE_RARITY_V1[grade],passive:family.description,
})));

export function mobileGemFamilyV1(familyId:string){return MOBILE_GEM_FAMILIES_V1.find(row=>row.familyId===familyId);}
export function mobileGemItemIdV1(familyId:string,grade:MobileGemGradeV1){return `gem:${familyId}:g${grade}`;}
export function mobileGemRecipeIdV1(familyId:string){return `recipe_gem_${familyId.replace(/^effect_|^stat_/,'')}`;}
