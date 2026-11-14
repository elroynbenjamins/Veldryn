import {Text,View} from 'react-native';
import type {ActiveHuntSkillEffect} from '../core/game';
import type {Language} from '../i18n/languages';
import {battleText} from '../i18n/battle';
import {useGameTheme} from '../theme/ThemeContext';

/** Compact, accessible feedback shared by both live-hunting surfaces.
 * Render only events emitted by the settlement timeline, never a cosmetic
 * animation timer. Keep the two newest skills visible at most. */
export function HuntAbilityCues({effects,language,formatAmount}:{
 effects:readonly ActiveHuntSkillEffect[];
 language:Language;
 formatAmount:(amount:number)=>string;
}){
 const C=useGameTheme();
 if(!effects.length)return null;
 const tr=(key:string,params?:Record<string,string|number>)=>battleText(language,key,params);
 return <View style={{gap:5}}>
  {effects.slice(-2).map((effect,index)=>{
   const color=effect.kind==='shield'?C.info:effect.kind==='damage'?(effect.source==='companion'?C.info:C.accent):C.good;
   const label=effect.kind==='recovery'?'ON-KILL RECOVERY':effect.source==='companion'?'COMPANION SKILL':'CLASS ABILITY';
   const amount=effect.amount!==undefined&&effect.amount>0
    ?tr(effect.kind==='damage'?'SKILL DAMAGE · {amount}':effect.kind==='shield'?'SHIELD · {amount}':'SKILL HEAL · {amount}',{amount:formatAmount(effect.amount)})
    :undefined;
   return <View key={effect.name+':'+Math.round(effect.atMs)+':'+index} accessible accessibilityLiveRegion="polite"
     accessibilityLabel={tr(label)+': '+tr(effect.name)+(amount?' · '+amount:'')}
     style={{borderLeftWidth:3,borderLeftColor:color,borderWidth:1,borderColor:C.line,borderRadius:6,backgroundColor:C.panel2,paddingHorizontal:8,paddingVertical:5,gap:2}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6}}>
     <Text numberOfLines={2} style={{fontSize:9,lineHeight:12,color,fontWeight:'900',letterSpacing:.3,flexShrink:1}}>{tr(label)}</Text>
     {amount?<Text numberOfLines={1} style={{fontSize:10,lineHeight:13,color:C.text,fontWeight:'800',marginLeft:'auto',flexShrink:1}}>{amount}</Text>:null}
    </View>
    <Text numberOfLines={1} style={{fontSize:12,lineHeight:16,color:C.text,fontWeight:'700'}}>{tr(effect.name)}</Text>
   </View>;
  })}
 </View>;
}
