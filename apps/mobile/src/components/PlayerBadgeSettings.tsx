import {accountText,accountError} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Pressable,StyleSheet,Switch,Text,View} from 'react-native';
import {usePlayerBadges,type BadgeState} from '../online/PlayerBadgeProvider';
import {PlayerBadge,PlayerBadges} from './PlayerBadges';
import {COLLECTIBLE_PLAYER_BADGE_IDS,MAX_DISPLAYED_PLAYER_BADGES,PLAYER_BADGE_LABELS,PLAYER_BADGE_UNLOCK_HINTS} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export function PlayerBadgeSettings(){
 const badges=usePlayerBadges();
 return <PlayerBadgeSettingsView badges={badges}/>;
}
export function PlayerBadgeSettingsView({language:languageOverride,badges}:{language?:Language;badges:BadgeState}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme();
 if(!badges.accountId)return null;
 return <View style={s.root}>
  <Text style={[s.title,{color:C.text}]}>{a("Player badges")}</Text>
  <PlayerBadges identity={badges.identity} showLabels size={28}/>
  <View style={s.row}><Text style={[s.label,{color:C.text}]}>{a("Show Supporter badge")}</Text><Switch accessibilityLabel={a("Show Supporter badge")} value={badges.showSupporter} disabled={badges.loading||badges.busy||!!badges.error} onValueChange={value=>void badges.setVisible(value)}/></View>
  {!badges.supporterAvailable&&!badges.loading?<Text style={[s.note,{color:C.muted}]}>{a("Requires an active Supporter subscription.")}</Text>:null}
  <Text style={[s.title,{color:C.text}]}>Collectible badges</Text>
  <Text style={[s.note,{color:C.muted}]}>Choose up to {MAX_DISPLAYED_PLAYER_BADGES} earned badges. Staff badges always take priority beside your name.</Text>
  {COLLECTIBLE_PLAYER_BADGE_IDS.map(id=>{
   const owned=badges.ownedExtras?.includes(id)===true,featured=badges.featuredExtras?.includes(id)===true;
   const selected=badges.featuredExtras??[];
   const blocked=!badges.setFeatured||badges.busy||badges.loading||!owned||(!featured&&selected.length>=MAX_DISPLAYED_PLAYER_BADGES);
   return <Pressable key={id} accessibilityRole="button" accessibilityLabel={PLAYER_BADGE_LABELS[id]} accessibilityState={{selected:featured,disabled:blocked}} disabled={blocked} onPress={()=>void badges.setFeatured?.(featured?selected.filter(x=>x!==id):[...selected,id])} style={[s.collectible,{borderColor:featured?C.accent:C.line,opacity:owned?1:.55}]}>
    <PlayerBadge id={id} size={30}/><View style={s.details}><Text style={[s.label,{color:C.text}]}>{PLAYER_BADGE_LABELS[id]}</Text><Text style={[s.note,{color:C.muted}]}>{owned?(featured?'Featured':'Earned · tap to feature'):PLAYER_BADGE_UNLOCK_HINTS[id]}</Text></View><Text style={{color:featured?C.accent:C.muted}}>{featured?'✓':owned?'+':'🔒'}</Text>
   </Pressable>;
  })}
  {badges.error?<><Text accessibilityRole="alert" style={[s.note,{color:C.bad}]}>{accountError(language,badges.error,'Could not load badges.')}</Text><GameButton compact title={a("Retry badges")} tone="secondary" onPress={()=>badges.refresh()}/></>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:10,paddingVertical:12},title:{fontSize:14,fontWeight:'700'},row:{flexDirection:'row',alignItems:'center',gap:12},label:{flex:1,fontSize:13},note:{fontSize:12,lineHeight:18},collectible:{flexDirection:'row',alignItems:'center',gap:10,minHeight:52,padding:8,borderWidth:1,borderRadius:8},details:{flex:1,gap:2}});
