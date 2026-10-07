import {Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

/** Quiet, slim progress treatment shared by contract boards. */
export function ContractProgress({label,current,total,personal=false,complete,showOverflow=false,tone="default"}:{label:string;current:number;total:number;personal?:boolean;complete?:boolean;showOverflow?:boolean;tone?:"default"|"good"}){
 const C=useGameTheme(),target=Number.isFinite(total)?Math.max(0,total):0,value=Number.isFinite(current)?Math.max(0,current):0;
 const done=complete??(target>0&&value>=target),pct=target>0?Math.min(100,value/target*100):done?100:0;
 const count=showOverflow?value:Math.min(value,target),text=`${count.toLocaleString()} / ${target.toLocaleString()}`;
 return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min:0,max:Math.max(1,target),now:target>0?Math.min(value,target):done?1:0,text}} style={{gap:7}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6}}><Text style={{color:C.muted,fontSize:12,lineHeight:17}}>{label}</Text><Text style={{color:done?C.good:C.text,fontSize:12,lineHeight:17,fontWeight:'600',fontVariant:['tabular-nums']}}>{text}</Text></View>
  <View style={{height:6,borderRadius:99,backgroundColor:C.panel2,overflow:'hidden'}}><View style={{height:'100%',width:`${pct}%`,borderRadius:99,backgroundColor:done||tone==="good"?C.good:personal?C.warning:C.info}}/></View>
 </View>;
}
