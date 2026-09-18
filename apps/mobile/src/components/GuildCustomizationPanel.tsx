import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {GameState} from '../core/types';
import {GUILD_BANNERS,GUILD_FRAMES,GUILD_NAMEPLATES,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameplateId} from '../core/guild-customization';
import {C,radii,spacing,typography} from '../theme/theme';

export function GuildCustomizationPanel({state,onChange,readOnly=false}:{state:GameState;onChange:(next:GameState)=>void;readOnly?:boolean}){
  const [motto,setMotto]=useState(()=>normalizeGuildMotto(state.account.guildMotto));
  const bannerId=normalizeGuildBannerId(state.account.guildBannerId);
  const frameId=normalizeGuildFrameId(state.account.guildProfileFrameId);
  const nameplateId=normalizeGuildNameplateId(state.account.guildNameplateId);
  const banner=useMemo(()=>GUILD_BANNERS.find(entry=>entry.id===bannerId)!,[bannerId]);
  const patch=(values:Partial<GameState['account']>)=>{if(!readOnly)onChange({...state,account:{...state.account,...values}})};
  const saveMotto=()=>{const value=normalizeGuildMotto(motto);setMotto(value);patch({guildMotto:value})};

  return <View style={s.root}>
    {readOnly?<View style={s.notice}><Text style={s.noticeTitle}>Guild visuals</Text><Text style={s.noticeText}>Only the guild leader or an officer can edit these visuals.</Text></View>:null}
    <Panel>
      <Text style={s.title}>Guild identity preview</Text>
      <View style={[s.preview,{borderColor:GUILD_FRAMES.find(entry=>entry.id===frameId)?.accent??C.accent}]}>
        <View style={[s.bannerPreview,{backgroundColor:banner.primary,borderColor:banner.secondary}]}>
          <Text style={[s.emblem,{color:banner.secondary}]}>{banner.emblem}</Text>
        </View>
        <View style={s.previewCopy}>
          <Text style={s.guildName}>The Bloomwardens</Text>
          <Text style={s.motto}>{normalizeGuildMotto(state.account.guildMotto)}</Text>
          <Text style={s.previewMeta}>{banner.name} · {GUILD_FRAMES.find(entry=>entry.id===frameId)?.name} · {GUILD_NAMEPLATES.find(entry=>entry.id===nameplateId)?.name}</Text>
        </View>
      </View>
    </Panel>

    <Panel>
      <Text style={s.title}>Banner / Emblem</Text>
      <Text style={s.help}>Choose the heraldry shown on your guild profile, recruitment posts and guild cards.</Text>
      <View style={s.grid}>{GUILD_BANNERS.map(entry=><Pressable key={entry.id} disabled={readOnly} accessibilityRole="button" accessibilityState={{selected:entry.id===bannerId,disabled:readOnly}} onPress={()=>patch({guildBannerId:entry.id})} style={[s.bannerCard,entry.id===bannerId&&s.selected]}>
        <View style={[s.bannerSwatch,{backgroundColor:entry.primary,borderColor:entry.secondary}]}><Text style={[s.cardEmblem,{color:entry.secondary}]}>{entry.emblem}</Text></View>
        <Text numberOfLines={1} style={s.cardName}>{entry.name}</Text>
        {entry.id===bannerId?<Text style={s.selectedText}>Selected</Text>:null}
      </Pressable>)}</View>
    </Panel>

    <Panel>
      <Text style={s.title}>Guild profile border</Text>
      <View style={s.row}>{GUILD_FRAMES.map(entry=><Pressable key={entry.id} disabled={readOnly} onPress={()=>patch({guildProfileFrameId:entry.id})} style={[s.option,entry.id===frameId&&s.selected,{borderColor:entry.id===frameId?entry.accent:C.line}]}>
        <View style={[s.frameSample,{borderColor:entry.accent}]}><View style={s.frameInner}/></View><Text style={s.optionText}>{entry.name}</Text>
      </Pressable>)}</View>
    </Panel>

    <Panel>
      <Text style={s.title}>Guild nameplate</Text>
      <View style={s.row}>{GUILD_NAMEPLATES.map(entry=><Pressable key={entry.id} disabled={readOnly} onPress={()=>patch({guildNameplateId:entry.id})} style={[s.option,entry.id===nameplateId&&s.selected,{borderColor:entry.id===nameplateId?entry.accent:C.line}]}>
        <View style={[s.nameplateSample,{borderColor:entry.accent}]}><View style={[s.nameplateGem,{backgroundColor:entry.accent}]}/></View><Text style={s.optionText}>{entry.name}</Text>
      </Pressable>)}</View>
    </Panel>

    <Panel>
      <Text style={s.title}>Guild motto</Text>
      <Text style={s.help}>Shown beneath the guild name. Maximum 80 characters.</Text>
      <GameTextInput editable={!readOnly} value={motto} onChangeText={value=>setMotto(value.slice(0,80))} onEndEditing={saveMotto} maxLength={80} placeholder="Stronger together." placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.counter}>{motto.length}/80</Text>
    </Panel>
  </View>;
}

const s=StyleSheet.create({
 root:{gap:spacing.md},title:{...typography.title,color:C.text},help:{...typography.body,color:C.muted,marginTop:4,marginBottom:8},
 notice:{padding:spacing.md,borderWidth:1,borderColor:'#725b2d',borderRadius:radii.md,backgroundColor:'#292419'},noticeTitle:{color:C.accent,fontWeight:'900'},noticeText:{color:C.muted,marginTop:3},
 preview:{marginTop:8,borderWidth:2,borderRadius:radii.lg,padding:10,backgroundColor:C.panel2,flexDirection:'row',gap:12,alignItems:'center'},bannerPreview:{width:70,height:86,borderWidth:2,borderRadius:8,alignItems:'center',justifyContent:'center'},emblem:{fontSize:34,fontWeight:'900'},previewCopy:{flex:1},guildName:{color:C.text,fontSize:20,fontWeight:'900'},motto:{color:C.accent,fontStyle:'italic',marginTop:3},previewMeta:{color:C.muted,fontSize:11,marginTop:7},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},bannerCard:{width:'31%',minWidth:92,borderWidth:1,borderColor:C.line,borderRadius:radii.md,padding:7,backgroundColor:C.panel2},selected:{borderColor:C.accent,backgroundColor:'#272417'},bannerSwatch:{height:70,borderWidth:2,borderRadius:7,alignItems:'center',justifyContent:'center'},cardEmblem:{fontSize:28,fontWeight:'900'},cardName:{color:C.text,fontSize:11,fontWeight:'800',marginTop:6},selectedText:{color:C.good,fontSize:10,fontWeight:'900',marginTop:2},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},option:{minWidth:128,flexGrow:1,borderWidth:1,borderRadius:radii.md,padding:9,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800',fontSize:12,marginTop:6},frameSample:{width:56,height:56,borderWidth:4,borderRadius:12,padding:4},frameInner:{flex:1,borderWidth:1,borderColor:'#536679',borderRadius:6,backgroundColor:'#101923'},nameplateSample:{height:38,borderWidth:2,borderRadius:8,backgroundColor:'#162231',padding:5,justifyContent:'center'},nameplateGem:{width:12,height:12,transform:[{rotate:'45deg'}],alignSelf:'center'},
 input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg,color:C.text,paddingHorizontal:12},counter:{color:C.muted,textAlign:'right',fontSize:11,marginTop:4}
});
