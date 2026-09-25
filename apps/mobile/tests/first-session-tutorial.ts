import {assert} from './test-assert';
import {firstSessionTutorialStep as step,firstSessionTutorialSteps,normalizeFirstSessionTutorialCompleted as normalize,type FirstSessionTutorialHost} from '../src/core/first-session-tutorial';
const questIds=['QST_001','QST_002','QST_003','QST_004','QST_005'];
function at(index:number,level=1):FirstSessionTutorialHost{return {character:{level},activity:null,currentRegionId:'GREENFIELDS',unlockedMonsterIds:['MOSS_RAT'],quests:questIds.map((questId,i)=>({questId,status:i<index?'claimed':i===index?'active':'locked',progress:0}))};}
function scouted(state:FirstSessionTutorialHost){return {...state,unlockedMonsterIds:[...(state.unlockedMonsterIds??[]),'FIELD_WISP']};}
function inIronwood(state:FirstSessionTutorialHost){return {...state,currentRegionId:'IRONWOOD'};}
function wolvesFound(state:FirstSessionTutorialHost){return {...state,unlockedMonsterIds:[...(state.unlockedMonsterIds??[]),'IRONWOOD_WOLF']};}
let checks=0;
function check(name:string,run:()=>void){run();checks++;console.log('PASS '+name)}
check('no tutorial before character creation',()=>assert.equal(step({...at(0),character:null}),undefined));
check('fresh character sees World only',()=>{assert.equal(step(at(0))?.id,'first_hunt');assert.equal(step(at(0))?.highlightPrimary,'World')});
check('acknowledged start is not nagged',()=>assert.equal(step(at(0),['first_hunt']),undefined));
check('running Moss Rat hunt explains Collect',()=>{const s=at(0);s.activity={kind:'combat',targetId:'MOSS_RAT'};assert.equal(step(s,['first_hunt'])?.id,'first_hunt_collect');assert.equal(step(s)?.destination,'Home');assert.equal(step(s)?.highlightPrimary,undefined)});
check('unrelated hunt does not imply Moss Rat progress',()=>{const s=at(0);s.activity={kind:'combat',targetId:'FIELD_WISP'};assert.equal(step(s)?.id,'first_hunt')});
check('uncollected preview does not complete a quest',()=>{const s=at(0);s.quests[0].progress=5;assert.equal(step(s)?.id,'first_hunt')});
for(let i=0;i<questIds.length;i++)check(`${questIds[i]} complete means claim, not repeat objective`,()=>{const s=at(i,10);s.quests[i].status='complete';assert.equal(step(s)?.id,`claim_qst00${i+1}`);assert.equal(step(s)?.destination,'Quests');assert.equal(step(s)?.highlightPrimary,undefined)});
check('gathering follows first quest claim',()=>assert.equal(step(at(1))?.id,'first_skill'));
check('running guided gathering explains skill XP collection',()=>{const s=at(1);s.activity={kind:'fishing',targetId:'MEADOW_PERCH_POOL'};assert.equal(step(s)?.id,'first_skill_collect')});
check('processing is not a gathering tutorial objective',()=>{const s=at(1);s.activity={kind:'processing',targetId:'SMELT_COPPER_INGOT'};assert.equal(step(s)?.id,'first_skill')});
check('QST_003 first teaches the Greenfields scouting route',()=>{assert.equal(step(at(2,6))?.id,'ironwood_scout');assert.equal(step(at(2,6))?.destination,'Skills')});
check('running Greenfields scouting points back to collection',()=>{const s=at(2,6);s.activity={kind:'exploration',targetId:'SCOUT_GREENFIELDS'};assert.equal(step(s)?.id,'ironwood_scout_collect');assert.equal(step(s)?.destination,'Home')});
check('level 6 gets a combat bridge after scouting',()=>assert.equal(step(scouted(at(2,6)))?.id,'ironwood_prepare'));
check('level 7 is sent to Ironwood after the road is discovered',()=>assert.equal(step(scouted(at(2,7)))?.id,'ironwood_travel'));
check('arriving in Ironwood teaches local encounter scouting',()=>assert.equal(step(inIronwood(scouted(at(2,7))))?.id,'ironwood_reveal'));
check('running Ironwood scouting points back to collection',()=>{const s=inIronwood(scouted(at(2,7)));s.activity={kind:'exploration',targetId:'SCOUT_IRONWOOD'};assert.equal(step(s)?.id,'ironwood_reveal_collect')});
check('the wolf objective appears only after its encounter is discovered',()=>{const s=wolvesFound(inIronwood(scouted(at(2,7))));assert.equal(step(s)?.id,'ironwood_hunt');assert.ok(step(s)?.hint.includes('Ironwood Wolf'))});
check('old acknowledged wolf guide does not suppress scouting prerequisite',()=>assert.equal(step(at(2,6),['ironwood_hunt'])?.id,'ironwood_scout'));
check('equipment goal counts the starter weapon',()=>{assert.equal(step(at(3))?.destination,'Inventory');assert.ok(step(at(3))?.body.includes('already counts as one'))});
check('level 10 objective distinguishes character and skill levels',()=>{assert.equal(step(at(4))?.id,'level_ten');assert.ok(step(at(4))?.body.includes('not the total'));assert.ok(step(at(4))?.hint.includes('combat rewards'))});
check('no extra Account tour after QST_005',()=>assert.equal(step(at(5,10)),undefined));
check('malformed or missing first quest fails quiet',()=>assert.equal(step({...at(0),quests:[]}),undefined));
check('locked current quest does not suggest progression',()=>{const s=at(1);s.quests[1].status='locked';assert.equal(step(s),undefined)});
check('future progress cannot skip an earlier unclaimed quest',()=>{const s=at(0);s.quests[4].status='claimed';assert.equal(step(s)?.id,'first_hunt')});
check('normalization rejects non-array storage',()=>assert.deepEqual(normalize({first_hunt:true}),[]));
check('normalization deduplicates and removes unknown IDs',()=>assert.deepEqual(normalize(['first_hunt',17,'bad','first_hunt','claim_qst001']),['first_hunt','claim_qst001']));
check('legacy completion stays readable without a new tour',()=>assert.deepEqual(normalize(['core_loop_complete']),['core_loop_complete']));
check('every guidance ID is unique',()=>{const rows=firstSessionTutorialSteps();assert.equal(new Set(rows.map(r=>r.id)).size,rows.length)});
check('navigation projection does not mutate the game',()=>{const s=at(2);const before=JSON.stringify(s);step(s);assert.equal(JSON.stringify(s),before)});
console.log(`PASS ${checks} first-session tutorial scenarios`);

import {createTutorialPreferenceStore} from '../src/core/tutorial-preferences';
async function preferenceChecks(){
 const saved=new Map<string,string>();let reads=0,writes=0,failRead=false,failWrite=false;
 const storage={async getItem(key:string){reads++;if(failRead)throw new Error('read unavailable');await Promise.resolve();return saved.get(key)??null},async setItem(key:string,value:string){writes++;if(failWrite)throw new Error('write unavailable');await Promise.resolve();saved.set(key,value)}};
 let store=createTutorialPreferenceStore(storage),tested=0;
 const pass=(name:string)=>{tested++;console.log('PASS preferences: '+name)};
 assert.deepEqual(await store.load('missing'),[]);pass('missing storage');
 saved.set('veldryn.first-session-tutorial.v1:corrupt','{bad json');assert.deepEqual(await store.load('corrupt'),[]);pass('malformed JSON');
 saved.set('veldryn.first-session-tutorial.v1:valid',JSON.stringify(['bad','first_hunt','first_hunt']));assert.deepEqual(await store.load('valid'),['first_hunt']);pass('normalizes stored IDs');
 const before=reads;await Promise.all([store.load('concurrent'),store.load('concurrent')]);assert.equal(reads-before,1);pass('coalesces simultaneous loads');
 await Promise.all([store.complete('parallel','first_hunt'),store.complete('parallel','first_hunt_collect'),store.complete('parallel','claim_qst001')]);assert.deepEqual(JSON.parse(saved.get('veldryn.first-session-tutorial.v1:parallel')!),['first_hunt','first_hunt_collect','claim_qst001']);pass('serial writes do not lose acknowledgements');
 await store.complete('parallel','first_hunt');assert.equal((await store.load('parallel')).length,3);pass('repeated acknowledgement is idempotent');
 assert.deepEqual(await store.load('other-character'),[]);pass('characters remain isolated');
 const exposed=await store.load('parallel');exposed.length=0;assert.equal((await store.load('parallel')).length,3);pass('consumer cannot mutate cached progress');
 failWrite=true;await store.complete('retry','first_hunt');assert.deepEqual(await store.load('retry'),['first_hunt']);failWrite=false;await store.complete('retry','first_hunt_collect');assert.deepEqual(JSON.parse(saved.get('veldryn.first-session-tutorial.v1:retry')!),['first_hunt','first_hunt_collect']);pass('failed write stays in memory and is retried');
 failRead=true;store=createTutorialPreferenceStore(storage);assert.deepEqual(await store.load('read-failure'),[]);failRead=false;pass('read rejection does not block play');
 const writeCount=writes;assert.deepEqual(await store.complete('','first_hunt'),[]);assert.equal(writes,writeCount);pass('missing character never writes shared preferences');
 console.log(`PASS ${tested} tutorial preference scenarios`);
}
void preferenceChecks().catch(error=>{throw error});
