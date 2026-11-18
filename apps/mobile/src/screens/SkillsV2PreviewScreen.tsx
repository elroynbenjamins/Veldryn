/**
 * Skills 2.0 isolated design preview.
 *
 * IMPORTANT: intentionally NOT imported into live navigation. All actions
 * edit a local draft only; no commands, persistence, economy or combat writes.
 * Connect authenticated, versioned server build APIs and translations before
 * exposing any of these controls to players.
 */
import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {ClassId} from '../core/types';
import {classSkillsFor} from '../content/class-skills';
import {skillsV2PreviewFor} from '../content/skills-v2-preview';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

type Tab='overview'|'skills'|'talents'|'builds';
type Draft={
 specialization:number;
 equipped:(number|null)[];
 variants:Record<number,number>;
 talentRanks:Record<string,number>;
};
type Saved={name:string;draft:Draft}|null;
const TABS:readonly {id:Tab;label:string}[]=[
 {id:'overview',label:'Overview'},{id:'skills',label:'Skills'},
 {id:'talents',label:'Talents'},{id:'builds',label:'Builds'},
];
const UNLOCK_SKILL=[1,1,10,20,30,40];
const UNLOCK_NODE=[10,20,30];
const TALENT_LEVELS=[10,15,20,25,30,35,40,45,50];
const tpoints=(level:number)=>TALENT_LEVELS.filter(x=>level>=x).length;
const newDraft=(level:number):Draft=>({
 specialization:0,equipped:level>=10?[0,1,2]:[0,1],
 variants:{},talentRanks:{},
});
const clone=(draft:Draft):Draft=>({
 specialization:draft.specialization,equipped:[...draft.equipped],
 variants:{...draft.variants},talentRanks:{...draft.talentRanks},
});
const resourceHelp:Record<ClassId,{gain:string;spend:string}>={
 IRONWARDEN:{gain:'Taunts, interrupts and blocked shield damage',spend:'Runic Judgment and defensive finishers'},
 BASTION:{gain:'Granting barriers and absorbing attacks',spend:'Citadel Slam and reinforced protection'},
 DREADGUARD:{gain:'Taunts and taking direct damage',spend:'Harbinger Strike and self-sustain'},
 WAYFINDER:{gain:'Successful direct attacks',spend:'Perfect Quarry and Heartseeker'},
 RAVAGER:{gain:'Attacks and taking damage',spend:'Overpower and heavy finishers'},
 HEXWEAVER:{gain:'Successful curse and damage-over-time ticks',spend:'Hex Detonation and void bursts'},
 KNIFE_DANCER:{gain:'Direct hits and evading attacks',spend:'Final Dance and combo finishers'},
 DAWNKEEPER:{gain:'Effective healing and shield grants',spend:'Solar Hymn and emergency support'},
 STONECALLER:{gain:'Effective healing and shield grants',spend:'Resonance Burst and party protection'},
};
const activeCount=(level:number)=>level>=10?3:2;
const nodeId=(branch:number,index:number)=>String(branch)+':'+String(index);

type ChipProps={
 title:string;active?:boolean;disabled?:boolean;hint?:string;
 onPress:()=>void;C:ThemeColors;
};
function Chip({title,active,disabled=false,hint,onPress,C}:ChipProps){
 return <Pressable accessibilityRole="button"
   accessibilityLabel={title+(hint?', '+hint:'')}
   accessibilityState={{selected:active,disabled}}
   disabled={disabled}
   onPress={onPress}
   style={({pressed})=>[{
     minHeight:44,justifyContent:'center',alignItems:'center',borderRadius:radii.sm,
     paddingHorizontal:12,paddingVertical:8,borderWidth:1,
     borderColor:active?C.selectionLine:C.lineStrong,
     backgroundColor:active?C.selection:C.panel2,opacity:disabled?.48:pressed?.74:1,
   }]}>
   <Text style={[typography.bodyStrong,{color:active?C.accent:C.text,textAlign:'center'}]}>{title}</Text>
 </Pressable>;
}

export function SkillsV2PreviewScreen({
 classId,level,characterLabel,onClose,
}:{classId:ClassId;level:number;characterLabel?:string;onClose?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const compact=width<375||fontScale>=1.3;
 const data=skillsV2PreviewFor(classId),discipline=classSkillsFor(classId);
 const [tab,setTab]=useState<Tab>('overview');
 const [draft,setDraft]=useState<Draft>(()=>newDraft(level));
 const [selectedSlot,setSelectedSlot]=useState(0);
 const [expanded,setExpanded]=useState<number|null>(0);
 const [saved,setSaved]=useState<[Saved,Saved]>([null,null]);
 const [slot,setSlot]=useState<0|1>(0);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  // Never carry another character's draft, talent ranks or selected build.
  setDraft(newDraft(level));setSaved([null,null]);setSelectedSlot(0);
  setTab('overview');setNotice('');setExpanded(0);
 },[classId,characterLabel]);
 const points=tpoints(level);
 const used=Object.values(draft.talentRanks).reduce((sum,v)=>sum+v,0);
 const available=points-used;
 const specialization=data.specializations[draft.specialization];
 const capacity=activeCount(level);
 const assign=(index:number)=>{
  if(level<UNLOCK_SKILL[index])return;
  setDraft(current=>{
   const next=clone(current),slot=Math.min(selectedSlot,capacity-1);
   const existing=next.equipped.indexOf(index);
   if(existing!==-1)next.equipped[existing]=next.equipped[slot]??null;
   next.equipped[slot]=index;return next;
  });
  setNotice('Updated local preview. Your live character is unchanged.');
 };
 const chooseVariant=(skillIndex:number,variantIndex:number)=>{
  if(level<20&&variantIndex>0)return;
  setDraft(current=>({...current,variants:{...current.variants,[skillIndex]:variantIndex}}));
  setNotice('Variant changed in preview only.');
 };
 const canSubtract=(branch:number,index:number)=>{
  const key=nodeId(branch,index),rank=draft.talentRanks[key]??0;
  if(rank<=0)return false;
  if(index===2)return true;
  const downstream=draft.talentRanks[nodeId(branch,index+1)]??0;
  return downstream===0||(index===0?rank-1>=1:rank-1>=2);
 };
 const changeTalent=(branch:number,index:number,delta:-1|1)=>{
  const key=nodeId(branch,index),value=draft.talentRanks[key]??0;
  if(level<UNLOCK_NODE[index]||value+delta<0||value+delta>3)return;
  if(delta===1){
   if(available<1)return;
   if(index>0&&(draft.talentRanks[nodeId(branch,index-1)]??0)<(index===2?2:1))return;
  }else if(!canSubtract(branch,index))return;
  setDraft(current=>{
   const next=clone(current),n=(next.talentRanks[key]??0)+delta;
   if(n)next.talentRanks[key]=n;else delete next.talentRanks[key];
   return next;
  });
 };
 const savePreview=()=>{
  const name=slot===0?'Farming':'Dungeon';
  setSaved(current=>{
   const next:[Saved,Saved]=[current[0],current[1]];
   next[slot]={name,draft:clone(draft)};return next;
  });
  setNotice('Saved to this preview only — no character data was changed.');
 };
 const applyPreview=()=>{
  const chosen=saved[slot];
  if(!chosen)return;
  setDraft(clone(chosen.draft));
  setNotice('Applied to this preview only — live equipment and skills are unchanged.');
 };
 const tabButton=(id:Tab,label:string)=><Chip key={id} title={label} active={tab===id} onPress={()=>{setTab(id);setNotice('');}} C={C}/>;
 const skillRow=(index:number,showDetail:boolean)=>{
  const skill=data.skills[index],unlocked=level>=UNLOCK_SKILL[index];
  const equipped=draft.equipped.includes(index);
  const variantIndex=draft.variants[index]??0;
  return <Panel key={index} style={s.skillCard}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===index,disabled:!unlocked}}
    accessibilityLabel={skill.name+', '+(equipped?'equipped':'unequipped')+', cooldown '+skill.cooldownSeconds+' seconds'}
    onPress={()=>setExpanded(expanded===index?null:index)}
    style={s.skillHeading}>
    <View style={s.iconSquare}><Text style={s.iconText}>{String(index+1).padStart(2,'0')}</Text></View>
    <View style={s.flex}>
     <Text style={s.skillName}>{skill.name}</Text>
     <Text style={s.subtitle}>{skill.cooldownSeconds}s cooldown · {unlocked?'Available':'Unlocks Lv '+UNLOCK_SKILL[index]}</Text>
    </View>
    <Text style={[s.stateText,{color:equipped?C.good:C.muted}]}>{equipped?'EQUIPPED':unlocked?'VIEW':'LOCKED'}</Text>
   </Pressable>
   {showDetail||expanded===index?<View style={s.detail}>
    <Text style={s.fieldLabel}>VARIANT</Text>
    {skill.variants.map((variant,k)=><Chip key={variant} title={variant}
      hint={level<20&&k>0?'Unlocks at level 20':undefined}
      disabled={level<20&&k>0||!unlocked}
      active={variantIndex===k} onPress={()=>chooseVariant(index,k)} C={C}/>)}
    <Text style={s.helper}>Variant changes attack behavior and cooldowns. Exact effects are server-calculated.</Text>
    <GameButton title={equipped?'Choose a different skill':'Equip to selected slot'}
      disabled={!unlocked||equipped} onPress={()=>assign(index)} tone="secondary"/>
   </View>:null}
  </Panel>;
 };
 const navSkill=(index:number)=>{setExpanded(index);setTab('skills');};
 const renderOverview=()=><View style={s.section}>
  <Panel style={s.panel}>
   <Text style={s.sectionLabel}>SPECIALIZATION</Text>
   {level>=10?<View style={[s.specRow,compact&&s.specStack]}>
    {data.specializations.map((spec,i)=><View key={spec.name} style={s.specCell}>
     <Chip title={spec.name} hint={'Capstone: '+spec.capstone} active={draft.specialization===i}
       onPress={()=>{setDraft(current=>({...current,specialization:i}));setNotice('Specialization changed in preview only.');}} C={C}/>
     <Text style={s.mutedSmall}>Lv 50: {spec.capstone}</Text>
    </View>)}
   </View>:<Text style={s.helper}>Choose one of two specializations at level 10.</Text>}
  </Panel>
  <Panel style={s.panel}>
   <View style={s.between}><Text style={s.sectionLabel}>ACTIVE SKILLS</Text><Text style={s.mutedSmall}>{capacity} slots</Text></View>
   {Array.from({length:capacity},(_,i)=>{
    const index=draft.equipped[i],skill=index===null||index===undefined?null:data.skills[index];
    return <Pressable key={i} accessibilityRole="button" accessibilityState={{selected:selectedSlot===i}}
      accessibilityLabel={'Skill slot '+(i+1)+', '+(skill?.name??'Empty')+', select slot'}
      onPress={()=>{setSelectedSlot(i);if(index!==null&&index!==undefined)navSkill(index);else setTab('skills');}}
      style={[s.slotRow,selectedSlot===i&&s.selectedSlot]}>
      <Text style={s.slotNumber}>{i+1}</Text>
      <View style={s.flex}><Text style={s.skillName}>{skill?.name??'Empty slot'}</Text>
       <Text style={s.mutedSmall}>{skill?skill.variants[draft.variants[index!]??0]+' · '+skill.cooldownSeconds+'s':'Choose a skill'}</Text>
      </View><Text style={s.mutedSmall}>Edit</Text>
    </Pressable>;
   })}
  </Panel>
  <Panel style={s.panel}>
    <Text style={s.sectionLabel}>CLASS TRAINING (UNCHANGED)</Text>
    <Text style={s.skillName}>{discipline[0].name}  ·  {discipline[1].name}</Text>
    <Text style={s.helper}>Your existing combat-discipline XP is separate from specialization and talent points.</Text>
  </Panel>
 </View>;
 const renderSkills=()=><View style={s.section}>
  <Panel style={s.panel}>
   <Text style={s.sectionLabel}>EDIT ACTIVE SKILLS</Text>
   <Text style={s.helper}>Select a slot, then expand a skill to equip it. Skill choices here are local preview changes.</Text>
   <View style={s.row}>
    {Array.from({length:capacity},(_,i)=><View key={i} style={s.slotChip}>
     <Chip title={'Slot '+(i+1)} active={selectedSlot===i} onPress={()=>setSelectedSlot(i)} C={C}/>
    </View>)}
   </View>
  </Panel>
  {data.skills.map((_,i)=>skillRow(i,false))}
 </View>;
 const renderTalents=()=><View style={s.section}>
  <Panel style={s.panel}>
   <View style={s.between}><Text style={s.sectionLabel}>TALENT POINTS</Text>
    <Text style={s.pointCount}>{available} available / {points} earned</Text></View>
   <Text style={s.helper}>Unlock 1 point every 5 levels from level 10 to 50. Rank up to 3. Branch progression requires preceding nodes.</Text>
   <GameButton title="Reset preview talents" tone="secondary" disabled={used===0}
     onPress={()=>{setDraft(old=>({...old,talentRanks:{}}));setNotice('Preview talents reset. No Gold was spent.');}}/>
  </Panel>
  {data.branches.map((branch,branchIndex)=><Panel key={branchIndex} style={s.panel}>
   <Text style={s.branchName}>{branch.name}</Text>
   {branch.nodes.map((node,index)=>{
    const key=nodeId(branchIndex,index),rank=draft.talentRanks[key]??0;
    const requirement=index>0?(index===2?2:1):0;
    const prereq=index>0?(draft.talentRanks[nodeId(branchIndex,index-1)]??0)>=requirement:true;
    const unlocked=level>=UNLOCK_NODE[index]&&prereq;
    return <View key={key} style={s.talentRow}>
     <View style={s.flex}><Text style={s.skillName}>{node}</Text>
      <Text style={s.mutedSmall}>Rank {rank}/3 · Lv {UNLOCK_NODE[index]}{prereq?'':' · Earlier node required'}</Text></View>
     <Chip title="−" disabled={!canSubtract(branchIndex,index)} onPress={()=>changeTalent(branchIndex,index,-1)} C={C}/>
     <Chip title="+" disabled={!unlocked||rank>=3||available<=0} onPress={()=>changeTalent(branchIndex,index,1)} C={C}/>
    </View>;
   })}
  </Panel>)}
  <Panel style={s.panel}><Text style={s.helper}>Talent descriptions and exact bonuses will be sourced from the server when final 2.0 combat effects are complete.</Text></Panel>
 </View>;
 const renderBuilds=()=><View style={s.section}>
  <Panel style={s.panel}>
   <Text style={s.sectionLabel}>PRESET LOADOUTS</Text>
   <Text style={s.helper}>Two example presets, Farming and Dungeon. These store a preview draft in memory only and do not overwrite existing equipment or companion loadouts.</Text>
   <View style={s.row}>
    {[0,1].map(i=><View key={i} style={s.slotChip}><Chip title={i===0?'Farming':'Dungeon'} active={slot===i} C={C}
      onPress={()=>setSlot(i as 0|1)}/></View>)}
   </View>
   <Text style={s.skillName}>{saved[slot]?'Saved preview':'Empty preset'}</Text>
   <Text style={s.mutedSmall}>Specialization: {saved[slot]?data.specializations[saved[slot]!.draft.specialization].name:specialization.name}</Text>
   <View style={s.row}>
    <View style={s.slotChip}><GameButton title="Save preview" tone="secondary" onPress={savePreview}/></View>
    <View style={s.slotChip}><GameButton title="Apply preview" disabled={!saved[slot]} onPress={applyPreview}/></View>
   </View>
  </Panel>
  <Panel style={s.panel}><Text style={s.sectionLabel}>BEFORE THE REAL RELEASE</Text>
   <Text style={s.helper}>Build changes will be validated by the server, blocked during combat, and linked to character-specific presets. Your current gear/companion presets will not be erased or automatically converted.</Text>
  </Panel>
 </View>;
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.root}
  showsVerticalScrollIndicator={false}>
  <View style={s.topRow}>
   <View style={s.flex}><Text accessibilityRole="header" style={s.title}>Skills 2.0</Text>
    <Text style={s.subtitle}>{characterLabel??data.name} · {data.name} · Lv {level}</Text></View>
   {onClose?<GameButton title="Close" tone="secondary" compact onPress={onClose}/>:null}
  </View>
  <View style={s.previewNote}><Text style={s.previewText}>DEVELOPMENT PREVIEW · No live character changes</Text></View>
  <Panel style={s.resource}>
   <View style={s.between}><Text style={s.sectionLabel}>{data.resource.toUpperCase()}</Text>
    <Text style={s.mutedSmall}>0 / {data.cap} · Starts empty each battle</Text></View>
   <View style={s.pips}>{Array.from({length:data.cap},(_,i)=><View key={i} style={s.pip}/>)}</View>
   <Text style={s.helper}>Gain: {resourceHelp[classId].gain}</Text>
   <Text style={s.helper}>Spend: {resourceHelp[classId].spend}</Text>
  </Panel>
  <View accessibilityRole="tablist" style={[s.tabs,compact&&s.compactTabs]}>
   {TABS.map(x=><View key={x.id} style={s.tabCell}>{tabButton(x.id,x.label)}</View>)}
  </View>
  {tab==='overview'?renderOverview():tab==='skills'?renderSkills():tab==='talents'?renderTalents():renderBuilds()}
  {!!notice?<View accessibilityLiveRegion="polite" style={s.message}><Text style={s.messageText}>{notice}</Text></View>:null}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,paddingBottom:40,gap:spacing.md,maxWidth:720,width:'100%',alignSelf:'center'},
 flex:{flex:1,minWidth:0},topRow:{flexDirection:'row',alignItems:'center',gap:8},
 title:{...typography.hero,color:C.text},subtitle:{...typography.caption,color:C.muted},
 previewNote:{borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,padding:8,backgroundColor:C.warningSurface},
 previewText:{...typography.caption,color:C.warning,fontWeight:'700',textAlign:'center'},
 resource:{gap:8},pips:{flexDirection:'row',gap:5,flexWrap:'wrap'},
 pip:{width:20,height:12,borderRadius:3,borderColor:C.lineStrong,borderWidth:1,backgroundColor:C.panel2},
 tabs:{flexDirection:'row',gap:5,flexWrap:'wrap'},
 compactTabs:{gap:4},tabCell:{flex:1,minWidth:72},
 section:{gap:spacing.md},panel:{gap:spacing.sm},
 sectionLabel:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:.5},
 skillName:{...typography.bodyStrong,color:C.text},
 mutedSmall:{...typography.caption,color:C.muted},
 helper:{...typography.body,color:C.muted},
 between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 specRow:{flexDirection:'row',gap:8},specStack:{flexDirection:'column'},
 specCell:{flex:1,minWidth:100,gap:4},
 slotRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderRadius:8,
  borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 selectedSlot:{borderColor:C.selectionLine,backgroundColor:C.selection},
 slotNumber:{color:C.accent,...typography.bodyStrong,minWidth:24,textAlign:'center'},
 skillCard:{gap:8},
 skillHeading:{flexDirection:'row',alignItems:'center',minHeight:56,gap:10},
 iconSquare:{width:40,height:40,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,
   borderRadius:6,alignItems:'center',justifyContent:'center'},
 iconText:{...typography.bodyStrong,color:C.accent},
 stateText:{...typography.caption,fontWeight:'800'},
 detail:{gap:6,borderTopWidth:1,borderColor:C.line,paddingTop:8},
 fieldLabel:{...typography.caption,fontWeight:'700',color:C.accent},
 row:{flexDirection:'row',gap:8,flexWrap:'wrap',alignItems:'center'},
 slotChip:{flex:1,minWidth:100},
 pointCount:{...typography.bodyStrong,color:C.good},
 branchName:{...typography.title,color:C.text},
 talentRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:8,
  borderTopWidth:1,borderColor:C.line,paddingVertical:7},
 message:{padding:10,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},
 messageText:{...typography.caption,color:C.text},
});}
