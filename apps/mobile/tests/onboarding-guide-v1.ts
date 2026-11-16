import {equal,deepEqual} from './assertions';
import {createGameGuideReadPreferenceStore} from '../src/core/game-guide-read-preferences';
import {acknowledgeGameGuide,guideDefinition,GAME_GUIDE_STEPS,newlyUnlockedGameGuide,normalizeOnboardingGuideState,unlockedGameGuide} from '../src/core/onboarding';
import {migrateSave} from '../src/core/save-migrations';
import {browseGameGuides} from '../src/core/game-guide-browse';
import {GAME_GUIDE,GAME_GUIDE_CATEGORIES} from '../src/core/onboarding';
import {newGame,createCharacter} from '../src/core/game';
const state:any=createCharacter(newGame(1),'IRONWARDEN','Guide Tester');state.character.level=2;state.account.guildMember=false;state.account.unlockedCharacterSlots=1;
equal(unlockedGameGuide(state).some(item=>item.id==='getting_started'),true,'starter guide unlocks');equal(newlyUnlockedGameGuide(state).length>=2,true,'initial guides are discoverable');
const acknowledged=acknowledgeGameGuide(state,'getting_started',true);deepEqual(acknowledged.account.guideState,{seenGuideIds:['getting_started'],acknowledgedGuideIds:['getting_started']},'acknowledgement persists');
equal(newlyUnlockedGameGuide(acknowledged).some(item=>item.id==='getting_started'),false,'acknowledged guide is no longer new');deepEqual(normalizeOnboardingGuideState({seenGuideIds:['bad','chat_social']}),{seenGuideIds:['chat_social'],acknowledgedGuideIds:[]},'invalid guide ids normalize');
const persisted=migrateSave(JSON.parse(JSON.stringify({...acknowledged,version:11})));deepEqual(persisted.account.guideState,acknowledged.account.guideState,'guide state survives migration');
console.log('onboarding-guide-v1 passed');

// Guild and Party have independent account-wide level unlocks.
state.character.level=7;
equal(unlockedGameGuide(state).some(row=>row.id==='guilds'),true,'Guild guide unlocks at Level 7');
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),false,'Party guide remains locked at Level 7');
state.character.level=9;
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),false,'Party guide stays locked below Level 10');
state.character.level=10;
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),true,'Party guide unlocks at Level 10');
equal(guideDefinition('parties').destination,'Party','Party guide links to the dedicated Party screen');
equal(GAME_GUIDE_STEPS.parties.some(step=>step.includes('Party Options')),true,'Party guide uses the current options disclosure');
equal(GAME_GUIDE_STEPS.chat_social.some(step=>step.includes('Party Chat appears only')),true,'Social guide documents contextual Party Chat');
equal(GAME_GUIDE_STEPS.guilds.some(step=>step.includes('Activities')),true,'Guild guide uses the Activities board');

// The older quest gates still apply to Companion and social-chat introductions.
state.character.level=100;
for(const id of ['combat_companions','chat_social','companion_trials'])equal(unlockedGameGuide(state).some(row=>row.id===id),false,id+' waits for its quest');
state.quests=state.quests.map((row:any)=>({...row,status:row.questId==='QST_002'?'claimed':row.status}));
state.otherCharacters=[{quests:[{questId:'QST_005',status:'claimed'}]}];
for(const id of ['guilds','combat_companions','chat_social','companion_trials','parties'])equal(unlockedGameGuide(state).some(row=>row.id===id),true,id+' respects its unlock');
state.account.liveEvent={enabled:true};
equal(unlockedGameGuide(state).some(row=>row.id==='live_events'),true,'released active events advertise their guide topic');

// Existing saves retain unlocks when switching to a low-level alt.
state.character.level=1;
state.otherCharacters=[{level:10,quests:[]}];
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),true,'Party Guide honors another character reaching Level 10');
// The dungeon guide follows the separate Level 25 + Chapter I boss gate.
state.character.level=24;state.defeatedBossIds=['FALLEN_KNIGHT'];
equal(unlockedGameGuide(state).some(row=>row.id==='coop_dungeons'),false,'Dungeon guide stays locked at 24');
state.character.level=25;state.defeatedBossIds=[];
equal(unlockedGameGuide(state).some(row=>row.id==='coop_dungeons'),false,'Dungeon guide needs the Chapter I clear');
state.defeatedBossIds=['FALLEN_KNIGHT'];
equal(unlockedGameGuide(state).some(row=>row.id==='coop_dungeons'),true,'Dungeon guide unlocks at 25 after boss');

// Reading online help is a device preference. It must not mutate the authoritative game state.
void (async()=>{
 const stored=new Map<string,string>();
 const adapter={getItem:async(key:string)=>stored.get(key)??null,setItem:async(key:string,value:string)=>{stored.set(key,value)}};
 const readPreferences=createGameGuideReadPreferenceStore(adapter);
 const snapshot=JSON.stringify(state);
 await Promise.all([readPreferences.markRead('account-a','getting_started'),readPreferences.markRead('account-a','faith_blessings')]);
 deepEqual(await readPreferences.load('account-a'),['getting_started','faith_blessings'],'multiple quick guide reads are kept');
 const restarted=createGameGuideReadPreferenceStore(adapter);
 deepEqual(await restarted.load('account-a'),['getting_started','faith_blessings'],'online guide read flags persist on device');
 deepEqual(await restarted.load('account-b'),[],'guide read flags do not leak to another account');
 equal(JSON.stringify(state),snapshot,'reading online guide never mutates server-owned game state');
 console.log('online guide read preferences passed');
})().catch(error=>{console.error(error);process.exitCode=1});

// Guide library regression: search, categories, progress and locked previews.
const guideState:any=createCharacter(newGame(2),'IRONWARDEN','Guide Hub Test');
const openIds=new Set(unlockedGameGuide(guideState).map(entry=>entry.id));
const readIds=new Set(['getting_started'] as const);
const browse=(category:'all'|'basics'|'progress'|'social'|'adventures',query='',unreadOnly=false)=>browseGameGuides({unlockedIds:openIds,readIds,category,query,unreadOnly});
equal(Object.keys(GAME_GUIDE_CATEGORIES).length,GAME_GUIDE.length,'every topic has a category');
equal(browse('basics').every(entry=>GAME_GUIDE_CATEGORIES[entry.id]==='basics'),true,'category filtering stays precise');
equal(browse('all','expedition marks').some(entry=>entry.id==='dungeon_shop'),true,'search includes locked guide content');
equal(browse('all','NO SUCH GUIDE').length,0,'no matches for an unrelated query');
equal(browse('all','',true).every(entry=>openIds.has(entry.id)&&!readIds.has(entry.id)),true,'unread filter excludes read and locked entries');
equal(browse('all').some(entry=>entry.id==='coop_dungeons'),true,'locked features can be previewed');
equal(guideDefinition('additional_characters').summary.includes('three'),true,'character guide reflects the three-character roster');
equal(GAME_GUIDE_STEPS.coop_dungeons.some(step=>step.includes('Asterfall')),true,'dungeon guide describes Asterfall solo access');
console.log('guide hub navigation and current-copy contract passed');
