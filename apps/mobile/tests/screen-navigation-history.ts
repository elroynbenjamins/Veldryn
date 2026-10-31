import {guildHallSectionGuide} from '../src/core/guild-hall-guide';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {rememberScreen,returnToPreviousScreen,type ScreenHistoryEntry} from '../src/core/screen-navigation-history';
type Screen='Home'|'Skills'|'Settings'|'Companions'|'World';
type Context={skill?:string;section?:string};
const entry=(route:Screen,context:Context={}):ScreenHistoryEntry<Screen,Context>=>({route,context});
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
let history:ScreenHistoryEntry<Screen,Context>[]=[];
history=rememberScreen(history,entry('Home'),'Skills');
history=rememberScreen(history,entry('Skills',{skill:'smithing'}),'Settings');
history=rememberScreen(history,entry('Settings',{section:'guide'}),'World');
const one=returnToPreviousScreen(history,'World');
ok(one.previous?.route==='Settings'&&one.previous.context.section==='guide','Back restores the selected Settings section');
const two=returnToPreviousScreen(one.remaining,'Settings');
ok(two.previous?.route==='Skills'&&two.previous.context.skill==='smithing','Back restores the chosen skill');
ok(returnToPreviousScreen(two.remaining,'Skills').previous?.route==='Home','Back returns to Home');
ok(returnToPreviousScreen([],'Home').previous===undefined,'Empty history leaves Home unchanged');
ok(rememberScreen(history,entry('World'),'World').length===history.length,'Re-selecting a tab cannot add a redundant entry');
const skip=returnToPreviousScreen(history,'World',route=>route!=='Settings');
ok(skip.previous?.route==='Skills'&&skip.remaining.length===1,'Locked routes are skipped without corrupting history');
let bounded:ScreenHistoryEntry<Screen,Context>[]=[];
for(let i=0;i<42;i++)bounded=rememberScreen(bounded,entry(i%2?'Home':'World'),i%2?'World':'Home');
ok(bounded.length===24,'History remains bounded at 24 entries');

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const appSource=fs.readFileSync('App.tsx','utf8'),guildSource=fs.readFileSync('src/screens/GuildScreen.tsx','utf8');
ok(appSource.includes('goalRegionId,goalDungeonId]);'),'Dungeon destination must invalidate memoized back-history context when changed');
ok(appSource.includes("useEffect(()=>{setTabHistory([]);},[auth.session?.user.id,state?.character?.id])"),'Back history must reset on account and character switch');
ok(appSource.includes('guildNavigationMemory.current?.scope===')&&appSource.includes('onNavigationChange={context=>'),'Guild navigation must restore account-scoped tabs and keep their latest section');
ok(guildSource.includes("onlineSection==='Hall'&&hallSection!=='Facilities'?\u0060Hall/\u0024{hallSection}\u0060"),'Guild Hall sub-tabs must have separate first-visit guides');
ok(guildSource.includes("onlineSection==='Hall'?guildHallSectionGuide(language,hallSection)"),'Guild Hall guidance must follow the actually visible Hall tab');
for(const language of SUPPORTED_LANGUAGES){
 for(const section of ['Facilities','Skills','Trophies','Shop'] as const){
  const guide=guildHallSectionGuide(language,section);
  ok(guide.title.length>5&&guide.body.length>20&&guide.detail.length>25,language+' '+section+' guide content must be localized');
 }
 const facilities=guildHallSectionGuide(language,'Facilities');
 ok(!/donate to any|donate unlimited|grants free cosmetics/i.test(facilities.detail),'Guild help must not promise unrestricted donations or free cosmetics');
}
ok(guildHallSectionGuide('en','Shop').detail.includes('never give the items for free'),'Guild Shop teaches access without free cosmetics');
ok(guildHallSectionGuide('en','Facilities').detail.includes('Only released, active'),'Guild Bank guide must distinguish release-gated materials');

console.log('PASS navigation history, scoped Guild context, live Dungeon deep-link dependencies and six-language Hall guide coverage');
