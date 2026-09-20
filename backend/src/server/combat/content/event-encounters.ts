import type {CombatantDefinition,DamageType} from '../types';

const stats=(maxHp:number,attackPower:number,defense:number,level:number)=>({maxHp,attackPower,healingPower:0,defense,accuracy:930,evasion:190,critChance:.06,critMultiplier:1.5,haste:.03});

interface EventCombatTheme{
 prefix:string;
 names:[string,string,string];
 bossName:string;
 level:number;
 scale:number;
 damageType:DamageType;
 strike:string;
 wave:string;
 bossStrike:string;
 bossWave:string;
}

const encounter=(id:string,first:string,second:string,level:number,scale:number,damageType:DamageType,strike:string,wave:string):CombatantDefinition[]=>[
 {id:`${id}_A`,name:first,team:'enemies',role:'enemy',level,stats:stats(6_500*scale,2_800*scale,850*scale,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities:[{id:`${id}_A_HIT`,name:strike,cooldownMs:6800,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:1.02,damageType}]}]},
 {id:`${id}_B`,name:second,team:'enemies',role:'enemy',level,stats:stats(5_800*scale,2_600*scale,780*scale,level),basicAttackMs:2900,basicAttackCoeff:.72,abilities:[{id:`${id}_B_WAVE`,name:wave,cooldownMs:9600,castTimeMs:1100,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.72,damageType}]}]},
];
const boss=(id:string,name:string,level:number,scale:number,damageType:DamageType,strike:string,wave:string):CombatantDefinition[]=>[{id,name,team:'enemies',role:'enemy',level,boss:true,stats:stats(58_000*scale,3_700*scale,1_500*scale,level),basicAttackMs:2650,basicAttackCoeff:.8,abilities:[{id:`${id}_LANCE`,name:strike,cooldownMs:6800,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:1.4,damageType}]},{id:`${id}_NOVA`,name:wave,cooldownMs:10800,castTimeMs:1450,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:1.05,damageType}]}],phases:[{id:`${id}_PHASE_50`,hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.65,damageType},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7500}]}]}];

function themed(theme:EventCombatTheme):Record<string,()=>CombatantDefinition[]>{
 const {prefix,names,bossName,level,scale,damageType,strike,wave,bossStrike,bossWave}=theme;
 return {
  [`${prefix}_BATTLE_01`]:()=>encounter(`${prefix}_BATTLE_01`,names[0],names[1],level,scale,damageType,strike,wave),
  [`${prefix}_BATTLE_02`]:()=>encounter(`${prefix}_BATTLE_02`,names[1],names[2],level,scale*1.04,damageType,strike,wave),
  [`${prefix}_BATTLE_03`]:()=>encounter(`${prefix}_BATTLE_03`,names[2],names[0],level,scale*1.08,damageType,strike,wave),
  [`${prefix}_BOSS`]:()=>boss(`${prefix}_BOSS`,bossName,level,scale,damageType,bossStrike,bossWave),
 };
}

export const EVENT_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={
 ...themed({prefix:'EVENT_SUNCREST',names:['Suncrest Corsair','Shoreline Colossus','Solar Reef Warden'],bossName:'Aureon, First Champion',level:45,scale:1,damageType:'fire',strike:'Sunblade Strike',wave:'Arena Flare',bossStrike:'Champion Lance',bossWave:'Solar Arena'}),
 ...themed({prefix:'EVENT_STARFALL',names:['Astral Marauder','Meteoric Sentinel','Riftbound Herald'],bossName:'The Constellation Eater',level:70,scale:1.18,damageType:'arcane',strike:'Meteor Cut',wave:'Astral Wave',bossStrike:'Comet Lance',bossWave:'Constellation Collapse'}),
 ...themed({prefix:'EVENT_VEILBREAK',names:['Gloam Stalker','Lantern Eater','Veilbound Penitent'],bossName:'The Pale Bellkeeper',level:25,scale:.82,damageType:'shadow',strike:'Veil Slash',wave:'Lantern Drain',bossStrike:'Pale Toll',bossWave:'Gloam Chorus'}),
 ...themed({prefix:'EVENT_MERCHANT',names:['Road Reaver','Contract Wraith','Coinbound Golem'],bossName:'The Gilded Extortioner',level:20,scale:.76,damageType:'physical',strike:'Tollblade',wave:'Ledger Hex',bossStrike:'Debt Collector',bossWave:'Golden Tax'}),
 ...themed({prefix:'EVENT_FROSTFALL',names:['Rimebound Marauder','Bellfrost Warden','Aurora Revenant'],bossName:'The White Bell Beast',level:25,scale:.84,damageType:'ice',strike:'Rime Cleave',wave:'Cold Toll',bossStrike:'Frostfang',bossWave:'Frostbell Roar'}),
 ...themed({prefix:'EVENT_TURNING',names:['Yearless Remnant','Ageglass Sentinel','Dawnless Chronicler'],bossName:'The Last Hour',level:25,scale:.86,damageType:'arcane',strike:'Lost Second',wave:'Chronal Wave',bossStrike:'Hourglass Lance',bossWave:'Midnight Collapse'}),
 ...themed({prefix:'EVENT_HEARTBOND',names:['Thornbound Jealousy','Vowbreaker Shade','Heartglass Knight'],bossName:'The Unbound Heart',level:15,scale:.68,damageType:'shadow',strike:'Thorned Grasp',wave:'Vow Shatter',bossStrike:'Heartbreak',bossWave:'Broken Promise'}),
 ...themed({prefix:'EVENT_BLOOMWAKE',names:['Blightcap Ravager','Rootwoken Stag','Pollen Wraith'],bossName:'Elderbloom Devourer',level:20,scale:.74,damageType:'nature',strike:'Spore Rend',wave:'Verdant Charge',bossStrike:'Root Maw',bossWave:'Pollen Burst'}),
};
