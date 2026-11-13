import {useEffect,useState} from 'react';
import {Image,Platform,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {PLAYER_BADGE_LABELS,playerBadgeIds,profileBadgeIds,type PlayerBadgeIdentity,type PlayerBadgeId} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {recentScreenText} from '../i18n/recent-screens';

// Static require paths allow Metro to bundle artwork offline. These badges are never remotely downloaded.
const artwork:Record<PlayerBadgeId,number>={
 admin:require('../../assets/player-badges-v1/admin.webp'),
 moderator:require('../../assets/player-badges-v1/moderator.webp'),
 supporter:require('../../assets/player-badges-v1/supporter.webp'),
 supporter_3m:require('../../assets/player-badges-v1/supporter_3m.webp'),
 supporter_6m:require('../../assets/player-badges-v1/supporter_6m.webp'),
 supporter_12m:require('../../assets/player-badges-v1/supporter_12m.webp'),
 founder:require('../../assets/player-badges-v1/founder.webp'),
 beta_tester:require('../../assets/player-badges-v1/beta_tester.webp'),
 veteran:require('../../assets/player-badges-v1/veteran.webp'),
 guild_leader:require('../../assets/player-badges-v1/guild_leader.webp'),
 community_champion:require('../../assets/player-badges-v1/community_champion.webp'),
 event_champion:require('../../assets/player-badges-v1/event_champion.webp'),
};
export function PlayerBadge({id,size=20,showLabel=false}:{id:PlayerBadgeId;size?:number;showLabel?:boolean}){
 const C=useGameTheme(),language=useGameLanguage(),label=recentScreenText(language,PLAYER_BADGE_LABELS[id]);
 return <View accessible accessibilityRole="image" accessibilityLabel={label} {...(Platform.OS==='web'?{title:label}:{})} style={s.badge}><Image accessible={false} source={artwork[id]} resizeMode="contain" style={{width:size,height:size}}/>{showLabel?<Text style={{color:C.text,fontSize:12,lineHeight:18}}>{label}</Text>:null}</View>;
}
/** A cached identity stops being trustworthy at validUntilMs, so re-render exactly then. */
function useBadgeClock(identity?:PlayerBadgeIdentity){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{setNow(Date.now());if(!identity)return;const timer=setTimeout(()=>setNow(Date.now()),Math.max(0,Math.min(2147483647,identity.validUntilMs-Date.now()+1)));return()=>clearTimeout(timer);},[identity]);
 return Math.max(now,Date.now());
}
/** The name row: automatic staff identity plus the one badge worn beside the name. */
export function PlayerBadges({identity,size=20,showLabels=false}:{identity?:PlayerBadgeIdentity;size?:number;showLabels?:boolean}){
 const ids=playerBadgeIds(identity,useBadgeClock(identity));
 if(!ids.length)return null;
 return <View style={s.row}>{ids.map(id=><PlayerBadge key={id} id={id} size={size} showLabel={showLabels}/>)}</View>;
}
/** The profile: up to three badges of the player's choosing, beside the automatic staff mark.
 * A profile has room for a collection; a chat line does not. */
export function PlayerBadgeShowcase({identity,size=17,style}:{identity?:PlayerBadgeIdentity;size?:number;style?:StyleProp<ViewStyle>}){
 const C=useGameTheme();
 const ids=profileBadgeIds(identity,useBadgeClock(identity));
 if(!ids.length)return null;
 return <View style={[s.showcase,{borderColor:C.line,backgroundColor:C.dark?'rgba(3,4,5,.52)':'rgba(255,255,255,.58)'},style]}>
  {ids.map(id=><PlayerBadge key={id} id={id} size={size}/>)}
 </View>;
}
const s=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 badge:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 showcase:{flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:5,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderRadius:99},
});
