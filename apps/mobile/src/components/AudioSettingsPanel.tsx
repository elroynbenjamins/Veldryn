import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {audioPreferences,playSound,setAudioPreferences,toggleAudioMute,useAudioPreferences} from '../storage/audio';
import type {AudioLevel,AudioPreferences} from '../core/audio-preferences';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Channel='music'|'effects';
const CHANNELS:readonly Channel[]=['music','effects'];
const LEVELS:readonly AudioLevel[]=[0,1,2,3];

// Tiny geometric glyphs are drawn from theme-colored squares, not scaled bitmap emoji.
// Keeping them native makes the UI crisp at all Android display densities.
const GLYPHS:Record<Channel,readonly string[]>={
 music:['00011110','00010010','00010010','00010010','01110010','11100010','01100000','00000000'],
 effects:['00000000','00100000','01101100','11101110','11101110','01101100','00100000','00000000'],
};
type Styles=ReturnType<typeof createStyles>;

function PixelAudioGlyph({channel,enabled,C,s}:{channel:Channel;enabled:boolean;C:ThemeColors;s:Styles}){
 const fill=enabled?C.selectionLine:C.muted;
 return <View style={s.glyphFrame} accessible={false} importantForAccessibility="no-hide-descendants">
  <View style={s.glyphGrid}>{GLYPHS[channel].map((line,i)=><View key={i} style={s.glyphRow}>{Array.from(line).map((cell,j)=><View key={j} style={[s.glyphPixel,cell==='1'&&{backgroundColor:fill}]}/>)}</View>)}</View>
 </View>;
}

function MuteButton({channelLabel,muted,label,onPress,s}:{
 channelLabel:string;muted:boolean;label:string;onPress:()=>void;s:Styles;
}){
 const [focused,setFocused]=useState(false);
 return <Pressable accessibilityRole="button" accessibilityLabel={channelLabel+': '+label}
  accessibilityState={{selected:muted}} onPress={onPress}
  onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
  style={({pressed})=>[s.muteButton,muted&&s.muteButtonActive,focused&&s.focused,pressed&&s.pressed]}>
  <Text style={[s.muteText,muted&&s.muteTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</Text>
 </Pressable>;
}

function LevelButton({channelLabel,level,label,current,onPress,C,s}:{
 channelLabel:string;level:AudioLevel;label:string;current:AudioLevel;onPress:()=>void;C:ThemeColors;s:Styles;
}){
 const [focused,setFocused]=useState(false);
 const selected=current===level,filled=level>0&&current>=level;
 return <Pressable
  accessibilityRole="button" accessibilityLabel={channelLabel+': '+label} accessibilityState={{selected}}
  onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
  style={({pressed})=>[s.levelButton,selected&&s.levelButtonSelected,focused&&s.focused,pressed&&s.pressed]}>
  <View style={s.levelGraphic} accessible={false} importantForAccessibility="no-hide-descendants">
   {level===0?<View style={[s.offMark,selected&&{borderColor:C.selectionLine}]}><View style={[s.offMarkLine,{backgroundColor:selected?C.selectionLine:C.muted}]}/></View>
    :<View style={s.levelBars}>{LEVELS.slice(1,level+1).map((_,index)=><View key={index} style={[s.levelBar,{height:6+index*5,backgroundColor:filled?C.selectionLine:C.muted,opacity:filled?1:.4}]}/>)}</View>}
  </View>
  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.levelCaption,selected&&s.levelCaptionSelected]}>{label}</Text>
 </Pressable>;
}

/** Compact, accessible audio controls; the stored 0–3 levels are unchanged. */
export function AudioSettingsPanel({translate}:{translate:(text:string)=>string}){
 const C=useGameTheme(),s=useMemo(()=>createStyles(C),[C]);
 const [audio]=useAudioPreferences();
 const labels=LEVELS.map(level=>translate(level===0?'Off':level===1?'Low':level===2?'Medium':'High'));
 const change=(channel:Channel,level:AudioLevel)=>{
  // Read the current device preferences, not a possibly stale React event closure.
  void setAudioPreferences({...audioPreferences(),[channel]:level});
  if(channel==='effects'&&level>0)playSound('ui_confirm');
 };
 const mute=(channel:Channel)=>{
  const next=toggleAudioMute(channel);
  if(channel==='effects'&&next>0)playSound('ui_confirm');
 };
 return <Panel style={s.panel}>
  <Text style={s.title}>{translate('Sound')}</Text>
  <Text style={s.help}>{translate("Sound plays only while Veldryn is open and follows your device's silent mode.")}</Text>
  {CHANNELS.map(channel=>{
   const current=audio[channel],name=translate(channel==='music'?'Music':'Sound effects');
   return <View key={channel} style={s.channelCard}>
    <View style={s.cardHeader}>
     <PixelAudioGlyph channel={channel} enabled={current>0} C={C} s={s}/>
     <View style={s.channelHeading}>
      <Text style={s.channelTitle} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
      <Text style={s.channelStatus}>{labels[current]}</Text>
     </View>
     <MuteButton channelLabel={name} muted={current===0} label={translate(current===0?'Unmute':'Mute')} onPress={()=>mute(channel)} s={s}/>
    </View>
    <View style={s.levelRow}>
     {LEVELS.map(level=><LevelButton key={level} channelLabel={name} level={level} label={labels[level]} current={current}
      onPress={()=>change(channel,level)} C={C} s={s}/>)}
    </View>
   </View>;
  })}
 </Panel>;
}

function createStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:10},
 title:{...typography.title,color:C.text,marginBottom:0},
 help:{...typography.caption,color:C.muted,lineHeight:17},
 channelCard:{backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:10,padding:10,gap:10},
 cardHeader:{flexDirection:'row',alignItems:'center',gap:9,minHeight:44},
 glyphFrame:{width:34,height:34,borderRadius:7,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.lineStrong,alignItems:'center',justifyContent:'center'},
 glyphGrid:{gap:0},
 glyphRow:{flexDirection:'row'},
 glyphPixel:{width:2.5,height:2.5},
 channelHeading:{flex:1,minWidth:0,gap:2},
 channelTitle:{...typography.bodyStrong,color:C.text},
 channelStatus:{...typography.caption,color:C.muted},
 muteButton:{minWidth:65,minHeight:44,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel,borderRadius:8,paddingHorizontal:9,justifyContent:'center',alignItems:'center'},
 muteButtonActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
 muteText:{...typography.caption,color:C.text,fontWeight:'700'},
 muteTextActive:{color:C.selectionLine},
 levelRow:{flexDirection:'row',gap:6},
 levelButton:{flex:1,minWidth:0,minHeight:58,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel,paddingHorizontal:2,paddingVertical:6},
 levelButtonSelected:{borderColor:C.selectionLine,backgroundColor:C.selection,borderWidth:2},
 levelGraphic:{height:20,alignItems:'center',justifyContent:'flex-end'},
 levelBars:{flexDirection:'row',alignItems:'flex-end',gap:3,height:19},
 levelBar:{width:5,borderRadius:1},
 offMark:{width:16,height:16,borderRadius:3,borderWidth:1,borderColor:C.muted,alignItems:'center',justifyContent:'center'},
 offMarkLine:{width:10,height:2,transform:[{rotate:'-45deg'}]},
 levelCaption:{fontSize:10,lineHeight:13,color:C.muted,fontWeight:'700',textAlign:'center'},
 levelCaptionSelected:{color:C.text},
 pressed:{opacity:.72},
 focused:{borderColor:C.selectionLine},
});}
