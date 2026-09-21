import type {GearStatKey} from './equipment-types-v22';

export type GemGradeV34=1|2|3|4|5;
export type GemKindV34='stat'|'effect';
export type EffectGemCategoryV34='damage'|'defense'|'support'|'hybrid';
export const GEM_GRADES_V34={
  1:{id:'CUT',name:'Cut'},2:{id:'POLISHED',name:'Polished'},3:{id:'REFINED',name:'Refined'},4:{id:'FLAWLESS',name:'Flawless'},5:{id:'RADIANT',name:'Radiant'},
} as const satisfies Record<GemGradeV34,{id:string;name:string}>;

export interface StatGemFamilyV34{id:string;name:string;stat:GearStatKey;values:readonly [number,number,number,number,number];unit:'relative'|'percentage_points';}
export const STAT_GEMS_V34:readonly StatGemFamilyV34[]=[
 {id:'stat_might',name:'Might',stat:'power',values:[.004,.005,.0065,.008,.01],unit:'relative'},
 {id:'stat_vitality',name:'Vitality',stat:'maxHp',values:[.006,.008,.01,.0125,.015],unit:'relative'},
 {id:'stat_iron',name:'Iron',stat:'armor',values:[.005,.0065,.008,.01,.0125],unit:'relative'},
 {id:'stat_ward',name:'Ward',stat:'ward',values:[.005,.0065,.008,.01,.0125],unit:'relative'},
 {id:'stat_precision',name:'Precision',stat:'accuracy',values:[.003,.004,.005,.0065,.008],unit:'percentage_points'},
 {id:'stat_keen',name:'Keen',stat:'critRate',values:[.002,.003,.004,.005,.006],unit:'percentage_points'},
 {id:'stat_savage',name:'Savage',stat:'critDamage',values:[.01,.013,.016,.02,.025],unit:'relative'},
 {id:'stat_piercing',name:'Piercing',stat:'penetration',values:[.0025,.0035,.0045,.006,.0075],unit:'percentage_points'},
 {id:'stat_swift',name:'Swift',stat:'haste',values:[.0035,.0045,.0055,.0065,.008],unit:'relative'},
 {id:'stat_potent',name:'Potent',stat:'potency',values:[.005,.0065,.008,.01,.012],unit:'relative'},
 {id:'stat_elusive',name:'Elusive',stat:'evasion',values:[.002,.0025,.003,.004,.005],unit:'percentage_points'},
 {id:'stat_resolute',name:'Resolute',stat:'tenacity',values:[.004,.005,.006,.0075,.009],unit:'relative'},
] as const;

export type EffectGemIdV34=
 'effect_momentum'|'effect_execution'|'effect_opening_strike'|'effect_predator'|'effect_critical_surge'|'effect_ruin'|
 'effect_bulwark'|'effect_aegis'|'effect_last_stand'|'effect_retaliation'|'effect_unyielding'|
 'effect_mercy'|'effect_benediction'|'effect_guardians_gift'|'effect_renewal'|'effect_shared_resolve'|
 'effect_sustenance'|'effect_battle_rhythm'|'effect_flow'|'effect_opportunist';

export interface EffectGemFamilyV34{
 id:EffectGemIdV34;name:string;category:EffectGemCategoryV34;
 values:readonly [number,number,number,number,number];
 valueLabel:string;baseRule:string;resonance2:string;resonance3:string;
 triggerCooldownMs?:number;durationMs?:number;maxStacks?:number;
}
export const EFFECT_GEMS_V34:readonly EffectGemFamilyV34[]=[
 {id:'effect_momentum',name:'Momentum',category:'damage',values:[.0018,.0022,.0026,.0031,.0036],valueLabel:'damage per Momentum stack',baseRule:'Successful direct attacks grant Momentum for 4s. Multi-hit abilities grant at most one stack every 0.50s. Pets and companions do not trigger it.',resonance2:'Maximum Momentum increases from 5 to 6.',resonance3:'After 4s without gaining Momentum, remove one stack every 2s instead of all stacks.',triggerCooldownMs:500,durationMs:4000,maxStacks:5},
 {id:'effect_execution',name:'Execution',category:'damage',values:[.008,.01,.012,.015,.018],valueLabel:'damage below execute threshold',baseRule:'Direct and periodic damage is increased against enemies below 30% HP.',resonance2:'Activation threshold increases to 35% HP.',resonance3:'Below 15% HP, total Execution effectiveness is increased by 25%.'},
 {id:'effect_opening_strike',name:'Opening Strike',category:'damage',values:[.007,.009,.011,.013,.015],valueLabel:'opening damage',baseRule:'Damage is increased for the first 8s after entering combat with a valid enemy.',resonance2:'Opening window increases to 10s.',resonance3:'Once per boss encounter, a server-authored boss phase may refresh Opening Strike.',durationMs:8000},
 {id:'effect_predator',name:'Predator',category:'damage',values:[.008,.01,.012,.014,.016],valueLabel:'Elite/Boss damage',baseRule:'Damage is increased against Elite and Boss enemies.',resonance2:'Also applies to dungeon minibosses and Champion enemies.',resonance3:'The first damaging hit grants 25% increased Predator effectiveness for 8s, once per qualifying enemy encounter.',durationMs:8000},
 {id:'effect_critical_surge',name:'Critical Surge',category:'damage',values:[.002,.0025,.003,.0035,.004],valueLabel:'Haste per stack',baseRule:'Direct critical hits grant a 5s Haste stack, at most once every 0.75s.',resonance2:'Maximum stacks increases from 3 to 4.',resonance3:'At maximum stacks, another qualifying critical refreshes the oldest stack.',triggerCooldownMs:750,durationMs:5000,maxStacks:3},
 {id:'effect_ruin',name:'Ruin',category:'damage',values:[.0025,.003,.0035,.004,.005],valueLabel:'damage per qualifying negative effect',baseRule:'Damage increases for each different qualifying negative effect on the target, counting up to 2.',resonance2:'Count up to 3 different qualifying effects.',resonance3:'A player-applied Mark counts as two qualifying effects for its first 4s.'},
 {id:'effect_bulwark',name:'Bulwark',category:'defense',values:[.006,.0075,.009,.0105,.012],valueLabel:'damage reduction',baseRule:'Blocking or using a qualifying defensive ability grants damage reduction for 4s. The effect does not stack with itself.',resonance2:'Duration increases to 5s.',resonance3:'Successful blocks refresh the remaining duration.',durationMs:4000},
 {id:'effect_aegis',name:'Aegis',category:'defense',values:[.01,.0125,.015,.0175,.02],valueLabel:'barrier strength',baseRule:'Barriers generated by the player are stronger.',resonance2:'A barrier that expires naturally heals its target for 5% of unused remaining barrier value.',resonance3:'Maximum allowed barrier cap increases by 5%.'},
 {id:'effect_last_stand',name:'Last Stand',category:'defense',values:[.015,.019,.023,.027,.032],valueLabel:'damage reduction',baseRule:'Once per combat, dropping below 30% HP grants damage reduction for 6s.',resonance2:'Activation threshold increases to 35% HP.',resonance3:'Duration increases to 8s.',durationMs:6000},
 {id:'effect_retaliation',name:'Retaliation',category:'defense',values:[.015,.019,.023,.027,.032],valueLabel:'next ability damage',baseRule:'Taking a single hit equal to at least 12% Max HP empowers the next damaging ability within 8s. Shared trigger cooldown is 8s.',resonance2:'Heavy-hit threshold decreases to 10% Max HP.',resonance3:'Consuming Retaliation restores 1% Max HP with a 10s healing cooldown.',triggerCooldownMs:8000,durationMs:8000},
 {id:'effect_unyielding',name:'Unyielding',category:'defense',values:[.0015,.002,.0025,.003,.0035],valueLabel:'Armor and Ward per stack',baseRule:'Receiving a damaging hit grants Armor and Ward for 5s, at most once every 0.75s, up to 4 stacks.',resonance2:'Maximum stacks increases to 5.',resonance3:'Stack duration increases to 7s.',triggerCooldownMs:750,durationMs:5000,maxStacks:4},
 {id:'effect_mercy',name:'Mercy',category:'support',values:[.04,.05,.06,.07,.08],valueLabel:'overhealing converted to barrier',baseRule:'A percentage of effective overhealing becomes an 8s barrier, capped at 3% of target Max HP. Mercy cannot trigger itself or companion healing.',resonance2:'Mercy barrier cap increases to 4% Max HP.',resonance3:'Barrier duration increases to 10s.',durationMs:8000},
 {id:'effect_benediction',name:'Benediction',category:'support',values:[.008,.01,.012,.014,.016],valueLabel:'next heal/barrier strength',baseRule:'Using a qualifying Support ability grants a 10s Benediction charge. The next direct heal or barrier consumes it.',resonance2:'May hold 2 Benediction charges.',resonance3:'Consuming a charge grants 2% Haste for 4s; this Haste does not stack with itself.',durationMs:10000},
 {id:'effect_guardians_gift',name:"Guardian's Gift",category:'support',values:[.0025,.0035,.0045,.0055,.0065],valueLabel:'ally damage reduction',baseRule:'Applying a barrier to another player grants that target damage reduction for 4s.',resonance2:'Duration increases to 6s.',resonance3:"The caster receives 50% of Guardian's Gift damage reduction for the same duration.",durationMs:4000},
 {id:'effect_renewal',name:'Renewal',category:'support',values:[.01,.0125,.015,.0175,.02],valueLabel:'additional healing',baseRule:'Direct healing leaves a 4s heal-over-time effect based on the original effective heal.',resonance2:'Renewal lasts 6s and its total healing increases by 20%.',resonance3:'Up to 2 independent Renewals may coexist on one target.',durationMs:4000},
 {id:'effect_shared_resolve',name:'Shared Resolve',category:'support',values:[.0025,.003,.0035,.004,.005],valueLabel:'Potency per stack',baseRule:'Buffing or shielding another player grants Potency for 6s, up to 2 stacks.',resonance2:'Duration increases to 8s.',resonance3:'Maximum stacks increases to 3.',durationMs:6000,maxStacks:2},
 {id:'effect_sustenance',name:'Sustenance',category:'hybrid',values:[.0015,.002,.0025,.003,.0035],valueLabel:'Max HP restored per kill',baseRule:'Defeating an enemy restores Max HP with a 3s cooldown. Trivial summoned boss adds cannot trigger it.',resonance2:'Elite and Champion kills restore 3x the normal amount.',resonance3:'Sustenance overhealing becomes a barrier at 25% efficiency, capped at 2% Max HP.',triggerCooldownMs:3000},
 {id:'effect_battle_rhythm',name:'Battle Rhythm',category:'hybrid',values:[.005,.0065,.008,.0095,.011],valueLabel:'opposite-category ability strength',baseRule:'Alternating offensive and defensive/support ability categories empowers the next ability in the opposite category. Base window is 8s; basic attacks do not count.',resonance2:'Alternation window increases to 12s.',resonance3:'A successful alternation grants 2% Haste for 4s with a 6s Haste-proc cooldown.',durationMs:8000},
 {id:'effect_flow',name:'Flow',category:'hybrid',values:[.001,.0015,.002,.0025,.003],valueLabel:'Haste per Flow stack',baseRule:'Using different abilities consecutively builds Flow for 6s, up to 3 stacks. Repeating the same ability refreshes duration but adds no stack.',resonance2:'Maximum stacks increases to 4.',resonance3:'After expiry, remove one Flow stack every 2s instead of all stacks.',durationMs:6000,maxStacks:3},
 {id:'effect_opportunist',name:'Opportunist',category:'hybrid',values:[.007,.009,.011,.013,.015],valueLabel:'next direct-hit damage',baseRule:'Applying a new Mark, debuff, exposed state or qualifying control effect empowers the next direct hit against that target within 4s. Per-target cooldown is 4s.',resonance2:'Per-target cooldown decreases to 3s.',resonance3:'If the empowered hit critically strikes, extend the triggering effect by 1s once per application.',triggerCooldownMs:4000,durationMs:4000},
] as const;

export const CLASS_EFFECT_GEM_RECOMMENDATIONS_V34={
 Ironwarden:{primary:['effect_bulwark','effect_unyielding','effect_last_stand'],alternatives:['effect_retaliation','effect_battle_rhythm']},
 Bastion:{primary:['effect_aegis','effect_bulwark','effect_guardians_gift'],alternatives:['effect_unyielding','effect_shared_resolve']},
 Dreadguard:{primary:['effect_retaliation','effect_last_stand','effect_sustenance'],alternatives:['effect_execution','effect_unyielding']},
 Wayfinder:{primary:['effect_critical_surge','effect_predator','effect_momentum'],alternatives:['effect_ruin','effect_opening_strike']},
 Ravager:{primary:['effect_execution','effect_opening_strike','effect_predator'],alternatives:['effect_critical_surge','effect_retaliation']},
 Hexweaver:{primary:['effect_ruin','effect_opportunist','effect_flow'],alternatives:['effect_momentum','effect_execution']},
 'Knife Dancer':{primary:['effect_momentum','effect_critical_surge','effect_flow'],alternatives:['effect_opening_strike','effect_execution']},
 Dawnkeeper:{primary:['effect_renewal','effect_mercy','effect_benediction'],alternatives:['effect_shared_resolve','effect_flow']},
 Stonecaller:{primary:['effect_guardians_gift','effect_aegis','effect_shared_resolve'],alternatives:['effect_bulwark','effect_benediction']},
} as const satisfies Record<string,{primary:readonly EffectGemIdV34[];alternatives:readonly EffectGemIdV34[]}>;

export interface EquippedGemV34{familyId:string;grade:GemGradeV34;}
export interface EffectGemSummaryV34{familyId:EffectGemIdV34;copies:number;resonance:1|2|3;totalValue:number;grades:readonly GemGradeV34[];}
export function statGemValueV34(familyId:string,grade:GemGradeV34):number{const family=STAT_GEMS_V34.find(v=>v.id===familyId);if(!family)throw new Error('unknown_stat_gem');return family.values[grade-1];}
export function effectGemValueV34(familyId:EffectGemIdV34,grade:GemGradeV34):number{const family=EFFECT_GEMS_V34.find(v=>v.id===familyId);if(!family)throw new Error('unknown_effect_gem');return family.values[grade-1];}
export function summarizeEffectGemsV34(equipped:readonly EquippedGemV34[]):readonly EffectGemSummaryV34[]{
 const grouped=new Map<EffectGemIdV34,GemGradeV34[]>();
 for(const gem of equipped){if(!EFFECT_GEMS_V34.some(v=>v.id===gem.familyId))continue;const id=gem.familyId as EffectGemIdV34;const grades=grouped.get(id)??[];grades.push(gem.grade);grouped.set(id,grades);}
 return [...grouped].map(([familyId,grades])=>{if(grades.length>3)throw new Error('effect_gem_resonance_cap');return{familyId,copies:grades.length,resonance:Math.min(3,grades.length) as 1|2|3,totalValue:Number(grades.reduce((sum,g)=>sum+effectGemValueV34(familyId,g),0).toFixed(6)),grades:[...grades].sort((a,b)=>b-a)};});
}
export function validateGemCatalogV34():string[]{const errors:string[]=[];if(STAT_GEMS_V34.length!==12)errors.push('stat_family_count');if(EFFECT_GEMS_V34.length!==20)errors.push('effect_family_count');const ids=[...STAT_GEMS_V34,...EFFECT_GEMS_V34].map(v=>v.id);if(new Set(ids).size!==ids.length)errors.push('duplicate_family_id');for(const v of [...STAT_GEMS_V34,...EFFECT_GEMS_V34]){if(v.values.length!==5||v.values.some(n=>!Number.isFinite(n)||n<=0))errors.push(`${v.id}:grades`);}return errors;}
