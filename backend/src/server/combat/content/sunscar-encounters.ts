import type {AbilityDefinition,CombatantDefinition} from '../types';

const stats=(maxHp:number,attackPower:number,defense:number,accuracy=910,evasion=220)=>({maxHp,attackPower,healingPower:0,defense,accuracy,evasion,critChance:.06,critMultiplier:1.5,haste:.03});
const strike=(id:string,name:string,coeff:number,damageType:'physical'|'fire'|'arcane',target:'current_target'|'all_enemies'='current_target',castTimeMs=650):AbilityDefinition=>({id,name,cooldownMs:target==='all_enemies'?9500:6800,castTimeMs,target,priority:target==='all_enemies'?90:70,interruptible:castTimeMs>900,effects:[{kind:'damage',coeff,damageType}]});
const enemy=(id:string,name:string,hp:number,ap:number,def:number,ability:AbilityDefinition):CombatantDefinition=>({id,name,team:'enemies',role:'enemy',level:45,stats:stats(hp,ap,def),basicAttackMs:2800,basicAttackCoeff:.72,abilities:[ability]});

const pairs:Array<[string,string,string,'physical'|'fire'|'arcane',number]>=[
  ['SUN_OBS_BATTLE_01','Sunstone Custodian','Amberglass Scribe','fire',0],['SUN_OBS_BATTLE_02','Orrery Scarab','Solar Watcher','arcane',1],['SUN_OBS_BATTLE_03','Dustbound Scholar','Heliolith Drone','fire',2],
  ['SUN_MIRAGE_BATTLE_01','Mirage Jackal','Glassscale Stalker','physical',0],['SUN_MIRAGE_BATTLE_02','Dune Phantom','Well Guardian','arcane',1],['SUN_MIRAGE_BATTLE_03','Sunscored Prowler','Amberglass Asp','fire',2],
];

export const SUNSCAR_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={};
for(const [id,first,second,type,index] of pairs)SUNSCAR_ENCOUNTERS[id]=()=>[
  enemy(`${id}_A`,first,8_300+index*450,3_100+index*50,980+index*45,strike(`${id}_A_SWEEP`,'Scouring Wave',.92+index*.025,type,'all_enemies',1050)),
  enemy(`${id}_B`,second,7_500+index*400,2_900+index*45,920+index*40,strike(`${id}_B_STRIKE`,'Scouring Hit',.96+index*.03,type)),
];

function elite(id:string,name:string,type:'physical'|'fire'|'arcane',index:number):CombatantDefinition[]{return[enemy(id,name,22_000+index*1_200,3_400+index*75,1_420+index*70,strike(`${id}_BURST`,'Focused Burst',1.22+index*.04,type,'all_enemies',1150))]}
for(const [prefix,names,type] of [
  ['SUN_OBS',['Orrery Warden','Solar Archivist','Amberglass Sentinel'],'arcane'],
  ['SUN_MIRAGE',['Dune Sphinx','Veiled Huntmaster','Wellbound Colossus'],'fire'],
] as const)names.forEach((name,index)=>{SUNSCAR_ENCOUNTERS[`${prefix}_ELITE_0${index+1}`]=()=>elite(`${prefix}_ELITE_${index+1}`,name,type,index)});

function boss(id:string,name:string,type:'fire'|'arcane',attackPower=3_900):CombatantDefinition[]{return[{id,name,team:'enemies',role:'enemy',level:45,boss:true,stats:stats(68_000,attackPower,1_650,940,180),basicAttackMs:2600,basicAttackCoeff:.78,abilities:[
  strike(`${id}_LANCE`,'Solar Lance',1.38,type),
  {...strike(`${id}_NOVA`,'Radiant Collapse',1.0,type,'all_enemies',1450),cooldownMs:10500,interruptible:true},
  {id:`${id}_WARD`,name:'Amberglass Ward',cooldownMs:16000,castTimeMs:0,target:'self',priority:65,effects:[{kind:'shield',coeff:1.25}]},
],phases:[{id:`${id}_PHASE_50`,hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.62,damageType:type},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7000}]}]}]}

SUNSCAR_ENCOUNTERS.BOSS_EXP_SOLAR=()=>boss('BOSS_EXP_SOLAR','The Buried Heliarch','fire',4_000);
SUNSCAR_ENCOUNTERS.BOSS_EXP_SPHINX=()=>boss('BOSS_EXP_SPHINX','The Veiled Sphinx','arcane');
