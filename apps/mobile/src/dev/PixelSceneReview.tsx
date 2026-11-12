import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GATHERING} from '../content/skills';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {createCharacter,newGame,startCombat} from '../core/game';
import {isGatheringSceneKind} from '../core/gathering-scene';
import type {ActiveActivity,ClassId} from '../core/types';
import {GameThemeProvider,useGameTheme} from '../theme/ThemeContext';
import {COMBAT_FX} from '../theme/pixel-scene-assets';
import {CombatAttackSprite} from '../components/CombatAttackSprite';
import {CombatImpactBurst,type CombatImpactKind} from '../components/CombatImpactBurst';
import {GatheringScene} from '../components/GatheringScene';
import {HuntingPreview} from '../components/HuntingPreview';
import {PixelFx,type PixelFxName} from '../components/anim/SpriteFrames';

/**
 * Opt-in art review for the generated pixel scenes and combat effects.
 * Memory-only fixtures: no saves, rewards or network. The short action time exists only so
 * a reviewer sees the completion cues (ore pop, log pop, fishing catch) without waiting.
 */
const REVIEW_CYCLE_SECONDS=7;
const SKILLS=['mining','woodcutting','fishing'] as const;
const CLASSES:readonly ClassId[]=['IRONWARDEN','BASTION','WAYFINDER','HEXWEAVER','KNIFE_DANCER','STONECALLER','DAWNKEEPER','RAVAGER','DREADGUARD'];
const IMPACTS:readonly CombatImpactKind[]=['damage','critical','heal','shield','interrupt','down'];

export default function PixelSceneReview(){
 return <GameThemeProvider themeId="obsidian"><Review/></GameThemeProvider>;
}
function Review(){
 const C=useGameTheme();
 const [skill,setSkill]=useState<typeof SKILLS[number]>('mining'),[reduceMotion,setReduceMotion]=useState(false),[working,setWorking]=useState(true);
 const [replay,setReplay]=useState(1),[classId,setClassId]=useState<ClassId>('WAYFINDER');
 const startedAt=useMemo(()=>Date.now(),[skill]);
 const nodes=GATHERING.filter(node=>node.skillId===skill&&isGatheringSceneKind(node.skillId));
 const hunt=useMemo(()=>{
  const now=Date.now(),state=startCombat(createCharacter(newGame(now),classId,'Reviewer'),'MOSS_RAT',now);
  return {...state,settings:{...state.settings,reduceMotion}};
 },[classId,reduceMotion]);
 const monster=MONSTERS.find(entry=>entry.id==='MOSS_RAT')!;
 const chip=(label:string,selected:boolean,onPress:()=>void)=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected}} onPress={onPress}
  style={[s.chip,{borderColor:selected?C.accent:C.line,backgroundColor:selected?C.selection:C.panel2}]}><Text style={{color:selected?C.text:C.muted,fontSize:12,fontWeight:'800'}}>{label}</Text></Pressable>;
 return <View style={{flex:1,minHeight:0,backgroundColor:C.bg}}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={[s.title,{color:C.text}]}>Gathering scenes</Text>
  <View style={s.row}>{SKILLS.map(id=>chip(id,skill===id,()=>setSkill(id)))}</View>
  <View style={s.row}>{chip(reduceMotion?'Reduced motion: on':'Reduced motion: off',reduceMotion,()=>setReduceMotion(value=>!value))}{chip(working?'Activity: running':'Activity: stopped / full',!working,()=>setWorking(value=>!value))}</View>
  {nodes.map(node=>{
   const activity:ActiveActivity={kind:node.skillId as ActiveActivity['kind'],targetId:node.id,startedAtMs:startedAt,lastClaimAtMs:startedAt};
   return <View key={node.id} style={s.card}>
    <Text style={[s.label,{color:C.muted}]}>{node.name} · {WORLD_ZONES.find(zone=>zone.id===node.zoneId)?.name??node.zoneId}</Text>
    <GatheringScene activity={activity} cycleSeconds={REVIEW_CYCLE_SECONDS} reduceMotion={reduceMotion} working={working}/>
   </View>;
  })}
  <Text style={[s.title,{color:C.text}]}>Live hunt</Text>
  <View style={s.row}>{CLASSES.map(id=>chip(id.toLowerCase().replace('_',' '),classId===id,()=>setClassId(id)))}</View>
  <HuntingPreview key={classId+String(reduceMotion)} state={hunt} monster={monster} regionId="GREENFIELDS"/>
  <Text style={[s.title,{color:C.text}]}>Combat effects</Text>
  <View style={s.row}>{chip('Replay effects',false,()=>setReplay(value=>value+1))}</View>
  <View style={s.row}>{(Object.keys(COMBAT_FX) as PixelFxName[]).map((name,index)=><View key={name} style={[s.cell,{borderColor:C.line}]}>
   <PixelFx name={name} color={[C.warning,C.bad,C.info,C.warning,C.good,C.info,C.special][index%7]} eventKey={replay} durationMs={520} enabled={!reduceMotion}/>
   <Text style={[s.label,{color:C.muted}]}>{name}</Text>
  </View>)}</View>
  <View style={s.row}>{IMPACTS.map(kind=><View key={kind} style={[s.cell,{borderColor:C.line}]}>
   <CombatImpactBurst eventId={String(replay)} kind={kind} reduceMotion={reduceMotion}/>
   <Text style={[s.label,{color:C.muted,marginTop:66}]}>{kind}</Text>
  </View>)}</View>
  <View style={s.row}>{(['lunge','smash','projectile','cast','dash'] as const).map(motion=><View key={motion} style={[s.cell,{borderColor:C.line,height:150,justifyContent:'flex-end'}]}>
   <CombatAttackSprite eventId={String(replay)} motion={motion} accent={motion==='cast'?'violet':motion==='projectile'?'cyan':'gold'} reduceMotion={reduceMotion}/>
   <Text style={[s.label,{color:C.muted}]}>{motion}</Text>
  </View>)}</View>
 </ScrollView></View>;
}
const s=StyleSheet.create({
 root:{padding:12,gap:10,paddingBottom:40},title:{fontSize:20,fontWeight:'900',marginTop:6},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:36,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderRadius:8},
 card:{gap:4},label:{fontSize:11,fontWeight:'700'},
 cell:{width:100,height:104,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8,gap:4},
});
