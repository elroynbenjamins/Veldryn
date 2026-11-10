import {useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {CoopRoomOutcomeView} from '../../core/coop-presentation';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {dungeonRoomPresentation} from './dungeon-room-presentation';

/** A transient, non-modal result based on committed server deltas, not guesses. */
export function DungeonRoomOutcomeBanner({outcome}:{outcome?:CoopRoomOutcomeView}){
 const {styles:s}=useCoopStyles(makeStyles),st=useSocialText(),[visible,setVisible]=useState(Boolean(outcome));
 useEffect(()=>{
  setVisible(Boolean(outcome));
  if(!outcome)return;
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
 return <View style={s.banner} accessibilityLiveRegion="polite">
  <Text style={s.mark}>✓</Text>
  <Text style={s.text} numberOfLines={3}>{room?`${st(room.name)} · ${summary}`:summary}</Text>
 </View>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 banner:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,minHeight:38,paddingHorizontal:coopSpacing.sm,paddingVertical:7,borderRadius:9,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,backgroundColor:C.surface},
 mark:{fontSize:14,lineHeight:18,fontWeight:'800',color:C.success},
 text:{flex:1,minWidth:0,fontSize:12,lineHeight:17,color:C.textSecondary,fontWeight:'700'}
});
