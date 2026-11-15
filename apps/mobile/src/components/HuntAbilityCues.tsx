import {Text,View} from 'react-native';
import type {ActiveHuntSkillEffect} from '../core/game';
import type {Language} from '../i18n/languages';
import type {ClassId} from '../core/types';
import {CLASS_ICON_ACCENT} from '../content/class-icon-colors';
import {battleText} from '../i18n/battle';
import {useGameTheme} from '../theme/ThemeContext';

/** Compact, accessible feedback shared by both live-hunting surfaces.
 * Render only events emitted by the settlement timeline, never a cosmetic
 * animation timer. Keep the two newest skills visible at most. */
export function HuntAbilityCues({effects,language,classId,formatAmount}:{
 effects:readonly ActiveHuntSkillEffect[];
 language:Language;
 classId:ClassId;
 formatAmount:(amount:number)=>string;
}){
 const C=useGameTheme();
 if(!effects.length)return null;
 const tr=(key:string,params?:Record<string,string|number>)=>battleText(language,key,params);
 return <View style={{gap:5}}>
  {effects.slice(-2).map((effect,index)=>{
   // Class skills use the exact accent of the approved class icon,
   // independent of their damage, shield, healing or recovery mechanic.
   const color=effect.source==='class'?CLASS_ICON_ACCENT[classId]:effect.kind==='heal'?C.good:C.info;
   const label=effect.kind==='recovery'?'ON-KILL RECOVERY':effect.source==='companion'?'COMPANION SKILL':'CLASS ABILITY';
   // Companion names are stable entities, while their ability can be
   // translated separately. The server emits "Companion: Ability" and a
   // full-string catalog lookup would leave every technique untranslated.
   const divider=effect.source==='companion'?effect.name.indexOf(': '):-1;
   const skillName=divider>=0?tr(effect.name.slice(0,divider))+': '+tr(effect.name.slice(divider+2)):tr(effect.name);
   const amount=effect.amount!==undefined&&effect.amount>0
    ?effect.kind==='recovery'?tr('ON-KILL RECOVERY')+' · '+formatAmount(effect.amount)
     :tr(effect.kind==='damage'?'SKILL DAMAGE · {amount}':effect.kind==='shield'?'SHIELD · {amount}':'SKILL HEAL · {amount}',{amount:formatAmount(effect.amount)})
    :undefined;
   return <View key={effect.name+':'+Math.round(effect.atMs)+':'+index} accessible accessibilityLiveRegion="polite"
     accessibilityLabel={tr(label)+': '+skillName+(amount?' · '+amount:'')}
     style={{borderLeftWidth:3,borderLeftColor:color,borderWidth:1,borderColor:C.line,borderRadius:6,backgroundColor:C.panel2,paddingHorizontal:8,paddingVertical:5,gap:2}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6}}>
     <Text numberOfLines={2} style={{fontSize:9,lineHeight:12,color,fontWeight:'900',letterSpacing:.3,flexShrink:1}}>{tr(label)}</Text>
     {amount?<Text numberOfLines={1} style={{fontSize:10,lineHeight:13,color:C.text,fontWeight:'800',marginLeft:'auto',flexShrink:1}}>{amount}</Text>:null}
    </View>
    <Text numberOfLines={2} style={{fontSize:12,lineHeight:16,color:effect.source==='class'&&C.dark?color:C.text,fontWeight:'700',flexShrink:1}}>{skillName}</Text>
   </View>;
  })}
 </View>;
}
