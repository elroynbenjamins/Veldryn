/** Selected production account/progression screens on an isolated in-memory QA state.
 * Never mounts authentication, live transports, save persistence, or privileged APIs.
 * Do not replace production release flags or grant real account entitlements here. */
import {useState} from 'react';
import {View,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GameThemeProvider} from '../theme/ThemeContext';
import {GameLanguageProvider} from '../i18n/GameLanguageProvider';
import {buildAdminQaState} from './admin-qa-profile';
import {ResourceCodexScreen} from '../screens/ResourceCodexScreen';
import {AdventurersJournalScreen} from '../screens/AdventurersJournalScreen';
import {BestiaryScreen} from '../screens/BestiaryScreen';
import {MasteryHallScreen} from '../screens/MasteryHallScreen';
import {DailySuppliesScreen} from '../screens/DailySuppliesScreen';
import {RewardsInboxScreen} from '../screens/RewardsInboxScreen';
import {AccountBonusesScreen} from '../screens/AccountBonusesScreen';
import {ActivityOverviewScreen} from '../screens/ActivityOverviewScreen';
import {ArenaScreen} from '../screens/ArenaScreen';
import {CollectionsScreen} from '../screens/CollectionsScreen';
import {MoreScreen} from '../screens/MoreScreen';
import {NewUnlocksScreen} from '../screens/NewUnlocksScreen';
import {AdminQaScreen} from '../screens/AdminQaScreen';
import type {ClassId} from '../core/types';

export type AdditionalReviewScreen=
 'resources'|'journal'|'bestiary'|'mastery'|'daily'|'inbox'|'bonuses'|'characters'|
 'arena'|'collections'|'account'|'unlocks'|'admin';

const noop=()=>{};
export default function AdditionalScreensReview({screen}:{screen:AdditionalReviewScreen}){
 const [state,setState]=useState(()=>buildAdminQaState(undefined,'IRONWARDEN'));
 const [selected,setSelected]=useState<AdditionalReviewScreen>(screen);
 const navigate=(destination:string)=>{
  const screens:Record<string,AdditionalReviewScreen>={
   ResourceCodex:'resources',AdventurersJournal:'journal',Bestiary:'bestiary',
   MasteryHall:'mastery',Collections:'collections',DailySupplies:'daily',RewardsInbox:'inbox',
   AccountBonuses:'bonuses',Activity:'characters',Arena:'arena',NewUnlocks:'unlocks',
   Settings:'account',
  };
  setSelected(screens[destination]??'account');
 };
 const command=async()=>{};
 let body;
 switch(selected){
  case 'resources':body=<ResourceCodexScreen state={state} onNavigateSource={noop} onOpenCompanions={noop}/>;break;
  case 'journal':body=<AdventurersJournalScreen state={state} onNavigate={navigate}/>;break;
  case 'bestiary':body=<BestiaryScreen state={state}/>;break;
  case 'mastery':body=<MasteryHallScreen state={state} onOpenSkill={noop} onNavigate={noop} onProfile={noop}/>;break;
  case 'daily':body=<DailySuppliesScreen state={state} onCommand={command}/>;break;
  case 'inbox':body=<RewardsInboxScreen state={state} online={false} onRefresh={async()=>{}} onEventClaim={async()=>{}} preview={{entries:[],pendingCount:0,total:0}}/>;break;
  case 'bonuses':body=<AccountBonusesScreen state={state}/>;break;
  case 'characters':body=<ActivityOverviewScreen state={state} now={Date.now()} onSwitch={noop}/>;break;
  case 'arena':body=<ArenaScreen state={state} onChange={setState}/>;break;
  case 'collections':body=<CollectionsScreen state={state} onChange={setState}/>;break;
  case 'account':body=<MoreScreen language={state.settings.language} character={state.character} accountStatus="local" onNavigate={navigate} onOpenAdminQa={()=>setSelected('admin')} onOpenRoadmap={noop}/>;break;
  case 'unlocks':body=<NewUnlocksScreen language={state.settings.language} entries={[]} onBack={noop} onCustomize={noop}/>;break;
  case 'admin':body=<AdminQaScreen state={state} onChange={setState} onClose={()=>setSelected('account')} onOpenDungeon={noop}/>;break;
 }
 return <SafeAreaProvider><GameThemeProvider themeId="obsidian"><GameLanguageProvider language="en">
  <View style={{flex:1,backgroundColor:'#101724',width:'100%',maxWidth:480,alignSelf:'center'}}>
   <View style={{paddingHorizontal:10,paddingVertical:6,backgroundColor:'#19263a',borderBottomWidth:1,borderBottomColor:'#34435d'}}>
    <Text style={{fontSize:10,color:'#c8d6e4'}}>SANDBOX · LEVEL 100 · MEMORY ONLY · NO LIVE ACCOUNT</Text>
   </View>
   <View style={{flex:1,minHeight:0}}>{body}</View>
  </View>
 </GameLanguageProvider></GameThemeProvider></SafeAreaProvider>;
}
