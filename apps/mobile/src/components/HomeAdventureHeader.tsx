import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {CLASSES} from '../content/classes';
import {WORLD_ZONES} from '../content/world-map';
import {characterProgressWithinLevel} from '../core/progression';
import {accountText} from '../i18n/account';
import {useGameTheme} from '../theme/ThemeContext';
import {classCreationPresentation} from '../theme/class-creation-art';
import {CharacterPortrait} from './CharacterVisual';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';

/** Character identity and real regional scenery anchor the player's current adventure. */
export function HomeAdventureHeader({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const c=state.character;if(!c)return null;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(state.settings.language,text,params);
 const region=WORLD_ZONES.find(row=>row.id===state.currentRegionId)??WORLD_ZONES[0];
 const accent=classCreationPresentation[c.classId].accent,className=CLASSES.find(row=>row.id===c.classId)?.name??c.classId;
 const xp=characterProgressWithinLevel(c.xp,c.level),ratio=xp.need>0?Math.max(0,Math.min(1,xp.current/xp.need)):1;
 const compact=width<360||fontScale>=1.3;
 return <><View style={s.screenHeading}><Text accessibilityRole="header" style={s.screenTitle}>{a('Your adventure')}</Text><Text style={s.screenLocation}>{a(region.name)}</Text></View><View style={s.hero}>
  <ZoneSceneArtwork regionId={region.id}/><View pointerEvents="none" style={s.shade}/>
  <View style={[s.identity,compact&&s.identityCompact]}>
   <View style={[s.portraitFrame,{borderColor:accent}]}><CharacterPortrait compact state={state} style={s.portrait}/></View>
   <View style={s.copy}><Text accessibilityRole="header" style={s.name}>{c.name}</Text><View style={s.classRow}><Text style={[s.className,{color:accent}]}>{a(className)}</Text><Text style={s.level}>{a('LV {level}',{level:c.level})}</Text></View>
    <View style={s.xpHead}><Text style={s.xpLabel}>{a('Experience')}</Text><Text style={s.xpValue}>{Math.round(ratio*100)}%</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={a('Experience')} accessibilityValue={{min:0,max:100,now:Math.round(ratio*100)}} style={s.track}><View style={[s.fill,{width:`${ratio*100}%`,backgroundColor:accent}]}/></View>
   </View>
  </View>
 </View></>;
}

function makeStyles(C:ReturnType<typeof useGameTheme>){return StyleSheet.create({
 screenHeading:{gap:4,paddingVertical:4},screenTitle:{fontSize:27,lineHeight:34,fontWeight:'800',color:C.text},screenLocation:{fontSize:14,lineHeight:20,color:C.muted},
 hero:{position:'relative',overflow:'hidden',borderWidth:1,borderColor:C.line,borderRadius:14,padding:16,gap:14,backgroundColor:C.panelRaised},
 shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(5,12,20,.62)':'rgba(255,255,255,.88)'},
 topline:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.6,color:C.muted},
 location:{paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},locationText:{fontSize:10,fontWeight:'800',color:C.text},
 identity:{flexDirection:'row',alignItems:'center',gap:14},identityCompact:{gap:10},portraitFrame:{width:76,height:80,borderWidth:1,borderRadius:16,backgroundColor:C.panel,alignItems:'center',justifyContent:'center',overflow:'hidden'},portrait:{width:68,height:68},
 copy:{flex:1,minWidth:0,gap:6},name:{fontSize:24,lineHeight:30,fontWeight:'900',color:C.text},classRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},className:{fontSize:11,fontWeight:'800'},level:{fontSize:9,fontWeight:'900',color:C.text,backgroundColor:C.panel,paddingHorizontal:7,paddingVertical:3,borderRadius:6},
 xpHead:{flexDirection:'row',justifyContent:'space-between',gap:8},xpLabel:{fontSize:9,color:C.muted,fontWeight:'700'},xpValue:{fontSize:9,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},track:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.inputBg},fill:{height:'100%',borderRadius:99},
 footer:{flexDirection:'row',alignItems:'center',gap:7,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},statusMark:{width:6,height:6,borderRadius:99},status:{flex:1,fontSize:10,lineHeight:15,color:C.muted,fontWeight:'700'},
});}
