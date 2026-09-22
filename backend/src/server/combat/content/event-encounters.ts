import type {CombatantDefinition,DamageType} from '../types';
import {pveBarrier,pveDotWave,pveEnrage,pveExecuteStrike,pveFocusStrike,pveHealingPressure,pveHeavyStrike,pveHex,pveInterruptibleWave,withPveIdentity,type PveArchetype,type PveMechanicId} from '../pve-encounter-identity';

const stats=(maxHp:number,attackPower:number,defense:number,level:number)=>({maxHp,attackPower,healingPower:0,defense,accuracy:930,evasion:190,critChance:.06,critMultiplier:1.5,haste:.03});

function archetypeFor(name:string):PveArchetype{
 const exact:Record<string,PveArchetype>={
  'Veilshade Stalker':'assassin','Lantern-Eater':'executioner','Hollow Warden':'guardian',
  'Ledger Hexer':'hexer','Iron Tollkeeper':'guardian','Bellfrost Spirit':'caster','Giftwork Colossus':'guardian',
  'Briarling Swarm':'swarm','Pollenmaw':'hexer','Solar Reef Warden':'guardian','Meteoric Sentinel':'guardian',
  'Yearshade Archivist':'hexer','Dawnless Warden':'guardian','Sorrowbound Shade':'assassin','Shoreline Colossus':'bruiser',
 };
 return exact[name]??'bruiser';
}
function mechanicsFor(archetype:PveArchetype):PveMechanicId[]{
 switch(archetype){
  case 'assassin': return ['focus','execute'];
  case 'caster': return ['interrupt','aoe'];
  case 'swarm': return ['aoe','dot'];
  case 'guardian': return ['heavy_hit','barrier'];
  case 'hexer': return ['vulnerability','healing_reduction','dot'];
  case 'executioner': return ['heavy_hit','execute'];
  case 'support': return ['sustain'];
  case 'bruiser': default: return ['heavy_hit'];
 }
}
function primaryAbilities(id:string,name:string,archetype:PveArchetype,scale:number,damageType:DamageType,strikeName:string):CombatantDefinition['abilities']{
 switch(archetype){
  case 'assassin': return[pveFocusStrike(`${id}_A_HIT`,strikeName,damageType,.96,6800)];
  case 'caster': return[pveInterruptibleWave(`${id}_A_HIT`,strikeName,damageType,.68,9000,1200)];
  case 'swarm': return[pveDotWave(`${id}_A_HIT`,strikeName,damageType,.48,8500)];
  case 'guardian': return[pveHeavyStrike(`${id}_A_HIT`,strikeName,damageType,.9,7000,650),pveBarrier(`${id}_A_WARD`,`${name} Ward`,700*scale,12000)];
  case 'hexer': return[pveHex(`${id}_A_HIT`,strikeName,damageType,.62,7200),pveHealingPressure(`${id}_A_WITHER`,`${name} Healing Seal`,damageType,.4,9200),pveDotWave(`${id}_A_CURSE`,`${name} Curse`,damageType,.38,11000)];
  case 'executioner': return[pveExecuteStrike(`${id}_A_HIT`,strikeName,damageType,1.02,7000)];
  case 'support': return[pveHeavyStrike(`${id}_A_HIT`,strikeName,damageType,.72,7600,650),pveEnrage(`${id}_A_RALLY`,`${name} Rally`,.08,15000)];
  case 'bruiser': default: return[pveHeavyStrike(`${id}_A_HIT`,strikeName,damageType,1.02,6800,700)];
 }
}
const encounter=(id:string,name:string,level:number,scale:number,damageType:DamageType,strikeName='Event Strike',waveName='Event Wave'):CombatantDefinition[]=>{
 const archetype=archetypeFor(name),primary=withPveIdentity({id:`${id}_A`,name,team:'enemies',role:'enemy',level,stats:stats(6_500*scale,2_800*scale,850*scale,level),basicAttackMs:2750,basicAttackCoeff:.74,abilities:primaryAbilities(id,name,archetype,scale,damageType,strikeName)},archetype,mechanicsFor(archetype));
 const echo=withPveIdentity({id:`${id}_B`,name:`${name} Echo`,team:'enemies',role:'enemy',level,stats:stats(5_800*scale,2_600*scale,780*scale,level),basicAttackMs:2900,basicAttackCoeff:.72,abilities:[pveInterruptibleWave(`${id}_B_WAVE`,waveName,damageType,.72,9600,1100)]},'caster',['interrupt','aoe']);
 return[primary,echo];
};

function bossIdentity(name:string):{archetype:PveArchetype;mechanics:PveMechanicId[]}{
 if(name==='The Hollow Regent')return{archetype:'hexer',mechanics:['focus','execute','interrupt','dot']};
 if(name==='The Coinbound Captain')return{archetype:'bruiser',mechanics:['heavy_hit','aoe','interrupt','enrage']};
 if(name==='The Rimebell Colossus')return{archetype:'guardian',mechanics:['heavy_hit','aoe','interrupt','barrier']};
 if(name==='The Constellation Eater'||name==='The Last Hour')return{archetype:'caster',mechanics:['interrupt','aoe','vulnerability']};
 if(name==='The Thornheart Ancient')return{archetype:'bruiser',mechanics:['heavy_hit','aoe','enrage']};
 return{archetype:'bruiser',mechanics:['heavy_hit','aoe','interrupt','vulnerability']};
}
const boss=(id:string,name:string,level:number,scale:number,damageType:DamageType,lanceName='Event Lance',novaName='Event Nova'):CombatantDefinition[]=>{
 const identity=bossIdentity(name);
 let lance=pveHeavyStrike(`${id}_LANCE`,lanceName,damageType,1.4,6800,700);
 let nova=pveInterruptibleWave(`${id}_NOVA`,novaName,damageType,1.05,10800,1450);
 const extras:CombatantDefinition['abilities']=[];
 let phases:NonNullable<CombatantDefinition['phases']>=[{id:`${id}_PHASE_50`,name:'Pressure Break',hpPct:.5,target:'all_enemies',effects:[{kind:'damage',coeff:.65,damageType},{kind:'debuff',tag:'damage_taken',value:.06,durationMs:7500}]}];
 if(name==='The Hollow Regent'){
  lance=pveFocusStrike(`${id}_LANCE`,lanceName,damageType,1.12,7000);
  nova=pveDotWave(`${id}_NOVA`,novaName,damageType,.82,10800);
  phases=[
   {id:`${id}_PHASE_LANTERNS_DIM`,name:'Lanterns Dim',hpPct:.7,target:'all_enemies',effects:[{kind:'damage',coeff:.38,damageType:'shadow'},{kind:'dot',coeff:.08,damageType:'shadow',durationMs:6000,tickMs:2000}]},
   {id:`${id}_PHASE_REGENTS_DECREE`,name:"Regent's Decree",hpPct:.35,target:'random_enemy',effects:[{kind:'damage',coeff:.72,damageType:'shadow',executeBelowHpPct:.35,executeBonus:.25}]},
  ];
 }
 if(name==='The Coinbound Captain'){
  extras.push(pveEnrage(`${id}_RALLY`,'Gilded Rally',.08,16000));
  phases=[
   {id:`${id}_PHASE_TOLL_DUE`,name:'Toll Is Due',hpPct:.7,target:'all_enemies',effects:[{kind:'damage',coeff:.42,damageType:'physical'},{kind:'debuff',tag:'damage_taken',value:.05,durationMs:6500}]},
   {id:`${id}_PHASE_CAPTAINS_SHARE`,name:"Captain's Share",hpPct:.35,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.12,durationMs:30000},{kind:'buff',tag:'crit',value:.06,durationMs:30000}]},
  ];
 }
 if(name==='The Rimebell Colossus'){
  extras.push(pveBarrier(`${id}_WARD`,'Rimebell Ward',3200*scale,15000));
  phases=[
   {id:`${id}_PHASE_FROZEN_CARAPACE`,name:'Frozen Carapace',hpPct:.65,target:'self',effects:[{kind:'shield',flat:4200*scale}]},
   {id:`${id}_PHASE_LAST_TOLL`,name:'Last Toll',hpPct:.3,target:'all_enemies',effects:[{kind:'damage',coeff:.62,damageType:'ice'}]},
  ];
 }
 const definition:CombatantDefinition={id,name,team:'enemies',role:'enemy',level,boss:true,stats:stats(58_000*scale,3_700*scale,1_500*scale,level),basicAttackMs:2650,basicAttackCoeff:.8,abilities:[lance,nova,...extras],phases};
 return[withPveIdentity(definition,identity.archetype,identity.mechanics)];
};

export const EVENT_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={
 EVENT_SUNCREST_BATTLE_01:()=>encounter('EVENT_SUNCREST_BATTLE_01','Suncrest Corsair',45,1,'fire'),EVENT_SUNCREST_BATTLE_02:()=>encounter('EVENT_SUNCREST_BATTLE_02','Shoreline Colossus',45,1.04,'fire'),EVENT_SUNCREST_BATTLE_03:()=>encounter('EVENT_SUNCREST_BATTLE_03','Solar Reef Warden',45,1.08,'fire'),
 EVENT_STARFALL_BATTLE_01:()=>encounter('EVENT_STARFALL_BATTLE_01','Astral Marauder',70,1.18,'arcane'),EVENT_STARFALL_BATTLE_02:()=>encounter('EVENT_STARFALL_BATTLE_02','Meteoric Sentinel',70,1.23,'arcane'),EVENT_STARFALL_BATTLE_03:()=>encounter('EVENT_STARFALL_BATTLE_03','Riftbound Herald',70,1.28,'arcane'),
 EVENT_SUNCREST_BOSS:()=>boss('EVENT_SUNCREST_BOSS','Aureon, First Champion',45,1,'fire',"Champion's Lance",'Solar Nova'),EVENT_STARFALL_BOSS:()=>boss('EVENT_STARFALL_BOSS','The Constellation Eater',70,1.18,'arcane','Astral Lance','Constellation Nova'),
 EVENT_TURNING_BATTLE_01:()=>encounter('EVENT_TURNING_BATTLE_01','Yearshade Archivist',50,1.12,'arcane'),
 EVENT_TURNING_BATTLE_02:()=>encounter('EVENT_TURNING_BATTLE_02','Hourglass Golem',50,1.16,'arcane'),
 EVENT_TURNING_BATTLE_03:()=>encounter('EVENT_TURNING_BATTLE_03','Dawnless Warden',50,1.2,'arcane'),
 EVENT_HEARTBOND_BATTLE_01:()=>encounter('EVENT_HEARTBOND_BATTLE_01','Vowbreaker Brigand',30,.92,'fire'),
 EVENT_HEARTBOND_BATTLE_02:()=>encounter('EVENT_HEARTBOND_BATTLE_02','Thorned Effigy',30,.96,'arcane'),
 EVENT_HEARTBOND_BATTLE_03:()=>encounter('EVENT_HEARTBOND_BATTLE_03','Sorrowbound Shade',30,1,'arcane'),
 EVENT_BLOOMWAKE_BATTLE_01:()=>encounter('EVENT_BLOOMWAKE_BATTLE_01','Briarling Swarm',30,.95,'fire'),
 EVENT_BLOOMWAKE_BATTLE_02:()=>encounter('EVENT_BLOOMWAKE_BATTLE_02','Pollenmaw',30,1,'arcane'),
 EVENT_BLOOMWAKE_BATTLE_03:()=>encounter('EVENT_BLOOMWAKE_BATTLE_03','Rootbound Stag',30,1.05,'arcane'),
 EVENT_TURNING_BOSS:()=>boss('EVENT_TURNING_BOSS','The Last Hour',50,1.12,'arcane','Chronicle Rend','Last Hour Nova'),
 EVENT_HEARTBOND_BOSS:()=>boss('EVENT_HEARTBOND_BOSS','The Severed Vow',30,.95,'arcane','Vow Sever','Heartbreak Nova'),
 EVENT_BLOOMWAKE_BOSS:()=>boss('EVENT_BLOOMWAKE_BOSS','The Thornheart Ancient',30,1,'arcane','Thornheart Slam','Verdant Cataclysm'),
 EVENT_VEILBREAK_BATTLE_01:()=>encounter('EVENT_VEILBREAK_BATTLE_01','Veilshade Stalker',35,1.02,'shadow','Gloam Rend','Veil Pulse'),
 EVENT_VEILBREAK_BATTLE_02:()=>encounter('EVENT_VEILBREAK_BATTLE_02','Lantern-Eater',35,1.06,'shadow','Snuffing Bite','Blackout Wave'),
 EVENT_VEILBREAK_BATTLE_03:()=>encounter('EVENT_VEILBREAK_BATTLE_03','Hollow Warden',35,1.1,'arcane','Wardbreaker','Hollow Toll'),
 EVENT_MERCHANT_BATTLE_01:()=>encounter('EVENT_MERCHANT_BATTLE_01','Road Reaver',35,1,'physical','Tollblade','Ambush Cry'),
 EVENT_MERCHANT_BATTLE_02:()=>encounter('EVENT_MERCHANT_BATTLE_02','Ledger Hexer',35,1.04,'arcane','Debt Mark','Compound Curse'),
 EVENT_MERCHANT_BATTLE_03:()=>encounter('EVENT_MERCHANT_BATTLE_03','Iron Tollkeeper',35,1.08,'physical','Gatehammer','Lockdown Sweep'),
 EVENT_FROSTFALL_BATTLE_01:()=>encounter('EVENT_FROSTFALL_BATTLE_01','Rimefang Marauder',35,1.02,'ice','Rimefang','Snowblind Howl'),
 EVENT_FROSTFALL_BATTLE_02:()=>encounter('EVENT_FROSTFALL_BATTLE_02','Bellfrost Spirit',35,1.06,'ice','Chime Shard','Winter Peal'),
 EVENT_FROSTFALL_BATTLE_03:()=>encounter('EVENT_FROSTFALL_BATTLE_03','Giftwork Colossus',35,1.1,'ice','Wrapped Fist','Toybox Avalanche'),
 EVENT_VEILBREAK_BOSS:()=>boss('EVENT_VEILBREAK_BOSS','The Hollow Regent',35,1.05,'shadow','Regent’s Grasp','Lantern Extinction'),
 EVENT_MERCHANT_BOSS:()=>boss('EVENT_MERCHANT_BOSS','The Coinbound Captain',35,1.03,'physical','Golden Cleaver','Caravan Breaker'),
 EVENT_FROSTFALL_BOSS:()=>boss('EVENT_FROSTFALL_BOSS','The Rimebell Colossus',35,1.07,'ice','Rimebell Hammer','Aurora Shatter'),
};
