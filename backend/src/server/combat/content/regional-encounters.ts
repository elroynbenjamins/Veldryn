import type {AbilityDefinition,CombatantDefinition,DamageType} from '../types';
import {pveBarrier,pveDotWave,pveEnrage,pveExecuteStrike,pveHex,pveInterruptibleWave,pveSustain,withPveIdentity,type PveArchetype,type PveMechanicId} from '../pve-encounter-identity';

const stats=(maxHp:number,attackPower:number,defense:number,level:number)=>({maxHp,attackPower,healingPower:0,defense,accuracy:930,evasion:190,critChance:.06,critMultiplier:1.5,haste:.03});
const strike=(id:string,name:string,coeff:number,damageType:DamageType,target:'current_target'|'all_enemies'='current_target'):AbilityDefinition=>({id,name,cooldownMs:target==='all_enemies'?9800:6800,castTimeMs:target==='all_enemies'?1100:700,target,priority:target==='all_enemies'?90:70,interruptible:target==='all_enemies',effects:[{kind:'damage',coeff,damageType}]});
const enemy=(id:string,name:string,level:number,hp:number,attackPower:number,defense:number,type:DamageType,index:number):CombatantDefinition=>withPveIdentity({id,name,team:'enemies',role:'enemy',level,stats:stats(hp,attackPower,defense,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities:[strike(`${id}_STRIKE`,'Regional Strike',.96+index*.025,type)]},'bruiser',['heavy_hit']);

function battle(prefix:string,level:number,index:number,type:DamageType,names:[string,string],baseHp:number,baseAttack:number,baseDefense:number):CombatantDefinition[]{
 return[
  enemy(`${prefix}_A`,names[0],level,baseHp+index*650,baseAttack+index*80,baseDefense+index*55,type,index),
  enemy(`${prefix}_B`,names[1],level,baseHp-700+index*550,baseAttack-70+index*65,baseDefense-45+index*45,type,index),
 ];
}
function eliteIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(name==='Permafrost Warden'||name==='Crucible Warden')return{archetype:'guardian',mechanics:['heavy_hit','barrier']};
 if(name==='Choirbreaker'||name==='Fen Pyrecaller')return{archetype:'caster',mechanics:['interrupt','aoe','dot']};
 if(name==='Blackglass Devourer')return{archetype:'executioner',mechanics:['heavy_hit','execute']};
 if(name==='Rimehorn Alpha')return{archetype:'bruiser',mechanics:['heavy_hit','enrage']};
 return{archetype:'bruiser',mechanics:['heavy_hit']};
}
function elite(id:string,name:string,level:number,type:DamageType,index:number,baseHp:number,baseAttack:number,baseDefense:number):CombatantDefinition[]{
 const hp=baseHp+index*1700,attackPower=baseAttack+index*120,defense=baseDefense+index*95,identity=eliteIdentity(name);
 let abilities:AbilityDefinition[]=[strike(`${id}_BLAST`,'Regional Blast',1.25+index*.04,type,'all_enemies')];
 if(identity.archetype==='guardian')abilities=[strike(`${id}_CRUSH`,'Warden Crush',1.18+index*.04,type),pveBarrier(`${id}_WARD`,'Regional Ward',2400+index*220,13000)];
 if(identity.archetype==='caster')abilities=[pveDotWave(`${id}_BLAST`,'Lingering Blast',type,.82+index*.03,9800)];
 if(identity.archetype==='executioner')abilities=[pveExecuteStrike(`${id}_EXECUTE`,'Devouring Strike',type,1.25+index*.04,7200)];
 if(name==='Rimehorn Alpha')abilities=[strike(`${id}_BLAST`,'Rimehorn Charge',1.22,type),pveEnrage(`${id}_RAGE`,'Alpha Fury',.08,15000)];
 return[withPveIdentity({id,name,team:'enemies',role:'enemy',level,stats:stats(hp,attackPower,defense,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities},identity.archetype,identity.mechanics)];
}
function bossIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(name==='The Frozen Cantor')return{archetype:'caster',mechanics:['interrupt','aoe','dot','vulnerability']};
 if(name==='The Blackglass Fen Prime')return{archetype:'executioner',mechanics:['heavy_hit','execute','vulnerability','aoe']};
 if(name==='The Crucible Prime')return{archetype:'guardian',mechanics:['heavy_hit','barrier','aoe','enrage']};
 return{archetype:'bruiser',mechanics:['heavy_hit','aoe','interrupt','enrage']};
}
function boss(id:string,name:string,level:number,type:DamageType,baseHp:number,baseAttack:number,baseDefense:number):CombatantDefinition[]{
 const identity=bossIdentity(name);
 let lance:AbilityDefinition=strike(`${id}_LANCE`,'Regional Lance',1.4,type);
 let surge:AbilityDefinition={...strike(`${id}_SURGE`,'Regional Surge',1.05,type,'all_enemies'),cooldownMs:10800,castTimeMs:1450,interruptible:true};
 const abilities:AbilityDefinition[]=[];
 if(identity.archetype==='caster'){lance=pveHex(`${id}_LANCE`,'Cantor Hex',type,.8,7200);surge=pveDotWave(`${id}_SURGE`,'Choir Tempest',type,.78,10800);}
 if(identity.archetype==='executioner')lance=pveExecuteStrike(`${id}_LANCE`,'Fen Execution',type,1.35,7000);
 abilities.push(lance,surge);
 if(identity.archetype==='guardian')abilities.push(pveBarrier(`${id}_WARD`,'Crucible Ward',7200,16500),pveEnrage(`${id}_RAGE`,'Crucible Heat',.07,18000));
 else if(identity.archetype==='bruiser')abilities.push(pveEnrage(`${id}_RAGE`,'Regional Fury',.08,17000));
 const definition:CombatantDefinition={id,name,team:'enemies',role:'enemy',level,boss:true,stats:stats(baseHp,baseAttack,baseDefense,level),basicAttackMs:2650,basicAttackCoeff:.8,abilities,phases:[{id:`${id}_PHASE_50`,hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.68,damageType:type},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7500}]}]};
 return[withPveIdentity(definition,identity.archetype,identity.mechanics)];
}

export const FROSTMARCH_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={};
const frostBattleNames:[string,string][][]=[[['Rimewolf','Shiverling']],[['Glacier Stalker','Frostbound Scout']],[['Lake Warden','Icefang Hound']]];
for(const [index,id] of ['FROST_LAKE_BATTLE_01','FROST_LAKE_BATTLE_02','FROST_LAKE_BATTLE_03'].entries())FROSTMARCH_ENCOUNTERS[id]=()=>battle(id,70,index,'ice',frostBattleNames[index][0] as [string,string],13_500,5_000,1_450);
const frostChoirNames:[string,string][][]=[[['Choir Wisp','Rime Cantor']],[['Frozen Pilgrim','Bellbound Shade']],[['Choir Sentinel','Glacial Acolyte']]];
for(const [index,id] of ['FROST_CHOIR_BATTLE_01','FROST_CHOIR_BATTLE_02','FROST_CHOIR_BATTLE_03'].entries())FROSTMARCH_ENCOUNTERS[id]=()=>battle(id,70,index,'ice',frostChoirNames[index][0] as [string,string],13_900,5_100,1_500);
for(const [index,name] of ['Rimehorn Alpha','Choirbreaker','Permafrost Warden'].entries()){
 FROSTMARCH_ENCOUNTERS[`FROST_LAKE_ELITE_0${index+1}`]=()=>elite(`FROST_LAKE_ELITE_${index+1}`,name,70,'ice',index,35_000,5_600,2_100);
 FROSTMARCH_ENCOUNTERS[`FROST_CHOIR_ELITE_0${index+1}`]=()=>elite(`FROST_CHOIR_ELITE_${index+1}`,name,70,'ice',index,35_800,5_700,2_150);
}
FROSTMARCH_ENCOUNTERS.BOSS_EXP_BELLBEAST=()=>boss('BOSS_EXP_BELLBEAST','The Bellbeast of Shiverlake',70,'ice',112_000,6_500,2_500);
FROSTMARCH_ENCOUNTERS.BOSS_EXP_CANTOR=()=>boss('BOSS_EXP_CANTOR','The Frozen Cantor',70,'ice',116_000,6_650,2_550);

export const ASHLANDS_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={};
const ashBattleNames:[string,string][][]=[[['Cinder Mireling','Blackglass Beetle']],[['Ember Wraith','Ashen Marauder']],[['Fen Reaver','Glassbone Hound']],[['Crucible Imp','Charred Adept']],[['Molten Pilgrim','Cinderbound Guard']],[['Prime Scoria','Ashen Colossus']]];
const ashIds=['ASH_FEN_BATTLE_01','ASH_FEN_BATTLE_02','ASH_FEN_BATTLE_03','ASH_CRUCIBLE_BATTLE_01','ASH_CRUCIBLE_BATTLE_02','ASH_CRUCIBLE_BATTLE_03'];
for(const [index,id] of ashIds.entries())ASHLANDS_ENCOUNTERS[id]=()=>battle(id,94,index%3,'fire',ashBattleNames[index][0] as [string,string],15_500,6_300,1_850);
for(const [index,name] of ['Fen Pyrecaller','Blackglass Devourer','Crucible Warden'].entries()){
 ASHLANDS_ENCOUNTERS[`ASH_FEN_ELITE_0${index+1}`]=()=>elite(`ASH_FEN_ELITE_${index+1}`,name,94,'fire',index,39_000,7_000,2_500);
 ASHLANDS_ENCOUNTERS[`ASH_CRUCIBLE_ELITE_0${index+1}`]=()=>elite(`ASH_CRUCIBLE_ELITE_${index+1}`,name,94,'fire',index,41_000,7_200,2_550);
}
ASHLANDS_ENCOUNTERS.BOSS_EXP_FEN=()=>boss('BOSS_EXP_FEN','The Blackglass Fen Prime',94,'fire',125_000,8_200,2_900);
ASHLANDS_ENCOUNTERS.BOSS_EXP_PRIME=()=>boss('BOSS_EXP_PRIME','The Crucible Prime',94,'fire',132_000,8_400,2_950);
