/**
 * Reusable read-only Classes 2.0 combat resource UI.
 *
 * Render ONLY values from the server's encounter snapshots or replay events;
 * never predict or mint stacks on the client. Safe for build previews at 0.
 * The component is not imported into live combat screens until rollout.
 */
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography} from '../theme/theme';

export type ResourceValueV2={label:string;current:number;max:number};
export type ResourceReplayEventV2={
 type:'resource_gain'|'resource_spend';
 actorId:string;
 resource:string;
 resourceAfter:number;
 atMs:number;
};
const valid=(value:ResourceValueV2)=>Number.isSafeInteger(value.current)&&
 Number.isSafeInteger(value.max)&&value.max>0&&value.max<=5&&
 value.current>=0&&value.current<=value.max;
const message=(value:ResourceValueV2,preview:boolean)=>
 preview?'Starts empty each encounter':value.current+' of '+value.max+' stacks';
/** Null if any replay event is malformed or refers to a different resource.
 * Do not render last event as authoritative if stream ordering is unknown.
 */
export function projectServerResourceV2(
 events:readonly ResourceReplayEventV2[],actorId:string,resource:string,max:number,
):number|null{
 if(!Number.isSafeInteger(max)||max<1||max>5)return null;
 let last=0,at=-1;
 for(const event of events){
   if(event.actorId!==actorId||event.resource!==resource)continue;
   if(!Number.isSafeInteger(event.resourceAfter)||event.resourceAfter<0||
     event.resourceAfter>max||!Number.isFinite(event.atMs)||event.atMs<at)
     return null;
   last=event.resourceAfter;at=event.atMs;
 }
 return last;
}
export function ClassResourceMeterV2({
 value,preview=false,
}:{value:ResourceValueV2;preview?:boolean}){
 const C=useGameTheme();
 const ok=valid(value);
 return <View accessibilityRole="progressbar"
  accessibilityLabel={value.label+(ok?', '+message(value,preview):', unavailable')}
  accessibilityValue={ok?{min:0,max:value.max,now:value.current}:undefined}
  style={styles.root}>
   <View style={styles.heading}>
    <Text style={[typography.bodyStrong,{color:C.text}]}>{value.label}</Text>
    <Text style={[typography.caption,{color:C.muted}]}>
      {ok?(preview?'0 / '+value.max:value.current+' / '+value.max):'Unavailable'}
    </Text>
   </View>
   <View style={styles.pips} accessible={false} importantForAccessibility="no">
    {ok?Array.from({length:value.max},(_,index)=>
      <View key={index} style={[styles.pip,{borderColor:C.lineStrong,
        backgroundColor:index<value.current?C.accent:C.panel2}]}/>):null}
   </View>
   {preview?<Text style={[typography.caption,{color:C.muted}]}>
     Combat preview · resource gains and spending are server-controlled
   </Text>:null}
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:6},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 pips:{flexDirection:'row',flexWrap:'wrap',gap:5},
 pip:{width:20,height:12,borderRadius:radii.sm,borderWidth:1},
});
