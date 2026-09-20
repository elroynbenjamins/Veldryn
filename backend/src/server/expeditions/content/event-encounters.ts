import type { CombatantDefinition } from '../../combat/types';

const stats=(maxHp:number,attackPower:number,defense:number,level:number)=>({maxHp,attackPower,healingPower:0,defense,accuracy:930,evasion:190,critChance:.06,critMultiplier:1.5,haste:.03});
const encounter=(id:string,name:string,level:number,scale:number,damageType:'fire'|'arcane'):CombatantDefinition[]=>[
 {id:`${id}_A`,name,team:'enemies',role:'enemy',level,stats:stats(12_000*scale,5_000*scale,1_450*scale,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities:[{id:`${id}_A_HIT`,name:'Event Strike',cooldownMs:6800,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:1.02,damageType}]}]},
 {id:`${id}_B`,name:`${name} Echo`,team:'enemies',role:'enemy',level,stats:stats(10_500*scale,4_700*scale,1_350*scale,level),basicAttackMs:2900,basicAttackCoeff:.72,abilities:[{id:`${id}_B_WAVE`,name:'Event Wave',cooldownMs:9600,castTimeMs:1100,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.72,damageType}]}]},
];
const boss=(id:string,name:string,level:number,scale:number,damageType:'fire'|'arcane'):CombatantDefinition[]=>[{id,name,team:'enemies',role:'enemy',level,boss:true,stats:stats(118_000*scale,6_900*scale,2_500*scale,level),basicAttackMs:2650,basicAttackCoeff:.8,abilities:[{id:`${id}_LANCE`,name:'Event Lance',cooldownMs:6800,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:1.4,damageType}]},{id:`${id}_NOVA`,name:'Event Nova',cooldownMs:10800,castTimeMs:1450,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:1.05,damageType}]}],phases:[{id:`${id}_PHASE_50`,hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.65,damageType},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7500}]}]}];
export const EVENT_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={
 EVENT_SUNCREST_BATTLE_01:()=>encounter('EVENT_SUNCREST_BATTLE_01','Suncrest Corsair',45,1,'fire'),
 EVENT_SUNCREST_BATTLE_02:()=>encounter('EVENT_SUNCREST_BATTLE_02','Shoreline Colossus',45,1.04,'fire'),
 EVENT_SUNCREST_BATTLE_03:()=>encounter('EVENT_SUNCREST_BATTLE_03','Solar Reef Warden',45,1.08,'fire'),
 EVENT_STARFALL_BATTLE_01:()=>encounter('EVENT_STARFALL_BATTLE_01','Astral Marauder',70,1.18,'arcane'),
 EVENT_STARFALL_BATTLE_02:()=>encounter('EVENT_STARFALL_BATTLE_02','Meteoric Sentinel',70,1.23,'arcane'),
 EVENT_STARFALL_BATTLE_03:()=>encounter('EVENT_STARFALL_BATTLE_03','Riftbound Herald',70,1.28,'arcane'),
 EVENT_SUNCREST_BOSS:()=>boss('EVENT_SUNCREST_BOSS','Aureon, First Champion',45,1,'fire'),
 EVENT_STARFALL_BOSS:()=>boss('EVENT_STARFALL_BOSS','The Constellation Eater',70,1.18,'arcane'),
 EVENT_TURNING_BATTLE_01:()=>encounter('EVENT_TURNING_BATTLE_01','Yearshade Archivist',50,1.12,'arcane'),
 EVENT_TURNING_BATTLE_02:()=>encounter('EVENT_TURNING_BATTLE_02','Hourglass Golem',50,1.16,'arcane'),
 EVENT_TURNING_BATTLE_03:()=>encounter('EVENT_TURNING_BATTLE_03','Dawnless Warden',50,1.2,'arcane'),
 EVENT_HEARTBOND_BATTLE_01:()=>encounter('EVENT_HEARTBOND_BATTLE_01','Vowbreaker Brigand',30,.92,'fire'),
 EVENT_HEARTBOND_BATTLE_02:()=>encounter('EVENT_HEARTBOND_BATTLE_02','Thorned Effigy',30,.96,'arcane'),
 EVENT_HEARTBOND_BATTLE_03:()=>encounter('EVENT_HEARTBOND_BATTLE_03','Sorrowbound Shade',30,1,'arcane'),
 EVENT_BLOOMWAKE_BATTLE_01:()=>encounter('EVENT_BLOOMWAKE_BATTLE_01','Briarling Swarm',30,.95,'fire'),
 EVENT_BLOOMWAKE_BATTLE_02:()=>encounter('EVENT_BLOOMWAKE_BATTLE_02','Pollenmaw',30,1,'arcane'),
 EVENT_BLOOMWAKE_BATTLE_03:()=>encounter('EVENT_BLOOMWAKE_BATTLE_03','Rootbound Stag',30,1.05,'arcane'),
 EVENT_TURNING_BOSS:()=>boss('EVENT_TURNING_BOSS','The Last Hour',50,1.12,'arcane'),
 EVENT_HEARTBOND_BOSS:()=>boss('EVENT_HEARTBOND_BOSS','The Severed Vow',30,.95,'arcane'),
 EVENT_BLOOMWAKE_BOSS:()=>boss('EVENT_BLOOMWAKE_BOSS','The Thornheart Ancient',30,1,'arcane'),
};
