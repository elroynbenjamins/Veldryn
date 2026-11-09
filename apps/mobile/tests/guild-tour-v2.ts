import {deepEqual,equal} from './assertions';
import {GUILD_TUTORIAL_STEPS,advanceGuildTutorial,createGuildTutorialStore,normalizeGuildTutorialProgress} from '../src/core/guild-tutorial';
import {guildTutorialText} from '../src/i18n/guild-tutorial';
import {guildDetailedGuide} from '../src/core/guild-detailed-guides';

async function testGuildTour(){
 deepEqual(GUILD_TUTORIAL_STEPS.map(step=>step.destination),['Home','Muster','Projects','PvE','Hall'],'new Guild tour has five reachable destinations');
 deepEqual(normalizeGuildTutorialProgress(null),{step:0,status:'new'},'existing Guild members are not interrupted on first app update');
 equal(guildTutorialText('nl',GUILD_TUTORIAL_STEPS[1].title),'Je dagelijkse spel telt mee','compact tour retains the translated Muster step');
 equal(guildTutorialText('nl','Guild Quests'),'Gildequests','new Guild Quest help is localized');
 for(const section of ['Progress/Projects','Progress/Skills','Hall/Bank','Hall/Construction']){
  const guide=guildDetailedGuide(section);
  equal(guide?.topics.length,3,section+' has three expanded help topics');
  equal(guide?.topics.every(topic=>topic.title.length>0&&topic.body.length>50),true,section+' topics contain practical explanations');
 }
 equal(guildDetailedGuide('Hall/Legacy'),undefined,'other screens retain lightweight section help');
 equal(guildDetailedGuide('Hall/Bank')?.topics.some(topic=>topic.body.includes('cannot be withdrawn')),true,'bank guide explains permanent deposits');
 for(const section of ['Activities/Muster','Activities/Quests','PvE','Hall/Shop']){
  const guide=guildDetailedGuide(section);
  equal(guide?.topics.length,3,section+' covers all essential tutorial topics');
  equal(guide?.topics.every(topic=>topic.title.length>0&&topic.body.length>90),true,section+' provides practical details');
  equal(new Set(guide?.topics.map(topic=>topic.id)).size,3,section+' has stable topic identifiers');
 }
 equal(guildDetailedGuide('Activities/Muster')?.topics.some(topic=>topic.body.includes('25 points')),true,'Muster explains the daily Rally threshold');
 equal(guildDetailedGuide('PvE')?.topics.some(topic=>topic.body.includes('three minutes')),true,'Raid guide explains asynchronous attempts');
 equal(guildDetailedGuide('Hall/Shop')?.topics.some(topic=>topic.body.includes('Guild Home')),true,'Token Shop guide directs daily claims to Guild Home');

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
