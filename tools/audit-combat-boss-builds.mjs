import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url),load=p=>require(path.join(root,'.combat-balance-build/apps/mobile/src',p+'.js'));
const game=load('core/game'),{REGIONAL_COMBAT_FIXTURES,regionalCombatFixture}=load('core/regional-combat-fixtures'),{CLASSES}=load('content/classes');
const {COMBAT_COMPANIONS}=load('content/combat-companions'),{unlockCombatCompanion,equipCombatCompanion}=load('core/combat-companions');
const {socketGem}=load('core/equipment-enhancement');
const region=REGIONAL_COMBAT_FIXTURES.find(r=>r.regionId==='KINGS_ROAD'),now=Date.UTC(2026,9,1,12),rows=[];
for(const cls of CLASSES)for(const preparation of ['bare','underprepared','prepared','optimized'])for(const role of ['none',...['tank','damage','support'].filter(r=>r!==cls.role.toLowerCase())])for(const build of ['plain','might','ward']){
 let state=preparation==='bare'?game.createCharacter(game.newGame(now),cls.id,'Unprepared'):regionalCombatFixture(region,preparation,cls.id),def=COMBAT_COMPANIONS.find(c=>c.role===role);
 if(preparation==='bare'){state.character.level=25;state.character.equippedFoodId=undefined;}
 state.inventory.stacks=preparation==='bare'?[]:[{itemId:region.foodId,quantity:100}];state.character.gold=100000;
 if(def){state=unlockCombatCompanion(state,def.id,now);state=equipCombatCompanion(state,def.id);}
 if(build!=='plain'){
  const gem=build==='might'?'gem:stat_might:g1':'gem:stat_iron:g1';
  state.inventory.stacks.push({itemId:gem,quantity:1});
  state=socketGem(state,state.character.equipment.weapon,gem);
  state.character.preparation={itemId:build==='might'?'OATH_VIGOR_TONIC':'OATH_WARD_TONIC',remainingEncounters:60};
 }
 state.character.currentHp=game.effectiveStats(state).hp;
 for(const mode of ['story','rematch']){
  let wins=0,food=0,duration=0;
  for(let seed=0;seed<12;seed++){
   const result=game.previewFallenKnightBattle(state,now+seed,mode);
   if(!Number.isFinite(result.durationMs)||!Number.isFinite(result.finalPlayerHp))throw Error('Invalid boss result');
   wins+=Number(result.won);food+=result.foodConsumed;duration+=result.durationMs;
  }
  rows.push({classId:cls.id,preparation,companion:def?.name??'None',build,mode,runs:12,wins,foodMean:food/12,durationSecondsMean:duration/12000});
 }
}
const groups=[];for(const mode of ['story','rematch'])for(const preparation of ['bare','underprepared','prepared','optimized']){const selected=rows.filter(r=>r.mode===mode&&r.preparation===preparation);groups.push({mode,preparation,runs:selected.reduce((n,r)=>n+r.runs,0),wins:selected.reduce((n,r)=>n+r.wins,0)});}
const out=path.join(root,'artifacts/combat-companion-audit');fs.writeFileSync(path.join(out,'boss-builds.json'),JSON.stringify({scope:'Fallen Knight story/rematch, nine classes, three stocked equipment fixtures plus bare starter gear at level 25 without food, legal starter-role companions, plain versus one G1 stat gem plus a preparation potion. Twelve deterministic seeds per case. This is not a full gem or companion-trial sweep.',groups,rows},null,2));console.log(JSON.stringify(groups));
