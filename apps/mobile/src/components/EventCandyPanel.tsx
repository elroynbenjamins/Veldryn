import {useEffect,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {eventCandies,type EventCandyKind,type LiveEventDef} from '../content/live-events';
import {combatCompanionDef} from '../content/combat-companions';
import {eventCandyStatus} from '../core/live-events';
import type {GameState} from '../core/types';
import {radii,spacing,typography} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameButton} from './GameButton';
import {Panel} from './Panel';

const kindLabels:Record<EventCandyKind,string>={skill:'SKILL',combat:'BATTLE',companion:'BOND',pet:'PET LUCK'};
function durationLabel(seconds:number){
 const total=Math.max(0,Math.ceil(seconds)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),remainder=total%60;
 return hours?`${hours}h ${minutes}m ${remainder}s`:minutes?`${minutes}m ${remainder}s`:`${remainder}s`;
}

export function EventCandyPanel({state,definition,eventActive,busy=false,pendingKind,onUse}:{state:GameState;definition:LiveEventDef;eventActive:boolean;busy?:boolean;pendingKind?:EventCandyKind;onUse:(kind:EventCandyKind,companionId?:string)=>unknown}){
 const C=useGameTheme(),[now,setNow]=useState(()=>Date.now()),candies=eventCandies(definition),visuals=liveEventVisuals(definition.visualKey);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1_000);return()=>clearInterval(id);},[]);
 const equippedId=state.character?.equippedCombatCompanionId,ownedIds=state.account.unlockedCombatCompanionIds??[];
 const [selectedId,setSelectedId]=useState<string|undefined>(equippedId??ownedIds[0]);
 const targetId=selectedId&&ownedIds.includes(selectedId)?selectedId:equippedId&&ownedIds.includes(equippedId)?equippedId:ownedIds[0],target=targetId?combatCompanionDef(targetId):undefined;
 const bondUses=state.account.eventShopPurchaseCounts?.[`${definition.id}:candy:companion_material`]??0;
 return <Panel>
  <View style={s.heading}><View style={s.flex}><Text style={[s.kicker,{color:C.accent}]}>EVENT CANDY</Text><Text style={[s.title,{color:C.text}]}>Festival boosts</Text><Text style={[s.copy,{color:C.muted}]}>Candy is stored on your account. Timed boosts continue while you are away and end when this event closes.</Text></View>{visuals.candyIcon?<Image accessible={false} source={visuals.candyIcon} resizeMode="contain" style={s.heroCandy}/>:null}</View>
  <View style={s.list}>{candies.map(candy=>{
   const owned=state.account.eventCandyChargesById?.[candy.id]??0,status=eventCandyStatus(state,now,candy.kind),timed=candy.kind!=='companion',durationFull=timed&&status.remainingSeconds>=candy.maxSeconds-1,bondCapped=candy.kind==='companion'&&bondUses>=5,needsCompanion=candy.kind==='companion'&&!target;
   const disabled=busy||!eventActive||owned<1||durationFull||bondCapped||needsCompanion;
   const button=owned<1?'None owned':!eventActive?'Event ended':durationFull?'Duration full':bondCapped?'Bond material cap reached':needsCompanion?'Own a companion first':candy.kind==='companion'?`Use on ${target?.name??'companion'}`:`Use · add ${durationLabel(candy.secondsPerUse)}`;
   return <View key={candy.kind} style={[s.card,{borderColor:status.active?C.good:C.line,backgroundColor:status.active?C.goodSurface:C.panel2}]}>
    <View style={s.row}>{visuals.candyIcon?<Image accessible={false} source={visuals.candyIcon} resizeMode="contain" style={s.candy}/>:null}<View style={s.flex}><View style={s.nameRow}><Text style={[s.name,{color:C.text}]}>{candy.name}</Text><View style={[s.count,{backgroundColor:C.accentSurface}]}><Text style={[s.countText,{color:C.accent}]}>×{owned}</Text></View></View><Text style={[s.kind,{color:C.accent}]}>{kindLabels[candy.kind]}</Text></View></View>
    <Text style={[s.copy,{color:C.muted}]}>{candy.description}</Text>
    {candy.kind==='companion'&&ownedIds.length>0?<View style={s.picker}><Text style={[s.kind,{color:C.muted}]}>CHOOSE OWNED COMPANION</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerList}>{ownedIds.map(id=>{const def=combatCompanionDef(id);return def?<Pressable key={id} accessibilityRole="button" accessibilityState={{selected:id===targetId}} onPress={()=>setSelectedId(id)} style={[s.pickerChip,{borderColor:id===targetId?C.accent:C.line,backgroundColor:id===targetId?C.accentSurface:C.panel}]}><Text style={[s.pickerLabel,{color:id===targetId?C.accent:C.text}]}>{def.name}</Text></Pressable>:null;})}</ScrollView></View>:null}
    {status.active?<Text accessibilityLiveRegion="polite" style={[s.status,{color:C.good}]}>ACTIVE · {durationLabel(status.remainingSeconds)} remaining</Text>:candy.kind==='companion'?<Text style={[s.status,{color:bondCapped?C.warning:C.muted}]}>{target?`Target: ${target.name}`:'Unlock a combat companion first'} · Event materials {bondUses}/5</Text>:<Text style={[s.status,{color:C.muted}]}>Up to {durationLabel(candy.maxSeconds)} active time</Text>}
    <GameButton compact title={pendingKind===candy.kind?'Using…':button} loading={pendingKind===candy.kind} disabled={disabled} onPress={()=>onUse(candy.kind,candy.kind==='companion'?targetId:undefined)}/>
   </View>;
  })}</View>
 </Panel>;
}

const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1.1},title:{...typography.title},copy:{...typography.body,lineHeight:19},heroCandy:{width:58,height:58},list:{gap:spacing.sm},card:{gap:7,padding:spacing.sm,borderWidth:1,borderRadius:radii.sm},row:{flexDirection:'row',alignItems:'center',gap:10},candy:{width:42,height:42},nameRow:{flexDirection:'row',alignItems:'center',gap:7},name:{...typography.bodyStrong,flex:1},kind:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.8},count:{minWidth:34,paddingHorizontal:7,paddingVertical:3,borderRadius:99,alignItems:'center'},countText:{fontSize:12,lineHeight:16,fontWeight:'900'},status:{fontSize:11,lineHeight:16,fontWeight:'800'},picker:{gap:6},pickerList:{gap:6,paddingVertical:2},pickerChip:{borderWidth:1,borderRadius:radii.sm,paddingVertical:7,paddingHorizontal:10},pickerLabel:{fontSize:12,fontWeight:'700'}});
