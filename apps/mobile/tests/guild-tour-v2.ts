import {deepEqual,equal} from './assertions';
import {GUILD_TUTORIAL_STEPS,advanceGuildTutorial,createGuildTutorialStore,normalizeGuildTutorialProgress} from '../src/core/guild-tutorial';

async function testGuildTour(){
 deepEqual(GUILD_TUTORIAL_STEPS.map(step=>step.destination),['Home','Muster','Projects','PvE','Hall'],'new Guild tour has five reachable destinations');
 deepEqual(normalizeGuildTutorialProgress(null),{step:0,status:'new'},'existing Guild members are not interrupted on first app update');
 deepEqual(normalizeGuildTutorialProgress({step:500,status:'active'}),{step:4,status:'active'},'tour step is bounded');
 deepEqual(advanceGuildTutorial({step:3,status:'active'}),{step:4,status:'active'},'next step is the Hall');
 deepEqual(advanceGuildTutorial({step:4,status:'active'}),{step:4,status:'complete'},'last step finishes the tour');

 const records:Record<string,string>={};
 const storage={
  getItem:async(key:string)=>records[key]??null,
  setItem:async(key:string,value:string)=>{records[key]=value},
 };
 const store=createGuildTutorialStore(storage);
 deepEqual(await store.load('first-guild'),{step:0,status:'new'},'new member may start the Guild tour');
 await store.save('first-guild',{step:2,status:'paused'});
 deepEqual(await store.load('first-guild'),{step:2,status:'paused'},'paused tour can resume at the same destination');
 equal(JSON.parse(records['veldryn.guild-tutorial.v2:first-guild']).status,'paused','tutorial state is account scoped and persisted');

 records['veldryn.guild-tutorial.v1:legacy-paused']=JSON.stringify({step:5,status:'paused'});
 deepEqual(await store.load('legacy-paused'),{step:3,status:'paused'},'legacy Raid step maps into five-step tour');
 records['veldryn.guild-tutorial.v1:legacy-done']=JSON.stringify({step:6,status:'complete'});
 deepEqual(await store.load('legacy-done'),{step:4,status:'complete'},'completed legacy tutorial stays completed');
 console.log('guild-tour-v2 passed');
}
void testGuildTour();
