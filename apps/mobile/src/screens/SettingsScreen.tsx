import {accountText,accountDuration} from '../i18n/account';
import {appBuildText} from '../i18n/app-build';
import {APP_BUILD_INFO} from '../app-build';
import type {Language} from '../i18n/languages';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BackHandler,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {UiIcon} from '../components/UiIcon';
import {DiscordButton} from '../components/DiscordButton';
import {GameButton} from '../components/GameButton';
import {ConfirmModal} from '../components/ConfirmModal';
import {SettingToggle} from '../components/SettingToggle';
import {Panel} from '../components/Panel';
import {DeveloperTools} from '../components/DeveloperTools';
import {OnlineAccountPanel} from '../components/OnlineAccountPanel';
import {GooglePlayCommercePanel} from '../components/GooglePlayCommercePanel';
import {SaveTransferPanel} from '../components/SaveTransferPanel';
import {GameState} from '../core/types';
import {typography,UI_THEMES,equipmentTheme,type ThemeColors,type UiThemeId} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';
import {GameGuidePanel} from '../components/GameGuidePanel';
import {ChatEmotePicker} from '../components/ChatEmotePicker';
import {GuideTopicModal} from '../components/GuideTopicModal';
import {acknowledgeGameGuide,guideDefinition} from '../core/onboarding';
import {offlineCapBreakdown} from '../core/game';
import {activityQueueCrossRegionAllowed} from '../core/activity-queue';
import type {GameGuideId,GameGuideDestination} from '../core/onboarding';

type Props={
  initialSection?:SettingsSection;
  onSectionChange?:(section:SettingsSection|undefined)=>void;
  onNavigateGuide?:(destination:GameGuideDestination)=>void;
  onStartMainScreenTour?:()=>void;
  onOpenUpdates?:()=>void;
  online?:boolean;
  state:GameState;
  onLanguage:(language:GameState['settings']['language'])=>void;
  onReset:()=>void;
  onChange:(next:GameState)=>void;
  /** Settles unclaimed progress and refunds reserved resources through the gameplay command. */
  onStopActivity:()=>Promise<void>;
  onRefreshCommerce?:(expectedAccountId:string)=>Promise<void>;
  onExport:()=>Promise<void>;
  onImport:(raw:string)=>Promise<void>;
  onRedeemCode?:(code:string)=>Promise<string|void>|string|void;
  onOpenCoopUiGallery?:()=>void;
};
export type SettingsSection='gameplay'|'chat'|'appearance'|'accessibility'|'account'|'store'|'data'|'guide'|'developer';
const DISCORD_INVITE_URL='https://discord.gg/Db83APvP5y';
const PRIVACY_POLICY_URL='https://elroynbenjamins.github.io/veldryn/privacy/';
const openExternal=(url:string)=>{void Linking.openURL(url)};
function SettingChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function ThemeChoice({id,selected,onPress,language}:{language:Language;id:UiThemeId;selected:boolean;onPress:()=>void}){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),p=UI_THEMES[id];return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.themeChoice,{backgroundColor:p.panel,borderColor:selected?p.selectionLine:p.line},pressed&&s.pressed]}><View style={s.themeChoiceHead}><View style={s.flex}><Text style={[s.themeChoiceName,{color:p.text}]}>{p.name}</Text><Text style={[s.themeChoiceSub,{color:p.muted}]}>{id==='obsidian'?a("Near-black · neutral hairlines"):id==='ember'?a("Near-black · ember accents"):a("Soft mint · cool teal accents")}</Text></View>{selected?<Text style={[s.themeCheck,{color:p.selectionLine}]}>✓</Text>:null}</View><View style={s.swatches}>{[p.bg,p.panelRaised,p.accent,p.selectionLine,p.good,p.bad].map((color,index)=><View key={index} style={[s.swatch,{backgroundColor:color,borderColor:p.line}]}/>)}</View></Pressable>}

function RedeemCodePanel({language,onRedeemCode}:{language:Language;onRedeemCode?:Props['onRedeemCode']}){
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [code,setCode]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const redeem=async()=>{
  const normalized=code.trim().toUpperCase();if(!normalized||busy)return;setStatus('');setBusy(true);
  try{const result=onRedeemCode?await onRedeemCode(normalized):a('Code redemption will be available when Live-Ops redemption is enabled.');setStatus(result??a('Code submitted.')) ;if(onRedeemCode)setCode('');}
  catch(error){setStatus(error instanceof Error?error.message:a('Unable to redeem this code.'));}
  finally{setBusy(false);}
 };
 return <Panel><Text style={[s.title,{color:C.text}]}>{a('Redeem code')}</Text><Text style={[s.sub,{color:C.muted}]}>{a('Enter a promotional code from an official VELDRYN announcement or event.')}</Text><View style={s.redeemRow}><TextInput accessibilityLabel={a('Redeem code')} autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={value=>{setCode(value.replace(/\s/g,''));setStatus('')}} placeholder={a('ENTER CODE')} placeholderTextColor={C.muted} style={[s.codeInput,{color:C.text,borderColor:C.line,backgroundColor:C.inputBg}]}/><GameButton compact title={busy?a('Checking…'):a('Redeem')} disabled={!code.trim()||busy} onPress={()=>redeem()}/></View>{status?<Text accessibilityLiveRegion="polite" style={[s.redeemStatus,{color:onRedeemCode?C.info:C.muted}]}>{status}</Text>:null}</Panel>;
}

export function SettingsScreen({state,onLanguage,onReset,onChange,onStopActivity,onRefreshCommerce,onExport,onImport,onRedeemCode,onOpenCoopUiGallery,onOpenUpdates,initialSection,onSectionChange,onNavigateGuide,onStartMainScreenTour,online=false}:Props){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const theme=useGameTheme(),s=useMemo(()=>makeStyles(theme),[theme]);
  const [selectedSection,setSelectedSection]=useState<SettingsSection|null>(initialSection??null);
  const setSection=(section:SettingsSection|null)=>{setSelectedSection(section);onSectionChange?.(section??undefined);};
  // Restore a category when returning from a linked page; also honor Android Back from the app shell.
  useEffect(()=>{setSelectedSection(initialSection??null);},[initialSection]);
  const [guideId,setGuideId]=useState<GameGuideId>();
   const [showAfkDetails,setShowAfkDetails]=useState(false),[showEmotes,setShowEmotes]=useState(false),[showActivityControls,setShowActivityControls]=useState(false),[showDeleteControls,setShowDeleteControls]=useState(false);
  const [confirmStop,setConfirmStop]=useState(false),[stopping,setStopping]=useState(false),[stopError,setStopError]=useState(''),[stopFeedback,setStopFeedback]=useState('');
  const stopInFlight=useRef(false);
  useEffect(()=>{if(!stopFeedback)return;const timeout=setTimeout(()=>setStopFeedback(''),5000);return()=>clearTimeout(timeout)},[stopFeedback]);
  const stopCurrentActivity=async()=>{
    if(stopInFlight.current)return;
    stopInFlight.current=true;setStopping(true);setStopError('');
    try{await onStopActivity();setConfirmStop(false);setShowActivityControls(false);setStopFeedback(a('Activity stopped. Earned progress has been settled.'));}
    catch(error){setConfirmStop(false);setStopFeedback('');setStopError(error instanceof Error?error.message:a('Could not stop activity. Try again.'));}
    finally{stopInFlight.current=false;setStopping(false);}
  };
  const {width}=useWindowDimensions(),phone=width<768;
  const section=phone?selectedSection:selectedSection??'gameplay';
  const navigationStyles=useMemo(()=>makeNavigationStyles(theme),[theme]);
  const sections:SettingsSection[]=['gameplay','chat','appearance','accessibility','account','data','store','guide',...(__DEV__&&!online?['developer' as const]:[])];
  const sectionLabel=(value:SettingsSection)=>value==='guide'?a('Help & Guide'):value==='data'?a('Data & Privacy'):value==='store'?a('Store'):a(value.charAt(0).toUpperCase()+value.slice(1));
  const sectionDescription=(value:SettingsSection)=>value==='gameplay'?a("Combat, activities and number display."):value==='chat'?a("Chat bar, language channel and emotes."):value==='appearance'?a("Choose a complete UI theme. Gameplay colors keep the same meaning in every theme."):value==='accessibility'?a("Make text, motion, and language fit your play style."):value==='account'?a("Manage your connected account and profile preferences."):value==='store'?a("Manage VIP, VIP+, Supporter and restore Google Play purchases."):value==='data'?a("Backups, save information and privacy."):value==='guide'?a("Browse the interactive VELDRYN help guide."):a("Development tools and visual QA controls.");
  const scrollRef=useRef<ScrollView>(null),scrollPositions=useRef<Record<string,number>>({}),restoredPage=useRef<string|undefined>(undefined);
  const pageKey=(phone?'phone:':'wide:')+(section??'index');
  const restoreScroll=()=>{if(restoredPage.current===pageKey)return;scrollRef.current?.scrollTo({y:scrollPositions.current[pageKey]??0,animated:false});restoredPage.current=pageKey;};
  useEffect(()=>{
    if(!phone||!selectedSection||guideId)return;
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{setSection(null);return true;});
    return()=>subscription.remove();
  },[phone,selectedSection,guideId]);
  const afk=offlineCapBreakdown(state),premiumRegionQueue=activityQueueCrossRegionAllowed(state);
  const update=(partial:Partial<GameState['settings']>)=>onChange({...state,settings:{...state.settings,...partial}});
  const restoreDefaults=()=>update({numberMode:'abbreviated',autoEatThresholdPct:40,stopCombatWhenOutOfFood:true,autoTravelQueuedActivities:false});
  return <View style={navigationStyles.screen}>
    <ScrollView key={pageKey} ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onContentSizeChange={restoreScroll} onScroll={event=>{if(restoredPage.current===pageKey)scrollPositions.current[pageKey]=event.nativeEvent.contentOffset.y;}} scrollEventThrottle={16} contentContainerStyle={[s.root,{backgroundColor:theme.bg}]} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={[s.h,{color:theme.text}]}>{phone&&section?sectionLabel(section):t(language,'settings.title')}</Text>
    {(!phone||!section)&&<Text style={[s.sub,{color:theme.muted}]}>{t(language,'settings.intro')}</Text>}
    {phone&&!section&&<View>{sections.map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={sectionLabel(value)} accessibilityHint={sectionDescription(value)} onPress={()=>setSection(value)} style={({pressed})=>[navigationStyles.category,pressed&&navigationStyles.categoryPressed]}><View style={navigationStyles.categoryCopy}><Text style={navigationStyles.categoryText}>{sectionLabel(value)}</Text><Text numberOfLines={1} style={navigationStyles.categoryDescription}>{sectionDescription(value)}</Text></View><UiIcon name="next" size={24}/></Pressable>)}</View>}
    {(!phone||!section)&&<Panel><View style={[s.communityRow,phone&&navigationStyles.communityStack]}><View style={s.flex}><Text style={[s.communityLabel,{color:theme.accent}]}>{a("COMMUNITY")}</Text><Text style={[s.communityText,{color:theme.muted}]}>{a("News, feedback, help and other VELDRYN players.")}</Text></View><DiscordButton label={a("Join Discord")} onPress={()=>openExternal(DISCORD_INVITE_URL)}/></View></Panel>}
    {section&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} showsVerticalScrollIndicator={false}>{phone?<SettingChip label={t(language,'settings.title')} selected={false} onPress={()=>setSection(null)}/>:null}{sections.map(value=><SettingChip key={value} label={sectionLabel(value)} selected={section===value} onPress={()=>setSection(value)}/>)}</ScrollView>}
    {section&&<Text style={[s.sectionHint,{color:theme.info}]}>{sectionDescription(section)}</Text>}

    {section==='appearance'&&<Panel><Text style={[s.title,{color:theme.text}]}>{a("Interface theme")}</Text><View style={s.themeList}>{(['obsidian','ember','ivory'] as const).map(id=><ThemeChoice language={language} key={id} id={id} selected={(state.settings.uiTheme??'obsidian')===id} onPress={()=>update({uiTheme:id})}/>)}</View></Panel>}
    {section==='guide'&&<GameGuidePanel state={state} onStartTour={onStartMainScreenTour} onOpen={id=>{onChange(acknowledgeGameGuide(state,id,true));setGuideId(id)}}/>}
    {section==='account'&&<><Panel>
      <Text style={[s.sub,{color:theme.muted}]}>{a('Character: {name} · {save}',{name:state.character?.name??a('Not created yet'),save:a(online?'Online save':'Local save')})}</Text>
      <Text style={[s.muted,{color:theme.muted}]}>{online?a("Your progress is saved after every successful action."):a("Local progress is kept separately from online characters.")}</Text>
    </Panel>
    <OnlineAccountPanel state={state}/></>}
    {section==='store'&&<><GooglePlayCommercePanel state={state} online={online} onChange={onChange} onRefreshCommerce={onRefreshCommerce}/><RedeemCodePanel language={language} onRedeemCode={onRedeemCode}/></>}
    {section==='gameplay'&&stopFeedback?<Text accessibilityLiveRegion="polite" style={[s.sub,{color:theme.good}]}>{stopFeedback}</Text>:null}
    {section==='gameplay'&&<><Panel>
      <View style={s.afkBox}><View style={s.afkHead}><Text style={[s.settingLabel,{color:theme.text,marginTop:0}]}>{a("AFK reserve")}</Text><Text style={[s.afkValue,{color:theme.good}]}>{accountDuration(language,afk.hours*3600)}</Text></View><Pressable accessibilityRole="button" accessibilityState={{expanded:showAfkDetails}} onPress={()=>setShowAfkDetails(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}><Text style={s.disclosureLabel}>{a("AFK details")}</Text><View style={showAfkDetails?s.disclosureArrowOpen:undefined}><UiIcon name="next" size={18} muted/></View></Pressable>{showAfkDetails?<View style={s.detailStack}><Text style={[s.muted,{color:theme.muted}]}>{a('{base}h base · up to {free}h through progression · {max}h maximum',{base:afk.baseHours,free:afk.freeMaxHours,max:afk.maxHours})}</Text><Text style={[s.muted,{color:theme.muted}]}>{a("Earned milestones include class, quest, boss, guild and character-slot progression through slot #5.")}</Text><Text style={[s.afkPaid,{color:theme.info}]}>{a("Final +6h: VIP +2h · VIP+ +2h extra · Supporter +2h")}</Text></View>:null}</View>
      <Text style={[s.settingLabel,{color:theme.text}]}>{a("Number display")}</Text><View style={s.choices}>{(['abbreviated','exact'] as const).map(mode=><SettingChip key={mode} label={mode==='abbreviated'?a("Abbreviated · 1.2K"):a("Exact · 1,200")} selected={state.settings.numberMode===mode} onPress={()=>update({numberMode:mode})}/>)}</View>
      <Text style={[s.settingLabel,{color:theme.text}]}>{a("Auto-eat threshold")}</Text><Text style={[s.sub,{color:theme.muted}]}>{a("Eat equipped food when HP falls below the selected level.")}</Text><View style={s.choices}>{([20,40,60,80] as const).map(threshold=><SettingChip key={threshold} label={a('{percent}% HP',{percent:threshold})} selected={state.settings.autoEatThresholdPct===threshold} onPress={()=>update({autoEatThresholdPct:threshold})}/>)}</View>
      <SettingToggle language={language} label={a("Stop combat when out of food")} value={state.settings.stopCombatWhenOutOfFood} onValueChange={value=>update({stopCombatWhenOutOfFood:value})}/>
      <SettingToggle language={language} label={a("Auto-travel between queued activities")} description={premiumRegionQueue?a("Automatically switch between already-unlocked regions only after a safe queue handoff. Does not reset the AFK limit."):a("Available with VIP, VIP+ or Supporter. Free players can still queue activities in their current region.")}
        value={premiumRegionQueue&&state.settings.autoTravelQueuedActivities===true} disabled={!premiumRegionQueue} onValueChange={value=>update({autoTravelQueuedActivities:value})}/>
      <GameButton compact title={a("Restore gameplay defaults")} tone="secondary" onPress={restoreDefaults}/>
    </Panel>
    {state.activity?<Panel>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showActivityControls}} onPress={()=>setShowActivityControls(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
        <View style={s.flex}>
          <Text style={[s.title,{color:theme.text}]}>{a("Current activity")}</Text>
          <Text numberOfLines={1} style={[s.muted,{color:theme.muted}]}>{a('Active: {target} ({kind})',{target:state.activity.targetId,kind:a(state.activity.kind.charAt(0).toUpperCase()+state.activity.kind.slice(1))})}</Text>
        </View>
        <View style={showActivityControls?s.disclosureArrowOpen:undefined}><UiIcon name="next" size={18} muted/></View>
      </Pressable>
      {showActivityControls?<View style={s.detailStack}>{stopError?<Text accessibilityRole="alert" style={[s.sub,{color:theme.bad}]}>{stopError}</Text>:null}<GameButton title={a("Stop current activity")} tone="danger" disabled={stopping} onPress={()=>{setStopError('');setConfirmStop(true)}}/></View>:null}
    </Panel>:null}
    </>}
    {section==='chat'&&<><Panel>
      <SettingToggle language={language} label={a("Show chat")} description={a("Show the chat dock above navigation. Turn it off to keep chat hidden while you play.")} value={state.settings.autoJoinWorldChat!==false} onValueChange={autoJoinWorldChat=>update({autoJoinWorldChat})}/>
      {state.settings.autoJoinWorldChat!==false?<View style={s.chatSettings}>
        <Text style={[s.settingLabel,{color:theme.text}]}>{a("Collapsed chat preview")}</Text>
        <View style={s.choices}>{([1,2,3] as const).map(lines=><SettingChip key={lines} label={lines===1?a("1 line · compact"):a('{count} lines',{count:lines})} selected={(state.settings.chatDockLines??1)===lines} onPress={()=>update({chatDockLines:lines})}/>)}</View>
        <Text style={[s.settingLabel,{color:theme.text}]}>{a("Default World channel")}</Text>
        <View style={s.choices}>{([{id:1,label:'English'},{id:2,label:'Spanish'},{id:3,label:'Global 1'},{id:4,label:'Global 2'}] as const).map(channel=><SettingChip key={channel.id} label={channel.label} selected={(state.settings.defaultWorldChat??1)===channel.id} onPress={()=>update({defaultWorldChat:channel.id})}/>)}</View>
      </View>:null}
    </Panel>
    <Panel><Pressable accessibilityRole="button" accessibilityState={{expanded:showEmotes}} onPress={()=>setShowEmotes(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
        <View style={s.flex}><Text style={[s.title,{color:theme.text}]}>{a("Chat emotes")}</Text><Text style={[s.muted,{color:theme.muted}]}>{a("Choose the eight emotes available from the chat composer.")}</Text></View>
        <View style={showEmotes?s.disclosureArrowOpen:undefined}><UiIcon name="next" size={18} muted/></View>
      </Pressable>
      {showEmotes?<View style={s.detailStack}><ChatEmotePicker settingsMode unlockedIds={state.account.unlockedEmoteIds} trayIds={state.settings.chatEmoteTrayIds} bodyPresentation={state.character?.bodyPresentation} onPick={()=>{}} onTrayChange={chatEmoteTrayIds=>update({chatEmoteTrayIds})}/></View>:null}
    </Panel></>}
    {section==='accessibility'&&<>
    <Panel>
      <Text style={[s.title,{color:theme.text}]}>{t(state.settings.language,'settings.accessibility')}</Text>
      <Text style={[s.sub,{color:theme.muted}]}>{a("Text scaling follows your device accessibility setting. Reduced motion disables repeating combat and progress effects.")}</Text>
      <SettingToggle language={language} label={a("Reduced motion")} description={a("Turn off repeating combat and progress effects.")} value={state.settings.reduceMotion} onValueChange={value=>update({reduceMotion:value})}/>
    </Panel>
    <Panel>
      <Text style={[s.title,{color:theme.text}]}>{t(state.settings.language,'settings.language')}</Text>
      <Text style={[s.sub,{color:theme.muted}]}>{t(state.settings.language,'settings.languageStatus')}</Text>
      <View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><SettingChip key={id} label={LANGUAGE_NAMES[id]} selected={state.settings.language===id} onPress={()=>onLanguage(id)}/>)}</View>
    </Panel></>}
    {section==='data'&&<>
      {online?<Panel>
        <Text style={[s.title,{color:theme.text}]}>{a("Save backup")}</Text>
        <Text style={[s.muted,{color:theme.muted}]}>{a("Your progress is saved after every successful action.")}</Text>
        <GameButton title={a("Export a copy of my online save")} tone="secondary" onPress={()=>onExport()}/>
      </Panel>:<SaveTransferPanel language={language} onExport={onExport} onImport={onImport} reduceMotion={state.settings.reduceMotion}/>}
      <Panel>
        <Text style={[s.title,{color:theme.text}]}>{t(state.settings.language,'settings.privacy')}</Text>
        <Text style={[s.sub,{color:theme.muted}]}>{online?a("Your account and gameplay progress are stored on VELDRYN servers. Your older local save stays on this device."):a("Offline progress remains on this device. Local progress cannot be uploaded as online rewards.")}</Text>
        <GameButton title={a("Privacy Policy")} tone="secondary" onPress={()=>openExternal(PRIVACY_POLICY_URL)}/>
      </Panel>
      {!online?<Panel>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showDeleteControls}} onPress={()=>setShowDeleteControls(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
          <Text style={[s.disclosureLabel,{color:theme.bad}]}>{a("Delete local save")}</Text>
          <View style={showDeleteControls?s.disclosureArrowOpen:undefined}><UiIcon name="next" size={18} muted/></View>
        </Pressable>
        {showDeleteControls?<View style={s.detailStack}>
          <Text style={[s.sub,{color:theme.muted}]}>{a("Deleting your local save removes progress stored on this device.")}</Text>
          <GameButton title={a("Delete local save")} tone="danger" onPress={onReset}/>
        </View>:null}
      </Panel>:null}
    </>}
    {section==='developer'&&__DEV__&&!online&&<DeveloperTools state={state} onChange={onChange} onOpenCoopUiGallery={onOpenCoopUiGallery}/>}
    {(!section||section==='account')?<View style={s.footerLinks}>{onOpenUpdates?<GameButton compact title={a("What's New & Updates")} tone="secondary" onPress={onOpenUpdates}/>:null}<GameButton compact title={a("Privacy Policy")} tone="secondary" onPress={()=>openExternal(PRIVACY_POLICY_URL)}/></View>:null}
    {(section==='account'||!section)?<View>
      <Text selectable style={s.sub}>{appBuildText(language,'version',{version:APP_BUILD_INFO.version})}{APP_BUILD_INFO.buildNumber?` · ${appBuildText(language,'build',{build:APP_BUILD_INFO.buildNumber})}`:''}</Text>
      <Text selectable style={s.sub}>{appBuildText(language,'channel',{channel:APP_BUILD_INFO.releaseChannel})}</Text>
      {APP_BUILD_INFO.sourceCommit?<Text selectable style={s.sub}>{appBuildText(language,'source',{source:APP_BUILD_INFO.sourceCommit})}</Text>:null}
    </View>:null}
  </ScrollView><GuideTopicModal onOpen={onNavigateGuide?destination=>{setGuideId(undefined);onNavigateGuide(destination)}:undefined} language={language} definition={guideId?guideDefinition(guideId):undefined} visible={!!guideId} onClose={()=>setGuideId(undefined)}/><ConfirmModal visible={confirmStop} busy={stopping} title={a('Stop current activity?')} message={a('Earned progress will be collected first. Any reserved resources are handled by the activity cancellation rules.')} confirmLabel={a('Stop activity')} danger reduceMotion={state.settings.reduceMotion} onConfirm={()=>void stopCurrentActivity()} onCancel={()=>setConfirmStop(false)}/></View>;
}

function makeNavigationStyles(C:ThemeColors){return StyleSheet.create({
  screen:{flex:1,minHeight:0,backgroundColor:C.bg},
  back:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
  backText:{...typography.bodyStrong,color:C.text,flexShrink:1},
  category:{minHeight:60,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
  categoryCopy:{flex:1,minWidth:0,gap:2},categoryText:{...typography.bodyStrong,color:C.text},categoryDescription:{...typography.caption,color:C.muted,lineHeight:15},
  categoryPressed:{backgroundColor:C.panel2},
  communityStack:{flexDirection:'column',alignItems:'stretch'},
});}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{padding:14,gap:10},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text,marginBottom:5},sub:{color:C.muted,lineHeight:20,marginBottom:8},muted:{color:C.muted,lineHeight:19,opacity:.8},tabs:{gap:6,paddingRight:16},sectionHint:{...typography.caption,color:C.info,lineHeight:18},chip:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:C.text},pressed:{opacity:.76},settingLabel:{...typography.bodyStrong,color:C.text,marginTop:8},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{flexGrow:1,flexBasis:120,minWidth:120},largeChoice:{flexBasis:'100%' as const},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},flex:{flex:1},communityRow:{flexDirection:'row',alignItems:'center',gap:10},communityLabel:{...typography.caption,fontWeight:'900',letterSpacing:.8},communityText:{...typography.caption,lineHeight:17},chatSettings:{gap:10,paddingTop:8},disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'},disclosureLabel:{...typography.caption,color:C.info,fontWeight:'700'},disclosureArrowOpen:{transform:[{rotate:'90deg'}]},detailStack:{gap:8,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},afkBox:{gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},afkHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},afkValue:{...typography.title,fontWeight:'900'},afkPaid:{...typography.caption,fontWeight:'800',lineHeight:17},redeemRow:{flexDirection:'row',alignItems:'center',gap:8},codeInput:{flex:1,minHeight:44,borderWidth:1,borderRadius:10,paddingHorizontal:12,fontSize:15,fontWeight:'700',letterSpacing:1},redeemStatus:{...typography.caption,lineHeight:17,marginTop:6},footerLinks:{paddingTop:4,paddingBottom:10},themeList:{gap:8},themeChoice:{minHeight:82,borderWidth:2,borderRadius:12,padding:10,gap:8},themeChoiceHead:{flexDirection:'row',alignItems:'center',gap:8},themeChoiceName:{...typography.bodyStrong},themeChoiceSub:{...typography.caption},themeCheck:{fontSize:20,fontWeight:'900'},swatches:{flexDirection:'row',gap:6},swatch:{flex:1,height:16,borderWidth:1,borderRadius:5}});}
