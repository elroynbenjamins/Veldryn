import {useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {useSocialText} from '../../i18n/social';
import {liveLobbySlots,readySecondsRemaining,type LiveQueueView,type LiveReadyView} from '../../core/coop-live-lobby';
import type {CoopDungeonView} from '../../core/coop-dungeon-browsing';
import {coopUiAssets} from '../../theme/coop-ui-assets';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';
import {FantasyPanel,PrimaryAction} from './CoopVisualKit';
import {IdentityArtwork} from '../SocialIdentity';

export type LobbyIdentity={dungeons?:CoopDungeonView[];selfPortrait?:ImageSourcePropType};
type Props=LobbyIdentity&{queue?:LiveQueueView;ready?:LiveReadyView;notice?:string;busy?:boolean;pending?:boolean;loading?:boolean;onBack:()=>void;onRetry:()=>void;onRetryPending:()=>void;onCancel:()=>void;onAccept:()=>void;onDecline:()=>void};
const roles={tank:'Tank',damage:'Damage',support:'Support'} as const;
const roleArt={tank:coopUiAssets.role_tank,damage:coopUiAssets.role_damage,support:coopUiAssets.role_support};

/** Actual server roster only; undisclosed player identities use role emblems. */
export function CoopLiveLobbyView({dungeons=[],selfPortrait,queue,ready,notice='',busy=false,pending=false,loading=false,onBack,onRetry,onRetryPending,onCancel,onAccept,onDecline}:Props){
 const {colors:C,styles:s}=useCoopStyles(makeStyles),st=useSocialText(),{height}=useWindowDimensions();
 const [elapsed,setElapsed]=useState(0);
 // Cosmetic refreshes may replace the roster view without advancing server time.
 useEffect(()=>{setElapsed(0);if(!ready||!['open','refilling'].includes(ready.status))return;const received=Date.now();const timer=setInterval(()=>setElapsed(Math.max(0,Date.now()-received)),250);return()=>clearInterval(timer);},[ready?.readyCheckId,ready?.status,ready?.serverNow,ready?.closesAtMs,ready?.refillEndsAtMs]);
 const seconds=ready?readySecondsRemaining({...ready,serverNow:ready.serverNow+elapsed}):0;
 const status=ready?.status??queue?.ticket?.status;
 const ended=!!status&&['expired','cancelled','requeued'].includes(status);
 const open=status==='open',queued=status==='queued',refilling=status==='refilling',committed=status==='committed';
 const self=ready?.members.find(m=>m.self),canAccept=open&&!!self&&!self.accepted&&seconds>0&&!busy&&!pending;
 const dungeon=dungeons.find(d=>d.id===(ready?.dungeonId??queue?.ticket?.dungeonId));
 const art=dungeon?.id==='EXP_001'?require('../../../assets/coop-ui/illustrations/rootbound_gate_v2.jpg'):dungeon?.heroArtId?coopUiAssets[dungeon.heroArtId]:undefined;
 const title=open?'Your party awaits':queued?'Gathering your party':refilling?'Finding a replacement':committed?'Your party is ready':ended?'Search ended':loading?'Restoring your party':'Find a dungeon party';
 const tier=ready?.tier??queue?.ticket?.maxTier??queue?.ticket?.tier;
 const roster=queued||open||refilling||committed;
 return <View style={s.screen}>
  <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
   <View style={[s.hero,{height:Math.max(190,Math.min(280,height*.30))}]}>
    {art?<Image source={art} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>:null}
    <Image source={require('../../../assets/coop-ui/illustrations/hero-shade.webp')} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>
    <Pressable accessibilityRole="button" accessibilityLabel={st('Back to expeditions')} onPress={onBack} style={({pressed})=>[s.back,pressed&&s.pressed]}><Text style={s.backText}>‹ {st('Expeditions')}</Text></Pressable>
    <View style={s.heroTitle}><Text accessibilityRole="header" style={s.dungeonTitle}>{dungeon?.name??st('Live expedition')}</Text><Text style={s.location}>{[dungeon?.region,tier?`${st(queued?'Auto Tier up to':'Tier')} ${tier}`:st('Live party')].filter(Boolean).join(' · ')}</Text></View>
   </View>
   <View style={s.body}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{st(title)}</Text>{open||refilling?<View style={s.timer}><Text style={s.timerText}>{seconds}s</Text><Text style={s.muted}>{st(open?'to confirm':'remaining')}</Text></View>:null}<Text style={s.subtitle}>{st(open?'Confirm your place before time runs out.':refilling?'Accepted players keep their place.':committed?'Everyone accepted. Preparing your dungeon…':ended?'Return to expeditions to start a new search.':'1 Tank · 2 Damage · 1 Support')}</Text></View>
    {notice?<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.error}>{notice}</Text><PrimaryAction label={st('Retry connection')} tone="secondary" disabled={busy} onPress={onRetry}/></FantasyPanel>:null}
    {pending?<FantasyPanel><Text style={s.copy}>{st('Your last action is saved. Retry to continue.')}</Text><PrimaryAction label={st('Retry pending action')} disabled={busy} loading={busy} onPress={onRetryPending}/></FantasyPanel>:null}
    {roster?<View style={s.grid}>{liveLobbySlots(queue,ready).map(slot=>{
     const waiting=!slot.member&&!slot.self;
     const ownPortrait=slot.self&&selfPortrait,memberIcon=!!(slot.member?.profileIconId||slot.member?.iconClassId),hasProfilePortrait=!!ownPortrait||memberIcon;
     const label=slot.accepted?'Accepted':slot.self&&queued?'Queued':slot.member?(slot.self?'Your response needed':'Waiting for response'):'Searching…';
     return <View key={slot.key} style={[s.card,slot.self&&s.selfCard]}>
      <View style={[s.portrait,waiting&&s.placeholder]}>
       {ownPortrait?<Image source={ownPortrait} resizeMode="contain" style={s.portraitImage}/>:memberIcon?<IdentityArtwork name={slot.self?st('You'):st(roles[slot.role])} profileIconId={slot.member?.profileIconId} className={slot.member?.iconClassId} size={62}/>:<Image source={roleArt[slot.role]} resizeMode="contain" style={s.portraitImage}/>}
       {hasProfilePortrait?<View style={s.roleBadge}><Image source={roleArt[slot.role]} resizeMode="contain" style={s.roleIcon}/></View>:null}
      </View>
      <Text style={s.memberName}>{slot.self?st('You'):st(roles[slot.role])}</Text>{slot.self?<Text style={s.muted}>{st(roles[slot.role])}</Text>:null}
      <Text style={[s.memberStatus,slot.accepted?s.accepted:slot.self&&open?s.attention:null]}>{slot.accepted?'✓ ':''}{st(label)}</Text>
     </View>;
    })}</View>:!ended?<View style={s.wait}>{loading||status==='reserved'||status==='matched'?<ActivityIndicator color={C.cyan}/>:null}<Text style={s.copy}>{st(status==='reserved'||status==='matched'?'Match found. Preparing your party…':loading?'Restoring your matchmaking session…':'No active search. Choose a dungeon to find a party.')}</Text></View>:null}
   </View>
  </ScrollView>
  <View style={s.footer}>
   {open?<><PrimaryAction label={st(self?.accepted?'Accepted':seconds===0?'Waiting for party update…':'Accept party')} disabled={!canAccept} loading={busy} onPress={onAccept}/><Pressable accessibilityRole="button" accessibilityState={{disabled:busy||pending||seconds===0}} disabled={busy||pending||seconds===0} onPress={onDecline} style={({pressed})=>[s.decline,pressed&&s.pressed]}><Text style={s.declineText}>{st('Decline')}</Text></Pressable></>:queued?<><Text style={s.hint}>{st('Keep this screen open while searching.')}</Text><PrimaryAction label={st('Cancel search')} tone="secondary" disabled={busy||pending} loading={busy} onPress={onCancel}/></>:ended||(!loading&&!status)?<PrimaryAction label={st('Back to expeditions')} tone="secondary" onPress={onBack}/>:<Text style={s.hint}>{st(committed?'Preparing your dungeon…':refilling?'Keep this screen open while we refill your party.':'Connecting your party…')}</Text>}
  </View>
 </View>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 screen:{flex:1,backgroundColor:C.background},scroll:{paddingBottom:16},hero:{backgroundColor:C.surface,position:'relative',overflow:'hidden'},back:{position:'absolute',top:8,left:12,minHeight:44,paddingHorizontal:12,justifyContent:'center',borderRadius:12,backgroundColor:'rgba(3,4,5,.76)',zIndex:2},backText:{fontSize:14,fontWeight:'700',color:'#F1F4F5'},pressed:{opacity:.65},heroTitle:{position:'absolute',bottom:20,left:20,right:20,gap:6},dungeonTitle:{fontSize:29,lineHeight:35,fontWeight:'800',color:'#F1F4F5'},location:{fontSize:12,lineHeight:17,letterSpacing:1.4,fontWeight:'700',color:'#D5DADD'},body:{paddingHorizontal:16,paddingTop:16,gap:12},heading:{alignItems:'center',gap:8},title:{fontSize:23,lineHeight:29,fontWeight:'700',color:C.text,textAlign:'center'},subtitle:{fontSize:13,lineHeight:19,color:C.textMuted,textAlign:'center'},timer:{flexDirection:'row',alignItems:'center',gap:6},timerText:{fontSize:18,lineHeight:23,fontWeight:'800',color:C.warning,fontVariant:['tabular-nums']},muted:{fontSize:12,lineHeight:17,color:C.textMuted},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'47%',flexGrow:1,minHeight:150,padding:12,alignItems:'center',justifyContent:'center',gap:4,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,borderRadius:16},selfCard:{borderColor:C.cyan},portrait:{width:64,height:64,alignItems:'center',justifyContent:'center',marginBottom:4,borderRadius:32,backgroundColor:C.surfaceRaised,borderWidth:1,borderColor:C.lineStrong},portraitImage:{width:52,height:52},placeholder:{opacity:.40},roleBadge:{position:'absolute',bottom:-2,right:-3,width:25,height:25,borderRadius:13,backgroundColor:C.surface,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},roleIcon:{width:20,height:20},memberName:{fontSize:15,lineHeight:20,fontWeight:'700',color:C.text},memberStatus:{fontSize:12,lineHeight:17,color:C.textMuted,textAlign:'center'},accepted:{color:C.success},attention:{color:C.warning},footer:{paddingHorizontal:16,paddingTop:10,paddingBottom:12,borderTopWidth:1,borderColor:C.line,backgroundColor:C.background,gap:8},hint:{fontSize:12,lineHeight:17,color:C.textMuted,textAlign:'center'},decline:{minHeight:44,justifyContent:'center',alignItems:'center'},declineText:{fontSize:14,color:C.textMuted},copy:{fontSize:14,lineHeight:20,color:C.textSecondary,textAlign:'center'},error:{fontSize:14,lineHeight:20,color:C.danger},wait:{padding:24,gap:12,alignItems:'center'}
});
