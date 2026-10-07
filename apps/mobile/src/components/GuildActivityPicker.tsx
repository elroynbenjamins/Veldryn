import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {socialLabel} from '../i18n/social';
import {UiIcon} from './UiIcon';
export type GuildActivity='Muster'|'Quests'|'Projects'|'PvE';
const activityIcons={Muster:'guild',Quests:'quests',Projects:'inventory',PvE:'training'} as const;
const labels:Record<GuildActivity,string>={Muster:'Daily Muster',Quests:'Guild Quests',Projects:'Projects',PvE:'Guild PvE'};
export function GuildActivityPicker({value,onChange}:{value:GuildActivity;onChange:(value:GuildActivity)=>void}){
 const language=useGameLanguage(),C=useGameTheme(),[open,setOpen]=useState(false);
 return <View style={{gap:6}}><Text style={{fontSize:12,color:C.muted}}>Guild activity</Text><Pressable accessibilityRole="button" accessibilityLabel={'Guild activity: '+socialLabel(language,labels[value])} accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={{minHeight:52,padding:12,borderWidth:1,borderColor:open?C.selectionLine:C.line,borderRadius:12,backgroundColor:C.panel,flexDirection:'row',alignItems:'center',gap:10}}><UiIcon name={activityIcons[value]} size={23}/><Text style={{flex:1,fontSize:16,fontWeight:'600',color:C.text}}>{socialLabel(language,labels[value])}</Text><Text style={{color:C.muted,fontSize:18}}>{open?'⌃':'⌄'}</Text></Pressable>{open&&<View accessibilityRole="radiogroup" style={{borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,overflow:'hidden'}}>{(Object.keys(labels) as GuildActivity[]).map(option=><Pressable key={option} accessibilityRole="radio" accessibilityState={{checked:option===value}} onPress={()=>{onChange(option);setOpen(false)}} style={{minHeight:48,paddingHorizontal:14,gap:10,flexDirection:'row',alignItems:'center',backgroundColor:option===value?C.selection:C.panel}}><UiIcon name={activityIcons[option]} size={22}/><Text style={{flex:1,fontSize:14,color:C.text}}>{socialLabel(language,labels[option])}</Text>{option===value&&<Text style={{color:C.accent}}>✓</Text>}</Pressable>)}</View>}</View>;
}
export function GuildActivityIntro({value}:{value:GuildActivity}){
 const C=useGameTheme();
 const copy={Muster:['Stand with your guild.','Check in, then contribute through Combat or Skilling.'],Quests:['Progress together.','Shared objectives for your whole guild.'],Projects:['Build something lasting.','Contribute resources to lasting guild improvements.'],PvE:['Face the next challenge.','Prepare with your guild for PvE encounters.']} as const;
 return <View style={{gap:8,paddingVertical:8}}><Text accessibilityRole="header" style={{fontSize:26,lineHeight:32,fontWeight:'600',color:C.text}}>{copy[value][0]}</Text><Text style={{fontSize:14,lineHeight:21,color:C.muted}}>{copy[value][1]}</Text></View>;
}
