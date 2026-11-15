import {MONSTERS} from '../src/content/monsters';
import {REGIONAL_AREAS,regionAreas} from '../src/content/regional-areas';
import {WORLD_ZONES} from '../src/content/world-map';
import {encounterIdentity,encounterProfileCoverage} from '../src/core/encounter-identity';
import {regionalEnemySecondaryStats} from '../src/core/regional-enemy-stats';
import {regionalClassCounter,regionalCounterCoverage} from '../src/core/regional-class-counter';
import {CLASSES} from '../src/content/classes';
import {itemDef} from '../src/content/items';
import {cumulativeMonsterUnlockIds,encounterLockRequirement,regionEncounters} from '../src/core/world-navigation';
import {combatSustainProjection,startCombat} from '../src/core/game';
import {regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import type {GameState} from '../src/core/types';
import {validateRegionalAreaContent} from '../src/core/region-area-activities';

const fs=require('fs') as {
 readFileSync(path:string,encoding:string):string;
 existsSync(path:string):boolean;
};
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const models=[
 ['DUSTVEIL_RUNNER','Sunscar','ZONE_006',32],
 ['SANDPLATE_JUGGERNAUT','Sunscar','ZONE_007',39],
 ['PRISM_HEXER','Sunscar','ZONE_008',45],
 ['CROWN_EXECUTIONER','Sunscar','ZONE_010',50],
 ['RIME_BERSERKER','Frostmarch','ZONE_011',57],
 ['FROSTNEEDLE_BROOD','Frostmarch','ZONE_012',64],
 ['CHOIR_DEFILER','Frostmarch','ZONE_013',70],
 ['STORMGLASS_COLOSSUS','Frostmarch','ZONE_015',75],
] as const;
const assets=fs.readFileSync('src/theme/monster-assets.ts','utf8');
const frame=fs.readFileSync('src/components/MonsterPortraitFrame.tsx','utf8');
check(fs.existsSync('assets/monsters/regional-monsters-v2.png'),'New 3x3 portrait atlas absent');
// PNG icon atlas: exactly three 48px cells across and down, with real alpha.
const png=Buffer.from(fs.readFileSync('assets/monsters/regional-monsters-v2.png','base64'),'base64');
check(png.subarray(1,4).toString('ascii')==='PNG','Portrait sheet is not a PNG');
check(png.readUInt32BE(16)===144&&png.readUInt32BE(20)===144,'New icon atlas must remain 3x3 at 48px/cell');
const pngColorType=png[25];
check(pngColorType===6||pngColorType===4||(pngColorType===3&&png.includes(Buffer.from('tRNS'))),'Enemy portraits need real transparency');
check(png.byteLength<32768,'New regional atlas exceeds the mobile 32KB asset budget');
check(assets.includes('newRegionalMonsterPortraitAtlas'),'New atlas must be statically bundled');
check(frame.includes('newRegionalMonsterPortraitCell(monster.id)'),'Portrait must select the new atlas cells');
for(const [id,region,area,level] of models){
 const row=MONSTERS.find(m=>m.id===id);
 check(row&&row.zone===region&&row.areaId===area&&row.level===level,id+' must resolve correct authored difficulty and area');
 check(row!.hp>0&&row!.attack>0&&row!.defense>0&&row!.xp>0&&row!.drops.length>0,id+' combat and reward configuration missing');
 check(row!.regionalAreaAutoUnlock,id+' must be eligible for area progression');
 check(assets.includes(id+':{column:'),id+' dedicated portrait cell missing');
 check(encounterIdentity(row!).id!=='OATHBOUND',id+' profile must be deliberate rather than generic default');
 const secondary=regionalEnemySecondaryStats(row!);
 check(secondary.accuracy>=.80&&secondary.accuracy<=.99,id+' secondary stats out of bounds');
}
check(validateRegionalAreaContent().length===0,'Area content validator must accept three enemies per area');
for(const [region,minimum,maximum] of [['SUNSCAR',26,50],['FROSTMARCH',51,75]] as const){
 const world=WORLD_ZONES.find(z=>z.id===region);
 check(world?.minLevel===minimum&&world?.maxLevel===maximum,region+' travel chapter band incorrect');
 const areas=regionAreas(region);
 check(areas.length===4,region+' must preserve four original subzones');
 const local=MONSTERS.filter(m=>m.zone.toUpperCase()===region&&!m.boss);
 check(local.length===12,region+' must have twelve ordinary enemies');
 check(Math.min(...local.map(m=>m.level))===minimum,region+' opening enemy must start at chapter minimum');
 check(Math.max(...local.map(m=>m.level))===maximum,region+' final enemy must end at chapter maximum');
 for(let i=0;i<areas.length;i++){
  const area=areas[i];
  check(local.filter(m=>m.areaId===area.id).length===3,area.id+' must contain three huntable enemies');
  check(local.filter(m=>m.areaId===area.id).every(m=>m.level>=area.minLevel&&m.level<=area.maxLevel),area.id+' level bands must contain all authored local enemies');
  if(i)check(areas[i-1].maxLevel>=area.minLevel,region+' adjacent subzones should overlap');
 }
 check(encounterProfileCoverage(local).missing.length===0,region+' monster identity coverage incomplete');
}
const covered=new Set(regionalCounterCoverage());
for(const cls of CLASSES)check(covered.has(cls.id),cls.id+' requires at least one favorable monster');
for(const [id] of models){
 for(const cls of CLASSES){
  const counter=regionalClassCounter(id,cls.id);
  check(counter.outputMultiplier>=1&&counter.outputMultiplier<=1.07,id+'/'+cls.id+' output advantage out of range');
  check(counter.incomingMultiplier>=.93&&counter.incomingMultiplier<=1,id+'/'+cls.id+' defensive advantage out of range');
 }
}
check(regionalClassCounter('MOSS_RAT','WAYFINDER').outputMultiplier===1,'Asterfall must retain neutral regional matchup');
// Regression: saved/cumulative region flags never bypass the new enemy level curve.
// Existing Asterfall and legacy regional monster unlocks are unchanged.
const balanceRows:Array<{id:string;classId:string;killsPerHour:number;foodPerHour:number}>=[];
for(const [id,region,area] of models){
 const monster=MONSTERS.find(m=>m.id===id)!;
 for(const drop of monster.drops){
  check(!!itemDef(drop.itemId),id+' loot must resolve to a valid item: '+drop.itemId);
  check(drop.chance>=0&&drop.chance<=1&&drop.min>=1&&drop.max>=drop.min,id+' invalid drop probability or stack');
 }
 const regionId=region.toUpperCase();
 const isFrost=region==='Frostmarch';
 const preparedLevel=monster.unlockLevel;
 const base={regionId,regionName:region,monsterId:id,level:preparedLevel,tier:isFrost?'T5':preparedLevel>=42?'T4':'T3',foodId:isFrost?'FROSTED_ICEFIN':'GRILLED_OASIS_CARP'};
 const early=regionalCombatFixture({...base,level:preparedLevel-1},'prepared','WAYFINDER');
 const blocked=encounterLockRequirement(early,monster);
 check(blocked?.kind==='level'&&blocked.level===monster.unlockLevel,id+' is accessible too early despite saved unlock ID');
 let started=false;try{startCombat(early,id,0);started=true;}catch{}
 check(!started,id+' can start a locked hunt');
 const unseen={...early,unlockedMonsterIds:early.unlockedMonsterIds.filter(x=>x!==id)} as GameState;
 check(!cumulativeMonsterUnlockIds(unseen).includes(id),id+' must not be pre-granted by cumulative unlock reconciliation');
 const ready=regionalCombatFixture(base,'prepared','WAYFINDER');
 check(!encounterLockRequirement(ready,monster),id+' should unlock at its authored level');
 for(const cls of CLASSES){
  const state=regionalCombatFixture(base,'prepared',cls.id);
  const projected=combatSustainProjection(state,id);
  check(!!projected,id+' '+cls.id+' missing long-hunt forecast');
  check(Number.isFinite(projected!.killsPerHour)&&projected!.killsPerHour>.5,id+' '+cls.id+' nonviable kill cadence');
  check(Number.isFinite(projected!.xpPerHour)&&projected!.xpPerHour>0,id+' '+cls.id+' invalid combat XP');
  check(Number.isFinite(projected!.goldPerHour)&&projected!.goldPerHour>0,id+' '+cls.id+' invalid Gold');
  check(Number.isFinite(projected!.foodPerHour)&&projected!.foodPerHour>=0,id+' '+cls.id+' invalid food projection');
  balanceRows.push({id,classId:cls.id,killsPerHour:projected!.killsPerHour,foodPerHour:projected!.foodPerHour});
 }
}
check(balanceRows.length===72,'Need all nine classes tested against the eight new encounters');
console.log('REGIONAL BALANCE '+JSON.stringify(models.map(([id])=>{
 const values=balanceRows.filter(x=>x.id===id);
 return {id,killsPerHourMin:Number(Math.min(...values.map(x=>x.killsPerHour)).toFixed(1)),killsPerHourMax:Number(Math.max(...values.map(x=>x.killsPerHour)).toFixed(1)),foodPerHourMax:Number(Math.max(...values.map(x=>x.foodPerHour)).toFixed(1))};
})));
const previewState=regionalCombatFixture({regionId:'SUNSCAR',regionName:'Sunscar',monsterId:'DUSTVEIL_RUNNER',level:32,tier:'T3',foodId:'GRILLED_OASIS_CARP'},'prepared','WAYFINDER');
for(const [name,zone] of [['Sunscar','ZONE_008'],['Frostmarch','ZONE_012']] as const){
 const rows=regionEncounters(previewState,name,'',false,zone);
 check(rows.length===3,name+' + '+zone+' must show all three encounters');
 check(rows.every((m,i)=>!i||rows[i-1].level<=m.level),name+' + '+zone+' must show low difficulty first');
}
const asterfallEncounters=regionEncounters(previewState,'Ironwood Forest','',false);
check(asterfallEncounters.map(x=>x.id).join(',')===MONSTERS.filter(x=>x.zone==='Ironwood Forest').map(x=>x.id).join(','),'Do not reorder existing Asterfall encounters');
const encounterUi=fs.readFileSync('src/components/RegionEncounterList.tsx','utf8');
check(encounterUi.includes('regionalClassCounter(monster.id,state.character.classId)'),'Class matchup must use the active character class');
check(encounterUi.includes('Favorable class matchup'),'Class advantage must be visible in the encounter details');
check(REGIONAL_AREAS.length===8,'Do not introduce additional subzones');
check(MONSTERS.find(m=>m.id==='FALLEN_KNIGHT')?.level===25,'Asterfall story boss unchanged');
console.log('PASS regional enemy wiring: 8 new portraits, 24 normal hunts, overlapping 26–75 chapter bands');
