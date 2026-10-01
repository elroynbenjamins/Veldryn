/** Opt-in storefront capture fixture. Real screens, memory-only sample progress.
 * No auth, storage, online calls or production entry. See marketing/play-store-v1. */
import React,{useState} from 'react';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {newGame,createCharacter,startCombat} from '../core/game';
import {debugPrepareDungeonLab,debugSetLevel} from './debug-tools';
import {unlockCombatCompanion,equipCombatCompanion} from '../core/combat-companions';
import {totalXpAtLevel} from '../core/progression';
import {ITEMS,itemDef} from '../content/items';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {CharacterScreen} from '../screens/CharacterScreen';
import {CombatScreen} from '../screens/CombatScreen';
import {SkillsScreen} from '../screens/SkillsScreen';
import {CompanionsScreen} from '../screens/CompanionsScreen';
import {WorldScreen} from '../screens/WorldScreen';
import {BattleStage} from '../components/BattleStage';
import {GuildChatView} from '../components/GuildChat';
import {GuildIdentitySummary} from '../components/GuildIdentitySummary';
import {GuildMemberRosterPanel} from '../components/GuildMemberRosterPanel';
import {GuildIdentityReview} from './GuildIdentityReview';
import {ProfileIdentityReview} from './ProfileIdentityReview';
import type {GuildChatMessage} from '../online/social';
import {MONSTERS} from '../content/monsters';
import {C} from '../theme/theme';

const now=Date.now();
const noop=()=>{};
const command=async()=>{};
// Fictional member/message data. Only presentational components are mounted;
// no online wrapper, read receipts, profile lookups or message sends are invoked.
const captureGuild={id:'store-bloomwardens',name:'The Bloomwardens',tag:'BLM',tagColorId:'tag_emerald'};
const captureMessages:GuildChatMessage[]=[
 {id:'store-1',account_id:'store-elowen',sender_name:'Elowen',body:'Welcome to the guild, Aster!',guild_role:'leader',created_at:'2026-09-28T18:41:00+02:00'},
 {id:'store-2',account_id:'store-brann',sender_name:'Brann',body:'Anyone else exploring Ironwood?',guild_role:'officer',created_at:'2026-09-28T18:42:00+02:00'},
 {id:'store-3',account_id:'store-aster',sender_name:'Aster',body:'I am! Hunting wolves and collecting ironwood.',guild_role:'member',created_at:'2026-09-28T18:43:00+02:00'},
] satisfies GuildChatMessage[];
for(const message of captureMessages){message.guild_tag='BLM';message.guild_tag_color_id='tag_emerald';}
function fixture(){
 let state=debugSetLevel(debugPrepareDungeonLab(createCharacter(newGame(now),'IRONWARDEN','Aster','female')),28);
 state={...state,currentRegionId:'IRONWOOD',exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD'],settings:{...state.settings,language:'en',reduceMotion:true},
  character:{...state.character!,gold:6840,profileIconId:'starter:armored-sentinel',equippedToolIds:{mining:'OATHSTONE_PICKAXE'}},
  inventory:{capacity:2000,stacks:ITEMS.filter(i=>i.type==='material').map((i,n)=>({itemId:i.id,quantity:48+n%70}))},
  skills:state.skills.map((s,n)=>({...s,level:24+n%9,xp:totalXpAtLevel(24+n%9)+6800})),
  quests:state.quests.map(q=>({...q,status:'claimed' as const,progress:1})),
 };
 const gear=EQUIPMENT_SETS.find(set=>set.id==='T1_003')!;
 state.character!.equipment=Object.fromEntries(gear.itemIds.map(id=>[itemDef(id).slot!,id]));

 for(const id of ['UNIT_001','UNIT_002','UNIT_003','UNIT_004','UNIT_005','UNIT_008'])state=unlockCombatCompanion(state,id,now-86400000*14);
 state.account.combatCompanionProgress=Object.fromEntries(Object.entries(state.account.combatCompanionProgress??{}).map(([id,p])=>[id,{...p,level:8,bondLevel:4}]));
 state=equipCombatCompanion(state,'UNIT_001');
 return state;
}
export default function StoreCaptureReview(){
 const [state]=useState(fixture);
 const screen=typeof window==='undefined'?'hero':new URLSearchParams(window.location.search).get('storeScreen')??'hero';
 const sharedSkills={state,now,onGather:noop,onQueueGather:noop,onQueueRemove:noop,onQueueMove:noop,onQueueClear:noop,onQueueStart:noop,onCraft:noop,onClaimCraft:noop,onClaimAllCrafts:noop,onCancelCraft:noop,onMoveCraftWaiting:noop,onCraftPrerequisites:noop,onEquipTool:noop,onCharacter:noop,onInventory:noop,onViewToolRecipes:noop};
 return <SafeAreaProvider><View style={{flex:1,backgroundColor:C.bg}}>
  {screen==='hero'&&<CharacterScreen state={state} onUnequip={noop} onEquipSet={noop} onCrafting={noop} onInventory={noop} onSave={noop} onUpgrade={noop} onSocket={noop} onReplaceGem={noop} onUnsocket={noop} onGemRefine={noop} onGemCombine={noop} onGemDismantle={noop} onGemCacheClaim={noop}/>}
  {screen==='combat'&&<CombatScreen state={startCombat(state,'IRONWOOD_WOLF',now-7000)} onCommand={command} onChangeRegion={noop} onStart={noop} onQueue={noop} onQueueRemove={noop} onQueueMove={noop} onQueueClear={noop} onQueueStart={noop} onBoss={noop} initialMonsterId="IRONWOOD_WOLF"/>}
  {screen==='battle'&&<View style={{padding:12}}><BattleStage state={state} monster={MONSTERS.find(m=>m.id==='IRONWOOD_WOLF')!} elapsedSeconds={7} cycleSeconds={28}/></View>}
  {screen==='skills'&&<SkillsScreen {...sharedSkills} state={{...state,currentRegionId:'OLD_MINES'}} initialMode="gathering" initialSkill="mining"/>}
  {screen==='crafting'&&<SkillsScreen {...sharedSkills} initialMode="crafting" initialSkill="smithing"/>}
  {screen==='companions'&&<CompanionsScreen state={state} language="en" now={now} onCommand={command} onCreate={noop}/>}
  {screen==='world'&&<WorldScreen state={state} onTravel={noop} onOpenCombat={noop} onOpenSkills={noop}/>}
  {screen==='guild-identity'&&<GuildIdentityReview state={state}/>}
  {screen==='profile-identity'&&<ProfileIdentityReview state={state}/>}
  {screen==='social'&&<View style={{padding:16,gap:16}}>
   <View nativeID="store-guild" style={{gap:10}}>
    <GuildIdentitySummary {...captureGuild} level={12} bannerId="world_tree_green" frameId="silver_fellowship" nameColorId="name_ivory" motto="Stronger together."/>
    <GuildMemberRosterPanel members={captureMessages.slice(0,2).map((message,i)=>({accountId:message.account_id,displayName:message.sender_name,role:message.guild_role!,contributionThisWeek:1480-i*360,onlineState:'online',joinedAt:'2026-09-01T12:00:00Z'}))}/>
   </View>
   <View nativeID="store-chat" style={{padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel}}>
    <GuildChatView language="en" currentPlayerName="Aster" guild={captureGuild} messages={captureMessages} body="" onBodyChange={noop} onSend={noop} reduceMotion/>
   </View>
  </View>}
 </View></SafeAreaProvider>;
}
