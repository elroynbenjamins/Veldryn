import {useMemo,useState} from 'react';
import {useGameplayText} from '../i18n/gameplay';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GUILD_MAJOR_BRANCHES,GUILD_SKILL_NODES,type GuildSkillNode} from '../content/guild-skill-paths';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {ResourceIcon} from './ResourceIcon';
import {GameButton} from './GameButton';
import {BoardTabs} from './BoardTabs';
import {guildSkillArtwork} from '../theme/guild-remaster-art';

type Props={
 guildLevel?:number;
 skillPoints?:number;
 metrics?:Record<string,number>;
 canUpgrade?:boolean;
 /** Server-authoritative rank costs; provided for live Guild Skills, never guessed from a static preview. */
 nodeCosts?:Record<string,Array<{rank:number;resourceId:string;amount:number}>>;
 isReleased?:(id:string)=>boolean;
 onSpend?:(id:string)=>void;
 onViewBank?:()=>void;
};

/** Permanent guild-wide skill trees. The server alone owns points, ranks,
 * release gates and bank balances; this component only presents a snapshot.
 * All skill upgrades require a second, explicit confirmation. */
export function GuildSpecializationPaths({guildLevel,skillPoints,metrics,nodeCosts,canUpgrade=false,isReleased,onSpend,onViewBank}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {gl,language}=useGameplayText();
 const de=(value:string)=>language==='de'?gl(value):value;
 const {width:windowWidth,fontScale}=useWindowDimensions();
 const narrow=windowWidth<350||fontScale>=1.25;
 const [branch,setBranch]=useState<typeof GUILD_MAJOR_BRANCHES[number]>('Professions');
 const [selected,setSelected]=useState('professions_gathering');
 const [review,setReview]=useState(false);
 const known=metrics!==undefined;
 const nodes=GUILD_SKILL_NODES.filter(n=>n.major===branch);
 const node=nodes.find(n=>n.id===selected)??nodes[0];
 const rank=(id:string)=>Math.min(3,Math.max(0,Math.floor(metrics?.[`guild_skill_${id}`]??0)));
 const level=rank(node.id);
 // The live server snapshot is the only source of payable amounts. The local
 // catalogue is used solely for offline/demo previews and release planning.
 const currentPublishedCosts=nodeCosts?.[node.id]?.filter(row=>row.rank===level+1)??[];
 const cost=nodeCosts
  ?Object.fromEntries(currentPublishedCosts.map(row=>[row.resourceId,row.amount]))
  :node.costs[level]??{};
 const costsKnown=nodeCosts===undefined||currentPublishedCosts.length>0;
 const released=isReleased?.(node.id)??true;
 const affordable=known&&costsKnown&&Object.entries(cost).length>0&&Object.entries(cost).every(([id,n])=>(metrics?.[`guild_bank_${id}`]??0)>=n);
 const ready=known&&released&&canUpgrade&&!!onSpend&&(skillPoints??0)>0&&level<3&&affordable;
 const reviewable=known&&costsKnown&&released&&canUpgrade&&!!onSpend&&(skillPoints??0)>0&&level<3;
 const bonus=(n:GuildSkillNode,r:number)=>`+${r*n.perTier}${n.id==='fellowship_membership'?(language==='de'?' Mitglieder':' members'):'%'}`;
 const active=known?GUILD_SKILL_NODES.filter(n=>rank(n.id)>0):[];
 const changeBranch=(value:typeof GUILD_MAJOR_BRANCHES[number])=>{
  setBranch(value);setSelected(GUILD_SKILL_NODES.find(n=>n.major===value)?.id??selected);setReview(false);
 };
 const close=()=>setReview(false);
 const confirm=()=>{
  if(!ready)return;
  setReview(false);
  onSpend?.(node.id);
 };
 const resources=Object.entries(cost);

 return <View style={s.root}>
  <View style={s.overview}>
   <View style={s.header}>
    <View style={s.flex}>
     <Text style={s.eyebrow}>{de('PERMANENT GUILD BONUSES')}</Text>
     <Text style={s.title} accessibilityRole="header">{de('Guild Skills')}</Text>
     <Text style={s.copy}>{guildLevel===undefined?de('Shared guild progression'):language==='de'?`Gildenstufe ${guildLevel}`:`Guild Level ${guildLevel}`}</Text>
    </View>
    <View style={s.points}><Text style={s.pointsValue}>{skillPoints===undefined?'—':skillPoints.toLocaleString()}</Text><Text style={s.pointsLabel}>{de('Skill points')}</Text></View>
   </View>
   <View style={s.summary}>
    <Text style={s.copy}>{de('Active skills')}</Text><Text style={s.summaryValue}>{known?`${active.length} / ${GUILD_SKILL_NODES.length}`:'—'}</Text>
   </View>
   {active.length?<View style={s.active}>
    {active.map(n=><View key={n.id} style={s.activeChip}><Text style={s.activeText}>{de(n.label)} {bonus(n,rank(n.id))}</Text></View>)}
   </View>:null}
  </View>

  <BoardTabs compact label={de('Guild Skill branches')} items={GUILD_MAJOR_BRANCHES.map(id=>({id,label:de(id)}))} value={branch} onChange={changeBranch}/>
  <View style={[s.tiles,narrow&&s.tilesNarrow]}>
   {nodes.map(n=>{const current=rank(n.id),chosen=n.id===node.id,live=isReleased?.(n.id)??true;return <Pressable key={n.id}
     accessibilityRole="button" accessibilityLabel={language==='de'?`${de(n.name)}, Rang ${current} von 3${live?'':', nicht freigeschaltet'}. Fertigkeit ansehen.`:`${n.name}, rank ${current} of 3${live?'':', not released'}. View skill.`}
     accessibilityState={{selected:chosen}} onPress={()=>{setSelected(n.id);setReview(false)}}
     style={({pressed})=>[s.tile,narrow&&s.tileNarrow,{borderColor:chosen?C.selectionLine:C.line,backgroundColor:chosen?C.selection:C.panelRaised},pressed&&s.pressed]}>
    <Image source={guildSkillArtwork(n.id)} resizeMode="contain" style={s.tileIcon} accessible={false}/>
    <Text numberOfLines={2} style={s.tileName}>{de(n.name)}</Text>
    <Text style={s.tileBonus}>{known?bonus(n,current):de('3 ranks')}</Text>
    <View style={s.rankDots}>{[1,2,3].map(k=><View key={k} style={[s.rankDot,{backgroundColor:current>=k?C.accent:C.lineStrong}]}/>)}</View>
    {!live?<Text style={s.unreleased}>{de('NOT RELEASED')}</Text>:null}
   </Pressable>})}
  </View>

  <View style={s.detail}>
   <View style={s.header}>
    <Image source={guildSkillArtwork(node.id)} resizeMode="contain" style={s.detailIcon} accessible={false}/>
    <View style={s.flex}><Text style={s.eyebrow}>{de(node.scope)}</Text><Text style={s.detailTitle}>{de(node.name)}</Text><Text style={s.copy}>{language==='de'?`Rang ${known?level:'—'} / 3`:`Rank ${known?level:'—'} / 3`}</Text></View>
   </View>
   <Text style={s.copy}>{de(node.summary)}{node.major==='Vanguard'?' '+de('Bonuses apply only in Guild encounters.'):''}</Text>
   <View style={s.compare}>
    <View style={s.compareCell}><Text style={s.compareLabel}>{de('CURRENT BONUS')}</Text><Text style={s.compareValue}>{known?bonus(node,level):'—'}</Text></View>
    <Text style={s.compareArrow}>→</Text>
    <View style={s.compareCell}><Text style={s.compareLabel}>{de(level>=3?'MAX RANK':'NEXT RANK')}</Text><Text style={[s.compareValue,{color:C.good}]}>{known?(level>=3?de('MAX'):bonus(node,level+1)):'—'}</Text></View>
   </View>
   {known&&level<3?<View style={s.costSection}>
    <View style={s.sectionHeader}><Text style={s.eyebrow}>{de('UPGRADE COST')}</Text><Text style={s.costPoint}>{de('1 Skill Point')}</Text></View>
    <View style={s.materials}>{resources.map(([id,needed])=>{
      const owned=Math.max(0,metrics?.[`guild_bank_${id}`]??0),missing=Math.max(0,needed-owned);
      return <View key={id} style={s.material}>
       <ResourceIcon resourceId={id} size={27}/>
       <View style={s.flex}><Text numberOfLines={1} style={s.materialName}>{id==='gold'?'Gold':de(itemDef(id).name)}</Text><Text style={s.materialOwned}>{de('Bank')}: {owned.toLocaleString()}</Text></View>
       <View style={s.materialRight}><Text style={[s.materialAmount,{color:missing?C.warning:C.good}]}>{needed.toLocaleString()}</Text><Text style={[s.materialStatus,{color:missing?C.warning:C.good}]}>{missing?de('Missing')+' '+missing.toLocaleString():de('Ready')}</Text></View>
      </View>;
    })}</View>
    {!costsKnown?<Text style={[s.warning,{color:C.warning}]}>{de("The Guild Bank upgrade costs are unavailable. Refresh Guild Skills before upgrading.")}</Text>:!released?<Text style={[s.warning,{color:C.warning}]}>{de("This bonus has not been released yet. You can review it but cannot upgrade it.")}</Text>:!canUpgrade?<Text style={s.copy}>{de("Only Guild Officers and Leaders may allocate skill points.")}</Text>:!(skillPoints??0)?<Text style={s.copy}>{de("Earn Guild XP to receive more skill points.")}</Text>:!affordable?<Text style={s.copy}>{de("Deposit the missing materials or Gold into the Guild Bank before upgrading.")}</Text>:null}
    <GameButton title={de('Upgrade · Review cost')} disabled={!reviewable} onPress={()=>setReview(true)}/>
   </View>:known?<Text style={[s.warning,{color:C.good}]}>{de('Maximum rank reached.')}</Text>:<Text style={s.copy}>{de('Live skill ranks and bank materials are unavailable in this preview.')}</Text>}
   {onViewBank?<GameButton compact title={de('Open Guild Bank')} tone="secondary" onPress={onViewBank}/>:null}
  </View>

  <Modal visible={review} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
   <View style={s.modalShade}>
    <Pressable style={s.modalBackdrop} accessibilityLabel={de('Dismiss upgrade confirmation')} accessibilityRole="button" onPress={close}/>
    <View style={s.modalCard} accessibilityViewIsModal>
     <ScrollView style={s.modalScroll} contentContainerStyle={s.modalBody} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <Text style={s.eyebrow}>{de('CONFIRM GUILD UPGRADE')}</Text>
      <View style={s.header}><Image source={guildSkillArtwork(node.id)} style={s.detailIcon} resizeMode="contain" accessible={false}/>
       <View style={s.flex}><Text style={s.modalTitle}>{de(node.name)}</Text><Text style={s.copy}>{language==='de'?`Rang ${level} → Rang ${level+1} von 3`:`Rank ${level} → Rank ${level+1} of 3`}</Text></View>
      </View>
      <View style={s.compare}>
       <View style={s.compareCell}><Text style={s.compareLabel}>{de('BEFORE')}</Text><Text style={s.compareValue}>{bonus(node,level)}</Text></View>
       <Text style={s.compareArrow}>→</Text>
       <View style={s.compareCell}><Text style={s.compareLabel}>{de('AFTER')}</Text><Text style={[s.compareValue,{color:C.good}]}>{bonus(node,level+1)}</Text></View>
      </View>
      <Text style={s.eyebrow}>{de('BANK MATERIALS & GOLD · 1 SKILL POINT')}</Text>
      {resources.map(([id,needed])=>{const owned=Math.max(0,metrics?.[`guild_bank_${id}`]??0),remaining=owned-needed;return <View key={id} style={s.modalMaterial}>
       <ResourceIcon resourceId={id} size={26}/><View style={s.flex}><Text style={s.materialName}>{id==='gold'?'Gold':de(itemDef(id).name)}</Text><Text style={s.materialOwned}>{de('Bank')} {owned.toLocaleString()} · {de('Cost')} {needed.toLocaleString()}</Text></View>
       <Text style={[s.materialAmount,{color:remaining>=0?C.good:C.warning}]}>{language==='de'?(remaining>=0?`${remaining.toLocaleString()} übrig`:`${Math.abs(remaining).toLocaleString()} fehlen`):(remaining>=0?`${remaining.toLocaleString()} left`:`${Math.abs(remaining).toLocaleString()} short`)}</Text>
      </View>})}
      <Text style={s.copy}>{de('This permanently spends 1 Guild Skill point, materials and Guild Bank Gold shown above. The server will recheck permissions and balances.')}</Text>
     </ScrollView>
     <View style={s.modalActions}>
      <GameButton title={de('Confirm upgrade')} disabled={!ready} onPress={confirm}/>
      <GameButton title={de('Cancel')} tone="secondary" onPress={close}/>
     </View>
    </View>
   </View>
  </Modal>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12,minWidth:0},flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',gap:10},
 eyebrow:{fontSize:10,lineHeight:14,fontWeight:'800',letterSpacing:.8,color:C.accent},
 title:{fontSize:19,lineHeight:25,fontWeight:'800',color:C.text},copy:{fontSize:12,lineHeight:18,color:C.muted},
 overview:{gap:10,padding:12,borderWidth:1,borderColor:C.good,borderRadius:10,backgroundColor:C.panelRaised},
 points:{alignItems:'center',justifyContent:'center',minWidth:86,minHeight:58,paddingHorizontal:10,paddingVertical:7,borderRadius:8,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1},
 pointsValue:{fontSize:20,lineHeight:24,fontWeight:'800',color:C.accent},pointsLabel:{fontSize:10,color:C.muted},
 summary:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},summaryValue:{fontSize:13,fontWeight:'800',color:C.text},
 active:{flexDirection:'row',gap:6,flexWrap:'wrap'},activeChip:{paddingHorizontal:8,paddingVertical:5,borderRadius:6,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},activeText:{fontSize:11,color:C.good,fontWeight:'700'},
 tiles:{flexDirection:'row',gap:7},tilesNarrow:{flexWrap:'wrap'},tileNarrow:{flex:0,width:'48%',minHeight:128},tile:{flex:1,minWidth:0,minHeight:126,alignItems:'center',justifyContent:'center',gap:4,paddingHorizontal:4,paddingVertical:9,borderRadius:9,borderWidth:1},
 tileIcon:{width:38,height:38},unreleased:{fontSize:8,lineHeight:11,fontWeight:'800',color:C.warning,letterSpacing:.2},tileName:{fontSize:11,lineHeight:14,minHeight:28,textAlign:'center',color:C.text,fontWeight:'800'},
 tileBonus:{fontSize:10,color:C.good,fontWeight:'700'},rankDots:{flexDirection:'row',gap:4,marginTop:2},rankDot:{width:10,height:5,borderRadius:2},
 detail:{gap:11,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panelRaised},
 detailIcon:{width:45,height:45},detailTitle:{fontSize:16,lineHeight:22,fontWeight:'800',color:C.text},
 compare:{flexDirection:'row',alignItems:'center',gap:10,padding:10,borderRadius:8,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 compareCell:{flex:1,minWidth:0},compareLabel:{fontSize:10,lineHeight:15,fontWeight:'700',color:C.muted},compareValue:{fontSize:23,lineHeight:30,fontWeight:'800',color:C.text},compareArrow:{fontSize:17,fontWeight:'800',color:C.muted},
 costSection:{gap:9},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},costPoint:{fontSize:11,fontWeight:'700',color:C.accent},
 materials:{gap:6},material:{flexDirection:'row',alignItems:'center',gap:9,minHeight:54,paddingHorizontal:10,paddingVertical:7,borderRadius:7,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 materialName:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.text},materialOwned:{fontSize:10,lineHeight:15,color:C.muted},
 materialRight:{alignItems:'flex-end',minWidth:60},materialAmount:{fontSize:13,lineHeight:17,fontWeight:'800'},materialStatus:{fontSize:10,lineHeight:14},
 warning:{fontSize:12,lineHeight:18,fontWeight:'700'},footer:{fontSize:11,lineHeight:16,color:C.muted,textAlign:'center',paddingHorizontal:8},
 pressed:{opacity:.75},modalShade:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:18,paddingVertical:28,backgroundColor:'rgba(7,14,19,.78)'},
 modalBackdrop:{position:'absolute',top:0,right:0,bottom:0,left:0},
 modalCard:{width:'100%',maxWidth:440,maxHeight:'88%',overflow:'hidden',borderWidth:1,borderColor:C.lineStrong,borderRadius:13,backgroundColor:C.panel},
 modalScroll:{flexShrink:1},modalBody:{padding:16,gap:12},modalTitle:{fontSize:18,lineHeight:24,color:C.text,fontWeight:'800'},
 modalMaterial:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 modalActions:{padding:14,gap:8,borderTopWidth:1,borderTopColor:C.line},
});}
