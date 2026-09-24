import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {newlyUnlockedEarlyFeatures} from '../src/core/feature-unlocks';

const base=createCharacter(newGame(0),'IRONWARDEN','Unlock Moment Test');
const pets={...base,quests:base.quests.map(q=>q.questId==='QST_003'?{...q,status:'claimed' as const,progress:6}:q)};
const petMoments=newlyUnlockedEarlyFeatures(base,pets);
assert.equal(petMoments.length,1);
assert.equal(petMoments[0].id,'pets');
assert.equal(petMoments[0].destination,'Collections');
assert.equal(petMoments[0].bullets.length,3);
assert.equal(newlyUnlockedEarlyFeatures(pets,pets).length,0,'already-unlocked Pets must not reveal again');

const companions={...pets,quests:pets.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed' as const,progress:10}:q)};
const companionMoments=newlyUnlockedEarlyFeatures(pets,companions);
assert.equal(companionMoments.length,1);
assert.equal(companionMoments[0].id,'companions');
assert.equal(companionMoments[0].destination,'Companions');
assert.ok(companionMoments[0].bullets.some(line=>line.includes('Housing')));
assert.equal(newlyUnlockedEarlyFeatures(companions,companions).length,0,'already-unlocked Companions must not reveal again');

const both={...base,quests:base.quests.map(q=>q.questId==='QST_003'||q.questId==='QST_005'?{...q,status:'claimed' as const,progress:q.questId==='QST_003'?6:10}:q)};
assert.deepEqual(newlyUnlockedEarlyFeatures(base,both).map(x=>x.id),['pets','companions']);
console.log('PASS one-time Pet and Companion feature unlock moments');
