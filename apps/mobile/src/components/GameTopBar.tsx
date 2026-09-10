import {useEffect,useMemo,useState} from 'react';
import {Image,ImageSourcePropType,Modal,Platform,Pressable,ScrollView,StatusBar as NativeStatusBar,StyleSheet,Text,View} from 'react-native';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {effectiveStats} from '../core/game';
import {formatGameNumber} from '../core/number-format';
import {normalizeQuickNavDestinations,QUICK_NAV_DESTINATIONS,QuickNavDestination} from '../core/quick-navigation';
import type {GameState} from '../core/types';
import {C,equipmentColors,touchTargetPreferred} from '../theme/theme';
import {environmentForActivity,environmentForZone} from '../core/world-weather';
import {currentRegionId} from '../core/combat-region';
import {EnvironmentArtwork} from './EnvironmentArtwork';
import {EnvironmentDetailsModal} from './EnvironmentDetailsModal';

const destinationIcons:Record<QuickNavDestination,ImageSourcePropType>={
  Home:require('../../assets/navigation/home_24.png'),
  Character:require('../../assets/navigation/character_24.png'),
  World:require('../../assets/navigation/world_24.png'),
  Inventory:require('../../assets/navigation/inventory_24.png'),
  More:require('../../assets/navigation/settings_24.png'),
  Quests:require('../../assets/navigation/quests_24.png'),
  Skills:require('../../assets/navigation/skills_24.png'),
  Events:require('../../assets/navigation/quests_24.png'),
  Friends:require('../features/chat-pilot/assets/icons/add_friend.png'),
  Guild:require('../features/chat-pilot/assets/icons/guild.png'),
  Settings:require('../../assets/navigation/settings_24.png'),
};

const activityLabels={combat:'HUNTING',mining:'MINING',woodcutting:'WOODCUTTING',fishing:'FISHING'} as const;

function elapsedLabel(startedAtMs:number,nowMs:number){
  const total=Math.max(0,Math.floor((nowMs-startedAtMs)/1000));
  const hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
  if(hours)return `${hours}h ${minutes}m`;
  if(minutes)return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function activityName(state:GameState){
  const activity=state.activity;
  if(!activity)return 'Ready for your next path';
  if(activity.kind==='combat')return MONSTERS.find(entry=>entry.id===activity.targetId)?.name??activity.targetId;
  return GATHERING.find(entry=>entry.id===activity.targetId)?.name??activity.targetId;
}

type Props={
  state:GameState;
  nowMs:number;
  labelForDestination:(destination:QuickNavDestination)=>string;
  onNavigate:(destination:QuickNavDestination)=>void;
  onChangeDestinations:(destinations:QuickNavDestination[])=>void|Promise<void>;
};

export function GameTopBar({state,nowMs,labelForDestination,onNavigate,onChangeDestinations}:Props){
  const active=normalizeQuickNavDestinations(state.settings.quickNavDestinations);
  const [open,setOpen]=useState(false);
  const [environmentOpen,setEnvironmentOpen]=useState(false);
  const [customizing,setCustomizing]=useState(false);
  const [draft,setDraft]=useState<QuickNavDestination[]>(active);
  useEffect(()=>{if(!open)setDraft(active)},[open,state.settings.quickNavDestinations]);
  const maxHp=Math.max(1,effectiveStats(state).hp),currentHp=Math.max(0,Math.min(maxHp,state.character?.currentHp??0));
  const hpPercent=`${Math.round(currentHp/maxHp*100)}%` as `${number}%`;
  const activity=state.activity;
  const environment=activity?environmentForActivity(activity):environmentForZone(currentRegionId(state),nowMs);
  const activityDetail=activity?`${activityLabels[activity.kind]} · ${elapsedLabel(activity.startedAtMs,nowMs)}`:'REALM IDLE';
  const selected=new Set(draft);
  const canSave=draft.length===5;
  const orderedChoices=useMemo(()=>[...draft,...QUICK_NAV_DESTINATIONS.filter(item=>!draft.includes(item))],[draft]);
  function close(){setOpen(false);setCustomizing(false)}
  function toggle(destination:QuickNavDestination){
    setDraft(current=>current.includes(destination)?current.filter(item=>item!==destination):current.length<5?[...current,destination]:current);
  }
  async function save(){if(!canSave)return;await onChangeDestinations(draft);setCustomizing(false)}
  return <>
    <View style={styles.shell}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:environmentOpen}} accessibilityLabel={`${environment.seasonName}, ${environment.weatherName}`} accessibilityHint="Shows season, weather, and activity effects" onPress={()=>setEnvironmentOpen(true)} style={({pressed})=>[styles.environmentButton,{borderColor:environment.weatherColor},pressed&&styles.pressed]}>
        <EnvironmentArtwork type="season" id={environment.seasonId} size={24}/><View style={styles.environmentDivider}/><EnvironmentArtwork type="weather" id={environment.weatherId} size={24}/><View style={[styles.seasonStrip,{backgroundColor:environment.seasonColor}]}/>{activity&&<View style={styles.lockedDot}/>} 
      </Pressable>
      <View style={styles.activityBlock}>
        <Text numberOfLines={1} style={styles.activityDetail}>✦ {activityDetail}</Text>
        <Text numberOfLines={1} style={styles.activityName}>{activityName(state)}</Text>
        <View style={styles.hpRow}><Text style={styles.hpLabel}>HP</Text><View style={styles.hpTrack}><View style={[styles.hpFill,{width:hpPercent}]}/></View><Text style={styles.hpValue}>{currentHp}/{maxHp}</Text></View>
      </View>
      <View style={styles.goldBlock}><Text style={styles.goldLabel}>GOLD</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.78} style={styles.goldValue}>● {formatGameNumber(state.character?.gold??0,state.settings.numberMode)}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open quick navigation" accessibilityHint="Opens five customizable navigation shortcuts" onPress={()=>setOpen(true)} style={({pressed})=>[styles.menuButton,pressed&&styles.pressed]}>
        <View style={styles.menuLine}/><View style={styles.menuLine}/><View style={styles.menuLine}/>
      </Pressable>
    </View>
    <EnvironmentDetailsModal visible={environmentOpen} environment={environment} nowMs={nowMs} locked={!!activity} activityKind={activity?.kind} reduceMotion={state.settings.reduceMotion} onClose={()=>setEnvironmentOpen(false)}/>
    <Modal visible={open} transparent animationType={state.settings.reduceMotion?'none':'fade'} statusBarTranslucent onRequestClose={close}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Close quick navigation" onPress={close} style={StyleSheet.absoluteFill}/>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View><Text style={styles.sheetEyebrow}>PLAYER SHORTCUTS</Text><Text style={styles.sheetTitle}>{customizing?'Choose five destinations':'Quick navigation'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          {customizing?<>
            <Text style={styles.helper}>{draft.length}/5 selected · Tap selected entries to remove them.</Text>
            <ScrollView style={styles.choiceScroll} contentContainerStyle={styles.choiceList}>
              {orderedChoices.map(destination=>{const isSelected=selected.has(destination),blocked=!isSelected&&draft.length>=5;return <Pressable key={destination} accessibilityRole="checkbox" accessibilityState={{checked:isSelected,disabled:blocked}} onPress={()=>toggle(destination)} disabled={blocked} style={({pressed})=>[styles.choice,isSelected&&styles.choiceSelected,blocked&&styles.choiceBlocked,pressed&&styles.pressed]}>
                <Image source={destinationIcons[destination]} style={[styles.choiceIcon,!isSelected&&styles.choiceIconDim]} resizeMode="contain"/><Text style={styles.choiceText}>{labelForDestination(destination)}</Text><View style={[styles.check,isSelected&&styles.checkSelected]}><Text style={styles.checkText}>{isSelected?'✓':''}</Text></View>
              </Pressable>})}
            </ScrollView>
            <View style={styles.actions}><Pressable accessibilityRole="button" onPress={()=>{setDraft(active);setCustomizing(false)}} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{disabled:!canSave}} disabled={!canSave} onPress={()=>void save()} style={[styles.saveButton,!canSave&&styles.saveDisabled]}><Text style={styles.saveText}>Save five</Text></Pressable></View>
          </>:<>
            <View style={styles.shortcutList}>{active.map((destination,index)=><Pressable key={destination} accessibilityRole="button" onPress={()=>{close();onNavigate(destination)}} style={({pressed})=>[styles.shortcut,pressed&&styles.pressed]}><View style={styles.shortcutNumber}><Text style={styles.shortcutNumberText}>{index+1}</Text></View><Image source={destinationIcons[destination]} style={styles.shortcutIcon} resizeMode="contain"/><Text style={styles.shortcutText}>{labelForDestination(destination)}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View>
            <Pressable accessibilityRole="button" onPress={()=>{setDraft(active);setCustomizing(true)}} style={({pressed})=>[styles.customizeButton,pressed&&styles.pressed]}><Text style={styles.customizeText}>⚙ Customize these five</Text></Pressable>
          </>}
        </View>
      </View>
    </Modal>
  </>;
}

const styles=StyleSheet.create({
  shell:{paddingTop:Platform.OS==='android'?(NativeStatusBar.currentHeight??24)+6:6,minHeight:86,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingBottom:8,backgroundColor:'#07111c',borderBottomWidth:1,borderBottomColor:equipmentColors.lineStrong},
  environmentButton:{width:62,height:touchTargetPreferred,position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,borderWidth:1,backgroundColor:equipmentColors.panelRaised,borderRadius:8},environmentDivider:{width:1,height:24,backgroundColor:equipmentColors.line},seasonStrip:{position:'absolute',left:0,right:0,bottom:0,height:2},lockedDot:{position:'absolute',right:3,top:3,width:6,height:6,borderRadius:3,backgroundColor:equipmentColors.gold},
  activityBlock:{flex:1,minWidth:0},activityDetail:{color:equipmentColors.goldSoft,fontSize:10,fontWeight:'900',letterSpacing:.8},activityName:{color:C.text,fontSize:14,fontWeight:'900',marginTop:1},
  hpRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:5},hpLabel:{color:C.muted,fontSize:9,fontWeight:'900'},hpTrack:{height:7,flex:1,minWidth:42,overflow:'hidden',backgroundColor:'#182031',borderWidth:1,borderColor:C.line},hpFill:{height:'100%',backgroundColor:'#49d783'},hpValue:{color:C.text,fontSize:9,fontWeight:'800',fontVariant:['tabular-nums']},
  goldBlock:{width:72,alignItems:'flex-end'},goldLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:1},goldValue:{width:'100%',color:equipmentColors.goldSoft,fontSize:13,fontWeight:'900',textAlign:'right',fontVariant:['tabular-nums']},
  menuButton:{width:touchTargetPreferred,height:touchTargetPreferred,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:equipmentColors.lineStrong,backgroundColor:equipmentColors.panelRaised,borderRadius:8},menuLine:{width:23,height:3,backgroundColor:equipmentColors.goldSoft,borderRadius:2},pressed:{opacity:.66},
  modalRoot:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.68)'},sheet:{maxHeight:'82%',paddingHorizontal:14,paddingTop:16,paddingBottom:Platform.OS==='android'?20:32,backgroundColor:equipmentColors.background,borderTopWidth:2,borderTopColor:equipmentColors.lineStrong,borderTopLeftRadius:18,borderTopRightRadius:18},
  sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},sheetEyebrow:{color:equipmentColors.gold,fontSize:10,fontWeight:'900',letterSpacing:1.4},sheetTitle:{color:C.text,fontSize:22,fontWeight:'900'},closeButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{color:C.muted,fontSize:30,lineHeight:32},helper:{color:C.muted,fontSize:12,marginBottom:8},
  shortcutList:{gap:7},shortcut:{minHeight:52,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:equipmentColors.line,borderRadius:8},shortcutNumber:{width:26,height:26,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.selected,borderWidth:1,borderColor:equipmentColors.selectedLine,borderRadius:6},shortcutNumberText:{color:C.text,fontWeight:'900'},shortcutIcon:{width:28,height:28},shortcutText:{flex:1,color:C.text,fontSize:15,fontWeight:'800'},chevron:{color:equipmentColors.goldSoft,fontSize:26},customizeButton:{minHeight:48,alignItems:'center',justifyContent:'center',marginTop:12,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:8},customizeText:{color:equipmentColors.goldSoft,fontSize:14,fontWeight:'900'},
  choiceScroll:{maxHeight:410},choiceList:{gap:6,paddingBottom:8},choice:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:11,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:7},choiceSelected:{backgroundColor:equipmentColors.selected,borderColor:equipmentColors.selectedLine},choiceBlocked:{opacity:.38},choiceIcon:{width:25,height:25},choiceIconDim:{opacity:.65},choiceText:{flex:1,color:C.text,fontSize:14,fontWeight:'800'},check:{width:24,height:24,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.muted,borderRadius:5},checkSelected:{backgroundColor:equipmentColors.selectedLine,borderColor:equipmentColors.selectedLine},checkText:{color:'#06121d',fontWeight:'900'},
  actions:{flexDirection:'row',gap:10,marginTop:10},secondaryButton:{minHeight:48,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8},secondaryText:{color:C.text,fontWeight:'800'},saveButton:{minHeight:48,flex:1,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.gold,borderRadius:8},saveDisabled:{opacity:.38},saveText:{color:'#1a1205',fontWeight:'900'},
});
