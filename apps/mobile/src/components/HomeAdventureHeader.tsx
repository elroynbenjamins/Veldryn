import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {CLASSES} from '../content/classes';
import {WORLD_ZONES} from '../content/world-map';
import {characterProgressWithinLevel} from '../core/progression';
import {recentScreenText} from '../i18n/recent-screens';
import {useGameTheme} from '../theme/ThemeContext';
import {classCreationPresentation} from '../theme/class-creation-art';
import {CharacterPortrait} from './CharacterVisual';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';

/** Character identity and real regional scenery anchor the player's current adventure. */
export function HomeAdventureHeader({state,compactHome=false}:{state:GameState;compactHome?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const c=state.character;if(!c)return null;
 const a=(text:string,params?:Record<string,string|number>)=>recentScreenText(state.settings.language,text,params);
 const region=WORLD_ZONES.find(row=>row.id===state.currentRegionId)??WORLD_ZONES[0];
 const accent=classCreationPresentation[c.classId].accent,className=CLASSES.find(row=>row.id===c.classId)?.name??c.classId;
 const xp=characterProgressWithinLevel(c.xp,c.level),ratio=xp.need>0?Math.max(0,Math.min(1,xp.current/xp.need)):1;
 const compact=width<360||fontScale>=1.3;
 return <><View style={[s.screenHeading,compactHome&&s.screenHeadingCompact]}><Text accessibilityRole="header" style={[s.screenTitle,compactHome&&s.screenTitleCompact]}>{compactHome?a('Home'):a('Your adventure')}</Text><Text style={[s.screenLocation,compactHome&&s.screenLocationCompact]} numberOfLines={1}>{a(region.name)}</Text></View><View style={[s.hero,compactHome&&s.heroCompact]}>
  <ZoneSceneArtwork regionId={region.id}/><View pointerEvents="none" style={s.shade}/>
  <View style={[s.identity,compact&&s.identityCompact,compactHome&&s.identityHome]}>
   <View style={[s.portraitFrame,{borderColor:accent},compactHome&&s.portraitFrameCompact]}><CharacterPortrait compact state={state} style={[s.portrait,compactHome&&s.portraitCompact]}/></View>
   <View style={s.copy}><Text accessibilityRole="header" style={[s.name,compactHome&&s.nameCompact]}>{c.name}</Text><View style={s.classRow}><Text style={[s.className,{color:accent}]}>{a(className)}</Text><Text style={s.level}>{a('LV {level}',{level:c.level})}</Text></View>
    <View style={s.xpHead}><Text style={s.xpLabel}>{a('Experience')}</Text><Text style={s.xpValue}>{Math.round(ratio*100)}%</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={a('Experience')} accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} style={s.track}><View style={[s.fill,{width:`${ratio*100}%`,backgroundColor:accent}]}/></View>
   </View>
  </View>
 </View></>;
}

function makeStyles(C:ReturnType<typeof useGameTheme>){return StyleSheet.create({
 screenHeading:{gap:4,paddingVertical:4},screenHeadingCompact:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingVertical:2},screenTitle:{fontSize:27,lineHeight:34,fontWeight:'800',color:C.text},screenTitleCompact:{fontSize:23,lineHeight:29},screenLocation:{fontSize:14,lineHeight:20,color:C.muted},screenLocationCompact:{fontSize:11,lineHeight:16,flexShrink:1},
 hero:{position:'relative',overflow:'hidden',borderWidth:1,borderColor:C.line,borderRadius:14,padding:16,gap:14,backgroundColor:C.panelRaised},heroCompact:{paddingHorizontal:12,paddingVertical:11,borderRadius:12},
 shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(5,12,20,.62)':'rgba(255,255,255,.88)'},
 topline:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.6,color:C.muted},
 location:{paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},locationText:{fontSize:10,fontWeight:'800',color:C.text},
 identity:{flexDirection:'row',alignItems:'center',gap:14},identityCompact:{gap:10},identityHome:{gap:10},portraitFrame:{width:76,height:80,borderWidth:1,borderRadius:16,backgroundColor:C.panel,alignItems:'center',justifyContent:'center',overflow:'hidden'},portraitFrameCompact:{width:54,height:58,borderRadius:10},portrait:{width:68,height:68},portraitCompact:{width:48,height:50},
 copy:{flex:1,minWidth:0,gap:6},name:{fontSize:24,lineHeight:30,fontWeight:'900',color:C.text},nameCompact:{fontSize:18,lineHeight:22},classRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},className:{fontSize:11,fontWeight:'800'},level:{fontSize:9,fontWeight:'900',color:C.text,backgroundColor:C.panel,paddingHorizontal:7,paddingVertical:3,borderRadius:6},
 xpHead:{flexDirection:'row',justifyContent:'space-between',gap:8},xpLabel:{fontSize:9,color:C.muted,fontWeight:'700'},xpValue:{fontSize:9,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},track:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.inputBg},fill:{height:'100%',borderRadius:99},
 footer:{flexDirection:'row',alignItems:'center',gap:7,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},statusMark:{width:6,height:6,borderRadius:99},status:{flex:1,fontSize:10,lineHeight:15,color:C.muted,fontWeight:'700'},
});}
