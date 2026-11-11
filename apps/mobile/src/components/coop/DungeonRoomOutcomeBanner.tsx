import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import type {CoopRoomOutcomeView} from '../../core/coop-presentation';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {dungeonRoomPresentation} from './dungeon-room-presentation';

/** A transient, non-modal result based on committed server deltas, not guesses. */
export function DungeonRoomOutcomeBanner({outcome}:{outcome?:CoopRoomOutcomeView}){
 const {colors:C,styles:s}=useCoopStyles(makeStyles),st=useSocialText(),[visible,setVisible]=useState(Boolean(outcome));
 const enter=useRef(new Animated.Value(0)).current;
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  setVisible(Boolean(outcome));
  if(!outcome)return;
  enter.setValue(0);pulse.setValue(0);
  Animated.timing(enter,{toValue:1,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  Animated.sequence([Animated.timing(pulse,{toValue:1,duration:360,easing:Easing.out(Easing.quad),useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:520,easing:Easing.in(Easing.quad),useNativeDriver:true})]).start();
  const timeout=setTimeout(()=>setVisible(false),6500);
  return()=>clearTimeout(timeout);
 },[outcome?.nodeId,outcome?.kind,outcome?.offerKind,outcome?.resourcesDelta]);
 if(!outcome||!visible||outcome.kind==='merchant')return null;
 const detail:string[]=[];
 if(outcome.kind==='merchant_purchase'){
  const item=outcome.offerKind==='boon'?st('Sealed boon'):outcome.offerKind==='artifact'?st('Run artifact'):st('Restorative salve');
  detail.push(st('Bought {item}',{item}));
 }
 if((outcome.damagedHp??0)>0)detail.push(`−${Math.round(outcome.damagedHp??0)} HP`);
 if(outcome.healedHp>0)detail.push(st('Restored {amount} HP',{amount:Math.round(outcome.healedHp)}));
 if(outcome.revivedCount>0)detail.push(st('Revived {count}',{count:outcome.revivedCount}));
 if(outcome.boonCount>0)detail.push(st('{count} boon gained',{count:outcome.boonCount}));
 if(outcome.artifactCount>0)detail.push(st('{count} artifact gained',{count:outcome.artifactCount}));
 if(outcome.curseCount>0)detail.push(st('{count} curse gained',{count:outcome.curseCount}));
 if(outcome.resourcesDelta!==0)detail.push(st('{amount} resources',{amount:`${outcome.resourcesDelta>0?'+':''}${outcome.resourcesDelta}`}));
 const room=dungeonRoomPresentation(outcome.kind);
 const summary=detail.length?detail.join(' · '):st('Room cleared');
 const tone=outcome.curseCount>0?'curse':outcome.artifactCount>0?'artifact':outcome.boonCount>0?'boon':outcome.revivedCount>0||outcome.healedHp>0?'heal':(outcome.damagedHp??0)>0?'danger':outcome.resourcesDelta>0?'gain':'neutral';
 const tint=tone==='curse'?C.violet:tone==='artifact'?C.gold:tone==='boon'?C.cyan:tone==='heal'?C.success:tone==='danger'?C.danger:tone==='gain'?C.gold:C.success;
 const glyph=tone==='curse'?'✦':tone==='artifact'?'✧':tone==='boon'?'◆':tone==='heal'?'+':tone==='danger'?'!':tone==='gain'?'★':'✓';
 const enterStyle={opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[-8,0]})}]};
 const markScale={transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.35]})}]};
 const ringStyle={opacity:pulse.interpolate({inputRange:[0,1],outputRange:[0,.35]}),transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[.6,1.8]})}]};
 return <Animated.View style={[s.banner,{borderColor:tint},enterStyle]} accessibilityLiveRegion="polite">
  <View style={s.markSlot}>
   <Animated.View pointerEvents="none" style={[s.ring,{backgroundColor:tint},ringStyle]}/>
   <Animated.Text style={[s.mark,{color:tint},markScale]}>{glyph}</Animated.Text>
  </View>
  <Text style={s.text} numberOfLines={3}>{room?`${st(room.name)} · ${summary}`:summary}</Text>
 </Animated.View>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 banner:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,minHeight:38,paddingHorizontal:coopSpacing.sm,paddingVertical:7,borderRadius:9,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,backgroundColor:C.surface},
 markSlot:{width:22,height:22,alignItems:'center',justifyContent:'center'},
 ring:{position:'absolute',width:22,height:22,borderRadius:11},
 mark:{fontSize:14,lineHeight:18,fontWeight:'800',color:C.success},
 text:{flex:1,minWidth:0,fontSize:12,lineHeight:17,color:C.textSecondary,fontWeight:'700'}
});
