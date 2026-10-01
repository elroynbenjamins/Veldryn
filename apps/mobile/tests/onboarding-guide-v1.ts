import {equal,deepEqual} from './assertions';
import {acknowledgeGameGuide,newlyUnlockedGameGuide,normalizeOnboardingGuideState,unlockedGameGuide} from '../src/core/onboarding';
import {migrateSave} from '../src/core/save-migrations';
import {newGame,createCharacter} from '../src/core/game';
const state:any=createCharacter(newGame(1),'IRONWARDEN','Guide Tester');state.character.level=2;state.account.guildMember=false;state.account.unlockedCharacterSlots=1;
equal(unlockedGameGuide(state).some(item=>item.id==='getting_started'),true,'starter guide unlocks');equal(newlyUnlockedGameGuide(state).length>=2,true,'initial guides are discoverable');
const acknowledged=acknowledgeGameGuide(state,'getting_started',true);deepEqual(acknowledged.account.guideState,{seenGuideIds:['getting_started'],acknowledgedGuideIds:['getting_started']},'acknowledgement persists');
equal(newlyUnlockedGameGuide(acknowledged).some(item=>item.id==='getting_started'),false,'acknowledged guide is no longer new');deepEqual(normalizeOnboardingGuideState({seenGuideIds:['bad','chat_social']}),{seenGuideIds:['chat_social'],acknowledgedGuideIds:[]},'invalid guide ids normalize');
const persisted=migrateSave(JSON.parse(JSON.stringify({...acknowledged,version:11})));deepEqual(persisted.account.guideState,acknowledged.account.guideState,'guide state survives migration');
console.log('onboarding-guide-v1 passed');

// Level alone must not advertise quest-gated systems.
state.character.level=100;
for(const id of ['working_toward','guilds','combat_companions','chat_social','companion_trials'])equal(unlockedGameGuide(state).some(row=>row.id===id),false,id+' waits for its quest');
state.quests=state.quests.map((row:any)=>({...row,status:row.questId==='QST_002'?'claimed':row.status}));
equal(unlockedGameGuide(state).some(row=>row.id==='working_toward'),true,'goal guide follows claimed QST_002');
state.otherCharacters=[{quests:[{questId:'QST_005',status:'claimed'}]}];
for(const id of ['guilds','combat_companions','chat_social','companion_trials'])equal(unlockedGameGuide(state).some(row=>row.id===id),true,id+' respects account-wide unlock');
state.account.liveEvent={enabled:true};
equal(unlockedGameGuide(state).some(row=>row.id==='live_events'),false,'unreleased events do not advertise new guide topics');
