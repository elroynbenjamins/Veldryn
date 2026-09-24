import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {newlyUnlockedEarlyFeatures} from '../src/core/feature-unlocks';

function claimQuest(state:any,id:string,progress:number){
 return {...state,quests:state.quests.map((q:any)=>q.questId===id?{...q,status:'claimed' as const,progress}:q)};
}

const base=createCharacter(newGame(0),'IRONWARDEN','Unlock Moment Test');

const starter=claimQuest(base,'QST_002',2);
const starterMoments=newlyUnlockedEarlyFeatures(base,starter);
assert.equal(starterMoments.length,1);
assert.equal(starterMoments[0].id,'workingToward');
assert.equal(starterMoments[0].destination,'Progression');
assert.ok(starterMoments[0].bullets.some(line=>line.includes('Daily Supplies')));
assert.ok(starterMoments[0].bullets.some(line=>line.includes('Live Events')));
assert.equal(newlyUnlockedEarlyFeatures(starter,starter).length,0,'already-revealed first systems must not reveal again');

const pets=claimQuest(starter,'QST_003',6);
const petMoments=newlyUnlockedEarlyFeatures(starter,pets);
assert.equal(petMoments.length,1);
assert.equal(petMoments[0].id,'pets');
assert.equal(petMoments[0].destination,'Collections');
assert.ok(petMoments[0].bullets.some(line=>line.includes('Account Bonuses')));
assert.ok(petMoments[0].bullets.some(line=>line.includes('Friends')));
assert.equal(newlyUnlockedEarlyFeatures(pets,pets).length,0,'already-unlocked Pets must not reveal again');

const companions=claimQuest(pets,'QST_005',10);
const companionMoments=newlyUnlockedEarlyFeatures(pets,companions);
assert.equal(companionMoments.length,1);
assert.equal(companionMoments[0].id,'companions');
assert.equal(companionMoments[0].destination,'Companions');
assert.ok(companionMoments[0].bullets.some(line=>line.includes('Housing')));
assert.ok(companionMoments[0].bullets.some(line=>line.includes('Contract Board')));
assert.equal(newlyUnlockedEarlyFeatures(companions,companions).length,0,'already-unlocked Companions must not reveal again');

const preDungeon={...companions,character:{...companions.character!,level:14}};
const dungeon={...preDungeon,character:{...preDungeon.character!,level:15}};
const dungeonMoments=newlyUnlockedEarlyFeatures(preDungeon,dungeon);
assert.equal(dungeonMoments.length,1);
assert.equal(dungeonMoments[0].id,'dungeons');
assert.equal(dungeonMoments[0].destination,'Coop');
assert.ok(dungeonMoments[0].title.includes('Dungeons'));

const guilds=claimQuest(dungeon,'QST_011',20);
const guildMoments=newlyUnlockedEarlyFeatures(dungeon,guilds);
assert.equal(guildMoments.length,1);
assert.equal(guildMoments[0].id,'guild');
assert.equal(guildMoments[0].destination,'Guild');
assert.ok(guildMoments[0].bullets.some(line=>line.includes('Rankings')));

const skipped=claimQuest(claimQuest(claimQuest(base,'QST_002',2),'QST_003',6),'QST_005',10);
assert.deepEqual(newlyUnlockedEarlyFeatures(base,skipped).map(x=>x.id),['workingToward','pets','companions']);
console.log('PASS grouped staged feature unlock moments');
