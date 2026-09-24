import {StyleSheet,View} from 'react-native';

/** Small outline symbols keep chat navigation quiet at mobile sizes. */
export function ChatChannelIcon({channel,color}:{channel:'world'|'guild'|'party'|'system';color:string}){
 const stroke={borderColor:color};
 return <View accessible={false} pointerEvents="none" style={s.icon}>
  {channel==='world'?<><View style={[s.globe,stroke]}/><View style={[s.meridian,stroke]}/><View style={[s.equator,{backgroundColor:color}]}/></>:null}
  {channel==='guild'?<View style={[s.shield,stroke]}/>:null}
  {channel==='party'?<><View style={[s.head,stroke]}/><View style={[s.shoulders,stroke]}/><View style={[s.secondHead,stroke]}/><View style={[s.secondShoulders,stroke]}/></>:null}
  {channel==='system'?<><View style={[s.bell,stroke]}/><View style={[s.bellBase,{backgroundColor:color}]}/><View style={[s.clapper,{backgroundColor:color}]}/></>:null}
 </View>;
}
const s=StyleSheet.create({
 icon:{width:24,height:24},globe:{position:'absolute',left:2,top:2,width:20,height:20,borderWidth:1.6,borderRadius:10},meridian:{position:'absolute',left:8,top:2,width:8,height:20,borderWidth:1.4,borderRadius:10},equator:{position:'absolute',left:3,top:11,width:18,height:1.5},
 shield:{position:'absolute',left:4,top:3,width:16,height:19,borderWidth:1.7,borderTopLeftRadius:3,borderTopRightRadius:3,borderBottomLeftRadius:10,borderBottomRightRadius:10},
 head:{position:'absolute',left:4,top:3,width:8,height:8,borderWidth:1.6,borderRadius:4},shoulders:{position:'absolute',left:1,top:13,width:14,height:9,borderWidth:1.6,borderTopLeftRadius:7,borderTopRightRadius:7,borderBottomWidth:0},secondHead:{position:'absolute',left:16,top:5,width:6,height:6,borderWidth:1.5,borderRadius:3},secondShoulders:{position:'absolute',left:17,top:14,width:6,height:8,borderWidth:1.5,borderTopRightRadius:5,borderLeftWidth:0,borderBottomWidth:0},
 bell:{position:'absolute',left:5,top:3,width:14,height:15,borderWidth:1.6,borderTopLeftRadius:8,borderTopRightRadius:8,borderBottomWidth:0},bellBase:{position:'absolute',left:3,top:17,width:18,height:1.6,borderRadius:1},clapper:{position:'absolute',left:10,top:20,width:4,height:2,borderRadius:2},
});
