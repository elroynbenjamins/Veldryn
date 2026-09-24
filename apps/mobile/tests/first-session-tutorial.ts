import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {firstSessionTutorialStep,firstSessionTutorialSteps} from '../src/core/first-session-tutorial';

function claim(state:any,id:string,progress:number){return {...state,quests:state.quests.map((q:any)=>q.questId===id?{...q,status:'claimed',progress}:q)}}

let state=createCharacter(newGame(0),'IRONWARDEN','Tutorial Flow');
assert.deepEqual(firstSessionTutorialSteps().map(row=>row.id),['first_hunt','first_skill','ironwood_hunt','gear_check','level_ten','core_loop_complete']);
assert.equal(firstSessionTutorialStep(state)?.id,'first_hunt');
assert.equal(firstSessionTutorialStep(state,['first_hunt']),undefined,'a tutorial step should not nag again after acknowledgement');

state=claim(state,'QST_001',5);
assert.equal(firstSessionTutorialStep(state)?.id,'first_skill');
assert.equal(firstSessionTutorialStep(state)?.destination,'Skills');

state=claim(state,'QST_002',2);
assert.equal(firstSessionTutorialStep(state)?.id,'ironwood_hunt');
assert.equal(firstSessionTutorialStep(state)?.destination,'World');

state=claim(state,'QST_003',6);
assert.equal(firstSessionTutorialStep(state)?.id,'gear_check');
assert.equal(firstSessionTutorialStep(state)?.destination,'Inventory');

state=claim(state,'QST_004',2);
assert.equal(firstSessionTutorialStep(state)?.id,'level_ten');
assert.ok(firstSessionTutorialStep(state)?.body.includes('basic loop'));

state=claim(state,'QST_005',10);
assert.equal(firstSessionTutorialStep(state)?.id,'core_loop_complete');
assert.equal(firstSessionTutorialStep(state)?.destination,'More');
assert.ok(firstSessionTutorialStep(state)?.body.includes('explain themselves when they unlock'));
console.log('PASS first-session tutorial is staged through QST_005');
