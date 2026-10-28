import {equal,deepEqual} from './assertions';
import {acknowledgeGameGuide,guideDefinition,GAME_GUIDE_STEPS,newlyUnlockedGameGuide,normalizeOnboardingGuideState,unlockedGameGuide} from '../src/core/onboarding';
import {migrateSave} from '../src/core/save-migrations';
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
state.character.level=19;
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),false,'Party guide stays locked below Level 20');
state.character.level=20;
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),true,'Party guide unlocks at Level 20');
equal(guideDefinition('parties').destination,'Social','Party guide links to the new Social tabs');
equal(GAME_GUIDE_STEPS.parties.some(step=>step.includes('Party options')),true,'Party guide uses the current options disclosure');
equal(GAME_GUIDE_STEPS.chat_social.some(step=>step.includes('Party Chat appears only')),true,'Social guide documents contextual Party Chat');
equal(GAME_GUIDE_STEPS.guilds.some(step=>step.includes('Activities')),true,'Guild guide uses the Activities board');

// The older quest gates still apply to Companion and social-chat introductions.
state.character.level=100;
for(const id of ['combat_companions','chat_social','companion_trials'])equal(unlockedGameGuide(state).some(row=>row.id===id),false,id+' waits for its quest');
state.quests=state.quests.map((row:any)=>({...row,status:row.questId==='QST_002'?'claimed':row.status}));
state.otherCharacters=[{quests:[{questId:'QST_005',status:'claimed'}]}];
for(const id of ['guilds','combat_companions','chat_social','companion_trials','parties'])equal(unlockedGameGuide(state).some(row=>row.id===id),true,id+' respects its unlock');
state.account.liveEvent={enabled:true};
equal(unlockedGameGuide(state).some(row=>row.id==='live_events'),false,'unreleased events do not advertise new guide topics');

// Existing saves retain unlocks when switching to a low-level alt.
state.character.level=1;
state.otherCharacters=[{level:20,quests:[]}];
equal(unlockedGameGuide(state).some(row=>row.id==='parties'),true,'Party Guide honors another character reaching Level 20');
