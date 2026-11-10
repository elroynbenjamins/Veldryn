import {useEffect,useState} from 'react';
import {Image,Platform,StyleSheet,Text,View} from 'react-native';
import {PLAYER_BADGE_LABELS,playerBadgeIds,type PlayerBadgeIdentity,type PlayerBadgeId} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';

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
 const C=useGameTheme(),label=PLAYER_BADGE_LABELS[id];
 return <View accessible accessibilityRole="image" accessibilityLabel={label} {...(Platform.OS==='web'?{title:label}:{})} style={s.badge}><Image accessible={false} source={artwork[id]} resizeMode="contain" style={{width:size,height:size}}/>{showLabel?<Text style={{color:C.text,fontSize:12,lineHeight:18}}>{label}</Text>:null}</View>;
}
export function PlayerBadges({identity,size=20,showLabels=false}:{identity?:PlayerBadgeIdentity;size?:number;showLabels?:boolean}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{setNow(Date.now());if(!identity)return;const timer=setTimeout(()=>setNow(Date.now()),Math.max(0,Math.min(2147483647,identity.validUntilMs-Date.now()+1)));return()=>clearTimeout(timer);},[identity]);
 const ids=playerBadgeIds(identity,Math.max(now,Date.now()));
 if(!ids.length)return null;
 return <View style={s.row}>{ids.map(id=><PlayerBadge key={id} id={id} size={size} showLabel={showLabels}/>)}</View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},badge:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0}});
