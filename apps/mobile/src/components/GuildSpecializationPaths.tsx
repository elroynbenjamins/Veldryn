import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {GUILD_MAJOR_BRANCHES,GUILD_SKILL_NODES} from '../content/guild-skill-paths';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import {ResourceIcon} from './ResourceIcon';
import {GameButton} from './GameButton';

/** Undefined allocations mean unavailable server data, never an invented zero rank. */
export function GuildSpecializationPaths({guildLevel,skillPoints,metrics,canUpgrade=false,onSpend}:{guildLevel:number;skillPoints?:number;metrics?:Record<string,number>;canUpgrade?:boolean;onSpend?:(id:string)=>void}){
 const C=useGameTheme();
 const [branch,setBranch]=useState<typeof GUILD_MAJOR_BRANCHES[number]>('Professions');
 const [selected,setSelected]=useState('professions_gathering'),[confirm,setConfirm]=useState(false);
 const nodes=GUILD_SKILL_NODES.filter(n=>n.major===branch),node=nodes.find(n=>n.id===selected)??nodes[0];
 const rank=(id:string)=>Math.min(3,Math.max(0,Math.floor(metrics?.[`guild_skill_${id}`]??0)));
 const level=rank(node.id),cost=node.costs[level]??{},known=metrics!==undefined;
 const affordable=known&&Object.entries(cost).every(([id,n])=>(metrics[`guild_bank_${id}`]??0)>=n);
 const ready=known&&canUpgrade&&!!onSpend&&(skillPoints??0)>0&&level<3&&affordable;
 const bonus=(n:number)=>`+${n*node.perTier}${node.id==='fellowship_membership'?' members':'%'}`;
 const copy={color:C.muted,fontSize:13,lineHeight:19} as const;
 const card={padding:14,gap:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panelRaised} as const;
 const reviewable=known&&canUpgrade&&!!onSpend&&level<3;
 return <View style={{gap:12,padding:18,borderWidth:1,borderColor:C.line,borderRadius:18,backgroundColor:C.panel}}>
  <View style={{gap:6}}><Text style={{color:C.accent,fontSize:11,fontWeight:'600',letterSpacing:1.4}}>GUILD SKILLS</Text><Text accessibilityRole="header" style={{color:C.text,fontSize:25,fontWeight:'600'}}>Shape your guild</Text><View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:8}}><Text style={copy}>Guild Level {guildLevel}</Text><Text style={{color:C.good,fontSize:12}}>{skillPoints===undefined?'Skill guide':`${skillPoints} skill point${skillPoints===1?'':'s'}`}</Text></View></View>
  <View accessibilityRole="tablist" style={{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:4}}>{GUILD_MAJOR_BRANCHES.map(name=><Pressable key={name} accessibilityRole="tab" accessibilityState={{selected:branch===name}} onPress={()=>{setBranch(name);setConfirm(false)}} style={{flexGrow:1,minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:6,borderWidth:1,borderColor:branch===name?C.accentSoft:C.line,borderRadius:9,backgroundColor:branch===name?C.selection:C.panel}}><Text style={{color:branch===name?C.text:C.muted,fontSize:12,fontWeight:'500'}}>{name}</Text></Pressable>)}</View>
  <View style={{gap:0}}>{nodes.map((n,index)=><View key={n.id} style={{flexDirection:'row',gap:10,paddingVertical:9,alignItems:'center'}}>
   {index<nodes.length-1?<View pointerEvents="none" style={{position:'absolute',left:15,top:39,bottom:-15,width:1,backgroundColor:C.line}}/>:null}
   <View accessible={false} style={{width:32,height:32,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panelRaised,alignItems:'center',justifyContent:'center'}}><Text style={{color:n.id===node.id?C.accent:C.muted,fontSize:13}}>{index+1}</Text></View>
   <Pressable accessibilityRole="button" accessibilityState={{selected:n.id===node.id}} onPress={()=>{setSelected(n.id);setConfirm(false)}} style={{flex:1,minHeight:44,paddingVertical:9,paddingHorizontal:11,flexDirection:'row',gap:8,alignItems:'center',borderWidth:1,borderRadius:9,borderColor:n.id===node.id?C.accentSoft:C.line,backgroundColor:n.id===node.id?C.selection:C.panel}}><Text style={{flex:1,color:C.text,fontSize:14,fontWeight:'400'}}>{n.name}</Text><Text style={{color:C.muted,fontSize:12}}>{known?`${rank(n.id)} / 3`:'3 ranks'}</Text></Pressable>
  </View>)}</View>
  <View style={card}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><Text accessibilityRole="header" style={{color:C.text,fontSize:16,fontWeight:'600'}}>{node.name}</Text>{known?<Text style={{color:C.good,fontSize:12}}>{level===3?'Max rank':`Rank ${level} → ${level+1}`}</Text>:null}</View><Text style={copy}>{node.label}{branch==='Vanguard'?' · Guild encounters only':''}</Text>
   {known?<View style={{flexDirection:'row',alignItems:'center',gap:16,paddingVertical:4}}><View style={{flex:1}}><Text style={copy}>Current</Text><Text style={{color:C.text,fontSize:23,fontWeight:'600'}}>{bonus(level)}</Text></View>{level<3?<><Text style={copy}>→</Text><View style={{flex:1}}><Text style={copy}>Next rank</Text><Text style={{color:C.good,fontSize:23,fontWeight:'600'}}>{bonus(level+1)}</Text></View></>:null}</View>:<Text style={copy}>Rank bonuses: {bonus(1)} → {bonus(2)} → {bonus(3)}. Live allocations are not available in this guide.</Text>}
   {known&&level<3?<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><Text style={{color:C.muted,fontSize:12,lineHeight:20}}>✦ 1 skill point</Text>{Object.entries(cost).map(([id,n])=>{const missing=Math.max(0,n-(metrics[`guild_bank_${id}`]??0));return <View key={id} style={{flexDirection:'row',alignItems:'center',gap:4,maxWidth:'100%'}}><ResourceIcon resourceId={id} size={18}/><Text style={{flexShrink:1,color:missing?C.warning:C.muted,fontSize:12,lineHeight:20}}>{n.toLocaleString()} {itemDef(id).name}{missing?` · missing ${missing.toLocaleString()}`:''}</Text></View>})}</View>:null}
   {known?<>{!canUpgrade?<Text style={copy}>Officers and Leaders allocate upgrades.</Text>:level<3&&!skillPoints?<Text style={copy}>Earn Guild XP for more skill points.</Text>:null}
    {confirm&&reviewable?<View style={{gap:10,borderTopWidth:1,borderTopColor:C.line,paddingTop:12}}><Text style={{color:C.text,fontSize:14,fontWeight:'600'}}>Review Rank {level+1}</Text><Text style={copy}>Spends 1 skill point and these shared bank materials.</Text>{Object.entries(cost).map(([id,n])=>{const owned=metrics[`guild_bank_${id}`]??0;return <View key={id} style={{flexDirection:'row',alignItems:'center',gap:6}}><ResourceIcon resourceId={id} size={18}/><View style={{flex:1}}><Text style={copy}>{itemDef(id).name}</Text><Text style={{color:owned>=n?C.muted:C.warning,fontSize:12}}>Bank {owned.toLocaleString()} · Cost {n.toLocaleString()} · {owned>=n?`Remaining ${(owned-n).toLocaleString()}`:`Missing ${(n-owned).toLocaleString()}`}</Text></View></View>})}<GameButton compact title="Confirm upgrade" disabled={!ready} onPress={()=>{if(ready){onSpend?.(node.id);setConfirm(false)}}}/><GameButton compact title="Cancel" tone="secondary" onPress={()=>setConfirm(false)}/></View>:level<3&&canUpgrade?<GameButton compact title="Review upgrade" tone="secondary" disabled={!reviewable} onPress={()=>setConfirm(true)}/>:null}
   </>:null}
  </View>
  <View style={{borderTopWidth:1,borderTopColor:C.line,paddingTop:12}}><Text style={{...copy,fontSize:12}}>Permanent bonuses · Officers allocate points · Bank funds materials</Text></View>
 </View>;
}
