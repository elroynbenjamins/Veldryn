import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {StatusPill} from './StatusPill';
import {ThemedIcon} from './ThemedNavigationIcon';
import {loadOnlineGuildMuster} from '../online/guild-muster';
import {loadOnlineGuildTokenShop,type GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function readyCount(snapshot:GuildTokenShopSnapshot|null):number{
 if(!snapshot)return 0;
 const weekly=snapshot.weeklyRewards.filter(r=>r.eligible&&!r.claimed).length;
 const events=snapshot.eventBonuses.filter(r=>!r.claimed).length;
 return weekly+events;
}

/**
 * Compact Guild check-in / claim widget for the Home dashboard. Only mounts for
 * guild members, so non-members pay no network cost and see nothing. Tapping
 * opens the Guild tab, where the full Hall summary handles claiming.
 */
export function GuildDashboardCard({onOpenGuild}:{onOpenGuild:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [checkedIn,setCheckedIn]=useState<boolean|null>(null);
 const [shop,setShop]=useState<GuildTokenShopSnapshot|null>(null);
 const mounted=useRef(true);

 const load=async()=>{
  if(!mounted.current)return;
  const [musterResult,shopResult]=await Promise.allSettled([loadOnlineGuildMuster(),loadOnlineGuildTokenShop()]);
  if(!mounted.current)return;
  if(musterResult.status==='fulfilled')setCheckedIn(musterResult.value?.state?.checkedIn===true);
  if(shopResult.status==='fulfilled')setShop(shopResult.value??null);
 };

 useEffect(()=>{
  mounted.current=true;
  void load();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void load()});
  return()=>{mounted.current=false;listener.remove();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const ready=readyCount(shop);
 const statusLabel=checkedIn===null?'Guild':checkedIn?'Checked in':'Check-in due';

 return <Pressable accessibilityRole="button" accessibilityLabel={`Guild · ${statusLabel}${ready?` · ${ready} to claim`:''}`} onPress={onOpenGuild} style={({pressed})=>[s.card,pressed&&s.pressed]}>
  <View style={s.icon}><ThemedIcon name="guild" size={26}/></View>
  <View style={s.body}>
   <View style={s.top}>
    <Text style={s.kicker}>YOUR GUILD</Text>
    <StatusPill label={checkedIn===null?'SYNCING':checkedIn?'CHECKED IN':'CHECK-IN DUE'} tone={checkedIn?'good':checkedIn===false?'warning':'muted'}/>
   </View>
   <Text style={s.line}>{ready>0
    ? `${ready} Guild Token reward${ready===1?'':'s'} ready to claim`
    : checkedIn?'Attendance recorded today':'Open to record today’s Muster'}</Text>
  </View>
  {ready>0
   ?<GameButton compact title={`Claim ${ready}`} onPress={onOpenGuild}/>
   :<Text style={s.arrow}>›</Text>}
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{flexDirection:'row',alignItems:'center',gap:11,padding:12,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 pressed:{opacity:.8},
 icon:{width:40,height:40,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 body:{flex:1,minWidth:0,gap:3},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 kicker:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:.7},
 line:{fontSize:12.5,color:C.muted,fontWeight:'600'},
 arrow:{fontSize:22,color:C.muted,fontWeight:'800',paddingHorizontal:4},
});}
