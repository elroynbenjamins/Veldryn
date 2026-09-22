import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {PlaybackCombatStatus} from '../../core/dungeon-combat-playback';
import {combatCompanionDef} from '../../content/combat-companions';
import {dungeonCombatAvatar} from '../../core/dungeon-combat-avatars';
import {radii,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';

export interface CombatantInspectCast{
 label:string;
 durationMs:number;
 interruptible:boolean;
 targetLabel?:string;
}

export interface CombatantInspectTarget{
 kind:'party'|'enemy';
 name:string;
 boss?:boolean;
 role?:'tank'|'damage'|'support';
 classId?:string;
 companionId?:string;
 currentHp?:number;
 maximumHp?:number;
 shield?:number;
 statuses:PlaybackCombatStatus[];
 phaseLabel?:string;
 cast?:CombatantInspectCast;
}

function roleLabel(role:CombatantInspectTarget['role']){
 return role==='tank'?'Tank':role==='support'?'Support':role==='damage'?'Damage':undefined;
}

function effectKind(status:PlaybackCombatStatus){
 if(status.source==='gem')return 'Effect Gem';
 if(status.kind==='dot')return 'Damage over time';
 if(status.kind==='hot')return 'Healing over time';
 if(status.kind==='debuff')return 'Debuff';
 return 'Buff';
}

function remaining(value:number){
 const seconds=Math.max(0,value)/1000;
 return seconds<10?`${seconds.toFixed(1)}s`:`${Math.ceil(seconds)}s`;
}

export function CombatantInspectPanel({target,onClose}:{target:CombatantInspectTarget;onClose:()=>void}){
 const C=useGameTheme(),s=makeStyles(C),avatar=target.classId?dungeonCombatAvatar(target.classId):undefined,companion=target.companionId?combatCompanionDef(target.companionId):undefined;
 const subtitle=target.kind==='enemy'?(target.boss?'Final Boss':'Dungeon Enemy'):[roleLabel(target.role),avatar?.label??target.classId].filter(Boolean).join(' · ');
 const hpKnown=target.currentHp!==undefined&&target.maximumHp!==undefined&&target.maximumHp>0;
 return <View style={s.panel} accessibilityLabel={`Combat details for ${target.name}`}>
  <View style={s.header}>
   <View style={s.headerCopy}><Text style={s.kicker}>COMBAT INSPECT</Text><Text numberOfLines={1} style={s.name}>{target.name}</Text>{subtitle?<Text numberOfLines={1} style={s.subtitle}>{subtitle}</Text>:null}</View>
   <Pressable accessibilityRole="button" accessibilityLabel="Close combat details" onPress={onClose} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
  </View>
  <View style={s.summaryRow}>
   {hpKnown?<View style={s.summaryItem}><Text style={s.summaryLabel}>HP</Text><Text style={s.summaryValue}>{Math.max(0,Math.round(target.currentHp!))}/{Math.max(1,Math.round(target.maximumHp!))}</Text></View>:null}
   {(target.shield??0)>0?<View style={s.summaryItem}><Text style={s.summaryLabel}>BARRIER</Text><Text style={[s.summaryValue,{color:C.info}]}>+{Math.round(target.shield!)}</Text></View>:null}
   {target.phaseLabel?<View style={s.summaryItemWide}><Text style={s.summaryLabel}>PHASE</Text><Text numberOfLines={1} style={s.summaryValue}>{target.phaseLabel}</Text></View>:null}
   {companion?<View style={s.summaryItemWide}><Text style={s.summaryLabel}>COMPANION</Text><Text numberOfLines={1} style={s.summaryValue}>{companion.name}</Text></View>:null}
  </View>
  {target.cast?<View style={[s.castBox,target.cast.interruptible&&s.castInterruptible]}><View style={s.castHead}><Text style={[s.castLabel,target.cast.interruptible&&{color:C.info}]}>{target.cast.interruptible?'INTERRUPTIBLE CAST':'ACTIVE CAST'}</Text><Text style={s.castTime}>{(Math.max(0,target.cast.durationMs)/1000).toFixed(1)}s</Text></View><Text style={s.castName}>{target.cast.label}</Text>{target.cast.targetLabel?<Text style={s.castTarget}>Focus → {target.cast.targetLabel}</Text>:null}</View>:null}
  <View style={s.effectsHead}><Text style={s.effectsTitle}>ACTIVE EFFECTS</Text><Text style={s.effectsCount}>{target.statuses.length}</Text></View>
  {target.statuses.length?<View style={s.effects}>{target.statuses.slice(0,8).map((status,index)=>{const harmful=status.kind==='dot'||status.kind==='debuff',gem=status.source==='gem';return <View key={`${status.kind}:${status.tag}:${status.abilityId??status.label}:${index}`} style={s.effectRow}>
    <View style={[s.effectDot,{backgroundColor:harmful?C.bad:gem?C.special:C.good}]}/>
    <View style={s.effectCopy}><Text numberOfLines={1} style={s.effectName}>{status.label}{status.stacks>1?` ×${status.stacks}`:''}</Text><Text numberOfLines={1} style={s.effectMeta}>{effectKind(status)} · {remaining(status.remainingMs)}</Text></View>
   </View>})}{target.statuses.length>8?<Text style={s.moreEffects}>+{target.statuses.length-8} more active effects</Text>:null}</View>:<Text style={s.empty}>No active timed effects at this replay moment.</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{padding:8,gap:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panelRaised},
 header:{flexDirection:'row',alignItems:'flex-start',gap:8},headerCopy:{flex:1,minWidth:0},kicker:{fontSize:7,lineHeight:9,color:C.info,fontWeight:'900',letterSpacing:.65},name:{fontSize:12,lineHeight:15,color:C.text,fontWeight:'900'},subtitle:{fontSize:8,lineHeight:10,color:C.muted,fontWeight:'800'},close:{width:28,height:28,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},pressed:{opacity:.6},closeText:{fontSize:17,lineHeight:19,color:C.text,fontWeight:'800'},
 summaryRow:{flexDirection:'row',flexWrap:'wrap',gap:5},summaryItem:{minWidth:62,paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},summaryItemWide:{minWidth:100,maxWidth:'58%',paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},summaryLabel:{fontSize:5.5,lineHeight:7,color:C.muted,fontWeight:'900',letterSpacing:.45},summaryValue:{fontSize:8,lineHeight:10,color:C.text,fontWeight:'900'},
 castBox:{gap:2,padding:6,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:C.warningSurface},castInterruptible:{borderColor:C.info,backgroundColor:C.infoSurface},castHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},castLabel:{fontSize:6,lineHeight:8,color:C.warning,fontWeight:'900',letterSpacing:.5},castTime:{fontSize:6,lineHeight:8,color:C.text,fontWeight:'900'},castName:{fontSize:9,lineHeight:11,color:C.text,fontWeight:'900'},castTarget:{fontSize:7,lineHeight:9,color:C.info,fontWeight:'900'},
 effectsHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},effectsTitle:{fontSize:6.5,lineHeight:8,color:C.muted,fontWeight:'900',letterSpacing:.55},effectsCount:{fontSize:6.5,lineHeight:8,color:C.text,fontWeight:'900'},effects:{gap:2},effectRow:{minHeight:27,flexDirection:'row',alignItems:'center',gap:6,paddingVertical:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},effectDot:{width:6,height:6,borderRadius:99},effectCopy:{flex:1,minWidth:0},effectName:{fontSize:8,lineHeight:10,color:C.text,fontWeight:'900'},effectMeta:{fontSize:6.5,lineHeight:8,color:C.muted,fontWeight:'800'},moreEffects:{fontSize:6.5,lineHeight:8,color:C.muted,fontWeight:'800',textAlign:'center',paddingTop:2},empty:{fontSize:7,lineHeight:10,color:C.muted,fontWeight:'700'},
 });}
