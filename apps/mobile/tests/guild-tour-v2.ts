import {deepEqual,equal} from './assertions';
import {GUILD_TUTORIAL_STEPS,advanceGuildTutorial,createGuildTutorialStore,normalizeGuildTutorialProgress} from '../src/core/guild-tutorial';
import {guildTutorialText} from '../src/i18n/guild-tutorial';
import {guildGuideLibraryText,guildGuideSectionTitle} from '../src/i18n/guild-guide-library';
import {GUILD_DETAILED_GUIDES,guildDetailedGuide} from '../src/core/guild-detailed-guides';
import {guildDetailedGuideLocaleCoverage,localizedGuildDetailedGuide} from '../src/i18n/guild-detailed-guide-locales';

async function testGuildTour(){
 deepEqual(GUILD_TUTORIAL_STEPS.map(step=>step.destination),['Home','Muster','Projects','PvE','Hall'],'new Guild tour has five reachable destinations');
 deepEqual(normalizeGuildTutorialProgress(null),{step:0,status:'new'},'existing Guild members are not interrupted on first app update');
 equal(guildTutorialText('nl',GUILD_TUTORIAL_STEPS[1].title),'Je dagelijkse spel telt mee','compact tour retains the translated Muster step');
 equal(guildTutorialText('nl','Guild Quests'),'Gildequests','new Guild Quest help is localized');
 equal(guildTutorialText('ru',GUILD_TUTORIAL_STEPS[1].title),'Ваши ежедневные действия важны','Russian Muster text maps to the correct five-stop tour step');
 equal(guildTutorialText('tr',GUILD_TUTORIAL_STEPS[4].title),'Artık hazırsın','Turkish Hall text maps to the correct five-stop tour step');
 equal(guildTutorialText('ru','Skip tour'),'Пропустить обучение','Russian Skip tour control is translated');
 equal(guildTutorialText('tr','Start guild guide'),'Lonca rehberini başlat','Turkish Start tour control is translated');
 for(const lang of ['de','es','nl','it','fr','ru','tr'] as const){
  const hallTip=guildTutorialText(lang,GUILD_TUTORIAL_STEPS[4].tip).toLocaleLowerCase();
  equal(['bank','banco','banca','banque','банк'].some(term=>hallTip.includes(term)),true,lang+' Hall tour tip mentions the Guild Bank');
 }
 for(const section of Object.keys(GUILD_DETAILED_GUIDES)){
  for(const lang of ['de','es','nl','it','fr','ru','tr'] as const){
   const label=guildGuideSectionTitle(lang,section,GUILD_DETAILED_GUIDES[section].title);
   equal(label.length>4,true,lang+' Guild Guide section '+section+' has a localized title');
  }
 }
 equal(guildGuideSectionTitle('nl','Hall/Bank','Guild Bank'),'Gildebank','Dutch Guild Bank title is consistent across Help and Library');
 equal(guildGuideSectionTitle('en','Hall/Bank','Guild Bank'),'Guild Bank','English Guild title uses source copy');
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
 for(const section of ['Roster','Manage','Appearance']){
  const guide=guildDetailedGuide(section);
  equal(guide?.topics.length,3,section+' has contextual role guidance');
  equal(guide?.topics.every(topic=>topic.title.length>0&&topic.body.length>70),true,section+' has actionable help');
 }
 equal(guildDetailedGuide('Roster')?.topics.some(topic=>topic.body.includes('Ordinary members and Officers can leave')),true,'members can find leaving instructions without leadership access');
 equal(guildDetailedGuide('Manage')?.topics.some(topic=>topic.body.includes('disbanding permanently')),true,'leadership guide warns about permanent Guild disbanding');
 equal(guildDetailedGuide('Appearance')?.topics.some(topic=>topic.body.includes('permanently retires')),true,'appearance guide warns about irreversible tag changes');
 equal(guildDetailedGuide('Home')?.topics.length,3,'Guild Guide library includes home and replay instructions');
 equal(guildDetailedGuide('Chat')?.topics.length,2,'Guild Chat has lightweight reference topics');
 equal(guildGuideLibraryText('nl','Guild Guide'),'Gildegids','Guild Guide Home shortcut is localized');
 equal(guildGuideLibraryText('tr','Browse guides'),'Rehberlere göz at','Guide Library supports Turkish navigation');
 const sourceIds=Object.keys(GUILD_DETAILED_GUIDES);
 const sourceTopicCount=sourceIds.reduce((sum,id)=>sum+GUILD_DETAILED_GUIDES[id].topics.length,0);
 equal(sourceIds.length,13,'source guide covers all 13 Guild sections');
 equal(sourceTopicCount,38,'source guide has 38 detailed Guild topics');
 for(const lang of ['de','es','nl','it','fr','ru','tr'] as const){
  const coverage=guildDetailedGuideLocaleCoverage(lang);
  equal(coverage.complete,true,lang+' covers every Guild Guide topic');
  equal(coverage.sections,13,lang+' includes all 13 Guild sections');
  equal(coverage.topics,38,lang+' includes all 38 detailed Guild topics');
  for(const id of sourceIds){
   const localized=localizedGuildDetailedGuide(lang,id)!;
   const original=GUILD_DETAILED_GUIDES[id];
   equal(localized.body.trim().length>=30,true,lang+' '+id+' has a translated introduction');
   equal(localized.body!==original.body,true,lang+' '+id+' does not silently use English intro');
   equal(localized.title!==original.title,true,lang+' '+id+' has a translated section title');
   for(let i=0;i<original.topics.length;i++){
    const source=original.topics[i],translated=localized.topics[i];
    equal(translated.id,source.id,lang+' '+id+' preserves stable topic ID');
    equal(translated.title!==source.title,true,lang+' '+id+' has translated topic title');
    equal(translated.body!==source.body,true,lang+' '+id+' has translated topic body');
    equal(translated.body.trim().length>=60,true,lang+' '+id+' topic translation is meaningful');
   }
  }
  const muster=localizedGuildDetailedGuide(lang,'Activities/Muster')!;
  const musterCopy=muster.topics.map(t=>t.body).join(' ');
  for(const critical of ['5','25','100','35','70','60','UTC']){
   equal(musterCopy.includes(critical),true,lang+' preserves Rally mechanic '+critical);
  }
  const pve=localizedGuildDetailedGuide(lang,'PvE')!.topics.map(t=>t.body).join(' ');
  for(const ratio of ['65','35'])equal(pve.includes(ratio),true,lang+' retains Raid Gate role weighting '+ratio);
  const projects=localizedGuildDetailedGuide(lang,'Progress/Projects')!.topics.map(t=>t.body).join(' ');
  for(const threshold of ['3','20','5','50','300'])equal(projects.includes(threshold),true,lang+' retains Project threshold '+threshold);
 }
 equal(localizedGuildDetailedGuide('en','Hall/Bank')?.body,GUILD_DETAILED_GUIDES['Hall/Bank'].body,'English guide remains source authoritative');


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
