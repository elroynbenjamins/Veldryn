import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Language} from '../i18n/languages';
import {recentScreenText} from '../i18n/recent-screens';
import {musicContextPreference,MUSIC_CONTEXTS,type MusicContextId,type AudioPreferences,type AudioLevel} from '../core/audio-preferences';
import {playSound,playMusicPreview,stopMusicPreview,useAudioPreferences} from '../storage/audio';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';

const REGIONS:readonly MusicContextId[]=['asterfall','sunscar','frostmarch'];
const MUSIC_CHOICES=MUSIC_CONTEXTS;
const ACTIVITIES:readonly MusicContextId[]=['dungeon','boss','world_boss'];
const LABELS:Record<MusicContextId,string>={
 asterfall:'Asterfall',sunscar:'Sunscar',frostmarch:'Frostmarch',
 dungeon:'Dungeons & Co-op',boss:'Boss battles',world_boss:'World boss encounters',
};
const LEVELS:readonly AudioLevel[]=[0,1,2,3];

export function MusicSettingsPanel({language}:{language:Language}){
 const theme=useGameTheme(),s=useMemo(()=>styles(theme),[theme]);
 const a=(value:string,params?:Record<string,string|number>)=>recentScreenText(language,value,params);
 const [audio,setAudio]=useAudioPreferences();
 const [expanded,setExpanded]=useState<MusicContextId|null>(null);
 useEffect(()=>()=>stopMusicPreview(),[]);
 const chooseLevel=(channel:'music'|'effects',level:AudioLevel)=>{
  setAudio({...audio,[channel]:level});
  if(channel==='effects'&&level>0)playSound('ui_confirm');
 };
 const chooseContext=(id:MusicContextId,part:Partial<{enabled:boolean;track:MusicContextId|null}>)=>{
  const current=musicContextPreference(audio,id);
  const musicContexts:AudioPreferences['musicContexts']={...audio.musicContexts,[id]:{...current,...part}};
  setAudio({...audio,musicContexts});
  if(part.track!==undefined)stopMusicPreview();
 };
 const regionRow=(id:MusicContextId)=>{
  const choice=musicContextPreference(audio,id),open=expanded===id;
  const label=a(LABELS[id]);
  const selection=choice.track?a(LABELS[choice.track]):a('Default theme');
  return <View key={id} style={s.area}>
   <View style={s.areaHeader}>
    <Text style={s.areaName} numberOfLines={2}>{label}</Text>
    <Pressable accessibilityRole="switch" accessibilityLabel={a('Music for {area}',{area:label})}
      accessibilityState={{checked:choice.enabled}} onPress={()=>chooseContext(id,{enabled:!choice.enabled})}
      hitSlop={6} style={({pressed})=>[s.switchButton,pressed&&s.pressed]}>
      <View style={[s.switchTrack,choice.enabled&&s.switchOn]}>
       <View style={[s.switchThumb,choice.enabled&&s.thumbOn]}/>
      </View>
      <Text style={[s.switchLabel,choice.enabled&&s.enabledText]}>{choice.enabled?a('On'):a('Off')}</Text>
    </Pressable>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={a('Change theme')+': '+label}
     accessibilityState={{expanded:open}} onPress={()=>setExpanded(previous=>previous===id?null:id)}
     style={({pressed})=>[s.picker,open&&s.pickerActive,pressed&&s.pressed]}>
    <Text style={s.musicNote}>♫</Text>
    <Text numberOfLines={1} style={[s.pickerLabel,!choice.enabled&&s.dimText]}>{selection}</Text>
    <Text style={s.chevron}>{open?'▴':'▾'}</Text>
   </Pressable>
   {open?<View style={s.choices}>
    {([null,...MUSIC_CHOICES] as (MusicContextId|null)[]).map(track=>{
     const selected=choice.track===track;
     const text=track?a(LABELS[track]):a('Default theme');
     return <View key={track??'default'} style={[s.option,selected&&s.optionSelected]}>
       <Pressable accessibilityRole="button" accessibilityState={{selected}} accessibilityLabel={text}
         onPress={()=>{chooseContext(id,{track});setExpanded(null);}}
         style={({pressed})=>[s.optionPick,pressed&&s.pressed]}>
        <Text numberOfLines={2} style={[s.optionText,selected&&s.selectedText]}>{selected?'✓ ':''}{text}</Text>
       </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel={a('Preview theme')+': '+text}
         disabled={audio.music===0} onPress={()=>playMusicPreview(track??id)}
         style={({pressed})=>[s.previewButton,audio.music===0&&s.disabled,pressed&&s.pressed]}>
        <Text style={s.previewText}>▶</Text>
       </Pressable>
     </View>;
    })}
   </View>:null}
  </View>;
 };
 return <Panel>
  <Text style={s.title}>{a('Music & Audio')}</Text>
  <Text style={s.hint}>{a('Sound plays only while Veldryn is open and follows your device\'s silent mode.')}</Text>
  {(['music','effects'] as const).map(channel=><View key={channel} style={s.volumeBlock}>
   <Text style={s.subheading}>{channel==='music'?a('Music'):a('Sound effects')}</Text>
   <View style={s.levelRow}>
    {LEVELS.map(level=><Pressable key={level} accessibilityRole="button" accessibilityState={{selected:audio[channel]===level}}
       onPress={()=>chooseLevel(channel,level)} style={({pressed})=>[s.level,level===audio[channel]&&s.levelActive,pressed&&s.pressed]}>
      <Text style={[s.levelText,level===audio[channel]&&s.selectedText]}>{level===0?a('Off'):level===1?a('Low'):level===2?a('Medium'):a('High')}</Text>
    </Pressable>)}
   </View>
  </View>)}
  {audio.music===0?<Text style={s.info}>{a('Music volume Off mutes every area. Your individual choices are kept.')}</Text>:null}
  <Text style={s.groupLabel}>{a('Regions')}</Text>
  {REGIONS.map(regionRow)}
  <Text style={s.groupLabel}>{a('Activities')}</Text>
  {ACTIVITIES.map(regionRow)}
  <Text style={s.hint}>{a('Each area uses its own theme unless you choose another.')}</Text>
  <Pressable accessibilityRole="button" onPress={()=>{setAudio({...audio,musicContexts:{}});setExpanded(null);}} style={({pressed})=>[s.reset,pressed&&s.pressed]}>
   <Text style={s.resetText}>{a('Restore area defaults')}</Text>
  </Pressable>
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 title:{...typography.title,color:C.text,marginBottom:4},
 hint:{...typography.caption,color:C.muted,lineHeight:18},
 info:{...typography.caption,color:C.info,lineHeight:18,marginTop:4},
 volumeBlock:{gap:8,marginTop:12},
 subheading:{...typography.bodyStrong,color:C.text},
 levelRow:{flexDirection:'row',gap:6},
 level:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:1,borderRadius:9,borderColor:C.line,backgroundColor:C.panel2},
 levelActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
 levelText:{...typography.caption,color:C.muted,fontWeight:'700',textAlign:'center'},
 selectedText:{color:C.text},
 groupLabel:{...typography.bodyStrong,color:C.text,marginTop:18,marginBottom:6},
 area:{gap:8,paddingVertical:10,borderTopColor:C.line,borderTopWidth:StyleSheet.hairlineWidth},
 areaHeader:{flexDirection:'row',alignItems:'center',gap:10},
 areaName:{...typography.bodyStrong,color:C.text,flex:1,minWidth:0},
 switchButton:{minWidth:52,minHeight:44,alignItems:'center',justifyContent:'center',gap:2},
 switchTrack:{width:38,height:21,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderRadius:11,padding:2,justifyContent:'center'},
 switchOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 switchThumb:{width:15,height:15,borderRadius:8,backgroundColor:C.muted},
 thumbOn:{alignSelf:'flex-end',backgroundColor:C.selectionLine},
 switchLabel:{...typography.caption,color:C.muted,fontSize:10,fontWeight:'700'},
 enabledText:{color:C.selectionLine},
 picker:{flexDirection:'row',alignItems:'center',minHeight:44,gap:9,borderWidth:1,borderColor:C.line,borderRadius:8,paddingHorizontal:12,backgroundColor:C.panel2},
 pickerActive:{borderColor:C.selectionLine},
 musicNote:{...typography.bodyStrong,color:C.info},
 pickerLabel:{...typography.caption,color:C.text,flex:1,fontWeight:'700'},
 dimText:{color:C.muted},
 chevron:{fontSize:17,color:C.muted},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:6,paddingVertical:2},
 option:{flexBasis:'47%' as const,flexGrow:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:8,borderColor:C.line,backgroundColor:C.panel2},
 optionSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},
 optionPick:{flex:1,minWidth:0,minHeight:46,justifyContent:'center',paddingLeft:8,paddingRight:2},
 optionText:{...typography.caption,color:C.muted,fontWeight:'700'},
 previewButton:{width:38,minHeight:46,alignItems:'center',justifyContent:'center',borderLeftWidth:StyleSheet.hairlineWidth,borderLeftColor:C.line},
 previewText:{...typography.caption,color:C.info,fontWeight:'800'},
 disabled:{opacity:.4},
 reset:{minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,borderRadius:9,marginTop:12},
 resetText:{...typography.caption,color:C.text,fontWeight:'700'},
 pressed:{opacity:.75},
});}
