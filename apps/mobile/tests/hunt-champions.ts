import {createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {championBonus,isChampionEncounter,CHAMPION_DAMAGE_MULTIPLIER} from '../src/core/hunt-champions';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const now=1_000_000;
let state=createCharacter(newGame(now),'WAYFINDER','Champion Tester');
const firstChampion=Array.from({length:5000},(_,index)=>index).find(index=>isChampionEncounter(state.character!.id,now,'MOSS_RAT',index));
ok(firstChampion!==undefined,'Champion schedule should produce a deterministic encounter in a long ordinary hunt');
ok(isChampionEncounter(state.character!.id,now,'MOSS_RAT',firstChampion!)===isChampionEncounter(state.character!.id,now,'MOSS_RAT',firstChampion!),'Champion rolls must be deterministic');
ok(CHAMPION_DAMAGE_MULTIPLIER>1,'Champion encounter must add real combat pressure');
const bonus=championBonus(20,3,2);ok(bonus.xp===120&&bonus.gold===24,'Champion bonus arithmetic drifted');

state=startCombat(state,'MOSS_RAT',now,undefined,'balanced');
const longPreview=previewActivityReward(state,now+24*60*60*1000);
ok((longPreview.championEncounters?.count??0)>0,'Long ordinary hunt should surface defeated Champion Encounters');
const repeated=previewActivityReward(state,now+24*60*60*1000);
ok(JSON.stringify(longPreview)===JSON.stringify(repeated),'Champion hunt previews must remain deterministic');

let challenge=createCharacter(newGame(now),'WAYFINDER','Challenge Tester');
challenge.character!.monsterMasteryPoints={MOSS_RAT:75};
challenge=startCombat(challenge,'MOSS_RAT',now,'ferocious','balanced');
const challengePreview=previewActivityReward(challenge,now+24*60*60*1000);
ok(!challengePreview.championEncounters,'Challenge Hunts must not stack random Champion Encounters');
console.log(JSON.stringify({status:'PASS',firstChampion,champions:longPreview.championEncounters?.count??0}));
