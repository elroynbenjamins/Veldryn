import {StyleSheet,View} from 'react-native';
import {equipmentColors} from '../theme/theme';

export type PrimaryNavigationDestination='Home'|'Character'|'World'|'Inventory'|'More';

type Props={
  destination:PrimaryNavigationDestination;
  active:boolean;
};

export function PrimaryNavigationIcon({destination,active}:Props){
  const color=active?equipmentColors.goldSoft:'#8190a3';
  const stroke={borderColor:color};
  const fill={backgroundColor:color};

  return <View accessible={false} pointerEvents="none" style={s.canvas}>
    {destination==='Home'&&<>
      <View style={[s.homeRoof,stroke]}/>
      <View style={[s.homeBody,stroke]}/>
      <View style={[s.homeDoor,stroke]}/>
    </>}
    {destination==='Character'&&<>
      <View style={[s.head,stroke]}/>
      <View style={[s.shoulders,stroke]}/>
    </>}
    {destination==='World'&&<>
      <View style={[s.compassRing,stroke]}/>
      <View style={[s.compassNeedle,stroke]}/>
      <View style={[s.compassCenter,fill]}/>
    </>}
    {destination==='Inventory'&&<>
      <View style={[s.bagHandle,stroke]}/>
      <View style={[s.bagBody,stroke]}>
        <View style={[s.bagSeam,fill]}/>
      </View>
    </>}
    {destination==='More'&&<View style={s.moreRow}>
      <View style={[s.moreDot,fill]}/><View style={[s.moreDot,fill]}/><View style={[s.moreDot,fill]}/>
    </View>}
  </View>;
}

const s=StyleSheet.create({
  canvas:{width:30,height:30,position:'relative'},
  homeRoof:{position:'absolute',left:7,top:3,width:17,height:17,borderLeftWidth:2,borderTopWidth:2,borderTopLeftRadius:2,transform:[{rotate:'45deg'}]},
  homeBody:{position:'absolute',left:6,top:12,width:18,height:14,borderWidth:2,borderTopWidth:0,borderBottomLeftRadius:3,borderBottomRightRadius:3},
  homeDoor:{position:'absolute',left:13,top:19,width:5,height:7,borderWidth:2,borderBottomWidth:0,borderTopLeftRadius:2,borderTopRightRadius:2},
  head:{position:'absolute',left:11,top:3,width:9,height:9,borderWidth:2,borderRadius:5},
  shoulders:{position:'absolute',left:5,top:15,width:21,height:12,borderWidth:2,borderBottomWidth:0,borderTopLeftRadius:11,borderTopRightRadius:11},
  compassRing:{position:'absolute',left:3,top:3,width:24,height:24,borderWidth:2,borderRadius:12},
  compassNeedle:{position:'absolute',left:10,top:5,width:10,height:20,borderWidth:2,borderRadius:2,transform:[{rotate:'35deg'}]},
  compassCenter:{position:'absolute',left:13,top:13,width:4,height:4,borderRadius:2},
  bagHandle:{position:'absolute',left:10,top:3,width:11,height:9,borderWidth:2,borderBottomWidth:0,borderTopLeftRadius:7,borderTopRightRadius:7},
  bagBody:{position:'absolute',left:5,top:9,width:21,height:18,borderWidth:2,borderRadius:5,alignItems:'center'},
  bagSeam:{width:7,height:2,borderRadius:1,marginTop:7},
  moreRow:{position:'absolute',left:3,top:3,width:24,height:24,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},
  moreDot:{width:5,height:5,borderRadius:3},
});
