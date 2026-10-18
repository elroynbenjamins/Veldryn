import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';

function resourceName(key:string){
 if(key==='gold')return 'Gold';
 return key.toLowerCase().split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
}
/** Shared cosmetic construction. Donations remain disabled until atomic
 * item/gold deduction and contribution persistence are implemented.
 */
export function OnlineGuildConstructionPanel({snapshot}:{snapshot:GuildTokenShopSnapshot}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <Panel>
  <Text style={s.kicker}>GUILD CONSTRUCTION</Text>
  <Text style={s.title}>Build something together</Text>
  <Text style={s.copy}>Permanent guild banners and decorations require collective gold and material donations. Construction is optional and never blocks Guild XP or leveling.</Text>
  <Text style={s.note}>Project preview · Donations are locked until shared-resource transactions are verified.</Text>
  {snapshot.constructionTemplates.map(template=>{
   const row=snapshot.construction.find(p=>p.templateId===template.id);
   const requirements=[{key:'gold',required:template.gold},...template.materials.map(material=>({key:material.materialKey,required:material.amount}))];
   const completion=requirements.length?requirements.reduce((sum,res)=>sum+Math.min(1,Math.max(0,(row?.resources[res.key]??0)/res.required)),0)/requirements.length:0;
   const allowed=snapshot.guildLevel>=template.guildLevel;
   return <View key={template.id} style={s.project}>
    <View style={s.head}><View style={s.flex}><Text style={s.projectName}>{resourceName(template.id)}</Text><Text style={s.projectMeta}>Guild Level {template.guildLevel} · {row?.completed?'Completed':allowed?'Materials needed':'Level locked'}</Text></View><Text style={s.percent}>{Math.round(completion*100)}%</Text></View>
    {requirements.map(res=>{
     const amount=Math.max(0,row?.resources[res.key]??0),percent=res.required?Math.min(100,Math.round(amount/res.required*100)):100;
     return <View key={res.key} style={s.resource}>
      <View style={s.head}><Text style={s.resourceName}>{resourceName(res.key)}</Text><Text style={s.resourceAmount}>{amount.toLocaleString()} / {res.required.toLocaleString()}</Text></View>
      <View style={s.track}><View style={[s.fill,{width:`${percent}%` as `${number}%`}]}/></View>
     </View>;
    })}
    <Text style={s.unlock}>{row?.completed?'Guild reward unlocked':`Reward: ${resourceName(template.unlockId)}`}</Text>
   </View>;
  })}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 kicker:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.8},
 title:{fontSize:17,color:C.text,fontWeight:'900',marginTop:3},
 copy:{fontSize:11,color:C.muted,lineHeight:16,marginTop:7},
 note:{fontSize:10,color:C.warning,marginTop:10,lineHeight:14},
 project:{marginTop:12,padding:11,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2,gap:8},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 flex:{flex:1},projectName:{fontSize:13,color:C.text,fontWeight:'800'},projectMeta:{fontSize:10,color:C.info,marginTop:3},
 percent:{fontSize:17,color:C.accent,fontWeight:'900'},
 resource:{gap:5},resourceName:{fontSize:10,color:C.text,fontWeight:'700'},
 resourceAmount:{fontSize:9,color:C.muted},track:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel},
 fill:{height:'100%',backgroundColor:C.accent},unlock:{color:C.good,fontSize:10,fontWeight:'700'},
 });}
