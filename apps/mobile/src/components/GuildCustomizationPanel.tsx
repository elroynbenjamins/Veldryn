import {useSocialText} from '../i18n/social';
import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameTextInput} from './GameTextInput';
import {GuildBackgroundPicker} from './GuildBackgroundPicker';
import {Panel} from './Panel';
import {GuildIdentitySummary} from './GuildIdentitySummary';
import {GuildBannerArtwork,GuildFrameSwatch} from './GuildHeraldry';
import {GameState} from '../core/types';
import {normalizeGuildBackgroundId,GUILD_BANNERS,GUILD_FRAMES,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameplateId} from '../core/guild-customization';
import {C,radii,spacing,typography} from '../theme/theme';

export function GuildCustomizationPanel({state,onChange,readOnly=false}:{state:GameState;onChange:(next:GameState)=>void;readOnly?:boolean}){
 const st=useSocialText();
  const [motto,setMotto]=useState(()=>normalizeGuildMotto(state.account.guildMotto));
  const backgroundId=normalizeGuildBackgroundId(state.account.guildBackgroundId);
  const bannerId=normalizeGuildBannerId(state.account.guildBannerId);
  const frameId=normalizeGuildFrameId(state.account.guildProfileFrameId);
  const nameplateId=normalizeGuildNameplateId(state.account.guildNameplateId);
  const patch=(values:Partial<GameState['account']>)=>{if(!readOnly)onChange({...state,account:{...state.account,...values}})};
  const saveMotto=()=>{const value=normalizeGuildMotto(motto);setMotto(value);patch({guildMotto:value})};

  return <View style={s.root}>
    {readOnly?<View style={s.notice}><Text style={s.noticeTitle}>{st("Guild visuals")}</Text><Text style={s.noticeText}>{st("Only the guild leader or an officer can edit these visuals.")}</Text></View>:null}
    <Panel>
      <Text style={s.title}>{st("Guild identity preview")}</Text>
      <GuildIdentitySummary name="The Bloomwardens" level={1} backgroundId={backgroundId} bannerId={bannerId} frameId={frameId} nameplateId={nameplateId} motto={normalizeGuildMotto(state.account.guildMotto)}/>
    </Panel>

    <Panel>
      <Text style={s.title}>{st("Banner / Emblem")}</Text>
      <Text style={s.help}>Choose the heraldry shown on your guild profile, recruitment posts and guild cards.</Text>
      <View style={s.grid}>{GUILD_BANNERS.map(entry=><Pressable key={entry.id} disabled={readOnly} accessibilityRole="button" accessibilityState={{selected:entry.id===bannerId,disabled:readOnly}} onPress={()=>patch({guildBannerId:entry.id})} style={[s.bannerCard,entry.id===bannerId&&s.selected]}>
        <View style={{alignItems:'center'}}><GuildBannerArtwork height={88} bannerId={entry.id}/></View>
        <Text numberOfLines={1} style={s.cardName}>{entry.name}</Text>
        {entry.id===bannerId?<Text style={s.selectedText}>{st("Selected")}</Text>:null}
      </Pressable>)}</View>
    </Panel>

    <Panel>
      <Text style={s.title}>{st("Card background")}</Text>
      <GuildBackgroundPicker selected={backgroundId} onSelect={id=>patch({guildBackgroundId:id})} entitlements={{guildLevel:1,bannerGalleryTier:0,pveAchievementIds:[]}} disabled={readOnly}/>
    </Panel>
    <Panel>
      <Text style={s.title}>{st("Guild profile border")}</Text>
      <View style={s.row}>{GUILD_FRAMES.map(entry=><Pressable key={entry.id} disabled={readOnly} onPress={()=>patch({guildProfileFrameId:entry.id})} style={[s.option,entry.id===frameId&&s.selected,{borderColor:entry.id===frameId?entry.accent:C.line}]}>
        <GuildFrameSwatch frameId={entry.id}/><Text style={s.optionText}>{entry.name}</Text>
      </Pressable>)}</View>
    </Panel>

    <Panel>
      <Text style={s.title}>{st("Guild motto")}</Text>
      <Text style={s.help}>{st("Shown beneath the guild name. Maximum 80 characters.")}</Text>
      <GameTextInput editable={!readOnly} value={motto} onChangeText={value=>setMotto(value.slice(0,80))} onEndEditing={saveMotto} maxLength={80} placeholder={st("Stronger together.")} placeholderTextColor={C.muted} style={s.input}/>
      <Text style={s.counter}>{motto.length}/80</Text>
    </Panel>
  </View>;
}

const s=StyleSheet.create({
 root:{gap:spacing.md},title:{...typography.title,color:C.text},help:{...typography.body,color:C.muted,marginTop:4,marginBottom:8},
 notice:{padding:spacing.md,borderWidth:1,borderColor:'#725b2d',borderRadius:radii.md,backgroundColor:'#292419'},noticeTitle:{color:C.accent,fontWeight:'900'},noticeText:{color:C.muted,marginTop:3},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},bannerCard:{width:'31%',minWidth:92,borderWidth:1,borderColor:C.line,borderRadius:radii.md,padding:7,backgroundColor:C.panel2},selected:{borderColor:C.accent,backgroundColor:'#272417'},cardName:{color:C.text,fontSize:11,fontWeight:'800',marginTop:6},selectedText:{color:C.good,fontSize:10,fontWeight:'900',marginTop:2},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},option:{minWidth:128,flexGrow:1,borderWidth:1,borderRadius:radii.md,padding:9,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800',fontSize:12,marginTop:6},nameplateSample:{height:38,borderWidth:2,borderRadius:8,backgroundColor:'#162231',padding:5,justifyContent:'center'},nameplateGem:{width:12,height:12,transform:[{rotate:'45deg'}],alignSelf:'center'},
 input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg,color:C.text,paddingHorizontal:12},counter:{color:C.muted,textAlign:'right',fontSize:11,marginTop:4}
});
