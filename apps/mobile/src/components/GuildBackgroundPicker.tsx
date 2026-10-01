import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GUILD_BACKGROUNDS,guildCosmeticUnlockLabel,isGuildCosmeticUnlocked,type GuildAppearanceEntitlements,type GuildBackgroundId} from '../core/guild-customization';
import {guildBackgroundSources} from '../theme/card-background-assets';
import {CardBackground} from './CardBackground';
import {useGameTheme} from '../theme/ThemeContext';
import {useSocialText} from '../i18n/social';

export function GuildBackgroundPicker({selected,onSelect,entitlements,disabled=false}:{selected:GuildBackgroundId;onSelect:(id:GuildBackgroundId)=>void;entitlements:GuildAppearanceEntitlements;disabled?:boolean}){
 const C=useGameTheme(),st=useSocialText();
 return <View style={s.grid}>{GUILD_BACKGROUNDS.map(row=>{
  const sources=guildBackgroundSources.get(row.id),unlocked=isGuildCosmeticUnlocked(row.unlock,entitlements),locked=disabled||!unlocked;
  return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={st(row.name)} accessibilityState={{selected:selected===row.id,disabled:locked}} disabled={locked} onPress={()=>onSelect(row.id)} style={[s.choice,{backgroundColor:C.panel2,borderColor:selected===row.id?C.accent:C.line},!unlocked&&{opacity:.55}]}>
   <View style={[s.art,{backgroundColor:C.stage}]}>{sources?<CardBackground sources={sources}/>:null}</View>
   <Text style={[s.name,{color:C.text}]}>{st(row.name)}</Text>
   <Text style={[s.meta,{color:C.muted}]}>{unlocked?st('Available'):guildCosmeticUnlockLabel(row.unlock)}</Text>
  </Pressable>;
 })}</View>;
}
const s=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{minWidth:120,flexBasis:120,flexGrow:1,padding:6,borderWidth:1,borderRadius:8,gap:4},art:{width:'100%',aspectRatio:16/9,overflow:'hidden',borderRadius:4},name:{fontSize:11,fontWeight:'800'},meta:{fontSize:10}});
