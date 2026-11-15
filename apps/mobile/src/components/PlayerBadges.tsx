import {useEffect,useState} from 'react';
import {Image,Modal,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions,type StyleProp,type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {PLAYER_BADGE_LABELS,PLAYER_BADGE_DESCRIPTIONS,playerBadgeIds,profileBadgeIds,type PlayerBadgeIdentity,type PlayerBadgeId} from '../core/player-badges';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {recentScreenText} from '../i18n/recent-screens';

// Static require paths allow Metro to bundle artwork offline. These badges are never remotely downloaded.
const artwork:Record<Exclude<PlayerBadgeId,'vip'|'vip_plus'>,number>={
 admin:require('../../assets/player-badges-v1/admin.webp'),
 moderator:require('../../assets/player-badges-v1/moderator.webp'),
 supporter:require('../../assets/player-badges-v1/supporter.webp'),
 supporter_3m:require('../../assets/player-badges-v1/supporter_3m.webp'),
 supporter_6m:require('../../assets/player-badges-v1/supporter_6m.webp'),
 supporter_12m:require('../../assets/player-badges-v1/supporter_12m.webp'),
 founder:require('../../assets/player-badges-v1/founder.webp'),
 veteran:require('../../assets/player-badges-v1/veteran.webp'),
 guild_leader:require('../../assets/player-badges-v1/guild_leader.webp'),
 community_champion:require('../../assets/player-badges-v1/community_champion.webp'),
 event_champion:require('../../assets/player-badges-v1/event_champion.webp'),
};
/**
 * The compact badge stays the same size in every name row. Its optional press target
 * opens a native popover outside clipped profile artwork and chat row containers.
 */
export function PlayerBadge({id,size=20,showLabel=false,interactive=false}:{id:PlayerBadgeId;size?:number;showLabel?:boolean;interactive?:boolean}){
 const C=useGameTheme(),language=useGameLanguage(),label=recentScreenText(language,PLAYER_BADGE_LABELS[id]);
 const detail=recentScreenText(language,PLAYER_BADGE_DESCRIPTIONS[id]);
 const {width:screenWidth,height:screenHeight}=useWindowDimensions(),insets=useSafeAreaInsets();
 const [anchor,setAnchor]=useState<{left:number;top:number}|null>(null);
 const vip=id==='vip'||id==='vip_plus';
 const art=(artSize:number)=>vip?<View style={[s.vipMark,{width:artSize,height:artSize,borderColor:id==='vip_plus'?'#C9A2FC':'#E6C365',backgroundColor:id==='vip_plus'?'#312044':'#3D3017'}]}>
   <Text numberOfLines={1} adjustsFontSizeToFit style={{color:id==='vip_plus'?'#F0DFFF':'#FFECB0',fontWeight:'900',fontSize:artSize*.31,letterSpacing:-.25}}>{id==='vip_plus'?'VIP+':'VIP'}</Text>
  </View>:<Image accessible={false} source={artwork[id as Exclude<PlayerBadgeId,'vip'|'vip_plus'>]} resizeMode="contain" style={{width:artSize,height:artSize}}/>;
 const content=<>{art(size)}{showLabel?<Text style={{color:C.text,fontSize:12,lineHeight:18}}>{label}</Text>:null}</>;
 if(!interactive)return <View accessible accessibilityRole="image" accessibilityLabel={label} {...(Platform.OS==='web'?{title:label}:{})} style={s.badge}>{content}</View>;
 const open=(pageX:number,pageY:number)=>{
  const bubbleWidth=Math.min(248,Math.max(180,screenWidth-24));
  const left=Math.max(12,Math.min(screenWidth-bubbleWidth-12,pageX-bubbleWidth/2));
  // Anchor to the tap itself so this works with modern React Native's function refs.
  const above=pageY+130>screenHeight-insets.bottom;
  const desiredTop=above?pageY-128:pageY+14;
  const top=Math.max(insets.top+8,Math.min(screenHeight-insets.bottom-132,desiredTop));
  setAnchor({left,top});
 };
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail}
   hitSlop={6} onPress={event=>{event.stopPropagation();open(event.nativeEvent.pageX,event.nativeEvent.pageY);}} style={({pressed})=>[s.badge,pressed&&s.pressed]}>{content}</Pressable>
  {anchor?<Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={()=>setAnchor(null)}>
   <View style={s.infoLayer}>
    <Pressable accessible={false} accessibilityLabel="Close badge information" style={StyleSheet.absoluteFill} onPress={()=>setAnchor(null)}/>
    <View accessibilityViewIsModal style={[s.infoBubble,{left:anchor.left,top:anchor.top,width:Math.min(248,Math.max(180,screenWidth-24)),backgroundColor:C.panel,borderColor:C.lineStrong}]}>
     <View style={[s.infoIcon,{backgroundColor:C.bg}]}>{art(34)}</View>
     <View style={s.infoCopy}>
      <Text accessibilityRole="header" style={[s.infoTitle,{color:C.text}]}>{label}</Text>
      <Text style={[s.infoDescription,{color:C.muted}]}>{detail}</Text>
     </View>
    </View>
   </View>
  </Modal>:null}
 </>;
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
 return <View style={s.row}>{ids.map(id=><PlayerBadge key={id} id={id} size={size} showLabel={showLabels} interactive/>)}</View>;
}
/** The profile: up to three badges of the player's choosing, beside the automatic staff mark.
 * A profile has room for a collection; a chat line does not. */
export function PlayerBadgeShowcase({identity,size=17,style}:{identity?:PlayerBadgeIdentity;size?:number;style?:StyleProp<ViewStyle>}){
 const C=useGameTheme();
 const ids=profileBadgeIds(identity,useBadgeClock(identity));
 if(!ids.length)return null;
 return <View style={[s.showcase,{borderColor:C.line,backgroundColor:C.dark?'rgba(3,4,5,.52)':'rgba(255,255,255,.58)'},style]}>
  {ids.map(id=><PlayerBadge key={id} id={id} size={size} interactive/>)}
 </View>;
}
const s=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 badge:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 pressed:{opacity:.72},
 infoLayer:{flex:1},
 infoBubble:{position:'absolute',flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderRadius:12,shadowColor:'#000',shadowOpacity:.45,shadowRadius:12,elevation:12},
 infoIcon:{width:42,height:42,borderRadius:8,alignItems:'center',justifyContent:'center'},
 infoCopy:{flex:1,minWidth:0,gap:3},
 infoTitle:{fontSize:13,fontWeight:'900'},
 infoDescription:{fontSize:11,lineHeight:15},

 vipMark:{alignItems:'center',justifyContent:'center',borderWidth:2,borderRadius:3},
 showcase:{flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:5,paddingHorizontal:5,paddingVertical:3,borderWidth:1,borderRadius:99},
});
