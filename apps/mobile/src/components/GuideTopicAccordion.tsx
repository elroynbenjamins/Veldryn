import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

type Topic={id:string;title:string;body:string};
type Props={topics:readonly Topic[];expandedIndex:number;onChange:(index:number)=>void;translate?:(value:string)=>string};

/** One expanded topic at a time; all topic labels remain visible in the vertical reading order. */
export function GuideTopicAccordion({topics,expandedIndex,onChange,translate}:Props){
 const C=useGameTheme(),t=translate??((value:string)=>value);
 return <View style={s.list}>
  {topics.map((topic,index)=>{
   const expanded=expandedIndex===index;
   return <View key={topic.id} style={[s.item,{backgroundColor:expanded?C.panel:C.panel2,borderColor:expanded?C.selectionLine:C.line}]}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={t(topic.title)} onPress={()=>onChange(expanded?-1:index)}
     style={({pressed})=>[s.header,expanded&&{backgroundColor:C.selection},pressed&&s.pressed]}>
     <Text style={[s.label,{color:C.text}]}>{t(topic.title)}</Text>
     <View accessible={false} importantForAccessibility="no" style={[s.chevron,{borderColor:expanded?C.accent:C.muted,transform:[{rotate:expanded?'225deg':'45deg'}]}]}/>
    </Pressable>
    {expanded?<View style={[s.content,{borderTopColor:C.line}]}>
     <Text style={[s.body,{color:C.muted}]}>{t(topic.body)}</Text>
    </View>:null}
   </View>;
  })}
 </View>;
}
const s=StyleSheet.create({
 list:{gap:6},
 item:{borderWidth:1,borderRadius:10,overflow:'hidden'},
 header:{minHeight:44,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:10},
 label:{flex:1,minWidth:0,fontSize:13,lineHeight:19,fontWeight:'700'},
 chevron:{width:8,height:8,borderRightWidth:2,borderBottomWidth:2,marginRight:3,flexShrink:0},
 pressed:{opacity:.75},
 content:{borderTopWidth:StyleSheet.hairlineWidth,paddingHorizontal:12,paddingTop:10,paddingBottom:12},
 body:{fontSize:13,lineHeight:21},
});
