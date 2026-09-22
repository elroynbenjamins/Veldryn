import type {AbilityDefinition,CombatantDefinition,DamageType} from '../types';
import {pveAllyMend,pveBarrier,pveDotWave,pveEnrage,pveExecuteStrike,pveFocusStrike,pveHealingPressure,pveHeavyStrike,pveHex,pveInterruptibleWave,pveSupportRally,withPveIdentity,type PveArchetype,type PveMechanicId} from '../pve-encounter-identity';

const stats=(maxHp:number,attackPower:number,defense:number,level:number)=>({maxHp,attackPower,healingPower:0,defense,accuracy:930,evasion:190,critChance:.06,critMultiplier:1.5,haste:.03});
const strike=(id:string,name:string,coeff:number,damageType:DamageType,target:'current_target'|'all_enemies'='current_target'):AbilityDefinition=>({id,name,cooldownMs:target==='all_enemies'?9800:6800,castTimeMs:target==='all_enemies'?1100:700,target,priority:target==='all_enemies'?90:70,interruptible:target==='all_enemies',effects:[{kind:'damage',coeff,damageType}]});
function normalIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(['Glacier Stalker','Icefang Hound','Glassbone Hound'].includes(name))return{archetype:'assassin',mechanics:['focus','execute']};
 if(['Choir Wisp','Ember Wraith','Crucible Imp'].includes(name))return{archetype:'caster',mechanics:['interrupt','aoe']};
 if(['Rime Cantor','Bellbound Shade','Charred Adept'].includes(name))return{archetype:'hexer',mechanics:['vulnerability','healing_reduction']};
 if(['Frozen Pilgrim','Glacial Acolyte','Molten Pilgrim'].includes(name))return{archetype:'support',mechanics:['sustain']};
 if(['Choir Sentinel','Cinderbound Guard','Ashen Colossus'].includes(name))return{archetype:'guardian',mechanics:['heavy_hit','barrier']};
 if(['Cinder Mireling'].includes(name))return{archetype:'swarm',mechanics:['aoe','dot']};
 if(['Fen Reaver','Prime Scoria'].includes(name))return{archetype:'executioner',mechanics:['heavy_hit','execute']};
 return{archetype:'bruiser',mechanics:['heavy_hit']};
}
function normalAbilities(id:string,name:string,type:DamageType,index:number,identity:ReturnType<typeof normalIdentity>):AbilityDefinition[]{
 const coeff=.96+index*.025;
 switch(identity.archetype){
  case 'assassin': return[pveFocusStrike(`${id}_HUNT`,`${name} Hunt`,type,coeff,7200)];
  case 'caster': return[pveInterruptibleWave(`${id}_CAST`,`${name} Channel`,type,.46+index*.02,9800,1200)];
  case 'hexer': return[pveHex(`${id}_HEX`,`${name} Hex`,type,.58+index*.02,7600),pveHealingPressure(`${id}_MEND_BREAK`,`${name} Withering Rite`,type,.42+index*.015,9000)];
  case 'support': return[pveAllyMend(`${id}_MEND`,`${name} Mend`,900+index*120,9200),pveSupportRally(`${id}_RALLY`,`${name} Rally`,.05,14500)];
  case 'guardian': return[pveHeavyStrike(`${id}_CRUSH`,`${name} Crush`,type,.92+index*.025,7200,700),pveBarrier(`${id}_WARD`,`${name} Ward`,700+index*120,13500)];
  case 'swarm': return[pveDotWave(`${id}_SWARM`,`${name} Swarm`,type,.38+index*.02,10500)];
  case 'executioner': return[pveExecuteStrike(`${id}_EXECUTE`,`${name} Execute`,type,coeff,7600)];
  case 'bruiser': default:return[pveHeavyStrike(`${id}_STRIKE`,`${name} Strike`,type,coeff,6800,700)];
 }
}
const enemy=(id:string,name:string,level:number,hp:number,attackPower:number,defense:number,type:DamageType,index:number):CombatantDefinition=>{
 const identity=normalIdentity(name);
 return withPveIdentity({id,name,team:'enemies',role:'enemy',level,stats:stats(hp,attackPower,defense,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities:normalAbilities(id,name,type,index,identity)},identity.archetype,identity.mechanics);
};

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
 let abilities:AbilityDefinition[]=[pveHeavyStrike(`${id}_BLAST`,`${name} Smash`,type,1.25+index*.04,7200,700)];
 if(identity.archetype==='guardian'){
  const crush=name==='Permafrost Warden'?'Permafrost Crush':'Crucible Crush',ward=name==='Permafrost Warden'?'Icebound Ward':'Furnace Ward';
  abilities=[pveHeavyStrike(`${id}_CRUSH`,crush,type,1.18+index*.04,7200,700),pveBarrier(`${id}_WARD`,ward,2400+index*220,13000)];
 }
 if(identity.archetype==='caster')abilities=[pveDotWave(`${id}_BLAST`,name==='Choirbreaker'?'Shattering Chorus':'Fenfire Deluge',type,.82+index*.03,9800)];
 if(identity.archetype==='executioner')abilities=[pveExecuteStrike(`${id}_EXECUTE`,'Blackglass Devour',type,1.25+index*.04,7200)];
 if(name==='Rimehorn Alpha')abilities=[pveHeavyStrike(`${id}_BLAST`,'Rimehorn Charge',type,1.22,7000,650),pveEnrage(`${id}_RAGE`,'Alpha Fury',.08,15000)];
 return[withPveIdentity({id,name,team:'enemies',role:'enemy',level,stats:stats(hp,attackPower,defense,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities},identity.archetype,identity.mechanics)];
}
function bossIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(name==='The Frozen Cantor')return{archetype:'caster',mechanics:['interrupt','aoe','dot','healing_reduction']};
 if(name==='The Blackglass Fen Prime')return{archetype:'executioner',mechanics:['heavy_hit','execute','vulnerability','aoe']};
 if(name==='The Crucible Prime')return{archetype:'guardian',mechanics:['heavy_hit','barrier','aoe','enrage']};
 return{archetype:'bruiser',mechanics:['heavy_hit','aoe','interrupt','enrage']};
}
function boss(id:string,name:string,level:number,type:DamageType,baseHp:number,baseAttack:number,baseDefense:number):CombatantDefinition[]{
 const identity=bossIdentity(name);
 let abilities:AbilityDefinition[],phases:NonNullable<CombatantDefinition['phases']>;
 if(name==='The Bellbeast of Shiverlake'){
  abilities=[
   pveHeavyStrike(`${id}_CHARGE`,'Shiverlake Charge',type,1.4,6800,700),
   pveInterruptibleWave(`${id}_QUAKE`,'Bellquake',type,1.0,10800,1450),
   pveEnrage(`${id}_FURY`,'Rimehorn Frenzy',.08,17000),
  ];
  phases=[
   {id:`${id}_PHASE_65`,name:'Cracked Bell',hpPct:.65,target:'all_enemies',effects:[{kind:'damage',coeff:.46,damageType:type},{kind:'debuff',tag:'damage_taken',value:.04,durationMs:5500}]},
   {id:`${id}_PHASE_30`,name:'Winter Stampede',hpPct:.30,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.14,durationMs:30000}]},
  ];
 }else if(name==='The Frozen Cantor'){
  abilities=[
   pveHex(`${id}_VERSE`,'Dissonant Verse',type,.8,7200),
   pveHealingPressure(`${id}_WITHER`,'Withering Refrain',type,.5,9000),
   pveDotWave(`${id}_TEMPEST`,'Choir Tempest',type,.78,10800),
  ];
  phases=[
   {id:`${id}_PHASE_60`,name:'First Refrain',hpPct:.60,target:'all_enemies',effects:[{kind:'damage',coeff:.44,damageType:type},{kind:'dot',coeff:.08,damageType:type,durationMs:6000,tickMs:2000}]},
   {id:`${id}_PHASE_30`,name:'Final Refrain',hpPct:.30,target:'all_enemies',effects:[{kind:'damage',coeff:.56,damageType:type},{kind:'debuff',tag:'damage_taken',value:.08,durationMs:8000}]},
  ];
 }else if(name==='The Blackglass Fen Prime'){
  abilities=[
   pveExecuteStrike(`${id}_EXECUTE`,'Blackglass Execution',type,1.35,7000),
   pveInterruptibleWave(`${id}_SHATTER`,'Fen Shatter',type,1.0,10800,1450),
   pveHex(`${id}_BRAND`,'Glassbrand',type,.56,9000),
  ];
  phases=[
   {id:`${id}_PHASE_55`,name:'Cracking Shell',hpPct:.55,target:'all_enemies',effects:[{kind:'damage',coeff:.52,damageType:type},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7500}]},
   {id:`${id}_PHASE_25`,name:'Devour the Weak',hpPct:.25,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.12,durationMs:30000}]},
  ];
 }else{
  abilities=[
   pveHeavyStrike(`${id}_HAMMER`,'Crucible Hammer',type,1.35,7000,700),
   pveInterruptibleWave(`${id}_COLLAPSE`,'Furnace Collapse',type,1.0,10800,1450),
   pveBarrier(`${id}_WARD`,'Molten Aegis',7200,16500),
   pveEnrage(`${id}_HEAT`,'Crucible Heat',.07,18000),
  ];
  phases=[
   {id:`${id}_PHASE_60`,name:'Tempered Shell',hpPct:.60,target:'self',effects:[{kind:'shield',flat:6500}]},
   {id:`${id}_PHASE_30`,name:'Overheat',hpPct:.30,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.15,durationMs:30000}]},
  ];
 }
 const definition:CombatantDefinition={id,name,team:'enemies',role:'enemy',level,boss:true,stats:stats(baseHp,baseAttack,baseDefense,level),basicAttackMs:2650,basicAttackCoeff:.8,abilities,phases};
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
