import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

/** Shared index tabs for objective boards and their neighbouring destinations. */
export function BoardTabs<T extends string>({items,value,onChange,label,compact=false}:{compact?:boolean;items:readonly {id:T;label:string}[];value:T;onChange:(id:T)=>void;label:string}){
 const C=useGameTheme();
 return <View accessibilityRole="tablist" accessibilityLabel={label} style={s.tabs}>{items.map(item=>{
  const selected=item.id===value;
  return <Pressable key={item.id} accessibilityRole="tab" aria-selected={selected} accessibilityState={{selected}} onPress={()=>onChange(item.id)} style={({pressed})=>[s.tab,compact&&s.compact,{backgroundColor:selected?C.selection:C.panel,borderColor:selected?C.selectionLine:C.line},pressed&&s.pressed]}>
   {!compact?<View accessible={false} pointerEvents="none" style={[s.mark,{backgroundColor:selected?C.accent:C.lineStrong}]}/>:null}
   <Text style={[s.label,{color:selected?C.text:C.muted}]}>{item.label}</Text>
  </Pressable>;
 })}</View>;
}
const s=StyleSheet.create({tabs:{flexDirection:'row',gap:4,alignItems:'stretch'},tab:{flex:1,minWidth:0,minHeight:54,justifyContent:'center',alignItems:'center',paddingHorizontal:4,paddingTop:12,paddingBottom:8,borderWidth:1,borderBottomWidth:2,borderTopLeftRadius:9,borderTopRightRadius:9},compact:{minHeight:44,paddingTop:8,borderRadius:8,borderBottomWidth:1},mark:{position:'absolute',top:5,width:16,height:2,borderRadius:1},label:{fontSize:12,lineHeight:17,fontWeight:'600',textAlign:'center'},pressed:{opacity:.76}});
