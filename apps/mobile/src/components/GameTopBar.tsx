import {navigationIcons as destinationIcons} from '../theme/ui-icons';
import {useEffect,useMemo,useState} from 'react';
import {Image,Platform,Pressable,ScrollView,StatusBar as NativeStatusBar,StyleSheet,Text,View} from 'react-native';
import {effectiveStats} from '../core/game';
import {formatGameNumber} from '../core/number-format';
import {normalizeQuickNavDestinations,QUICK_NAV_DESTINATIONS,QuickNavDestination} from '../core/quick-navigation';
import type {GameState} from '../core/types';
import {touchTargetPreferred,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {environmentForActivity,environmentForZone} from '../core/world-weather';
import {currentRegionId} from '../core/combat-region';
import {EnvironmentArtwork} from './EnvironmentArtwork';
import {EnvironmentDetailsModal} from './EnvironmentDetailsModal';
import {ActiveActivityBar} from './ActiveActivityBar';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';



type Props={
  state:GameState;
  nowMs:number;
  labelForDestination:(destination:QuickNavDestination)=>string;
  onNavigate:(destination:QuickNavDestination)=>void;
  onChangeDestinations:(destinations:QuickNavDestination[])=>void|Promise<void>;
  onOpenActivity:()=>void;
};

export function GameTopBar({state,nowMs,labelForDestination,onNavigate,onChangeDestinations,onOpenActivity}:Props){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),styles=useMemo(()=>makeStyles(C),[C]);
  const active=normalizeQuickNavDestinations(state.settings.quickNavDestinations);
  const [open,setOpen]=useState(false);
  const [environmentOpen,setEnvironmentOpen]=useState(false);
  const [customizing,setCustomizing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [draft,setDraft]=useState<QuickNavDestination[]>(active);
  useEffect(()=>{if(!open)setDraft(active)},[open,state.settings.quickNavDestinations]);
  const maxHp=Math.max(1,effectiveStats(state).hp),currentHp=Math.max(0,Math.min(maxHp,state.character?.currentHp??0));
  const hpPercent=`${Math.round(currentHp/maxHp*100)}%` as `${number}%`;
  const activity=state.activity;
  const environment=activity?environmentForActivity(activity):environmentForZone(currentRegionId(state),nowMs);
  const selected=new Set(draft);
  const canSave=draft.length===5&&!saving;
  const orderedChoices=useMemo(()=>[...draft,...QUICK_NAV_DESTINATIONS.filter(item=>!draft.includes(item))],[draft]);
  function close(){setOpen(false);setCustomizing(false)}
  function toggle(destination:QuickNavDestination){
    setDraft(current=>current.includes(destination)?current.filter(item=>item!==destination):current.length<5?[...current,destination]:current);
  }
  async function save(){if(!canSave)return;setSaving(true);try{await onChangeDestinations(draft);setCustomizing(false)}finally{setSaving(false)}}
  return <>
    <View style={styles.shell}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:environmentOpen}} accessibilityLabel={`${environment.seasonName}, ${environment.weatherName}`} accessibilityHint="Shows season, weather, and activity effects" onPress={()=>setEnvironmentOpen(true)} style={({pressed})=>[styles.environmentButton,{borderColor:environment.weatherColor},pressed&&styles.pressed]}>
        <EnvironmentArtwork type="season" id={environment.seasonId} size={24}/><View style={styles.environmentDivider}/><EnvironmentArtwork type="weather" id={environment.weatherId} size={24}/><View style={[styles.seasonStrip,{backgroundColor:environment.seasonColor}]}/>{activity&&<View style={styles.lockedDot}/>} 
      </Pressable>
      <View accessible accessibilityRole="text" style={styles.hpBlock} accessibilityLabel={`${currentHp} of ${maxHp} health`}>
        <View style={styles.hpHeading}><Text style={styles.hpLabel}>HP</Text><Text style={styles.hpValue}>{currentHp}/{maxHp}</Text></View>
        <View style={styles.hpTrack}><View style={[styles.hpFill,{width:hpPercent}]}/></View>
      </View>
      <View accessible accessibilityRole="text" accessibilityLabel={`${formatGameNumber(state.character?.gold??0,state.settings.numberMode)} gold`} style={styles.goldBlock}><Text style={styles.goldLabel}>GOLD</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.78} style={styles.goldValue}>● {formatGameNumber(state.character?.gold??0,state.settings.numberMode)}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open quick navigation" accessibilityHint="Opens five customizable navigation shortcuts" onPress={()=>setOpen(true)} style={({pressed})=>[styles.menuButton,pressed&&styles.pressed]}>
        <View style={styles.menuLine}/><View style={styles.menuLine}/><View style={styles.menuLine}/>
      </Pressable>
    </View>
    <ActiveActivityBar state={state} nowMs={nowMs} onOpen={onOpenActivity}/>
    <EnvironmentDetailsModal visible={environmentOpen} environment={environment} nowMs={nowMs} locked={!!activity} activityKind={activity?.kind} reduceMotion={state.settings.reduceMotion} onClose={()=>setEnvironmentOpen(false)}/>
    <GameModalSurface visible={open} reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel="Close quick navigation" surfaceStyle={styles.sheet}>
          <GameModalHeader eyebrow="PLAYER SHORTCUTS" title={customizing?'Choose five destinations':'Quick navigation'} onClose={close} closeDisabled={saving}/>
          {customizing?<>
            <Text style={styles.helper}>{draft.length}/5 selected · Tap selected entries to remove them.</Text>
            <ScrollView style={styles.choiceScroll} contentContainerStyle={styles.choiceList}>
              {orderedChoices.map(destination=>{const isSelected=selected.has(destination),blocked=!isSelected&&draft.length>=5;return <Pressable key={destination} accessibilityRole="checkbox" accessibilityState={{checked:isSelected,disabled:blocked}} onPress={()=>toggle(destination)} disabled={blocked} style={({pressed})=>[styles.choice,isSelected&&styles.choiceSelected,blocked&&styles.choiceBlocked,pressed&&styles.pressed]}>
                <Image source={destinationIcons[destination]} style={[styles.choiceIcon,!isSelected&&styles.choiceIconDim]} resizeMode="contain"/><Text style={styles.choiceText}>{labelForDestination(destination)}</Text><View style={[styles.check,isSelected&&styles.checkSelected]}><Text style={styles.checkText}>{isSelected?'✓':''}</Text></View>
              </Pressable>})}
            </ScrollView>
            <View style={styles.actions}><View style={styles.action}><GameButton title="Cancel" tone="secondary" disabled={saving} onPress={()=>{setDraft(active);setCustomizing(false)}}/></View><View style={styles.action}><GameButton title="Save five" loading={saving} disabled={draft.length!==5} onPress={()=>void save()}/></View></View>
          </>:<>
            <View style={styles.shortcutList}>{active.map((destination,index)=><Pressable key={destination} accessibilityRole="button" onPress={()=>{close();onNavigate(destination)}} style={({pressed})=>[styles.shortcut,pressed&&styles.pressed]}><View style={styles.shortcutNumber}><Text style={styles.shortcutNumberText}>{index+1}</Text></View><Image source={destinationIcons[destination]} style={styles.shortcutIcon} resizeMode="contain"/><Text style={styles.shortcutText}>{labelForDestination(destination)}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View>
            <View style={styles.customizeButton}><GameButton title="⚙ Customize these five" tone="secondary" onPress={()=>{setDraft(active);setCustomizing(true)}}/></View>
          </>}
    </GameModalSurface>
  </>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  shell:{paddingTop:Platform.OS==='android'?(NativeStatusBar.currentHeight??24)+6:6,minHeight:70,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingBottom:8,backgroundColor:C.bg,borderBottomWidth:1,borderBottomColor:equipmentColors.lineStrong},
  environmentButton:{width:54,height:44,position:'relative',overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,borderWidth:1,backgroundColor:equipmentColors.panelRaised,borderRadius:8},environmentDivider:{width:1,height:22,backgroundColor:equipmentColors.line},seasonStrip:{position:'absolute',left:0,right:0,bottom:0,height:2},lockedDot:{position:'absolute',right:3,top:3,width:6,height:6,borderRadius:3,backgroundColor:equipmentColors.gold},
  hpBlock:{flex:1,minWidth:72,gap:4},hpHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},hpLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:.8},hpTrack:{height:8,overflow:'hidden',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:4},hpFill:{height:'100%',backgroundColor:C.good,borderRadius:3},hpValue:{color:C.text,fontSize:10,fontWeight:'800',fontVariant:['tabular-nums']},
  goldBlock:{width:72,alignItems:'flex-end'},goldLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:1},goldValue:{width:'100%',color:equipmentColors.goldSoft,fontSize:13,fontWeight:'900',textAlign:'right',fontVariant:['tabular-nums']},
  menuButton:{width:touchTargetPreferred,height:touchTargetPreferred,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:equipmentColors.lineStrong,backgroundColor:equipmentColors.panelRaised,borderRadius:8},menuLine:{width:23,height:3,backgroundColor:equipmentColors.goldSoft,borderRadius:2},pressed:{opacity:.66},
  sheet:{maxHeight:'82%'},helper:{color:C.muted,fontSize:12,marginBottom:8},
  shortcutList:{gap:7},shortcut:{minHeight:52,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:equipmentColors.line,borderRadius:8},shortcutNumber:{width:26,height:26,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.selected,borderWidth:1,borderColor:equipmentColors.selectedLine,borderRadius:6},shortcutNumberText:{color:C.text,fontWeight:'900'},shortcutIcon:{width:28,height:28},shortcutText:{flex:1,color:C.text,fontSize:15,fontWeight:'800'},chevron:{color:equipmentColors.goldSoft,fontSize:26},customizeButton:{marginTop:12},
  choiceScroll:{maxHeight:410},choiceList:{gap:6,paddingBottom:8},choice:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:11,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:7},choiceSelected:{backgroundColor:equipmentColors.selected,borderColor:equipmentColors.selectedLine},choiceBlocked:{opacity:.38},choiceIcon:{width:25,height:25},choiceIconDim:{opacity:.65},choiceText:{flex:1,color:C.text,fontSize:14,fontWeight:'800'},check:{width:24,height:24,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.muted,borderRadius:5},checkSelected:{backgroundColor:equipmentColors.selectedLine,borderColor:equipmentColors.selectedLine},checkText:{color:C.dark?C.bg:C.primaryButtonText,fontWeight:'900'},
  actions:{flexDirection:'row',gap:10,marginTop:10},action:{flex:1,minWidth:0},
});}
