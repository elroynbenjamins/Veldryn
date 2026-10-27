import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GUILD_MAJOR_BRANCHES,GUILD_SKILL_NODES} from '../content/guild-skill-paths';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {ResourceIcon} from './ResourceIcon';
import {GameButton} from './GameButton';
import {BoardTabs} from './BoardTabs';
import {QuestBoard} from './QuestBoard';
import {StatBar} from './StatBar';
import {ActivityArtwork} from './ActivityArtwork';

/** Undefined allocations mean unavailable server data, never an invented zero rank. */
export function GuildSpecializationPaths({guildLevel,skillPoints,metrics,canUpgrade=false,onSpend,onViewBank}:{guildLevel?:number;skillPoints?:number;metrics?:Record<string,number>;canUpgrade?:boolean;onSpend?:(id:string)=>void;onViewBank?:()=>void}){
 const C=useGameTheme(),s=styles(C);
 const [branch,setBranch]=useState<typeof GUILD_MAJOR_BRANCHES[number]>('Professions');
 const [selected,setSelected]=useState('professions_gathering'),[confirm,setConfirm]=useState(false);
 const nodes=GUILD_SKILL_NODES.filter(n=>n.major===branch),node=nodes.find(n=>n.id===selected)??nodes[0];
 const rank=(id:string)=>Math.min(3,Math.max(0,Math.floor(metrics?.[`guild_skill_${id}`]??0)));
 const level=rank(node.id),cost=node.costs[level]??{},known=metrics!==undefined;
 const affordable=known&&Object.entries(cost).every(([id,n])=>(metrics[`guild_bank_${id}`]??0)>=n);
 const ready=known&&canUpgrade&&!!onSpend&&(skillPoints??0)>0&&level<3&&affordable;
 const reviewable=known&&canUpgrade&&!!onSpend&&level<3;
 const bonus=(n:number)=>`+${n*node.perTier}${node.id==='fellowship_membership'?' members':'%'}`;
 const active=known?GUILD_SKILL_NODES.filter(n=>rank(n.id)>0):[];
 return <QuestBoard>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>GUILD SKILLS</Text><Text accessibilityRole="header" style={s.title}>{confirm?'Review upgrade':'Shape your guild'}</Text><Text style={s.copy}>{guildLevel===undefined?'Skill guide':`Guild Level ${guildLevel}`}{skillPoints===undefined?'':` · ${skillPoints} skill point${skillPoints===1?'':'s'}`}</Text></View></View>
  {!confirm&&active.length?<View style={s.panel}><Text style={s.eyebrow}>ACTIVE BONUSES</Text>{active.map(n=><Text key={n.id} style={s.copy}>{n.label} +{rank(n.id)*n.perTier}{n.id==='fellowship_membership'?' members':'%'}{n.major==='Vanguard'?' · Guild encounters only':''}</Text>)}</View>:null}
  {!confirm?<BoardTabs label="Guild skill branches" items={GUILD_MAJOR_BRANCHES.map(id=>({id,label:id}))} value={branch} onChange={value=>{setBranch(value);setConfirm(false)}}/>:null}
  {!confirm?<View style={s.stack}>{nodes.map(n=><Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`View ${n.name}`} aria-pressed={n.id===node.id} accessibilityState={{selected:n.id===node.id}} onPress={()=>{setSelected(n.id);setConfirm(false)}} style={({pressed})=>[s.node,{borderColor:n.id===node.id?C.selectionLine:C.line,backgroundColor:n.id===node.id?C.selection:C.panelRaised},pressed&&s.pressed]}><ActivityArtwork id={n.major==='Vanguard'?'combat':n.major==='Fellowship'?'exploration':n.id==='professions_crafting'?'smithing':n.id==='professions_mastery'?'training':'herbalism'} size={34}/><View style={s.flex}><Text style={s.nodeTitle}>{n.name}</Text><Text style={s.copy}>{known?`Rank ${rank(n.id)} / 3`:'3 ranks · Skill guide'}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}</View>:null}
  <View style={s.panel}>
   <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>{confirm?'NEXT RANK':node.scope}</Text><Text accessibilityRole="header" style={s.title}>{confirm?`${node.name} · Rank ${level+1}`:node.name}</Text></View></View>
   <Text style={s.copy}>{node.label}{branch==='Vanguard'?' · Guild encounters only':''}</Text>
   {known?<View style={s.compare}><View style={s.flex}><Text style={s.copy}>Current</Text><Text style={s.value}>{bonus(level)}</Text></View>{level<3?<><Text style={s.copy}>→</Text><View style={s.flex}><Text style={s.copy}>Next rank</Text><Text style={[s.value,{color:C.good}]}>{bonus(level+1)}</Text></View></>:<Text style={s.good}>Max rank</Text>}</View>:<><Text style={s.copy}>{node.summary}</Text><Text style={s.copy}>Rank bonuses: {bonus(1)} → {bonus(2)} → {bonus(3)}.</Text><Text style={s.copy}>Live allocations and bank balances are not available in this skill guide.</Text></>}
   {known&&level<3?<>
    <Text style={s.eyebrow}>{confirm?'UPGRADE COST · 1 SKILL POINT':'GUILD BANK READINESS · 1 SKILL POINT'}</Text>
    {Object.entries(cost).map(([id,n])=>{const owned=Math.max(0,metrics[`guild_bank_${id}`]??0),missing=Math.max(0,n-owned);return <View key={id} style={s.material}><View style={s.head}><ResourceIcon resourceId={id} size={24}/><Text style={[s.nodeTitle,s.flex]}>{itemDef(id).name}</Text></View>{confirm?<View style={s.bankNumbers}>{[['Bank',owned],['Cost',n],[missing?'Missing':'After',missing||owned-n]].map(([label,value])=><View key={String(label)} style={s.flex}><Text style={s.copy}>{label}</Text><Text style={[s.number,label==='Missing'&&{color:C.warning}]}>{Number(value).toLocaleString()}</Text></View>)}</View>:<><StatBar rounded label={itemDef(id).name} current={Math.min(owned,n)} max={n}/><Text style={[s.copy,{color:missing?C.warning:C.good}]}>{missing?`${missing.toLocaleString()} missing`:'Materials ready'} · Bank {owned.toLocaleString()}</Text></>}</View>})}
    {!canUpgrade?<Text style={s.copy}>Officers and Leaders allocate upgrades.</Text>:!skillPoints?<Text style={s.copy}>Earn Guild XP for more skill points.</Text>:null}
    {confirm?<><Text style={s.copy}>Spends 1 skill point and these shared bank materials.</Text><GameButton title="Confirm upgrade" disabled={!ready} onPress={()=>{if(ready){onSpend?.(node.id);setConfirm(false)}}}/><Pressable accessibilityRole="button" accessibilityLabel="Cancel upgrade" onPress={()=>setConfirm(false)} style={({pressed})=>[s.cancel,pressed&&s.pressed]}><Text style={s.cancelText}>Cancel</Text></Pressable></>:<><GameButton title="Review upgrade" tone="secondary" disabled={!reviewable} onPress={()=>setConfirm(true)}/>{onViewBank?<GameButton title="View bank" tone="secondary" onPress={onViewBank}/>:null}</>}
   </>:null}
  </View>
  <Text style={s.copy}>Permanent bonuses · Officers allocate points · Bank funds materials</Text>
 </QuestBoard>;
}
function styles(C:ThemeColors){return StyleSheet.create({head:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0,gap:3},stack:{gap:8},eyebrow:{fontSize:11,lineHeight:15,fontWeight:'700',letterSpacing:1,color:C.info},title:{fontSize:19,lineHeight:25,fontWeight:'700',color:C.text},copy:{fontSize:13,lineHeight:19,color:C.muted},node:{minHeight:66,flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:10,borderWidth:1},nodeTitle:{fontSize:14,lineHeight:20,color:C.text,fontWeight:'600'},arrow:{fontSize:23,color:C.muted},cancel:{minHeight:44,alignItems:'center',justifyContent:'center',padding:8},cancelText:{fontSize:13,lineHeight:19,color:C.muted,fontWeight:'600'},panel:{gap:12,padding:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panelRaised},compare:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:6},value:{fontSize:25,lineHeight:32,fontWeight:'600',color:C.text},good:{fontSize:13,color:C.good},material:{gap:8,paddingTop:10,borderTopWidth:1,borderTopColor:C.line},bankNumbers:{flexDirection:'row',gap:8},number:{fontSize:16,lineHeight:22,color:C.text,fontWeight:'600'},pressed:{opacity:.76}});}
