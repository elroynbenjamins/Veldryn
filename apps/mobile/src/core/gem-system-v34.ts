import type {ClassId,GemEffectId,GemStat} from './types';

export type GemGradeV34=1|2|3|4|5;
export const GEM_GRADE_META_V34={
 1:{name:'Cut',short:'I'},2:{name:'Polished',short:'II'},3:{name:'Refined',short:'III'},4:{name:'Flawless',short:'IV'},5:{name:'Radiant',short:'V'},
} as const;

export interface StatGemFamilyMobileV34{id:string;name:string;stat:GemStat;values:readonly [number,number,number,number,number];}
export const STAT_GEM_FAMILIES_V34:readonly StatGemFamilyMobileV34[]=[
 {id:'stat_might',name:'Might',stat:'power',values:[.004,.005,.0065,.008,.01]},
 {id:'stat_vitality',name:'Vitality',stat:'max_hp',values:[.006,.008,.01,.0125,.015]},
 {id:'stat_iron',name:'Iron',stat:'armor',values:[.005,.0065,.008,.01,.0125]},
 {id:'stat_ward',name:'Ward',stat:'ward',values:[.005,.0065,.008,.01,.0125]},
 {id:'stat_precision',name:'Precision',stat:'accuracy',values:[.003,.004,.005,.0065,.008]},
 {id:'stat_keen',name:'Keen',stat:'crit_chance',values:[.002,.003,.004,.005,.006]},
 {id:'stat_savage',name:'Savage',stat:'crit_damage',values:[.01,.013,.016,.02,.025]},
 {id:'stat_piercing',name:'Piercing',stat:'penetration',values:[.0025,.0035,.0045,.006,.0075]},
 {id:'stat_swift',name:'Swift',stat:'haste',values:[.0035,.0045,.0055,.0065,.008]},
 {id:'stat_potent',name:'Potent',stat:'potency',values:[.005,.0065,.008,.01,.012]},
 {id:'stat_elusive',name:'Elusive',stat:'evasion',values:[.002,.0025,.003,.004,.005]},
 {id:'stat_resolute',name:'Resolute',stat:'tenacity',values:[.004,.005,.006,.0075,.009]},
] as const;

export interface EffectGemFamilyMobileV34{id:GemEffectId;name:string;category:'damage'|'defense'|'support'|'hybrid';values:readonly [number,number,number,number,number];valueLabel:string;base:string;r2:string;r3:string;}
export const EFFECT_GEM_FAMILIES_V34:readonly EffectGemFamilyMobileV34[]=[
 {id:'effect_momentum',name:'Momentum',category:'damage',values:[.0018,.0022,.0026,.0031,.0036],valueLabel:'damage per stack',base:'Successful direct attacks build Momentum for 4s (max 5).',r2:'Maximum Momentum becomes 6.',r3:'Momentum decays one stack at a time.'},
 {id:'effect_execution',name:'Execution',category:'damage',values:[.008,.01,.012,.015,.018],valueLabel:'execute damage',base:'Deal more damage to enemies below 30% HP.',r2:'Threshold becomes 35% HP.',r3:'Below 15% HP, Execution is 25% stronger.'},
 {id:'effect_opening_strike',name:'Opening Strike',category:'damage',values:[.007,.009,.011,.013,.015],valueLabel:'opening damage',base:'Deal more damage during the first 8s of combat.',r2:'Opening window becomes 10s.',r3:'Refreshes once on an authored new boss phase.'},
 {id:'effect_predator',name:'Predator',category:'damage',values:[.008,.01,.012,.014,.016],valueLabel:'Elite/Boss damage',base:'Deal more damage to Elite and Boss enemies.',r2:'Also affects minibosses and Champions.',r3:'First hit boosts Predator by 25% for 8s.'},
 {id:'effect_critical_surge',name:'Critical Surge',category:'damage',values:[.002,.0025,.003,.0035,.004],valueLabel:'Haste per stack',base:'Direct critical hits grant a 5s Haste stack (max 3).',r2:'Maximum stacks becomes 4.',r3:'Criticals at maximum refresh the oldest stack.'},
 {id:'effect_ruin',name:'Ruin',category:'damage',values:[.0025,.003,.0035,.004,.005],valueLabel:'damage per debuff',base:'Deal more damage per different negative effect on the target (max 2).',r2:'Count up to 3 effects.',r3:'A new player Mark counts twice for 4s.'},
 {id:'effect_bulwark',name:'Bulwark',category:'defense',values:[.006,.0075,.009,.0105,.012],valueLabel:'damage reduction',base:'Blocking or a defensive ability grants 4s damage reduction.',r2:'Duration becomes 5s.',r3:'Successful blocks refresh the duration.'},
 {id:'effect_aegis',name:'Aegis',category:'defense',values:[.01,.0125,.015,.0175,.02],valueLabel:'barrier strength',base:'Your generated barriers are stronger.',r2:'Expired barriers heal 5% of unused value.',r3:'Barrier cap increases by 5%.'},
 {id:'effect_last_stand',name:'Last Stand',category:'defense',values:[.015,.019,.023,.027,.032],valueLabel:'damage reduction',base:'Once per combat, dropping below 30% HP grants 6s damage reduction.',r2:'Triggers below 35% HP.',r3:'Duration becomes 8s.'},
 {id:'effect_retaliation',name:'Retaliation',category:'defense',values:[.015,.019,.023,.027,.032],valueLabel:'next ability damage',base:'A hit of at least 12% Max HP empowers your next damaging ability.',r2:'Trigger threshold becomes 10% Max HP.',r3:'Consuming Retaliation restores 1% Max HP.'},
 {id:'effect_unyielding',name:'Unyielding',category:'defense',values:[.0015,.002,.0025,.003,.0035],valueLabel:'Armor + Ward per stack',base:'Taking damage builds Armor and Ward for 5s (max 4).',r2:'Maximum stacks becomes 5.',r3:'Stacks last 7s.'},
 {id:'effect_mercy',name:'Mercy',category:'support',values:[.04,.05,.06,.07,.08],valueLabel:'overheal conversion',base:'Effective overhealing becomes an 8s barrier, capped at 3% target Max HP.',r2:'Barrier cap becomes 4% Max HP.',r3:'Barrier duration becomes 10s.'},
 {id:'effect_benediction',name:'Benediction',category:'support',values:[.008,.01,.012,.014,.016],valueLabel:'next heal/barrier',base:'A Support ability grants a 10s charge that strengthens the next direct heal/barrier.',r2:'May hold 2 charges.',r3:'Consuming a charge grants 2% Haste for 4s.'},
 {id:'effect_guardians_gift',name:"Guardian's Gift",category:'support',values:[.0025,.0035,.0045,.0055,.0065],valueLabel:'ally damage reduction',base:'Barrier another player to grant them 4s damage reduction.',r2:'Duration becomes 6s.',r3:'You receive 50% of the granted reduction.'},
 {id:'effect_renewal',name:'Renewal',category:'support',values:[.01,.0125,.015,.0175,.02],valueLabel:'additional healing',base:'Direct healing leaves a 4s heal-over-time effect.',r2:'Lasts 6s and heals 20% more.',r3:'Up to 2 Renewals can coexist.'},
 {id:'effect_shared_resolve',name:'Shared Resolve',category:'support',values:[.0025,.003,.0035,.004,.005],valueLabel:'Potency per stack',base:'Buffing or shielding an ally grants Potency for 6s (max 2).',r2:'Duration becomes 8s.',r3:'Maximum stacks becomes 3.'},
 {id:'effect_sustenance',name:'Sustenance',category:'hybrid',values:[.0015,.002,.0025,.003,.0035],valueLabel:'Max HP per kill',base:'Kills restore Max HP with a 3s cooldown.',r2:'Elite/Champion kills restore 3x.',r3:'Overhealing becomes a small barrier.'},
 {id:'effect_battle_rhythm',name:'Battle Rhythm',category:'hybrid',values:[.005,.0065,.008,.0095,.011],valueLabel:'alternating ability strength',base:'Alternating offensive and defensive/support abilities empowers the opposite category.',r2:'Alternation window becomes 12s.',r3:'Successful alternation grants 2% Haste for 4s.'},
 {id:'effect_flow',name:'Flow',category:'hybrid',values:[.001,.0015,.002,.0025,.003],valueLabel:'Haste per stack',base:'Using different abilities consecutively builds Flow for 6s (max 3).',r2:'Maximum stacks becomes 4.',r3:'Flow decays one stack at a time.'},
 {id:'effect_opportunist',name:'Opportunist',category:'hybrid',values:[.007,.009,.011,.013,.015],valueLabel:'next direct-hit damage',base:'A new Mark/debuff/control effect empowers the next direct hit within 4s.',r2:'Per-target cooldown becomes 3s.',r3:'A critical empowered hit extends the triggering effect by 1s.'},
] as const;

export const CLASS_EFFECT_RECOMMENDATIONS_V34:Readonly<Record<ClassId,{primary:readonly GemEffectId[];alternatives:readonly GemEffectId[]}>>={
 IRONWARDEN:{primary:['effect_bulwark','effect_unyielding','effect_last_stand'],alternatives:['effect_retaliation','effect_battle_rhythm']},
 BASTION:{primary:['effect_aegis','effect_bulwark','effect_guardians_gift'],alternatives:['effect_unyielding','effect_shared_resolve']},
 DREADGUARD:{primary:['effect_retaliation','effect_last_stand','effect_sustenance'],alternatives:['effect_execution','effect_unyielding']},
 WAYFINDER:{primary:['effect_critical_surge','effect_predator','effect_momentum'],alternatives:['effect_ruin','effect_opening_strike']},
 RAVAGER:{primary:['effect_execution','effect_opening_strike','effect_predator'],alternatives:['effect_critical_surge','effect_retaliation']},
 HEXWEAVER:{primary:['effect_ruin','effect_opportunist','effect_flow'],alternatives:['effect_momentum','effect_execution']},
 KNIFE_DANCER:{primary:['effect_momentum','effect_critical_surge','effect_flow'],alternatives:['effect_opening_strike','effect_execution']},
 DAWNKEEPER:{primary:['effect_renewal','effect_mercy','effect_benediction'],alternatives:['effect_shared_resolve','effect_flow']},
 STONECALLER:{primary:['effect_guardians_gift','effect_aegis','effect_shared_resolve'],alternatives:['effect_bulwark','effect_benediction']},
};

export const GEM_COMBINE_COSTS_V34={
 1:{copies:3,dust:0,regionalCatalyst:0,radiantCatalyst:0,gold:1500,seconds:300},
 2:{copies:3,dust:5,regionalCatalyst:0,radiantCatalyst:0,gold:5000,seconds:900},
 3:{copies:3,dust:15,regionalCatalyst:1,radiantCatalyst:0,gold:18000,seconds:2700},
 4:{copies:3,dust:40,regionalCatalyst:0,radiantCatalyst:1,gold:60000,seconds:7200},
} as const;
export const GEM_DISMANTLE_DUST_V34={1:1,2:3,3:8,4:22,5:60} as const;
export const GEM_UNSOCKET_COST_V34={1:{gold:0,dust:0},2:{gold:0,dust:0},3:{gold:500,dust:0},4:{gold:1500,dust:1},5:{gold:5000,dust:3}} as const;

export function gemItemIdV34(kind:'stat'|'effect',familyId:string,grade:GemGradeV34){const prefix=kind==='stat'?'stat_':'effect_';return `GEM_${kind.toUpperCase()}_${familyId.replace(prefix,'').toUpperCase()}_G${grade}`;}
export function statFamilyV34(id:string){return STAT_GEM_FAMILIES_V34.find(v=>v.id===id);}
export function effectFamilyV34(id:string){return EFFECT_GEM_FAMILIES_V34.find(v=>v.id===id);}
export function gemGradeLabelV34(grade:GemGradeV34){const m=GEM_GRADE_META_V34[grade];return `${m.name} · Grade ${m.short}`;}
export function gemStatLabelV34(stat:GemStat){return ({attack:'Attack',defense:'Defense',hp:'Max HP',power:'Power',max_hp:'Max HP',armor:'Armor',ward:'Ward',accuracy:'Accuracy',crit_chance:'Critical Chance',crit_damage:'Critical Damage',penetration:'Penetration',haste:'Haste',potency:'Potency',evasion:'Evasion',tenacity:'Tenacity'} as Record<GemStat,string>)[stat];}
