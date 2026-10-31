import {useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {eventCandies,type EventCandyKind,type LiveEventDef} from '../content/live-events';
import {eventCandyStatus} from '../core/live-events';
import type {GameState} from '../core/types';
import {radii,spacing,typography} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {EventBondCandySelector} from './EventBondCandySelector';

const kindLabels:Record<EventCandyKind,string>={skill:'SKILL',combat:'BATTLE',companion:'BOND',pet:'PET LUCK'};
function durationLabel(seconds:number){
 const minutesTotal=Math.max(0,Math.ceil(seconds/60)),hours=Math.floor(minutesTotal/60),minutes=minutesTotal%60;
 return hours?`${hours}h${minutes?` ${minutes}m`:''}`:minutes?`${minutes}m`:'Less than 1m';
}

export function EventCandyPanel({state,definition,eventActive,busy=false,pendingKind,onUse}:{state:GameState;definition:LiveEventDef;eventActive:boolean;busy?:boolean;pendingKind?:EventCandyKind;onUse:(kind:EventCandyKind,companionId?:string)=>unknown}){
 const C=useGameTheme(),[now,setNow]=useState(()=>Date.now()),candies=eventCandies(definition),visuals=liveEventVisuals(definition.visualKey);
 const {width,fontScale}=useWindowDimensions(),twoColumns=width>=410&&fontScale<1.35;
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30_000);return()=>clearInterval(id);},[]);
 return <Panel>
  <View style={s.heading}><View style={s.flex}><Text style={[s.kicker,{color:C.accent}]}>EVENT CANDY</Text><Text style={[s.title,{color:C.text}]}>Festival boosts</Text><Text style={[s.copy,{color:C.muted}]}>Candy is stored on your account. Timed boosts continue while you are away and end when this event closes.</Text></View>{visuals.candyIcon?<Image accessible={false} source={visuals.candyIcon} resizeMode="contain" style={s.heroCandy}/>:null}</View>
  <View style={[s.list,twoColumns&&s.listTwo]}>{candies.map(candy=>{
   const owned=state.account.eventCandyChargesById?.[candy.id]??0,status=eventCandyStatus(state,now,candy.kind),timed=candy.kind!=='companion',durationFull=timed&&status.remainingSeconds>=candy.maxSeconds-1;
   const disabled=busy||!eventActive||owned<1||durationFull;
   const button=owned<1?'None owned':!eventActive?'Event ended':durationFull?'Duration full':'Use · add '+durationLabel(candy.secondsPerUse);
   return <View key={candy.kind} style={[s.card,twoColumns&&s.cardHalf,{borderColor:status.active?C.good:C.line,backgroundColor:status.active?C.goodSurface:C.panel2}]}>
    <View style={s.row}>{visuals.candyIcon?<Image accessible={false} source={visuals.candyIcon} resizeMode="contain" style={s.candy}/>:null}<View style={s.flex}><View style={s.nameRow}><Text style={[s.name,{color:C.text}]}>{candy.name}</Text><View style={[s.count,{backgroundColor:C.accentSurface}]}><Text style={[s.countText,{color:C.accent}]}>×{owned}</Text></View></View><Text style={[s.kind,{color:C.accent}]}>{kindLabels[candy.kind]}</Text></View></View>
    <Text style={[s.copy,{color:C.muted}]}>{candy.description}</Text>
    {candy.kind==='companion'
     ?<EventBondCandySelector state={state} eventId={definition.id} ownedCharges={owned} active={eventActive} busy={busy} onUse={id=>onUse('companion',id)}/>
     :<>
       {status.active?<Text accessibilityLiveRegion="polite" style={[s.status,{color:C.good}]}>ACTIVE · {durationLabel(status.remainingSeconds)} remaining</Text>:<Text style={[s.status,{color:C.muted}]}>Up to {durationLabel(candy.maxSeconds)} active time</Text>}
       <GameButton compact title={pendingKind===candy.kind?'Using…':button} loading={pendingKind===candy.kind} disabled={disabled} onPress={()=>onUse(candy.kind)}/>
      </>}
   </View>;
  })}</View>
 </Panel>;
}

const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1.1},title:{...typography.title},copy:{...typography.body,lineHeight:19},heroCandy:{width:58,height:58},list:{gap:spacing.sm},listTwo:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},cardHalf:{width:'48.5%'},card:{gap:7,padding:spacing.sm,borderWidth:1,borderRadius:radii.sm},row:{flexDirection:'row',alignItems:'center',gap:10},candy:{width:42,height:42},nameRow:{flexDirection:'row',alignItems:'center',gap:7},name:{...typography.bodyStrong,flex:1},kind:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.8},count:{minWidth:34,paddingHorizontal:7,paddingVertical:3,borderRadius:99,alignItems:'center'},countText:{fontSize:12,lineHeight:16,fontWeight:'900'},status:{fontSize:11,lineHeight:16,fontWeight:'800'},});
