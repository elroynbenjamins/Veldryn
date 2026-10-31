import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../content/guild-construction-blueprints';
import {itemDef} from '../content/items';
import {loadOnlineGuildTokenShop,type GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {Panel} from './Panel';
import {GameButton} from './GameButton';

const BUILDINGS=[
 {prefix:'construction_hall_',label:'Hall'},
 {prefix:'construction_forge_',label:'Forge'},
 {prefix:'construction_library_',label:'Library'},
 {prefix:'construction_treasury_',label:'Treasury'},
 {prefix:'construction_war_room_',label:'War Room'},
 {prefix:'construction_expedition_',label:'Lodge'},
] as const;

/** Guild-wide material-funded upgrades. This panel is strictly read-only:
 * server decides enabled tiers, requirements, progress and accepted donations.
 */
export function GuildConstructionRoadmapPanel({onOpenBank}:{onOpenBank?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [opened,setOpened]=useState(false),[selected,setSelected]=useState<string>(BUILDINGS[0].prefix);
 const [snapshot,setSnapshot]=useState<GuildTokenShopSnapshot|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!opened)return;let active=true;
  setLoading(true);setError('');
  void loadOnlineGuildTokenShop().then(result=>{if(active)setSnapshot(result)}).catch(reason=>{
   if(active)setError(reason instanceof Error?reason.message:'Could not load Guild Construction.');
  }).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[opened]);
 const plans=GUILD_CONSTRUCTION_BLUEPRINTS.filter(row=>row.id.startsWith(selected));
 return <Panel>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:opened}} onPress={()=>setOpened(value=>!value)} style={s.head}>
   <View style={s.flex}><Text style={s.title}>Guild Construction</Text><Text style={s.copy}>Build lasting guild benefits together · 10× material costs</Text></View>
   <Text style={s.link}>{opened?'Hide':'View'}</Text>
  </Pressable>
  {opened?<View style={s.stack}>
   <View style={s.choices}>{BUILDINGS.map(choice=><Pressable key={choice.prefix} accessibilityRole="button" accessibilityState={{selected:selected===choice.prefix}} onPress={()=>setSelected(choice.prefix)} style={[s.choice,selected===choice.prefix&&s.choiceSelected]}><Text style={[s.choiceText,selected===choice.prefix&&s.choiceActive]}>{choice.label}</Text></Pressable>)}</View>
   {loading?<Text style={s.copy}>Loading Guild progress…</Text>:null}
   {!!error?<Text accessibilityRole="alert" style={s.warn}>{error}</Text>:null}
   {plans.map(plan=>{
    const template=snapshot?.constructionTemplates.find(row=>row.id===plan.id);
    const progress=snapshot?.construction.find(row=>row.templateId===plan.id);
    const finished=!!progress?.completed;
    const available=!!template?.enabled&&!!snapshot&&snapshot.guildLevel>=plan.requiredGuildLevel;
    const missingLevel=snapshot&&snapshot.guildLevel<plan.requiredGuildLevel;
    const status=finished?'Completed':!template?.enabled?'Not released':missingLevel?`Guild Lv ${plan.requiredGuildLevel} required`:'Ready for donations';
    const required=plan.materials.map(material=>{
     const saved=progress?.resources[material.itemId]??0;
     return {name:itemDef(material.itemId).name,amount:material.amount,done:Math.min(saved,material.amount)};
    });
    return <View key={plan.id} style={s.plan}>
     <View style={s.head}><View style={s.flex}><Text style={s.planTitle}>{plan.name}</Text><Text style={s.level}>Guild Level {plan.requiredGuildLevel}</Text></View><Text style={[s.status,{color:finished?C.good:available?C.info:C.muted}]}>{status}</Text></View>
     <Text style={s.reward}>{plan.benefit}</Text>
     <Text style={s.copy}>{plan.description}</Text>
     {required.map(material=><View key={material.name} style={s.materialRow}><Text style={s.materialName}>{material.name}</Text><Text style={s.materialAmount}>{material.done.toLocaleString()} / {material.amount.toLocaleString()}</Text></View>)}
     {available&&!finished&&onOpenBank?<GameButton compact title="Donate in Guild Bank" tone="secondary" onPress={onOpenBank}/>:null}
    </View>;
   })}
   {!snapshot&&!loading&&!error?<Text style={s.copy}>Join a guild to view construction availability.</Text>:null}
  </View>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,minHeight:44},
 flex:{flex:1,minWidth:0},title:{fontSize:16,fontWeight:'800',color:C.text},
 link:{fontSize:12,fontWeight:'800',color:C.accent},
 copy:{fontSize:12,lineHeight:18,color:C.muted},
 warn:{fontSize:12,lineHeight:18,color:C.warning},
 stack:{gap:10,marginTop:10},choices:{flexDirection:'row',flexWrap:'wrap',gap:6},
 choice:{borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderRadius:8,paddingHorizontal:11,minHeight:40,justifyContent:'center'},
 choiceSelected:{borderColor:C.accent,backgroundColor:C.selection},
 choiceText:{fontSize:12,fontWeight:'700',color:C.muted},choiceActive:{color:C.text},
 plan:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,padding:10,gap:6},
 planTitle:{fontSize:14,fontWeight:'800',color:C.text},level:{fontSize:11,fontWeight:'700',color:C.muted},
 status:{fontSize:11,fontWeight:'800',maxWidth:108,textAlign:'right'},
 reward:{fontSize:13,fontWeight:'800',color:C.good},
 materialRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:26},
 materialName:{flex:1,fontSize:12,color:C.text},
 materialAmount:{fontSize:12,color:C.info,fontWeight:'600'},
 });}
