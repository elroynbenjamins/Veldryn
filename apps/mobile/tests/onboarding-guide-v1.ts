import {equal,deepEqual} from './assertions';
import {acknowledgeGameGuide,newlyUnlockedGameGuide,normalizeOnboardingGuideState,unlockedGameGuide} from '../src/core/onboarding';
import {migrateSave} from '../src/core/save-migrations';
import {newGame,createCharacter} from '../src/core/game';

function claimQuest(state:any,id:string,progress:number){return {...state,quests:state.quests.map((q:any)=>q.questId===id?{...q,status:'claimed',progress}:q)}}

let state:any=createCharacter(newGame(1),'IRONWARDEN','Guide Tester');
state.character.level=2;state.account.guildMember=false;state.account.unlockedCharacterSlots=1;
equal(unlockedGameGuide(state).some(item=>item.id==='getting_started'),true,'starter guide unlocks');
equal(unlockedGameGuide(state).some(item=>item.id==='seasons_weather'),true,'weather guide unlocks by early character level');
equal(unlockedGameGuide(state).some(item=>item.id==='working_toward'),false,'staged systems do not unlock from level alone');
equal(newlyUnlockedGameGuide(state).length>=2,true,'initial guides are discoverable');

state=claimQuest(state,'QST_002',2);
for(const id of ['working_toward','daily_supplies','live_events'])equal(unlockedGameGuide(state).some(item=>item.id===id),true,id+' follows QST_002');

state=claimQuest(state,'QST_003',6);
for(const id of ['pets','account_bonuses','chat_social'])equal(unlockedGameGuide(state).some(item=>item.id===id),true,id+' follows QST_003');

state=claimQuest(state,'QST_005',10);
for(const id of ['combat_companions','contract_board','mastery_hall'])equal(unlockedGameGuide(state).some(item=>item.id===id),true,id+' follows QST_005');
state.character.level=20;
equal(unlockedGameGuide(state).some(item=>item.id==='guilds'),false,'Guild guide waits for Place Among Guilds rather than level alone');
state=claimQuest(state,'QST_011',20);
equal(unlockedGameGuide(state).some(item=>item.id==='guilds'),true,'Guild guide follows QST_011');
equal(unlockedGameGuide(state).some(item=>item.id==='rankings'),true,'Rankings guide follows QST_011');

const dungeonState:any=createCharacter(newGame(2),'IRONWARDEN','Dungeon Guide Tester');
dungeonState.character.level=14;
equal(unlockedGameGuide(dungeonState).some(item=>item.id==='coop_dungeons'),false,'Dungeon guide stays locked before level 15');
dungeonState.character.level=15;
equal(unlockedGameGuide(dungeonState).some(item=>item.id==='coop_dungeons'),true,'Dungeon guide unlocks at level 15');

const acknowledged=acknowledgeGameGuide(state,'getting_started',true);
deepEqual(acknowledged.account.guideState,{seenGuideIds:['getting_started'],acknowledgedGuideIds:['getting_started']},'acknowledgement persists');
equal(newlyUnlockedGameGuide(acknowledged).some(item=>item.id==='getting_started'),false,'acknowledged guide is no longer new');
deepEqual(normalizeOnboardingGuideState({seenGuideIds:['bad','chat_social','pets']}),{seenGuideIds:['chat_social','pets'],acknowledgedGuideIds:[]},'invalid guide ids normalize');
const persisted=migrateSave(JSON.parse(JSON.stringify({...acknowledged,version:11})));deepEqual(persisted.account.guideState,acknowledged.account.guideState,'guide state survives migration');
console.log('onboarding-guide-v1 passed');
