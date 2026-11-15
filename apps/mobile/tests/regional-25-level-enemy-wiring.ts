import {MONSTERS} from '../src/content/monsters';
import {REGIONAL_AREAS,regionAreas} from '../src/content/regional-areas';
import {WORLD_ZONES} from '../src/content/world-map';
import {encounterIdentity,encounterProfileCoverage} from '../src/core/encounter-identity';
import {regionalEnemySecondaryStats} from '../src/core/regional-enemy-stats';
import {regionalClassCounter,regionalCounterCoverage} from '../src/core/regional-class-counter';
import {CLASSES} from '../src/content/classes';
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
check(REGIONAL_AREAS.length===8,'Do not introduce additional subzones');
check(MONSTERS.find(m=>m.id==='FALLEN_KNIGHT')?.level===25,'Asterfall story boss unchanged');
console.log('PASS regional enemy wiring: 8 new portraits, 24 normal hunts, overlapping 26–75 chapter bands');
