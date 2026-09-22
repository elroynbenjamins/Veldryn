import type {AbilityDefinition,CombatantDefinition} from '../types';
import {pveBarrier,pveFocusStrike,pveHex,pveInterruptibleWave,withPveIdentity,type PveArchetype,type PveMechanicId} from '../pve-encounter-identity';

const stats=(maxHp:number,attackPower:number,defense:number,accuracy=910,evasion=220)=>({maxHp,attackPower,healingPower:0,defense,accuracy,evasion,critChance:.06,critMultiplier:1.5,haste:.03});
const strike=(id:string,name:string,coeff:number,damageType:'physical'|'fire'|'arcane',target:'current_target'|'all_enemies'='current_target',castTimeMs=650):AbilityDefinition=>({id,name,cooldownMs:target==='all_enemies'?9500:6800,castTimeMs,target,priority:target==='all_enemies'?90:70,interruptible:castTimeMs>900,effects:[{kind:'damage',coeff,damageType}]});
const enemy=(id:string,name:string,hp:number,ap:number,def:number,ability:AbilityDefinition,archetype:PveArchetype='bruiser',mechanics:PveMechanicId[]=['heavy_hit']):CombatantDefinition=>withPveIdentity({id,name,team:'enemies',role:'enemy',level:45,stats:stats(hp,ap,def),basicAttackMs:2800,basicAttackCoeff:.72,abilities:[ability]},archetype,mechanics);

const pairs:Array<[string,string,string,'physical'|'fire'|'arcane',number]>=[
 ['SUN_OBS_BATTLE_01','Sunstone Custodian','Amberglass Scribe','fire',0],['SUN_OBS_BATTLE_02','Orrery Scarab','Solar Watcher','arcane',1],['SUN_OBS_BATTLE_03','Dustbound Scholar','Heliolith Drone','fire',2],
 ['SUN_MIRAGE_BATTLE_01','Mirage Jackal','Glassscale Stalker','physical',0],['SUN_MIRAGE_BATTLE_02','Dune Phantom','Well Guardian','arcane',1],['SUN_MIRAGE_BATTLE_03','Sunscored Prowler','Amberglass Asp','fire',2],
];

export const SUNSCAR_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={};
for(const [id,first,second,type,index] of pairs)SUNSCAR_ENCOUNTERS[id]=()=>[
 enemy(`${id}_A`,first,8_300+index*450,3_100+index*50,980+index*45,strike(`${id}_A_SWEEP`,'Scouring Wave',.92+index*.025,type,'all_enemies',1050),'caster',['interrupt','aoe']),
 enemy(`${id}_B`,second,7_500+index*400,2_900+index*45,920+index*40,strike(`${id}_B_STRIKE`,'Scouring Hit',.96+index*.03,type),'bruiser',['heavy_hit']),
];

function eliteIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(name==='Orrery Warden'||name==='Amberglass Sentinel'||name==='Wellbound Colossus')return{archetype:'guardian',mechanics:['heavy_hit','barrier']};
 if(name==='Solar Archivist')return{archetype:'caster',mechanics:['interrupt','aoe']};
 if(name==='Dune Sphinx')return{archetype:'hexer',mechanics:['vulnerability','dot']};
 if(name==='Veiled Huntmaster')return{archetype:'assassin',mechanics:['focus','execute']};
 return{archetype:'bruiser',mechanics:['heavy_hit']};
}
function elite(id:string,name:string,type:'physical'|'fire'|'arcane',index:number):CombatantDefinition[]{
 const hp=22_000+index*1_200,ap=3_400+index*75,def=1_420+index*70,identity=eliteIdentity(name);
 let abilities:AbilityDefinition[]=[strike(`${id}_BURST`,'Focused Burst',1.22+index*.04,type,'all_enemies',1150)];
 if(identity.archetype==='guardian')abilities=[strike(`${id}_STRIKE`,'Sentinel Crush',1.05+index*.04,type),pveBarrier(`${id}_WARD`,'Amberglass Ward',1800+index*180,12500)];
 if(identity.archetype==='hexer')abilities=[pveHex(`${id}_HEX`,'Mirage Hex',type,.7,7200),pveInterruptibleWave(`${id}_BURST`,'Sphinx Riddleburst',type,.55,10500,1300)];
 if(identity.archetype==='assassin')abilities=[pveFocusStrike(`${id}_HUNT`,'Marked Quarry',type,1.05,7000)];
 return[withPveIdentity({id,name,team:'enemies',role:'enemy',level:45,stats:stats(hp,ap,def),basicAttackMs:2800,basicAttackCoeff:.72,abilities},identity.archetype,identity.mechanics)];
}
for(const [prefix,names,type] of [
 ['SUN_OBS',['Orrery Warden','Solar Archivist','Amberglass Sentinel'],'arcane'],
 ['SUN_MIRAGE',['Dune Sphinx','Veiled Huntmaster','Wellbound Colossus'],'fire'],
] as const)names.forEach((name,index)=>{SUNSCAR_ENCOUNTERS[`${prefix}_ELITE_0${index+1}`]=()=>elite(`${prefix}_ELITE_${index+1}`,name,type,index)});

function boss(id:string,name:string,type:'fire'|'arcane',attackPower=3_900):CombatantDefinition[]{
 const hex=name==='The Veiled Sphinx',archetype:PveArchetype=hex?'hexer':'guardian',mechanics:PveMechanicId[]=hex?['vulnerability','interrupt','aoe','focus']:['heavy_hit','interrupt','aoe','barrier'];
 const lance=hex?pveFocusStrike(`${id}_LANCE`,'Sphinx Pursuit',type,1.22,7000):strike(`${id}_LANCE`,'Solar Lance',1.38,type);
 const abilities:AbilityDefinition[]=[lance,{...strike(`${id}_NOVA`,'Radiant Collapse',1.0,type,'all_enemies',1450),cooldownMs:10500,interruptible:true}];
 if(hex)abilities.push(pveHex(`${id}_HEX`,'Veiled Verdict',type,.6,9000));else abilities.push(pveBarrier(`${id}_WARD`,'Amberglass Ward',5200,16000));
 const definition:CombatantDefinition={id,name,team:'enemies',role:'enemy',level:45,boss:true,stats:stats(68_000,attackPower,1_650,940,180),basicAttackMs:2600,basicAttackCoeff:.78,abilities,phases:[{id:`${id}_PHASE_50`,hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.62,damageType:type},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7000}]}]};
 return[withPveIdentity(definition,archetype,mechanics)];
}

SUNSCAR_ENCOUNTERS.BOSS_EXP_SOLAR=()=>boss('BOSS_EXP_SOLAR','The Buried Heliarch','fire',4_000);
SUNSCAR_ENCOUNTERS.BOSS_EXP_SPHINX=()=>boss('BOSS_EXP_SPHINX','The Veiled Sphinx','arcane');
