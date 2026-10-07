import {StyleSheet,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

export type StatIconKind='health'|'currentHealth'|'defense'|'attack'|'power'|'critChance'|'critDamage'|'accuracy'|'evasion'|'haste'|'armor'|'ward'|'tenacity'|'potency'|'penetration'|'readiness'|'slots';

export function StatIcon({kind,size=22,muted=false}:{kind:StatIconKind;size?:number;muted?:boolean}){
 const C=useGameTheme(),color=muted?C.muted:C.accent;
 const line=Math.max(1.5,size*.085),box={width:size,height:size};
 const stroke={borderColor:color};
 if(kind==='health')return <View accessible={false} style={[s.icon,box]}><View style={[s.heartLeft,{width:size*.42,height:size*.42,borderRadius:size*.21,backgroundColor:color,left:size*.12,top:size*.17}]}/><View style={[s.heartRight,{width:size*.42,height:size*.42,borderRadius:size*.21,backgroundColor:color,right:size*.12,top:size*.17}]}/><View style={[s.heartPoint,{width:size*.5,height:size*.5,backgroundColor:color,left:size*.25,top:size*.29,transform:[{rotate:'45deg'}]}]}/></View>;
 if(kind==='currentHealth')return <View accessible={false} style={[s.icon,box]}><View style={[s.plus,{width:size*.68,height:line,backgroundColor:color,left:size*.16,top:size*.5-line/2}]}/><View style={[s.plus,{width:line,height:size*.68,backgroundColor:color,left:size*.5-line/2,top:size*.16}]}/></View>;
 if(kind==='attack')return <View accessible={false} style={[s.icon,box]}><View style={[s.weapon,{width:line,height:size*.72,backgroundColor:color,left:size*.47,top:size*.07,transform:[{rotate:'42deg'}]}]}/><View style={[s.weapon,{width:line,height:size*.72,backgroundColor:color,left:size*.47,top:size*.07,transform:[{rotate:'-42deg'}]}]}/><View style={[s.guard,{width:size*.34,height:line,backgroundColor:color,left:size*.1,top:size*.62,transform:[{rotate:'42deg'}]}]}/><View style={[s.guard,{width:size*.34,height:line,backgroundColor:color,right:size*.1,top:size*.62,transform:[{rotate:'-42deg'}]}]}/></View>;
 if(kind==='defense'||kind==='armor'||kind==='tenacity')return <View accessible={false} style={[s.icon,box]}><View style={[s.shield,stroke,{width:size*.68,height:size*.78,left:size*.16,top:size*.08,borderWidth:line,borderTopLeftRadius:size*.12,borderTopRightRadius:size*.12,borderBottomLeftRadius:size*.28,borderBottomRightRadius:size*.28}]}/>{kind==='armor'?<View style={[s.centerLine,{width:size*.38,height:line,backgroundColor:color,left:size*.31,top:size*.45}]}/>:kind==='tenacity'?<View style={[s.centerDot,{width:size*.18,height:size*.18,borderRadius:size*.09,backgroundColor:color,left:size*.41,top:size*.36}]}/>:null}</View>;
 if(kind==='power'||kind==='potency'||kind==='critDamage')return <View accessible={false} style={[s.icon,box]}><View style={[s.spark,{width:size*.42,height:size*.42,left:size*.29,top:size*.29,borderWidth:line,borderColor:color,transform:[{rotate:'45deg'}]}]}/><View style={[s.ray,{width:line,height:size*.18,backgroundColor:color,left:size*.5-line/2,top:size*.03}]}/><View style={[s.ray,{width:line,height:size*.18,backgroundColor:color,left:size*.5-line/2,bottom:size*.03}]}/><View style={[s.ray,{width:size*.18,height:line,backgroundColor:color,left:size*.03,top:size*.5-line/2}]}/><View style={[s.ray,{width:size*.18,height:line,backgroundColor:color,right:size*.03,top:size*.5-line/2}]}/></View>;
 if(kind==='critChance'||kind==='accuracy'||kind==='readiness')return <View accessible={false} style={[s.icon,box]}><View style={[s.targetOuter,stroke,{width:size*.76,height:size*.76,left:size*.12,top:size*.12,borderRadius:size*.38,borderWidth:line}]}/><View style={[s.targetInner,stroke,{width:size*.4,height:size*.4,left:size*.3,top:size*.3,borderRadius:size*.2,borderWidth:line}]}/><View style={[s.centerDot,{width:size*.12,height:size*.12,left:size*.44,top:size*.44,borderRadius:size*.06,backgroundColor:color}]}/></View>;
 if(kind==='evasion'||kind==='haste')return <View accessible={false} style={[s.icon,box]}><View style={[s.chevron,{width:size*.42,height:size*.42,left:size*.12,top:size*.29,borderTopWidth:line,borderRightWidth:line,borderColor:color,transform:[{rotate:'45deg'}]}]}/><View style={[s.chevron,{width:size*.42,height:size*.42,right:size*.12,top:size*.29,borderTopWidth:line,borderRightWidth:line,borderColor:color,transform:[{rotate:'45deg'}]}]}/></View>;
 if(kind==='ward')return <View accessible={false} style={[s.icon,box]}><View style={[s.diamond,stroke,{width:size*.58,height:size*.58,left:size*.21,top:size*.21,borderWidth:line,transform:[{rotate:'45deg'}]}]}/><View style={[s.centerDot,{width:size*.13,height:size*.13,left:size*.435,top:size*.435,borderRadius:size*.065,backgroundColor:color}]}/></View>;
 if(kind==='penetration')return <View accessible={false} style={[s.icon,box]}><View style={[s.arrowShaft,{width:size*.68,height:line,backgroundColor:color,left:size*.12,top:size*.5-line/2}]}/><View style={[s.arrowHead,{width:size*.3,height:size*.3,right:size*.1,top:size*.35,borderTopWidth:line,borderRightWidth:line,borderColor:color,transform:[{rotate:'45deg'}]}]}/></View>;
 return <View accessible={false} style={[s.icon,box]}><View style={[s.gridCell,stroke,{left:size*.12,top:size*.12,width:size*.31,height:size*.31,borderWidth:line}]}/><View style={[s.gridCell,stroke,{right:size*.12,top:size*.12,width:size*.31,height:size*.31,borderWidth:line}]}/><View style={[s.gridCell,stroke,{left:size*.12,bottom:size*.12,width:size*.31,height:size*.31,borderWidth:line}]}/><View style={[s.gridCell,stroke,{right:size*.12,bottom:size*.12,width:size*.31,height:size*.31,borderWidth:line}]}/></View>;
}

const s=StyleSheet.create({
 icon:{position:'relative'},
 heartLeft:{position:'absolute'},heartRight:{position:'absolute'},heartPoint:{position:'absolute'},
 plus:{position:'absolute',borderRadius:99},weapon:{position:'absolute',borderRadius:99},guard:{position:'absolute',borderRadius:99},
 shield:{position:'absolute'},centerLine:{position:'absolute',borderRadius:99},centerDot:{position:'absolute'},
 spark:{position:'absolute'},ray:{position:'absolute',borderRadius:99},
 targetOuter:{position:'absolute'},targetInner:{position:'absolute'},
 chevron:{position:'absolute'},diamond:{position:'absolute'},
 arrowShaft:{position:'absolute',borderRadius:99},arrowHead:{position:'absolute'},
 gridCell:{position:'absolute',borderRadius:2},
});
