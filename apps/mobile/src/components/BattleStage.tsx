import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {MonsterDef} from '../content/monsters';
import {classSkillsFor} from '../content/class-skills';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {characterClassSkills} from '../core/class-skills';
import {companionCombatContribution} from '../core/combat-companions';
import {WORLD_ZONES} from '../content/world-map';
import {combatMotionProfile} from '../core/combat-motion';
import {combatPresentation} from '../core/combat-presentation';
import {activeCombatHitProjection,effectiveStats} from '../core/game';
import {displayStat,displayStatPrecise} from '../core/stat-display';
import {GameState} from '../core/types';
import {C,radii,typography} from '../theme/theme';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';
import {StatBar} from './StatBar';
import {battleText} from '../i18n/battle';
import {CombatEffectShape} from './CombatAttackSprite';
import {HuntAbilityCues} from './HuntAbilityCues';

export function BattleStage({state,monster,elapsedSeconds,cycleSeconds}:{state:GameState;monster:MonsterDef;elapsedSeconds:number;cycleSeconds:number}){
 const tr=(text:string,params?:Record<string,string|number>)=>battleText(state.settings.language,text,params);
 // combatPresentation runs stat/tactic math each tick — memoize so re-renders without
 // meaningful inputs skip the recompute.
 const view=useMemo(()=>combatPresentation(state,monster,elapsedSeconds,cycleSeconds),[state,monster,elapsedSeconds,cycleSeconds]);
 const stats=useMemo(()=>effectiveStats(state),[state]);
 // Solo hunts apply passive combat bonuses. Do not fabricate per-hit skill casts.
 const classSkills=useMemo(()=>characterClassSkills(state.character!),[state.character]);
 const skillDefinitions=classSkillsFor(state.character!.classId);
 const companionBonus=useMemo(()=>companionCombatContribution(state),[state]);
 const combatCompanion=companionBonus.contributionPct>0?COMBAT_COMPANIONS.find(def=>def.id===state.character?.equippedCombatCompanionId):undefined;
 const isLive=state.activity?.kind==='combat'&&state.activity.targetId===monster.id;
 const effectiveNowMs=(state.activity?.lastClaimAtMs??0)+elapsedSeconds*1000;
 const replayCursor=useRef<import('../core/game').ActiveCombatHitCursor|undefined>(undefined);
 const fight=useMemo(()=>isLive?activeCombatHitProjection(state,effectiveNowMs,replayCursor.current):undefined,[isLive,state,effectiveNowMs]);
 useEffect(()=>{replayCursor.current=fight?.cursor;},[fight?.cursor]);
 const recentHit=!fight?.searching&&fight?.lastHit&&effectiveNowMs-fight.lastHit.atMs<2600?fight.lastHit:undefined;
 const recentSkillEffects=isLive?(fight?.lastSkillEffects??[]).filter(effect=>effectiveNowMs-effect.atMs>=0&&effectiveNowMs-effect.atMs<2700).slice(-2):[];
 const damageValue=(value:number)=>displayStatPrecise(value);
 const region=WORLD_ZONES.find(zone=>zone.name===monster.zone),motion=combatMotionProfile(cycleSeconds,state.settings.reduceMotion);
 const playerLunge=useRef(new Animated.Value(0)).current,enemyLunge=useRef(new Animated.Value(0)).current;
 const enemyImpact=useRef(new Animated.Value(0)).current,playerImpact=useRef(new Animated.Value(0)).current;
 const shake=useRef(new Animated.Value(0)).current,breath=useRef(new Animated.Value(0)).current;

 useEffect(()=>{
  const values=[playerLunge,enemyLunge,enemyImpact,playerImpact,shake,breath];values.forEach(value=>value.setValue(0));
  if(!motion.enabled||isLive)return;
  const tail=(used:number)=>Math.max(0,motion.cycleMs-used);
  const lungeLoop=(value:Animated.Value,at:number)=>Animated.loop(Animated.sequence([
   Animated.delay(at),
   Animated.timing(value,{toValue:1,duration:motion.lungeMs,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(value,{toValue:0,duration:motion.recoverMs,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(tail(at+motion.lungeMs+motion.recoverMs)),
  ]));
  const impactLoop=(value:Animated.Value,at:number)=>Animated.loop(Animated.sequence([
   Animated.delay(at),
   Animated.timing(value,{toValue:1,duration:motion.impactMs,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
   Animated.timing(value,{toValue:0,duration:1,useNativeDriver:true}),
   Animated.delay(tail(at+motion.impactMs+1)),
  ]));
  const player=lungeLoop(playerLunge,motion.playerAttackAtMs),enemy=lungeLoop(enemyLunge,motion.enemyAttackAtMs);
  const hitEnemy=impactLoop(enemyImpact,motion.playerAttackAtMs+motion.lungeMs),hitPlayer=impactLoop(playerImpact,motion.enemyAttackAtMs+motion.lungeMs);
  const shakeStart=motion.enemyAttackAtMs+motion.lungeMs,shakeLoop=Animated.loop(Animated.sequence([
   Animated.delay(shakeStart),
   Animated.timing(shake,{toValue:motion.shakePx,duration:35,useNativeDriver:true}),
   Animated.timing(shake,{toValue:-motion.shakePx,duration:45,useNativeDriver:true}),
   Animated.timing(shake,{toValue:motion.shakePx*.5,duration:40,useNativeDriver:true}),
   Animated.timing(shake,{toValue:0,duration:55,useNativeDriver:true}),
   Animated.delay(tail(shakeStart+175)),
  ]));
  const breathing=Animated.loop(Animated.sequence([
   Animated.timing(breath,{toValue:1,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
   Animated.timing(breath,{toValue:0,duration:900,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
  ]));
  for(const animation of [player,enemy,hitEnemy,hitPlayer,shakeLoop,breathing])animation.start();
  return()=>{for(const animation of [player,enemy,hitEnemy,hitPlayer,shakeLoop,breathing])animation.stop();};
 },[breath,enemyImpact,enemyLunge,isLive,motion.cycleMs,motion.enabled,motion.enemyAttackAtMs,motion.impactMs,motion.lungeMs,motion.playerAttackAtMs,motion.recoverMs,motion.shakePx,playerImpact,playerLunge,shake]);

 // During a real hunt, only an authoritative hit event triggers a lunge/impact.
 // Static encounter previews retain their looping demonstration animation.
 useEffect(()=>{
  if(!isLive||!motion.enabled||!recentHit)return;
  const lunge=recentHit.actor==='player'?playerLunge:enemyLunge;
  const impact=recentHit.actor==='player'?enemyImpact:playerImpact;
  lunge.stopAnimation();impact.stopAnimation();lunge.setValue(0);impact.setValue(0);
  const attack=Animated.parallel([
   Animated.sequence([
    Animated.timing(lunge,{toValue:1,duration:motion.lungeMs,easing:Easing.out(Easing.quad),useNativeDriver:true}),
    Animated.timing(lunge,{toValue:0,duration:motion.recoverMs,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   ]),
   Animated.sequence([
    Animated.timing(impact,{toValue:1,duration:motion.impactMs,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    Animated.timing(impact,{toValue:0,duration:1,useNativeDriver:true}),
   ]),
  ]);
  attack.start();
  return()=>attack.stop();
 },[isLive,recentHit?.atMs,recentHit?.actor,motion.enabled,motion.impactMs,motion.lungeMs,motion.recoverMs,playerLunge,enemyLunge,playerImpact,enemyImpact]);

 const playerScale=breath.interpolate({inputRange:[0,1],outputRange:[1,1.012]}),enemyScale=breath.interpolate({inputRange:[0,1],outputRange:[1.008,1]});
 const enemyFloatOpacity=enemyImpact.interpolate({inputRange:[0,.08,.55,1],outputRange:[0,1,.6,0]}),playerFloatOpacity=playerImpact.interpolate({inputRange:[0,.08,.55,1],outputRange:[0,1,.6,0]});
 const floatY=(value:Animated.Value)=>value.interpolate({inputRange:[0,1],outputRange:[0,-22]});
 const flash=(value:Animated.Value)=>value.interpolate({inputRange:[0,.08,.22,1],outputRange:[0,.58,.12,0]});
 const slashOpacity=enemyImpact.interpolate({inputRange:[0,.05,.34,1],outputRange:[0,1,.7,0]}),slashScale=enemyImpact.interpolate({inputRange:[0,.14,1],outputRange:[.15,1,1.2]});
 const sparkOpacity=enemyImpact.interpolate({inputRange:[0,.08,.45,1],outputRange:[0,1,.75,0]}),sparkTravel=enemyImpact.interpolate({inputRange:[0,1],outputRange:[0,18]});
 const enemySlashOpacity=playerImpact.interpolate({inputRange:[0,.05,.30,1],outputRange:[0,.8,.45,0]});
 return <View style={s.stage}>
  <View style={s.header}><View><Text accessibilityRole="header" style={s.title}>{tr(isLive?(fight?.searching?'Searching for an encounter...':'Live combat'):'Combat preview')}</Text></View><Text style={[s.safety,{color:view.safety==='safe'?C.good:view.safety==='dangerous'?C.warning:C.info}]}>{tr(view.safety)}</Text></View>
  <Animated.View style={[s.arena,{transform:[{translateX:shake}]}]}><RegionArtwork regionId={region?.id??'GREENFIELDS'}/><View style={s.shade}/>
   <View style={s.combatants}>
    <Animated.View style={[s.side,{transform:[{translateX:playerLunge.interpolate({inputRange:[0,1],outputRange:[0,motion.playerLungePx]})},{scale:playerScale}]}]}>
     <View style={s.portrait}><CharacterPortrait state={state} style={{width:96,height:120}}/><Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(playerImpact)}]}/><Animated.View pointerEvents="none" style={[s.enemySlash,{opacity:enemySlashOpacity,transform:[{rotate:'24deg'},{scaleX:playerImpact.interpolate({inputRange:[0,.15,1],outputRange:[.2,1,1.1]})}]}]}/><Animated.View pointerEvents="none" style={[s.floatTextWrap,{opacity:playerFloatOpacity,transform:[{translateY:floatY(playerImpact)}]}]}><Text style={s.damageTaken}>−{recentHit?.actor==='enemy'?damageValue(recentHit.damage):isLive?'':displayStat(view.enemyHit)}</Text></Animated.View></View>
     <Text style={s.name}>{state.character!.name}</Text><Text style={s.hit}>{isLive?recentHit?.actor==='player'?tr('Hit · {amount}',{amount:damageValue(recentHit.damage)}):tr('Current health'):tr('≈ {amount} damage',{amount:displayStat(view.playerHit)})}</Text>
    </Animated.View>
    <View style={s.versus}><Text style={s.vs}>VS</Text><Text style={s.motionHint}>{motion.enabled?tr("LIVE FX"):tr("REDUCED")}</Text></View>
    <Animated.View style={[s.side,{transform:[{translateX:enemyLunge.interpolate({inputRange:[0,1],outputRange:[0,motion.enemyLungePx]})},{scale:enemyScale}]}]}>
     <View style={s.portrait}><MonsterPortraitFrame monster={monster} size={112} active reduceMotion={state.settings.reduceMotion} framed={false}/><Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(enemyImpact)}]}/><Animated.View pointerEvents="none" style={{position:'absolute',left:28,top:30,opacity:slashOpacity,transform:[{scale:slashScale},{rotate:'-25deg'}]}}><CombatEffectShape kind="slash" color="#f4ce91"/></Animated.View><Animated.View pointerEvents="none" style={[s.floatTextWrap,{opacity:enemyFloatOpacity,transform:[{translateY:floatY(enemyImpact)}]}]}><Text style={s.damageDealt}>−{recentHit?.actor==='player'?damageValue(recentHit.damage):isLive?'':displayStat(view.playerHit)}{recentHit?.actor==='player'&&recentHit.critical?'!':''}</Text></Animated.View></View>
     <Text style={s.name}>{monster.name}</Text><Text style={s.hit}>{isLive?recentHit?.actor==='enemy'?tr('Hit · {amount}',{amount:damageValue(recentHit.damage)}):tr('Enemy health'):tr('≈ {amount} damage',{amount:displayStat(view.enemyHit)})}</Text>
    </Animated.View>
   </View>
  </Animated.View>
  <View style={s.details}>
    <HuntAbilityCues effects={recentSkillEffects} language={state.settings.language} classId={state.character!.classId} formatAmount={damageValue}/>
    <View style={s.passiveSummary}>
     <Text numberOfLines={1} style={s.passiveLabel}>{tr('COMBAT STYLE · PASSIVE')} · {tr(view.style.name)}</Text>
     <Text numberOfLines={2} style={s.sub}>{tr(view.style.description)}</Text>
     <View style={s.passiveChips}>
      <Text style={s.passiveLabel}>{tr('CLASS SKILLS · PASSIVE')}</Text>
      {classSkills.map((skill,index)=><View key={skill.skillId} style={s.passiveChip}><Text style={s.passiveChipText}>{tr(skillDefinitions[index]?.name??skill.skillId)} · {tr('Lv. {level}',{level:skill.level})}</Text></View>)}
     </View>
     {combatCompanion?<Text numberOfLines={1} style={s.companionPassive}>{tr('COMPANION · PASSIVE BONUS')} · {combatCompanion.name}</Text>:null}
    </View>
   <View style={s.identity}><View style={s.identityHead}><Text style={s.identityLabel}>{tr('ENCOUNTER · {type}',{type:tr(view.encounter.archetype).toUpperCase()})}</Text><Text style={s.pressure}>{tr(view.encounter.pressure).toUpperCase()}</Text></View><Text style={s.sub}>{tr(view.encounter.summary)}</Text><View style={s.mechanics}>{view.encounter.mechanics.map(mechanic=><View key={mechanic} style={s.mechanic}><Text style={s.mechanicText}>{tr(mechanic)}</Text></View>)}</View><Text style={s.tactic}>{tr('Tactic: {tactic}',{tactic:tr(view.encounter.tactic)})}</Text></View>
   <StatBar label={tr("Current health")} current={displayStat(fight?.playerHp??state.character!.currentHp)} max={displayStat(fight?.playerMaxHp??stats.hp)} reduceMotion={state.settings.reduceMotion}/>
   <StatBar label={tr(isLive?"Enemy health":"Estimated enemy health")} current={displayStat(fight?.enemyHp??view.enemyHp)} max={displayStat(fight?.enemyMaxHp??view.enemyMaxHp)} reduceMotion={state.settings.reduceMotion}/>
   <Text style={s.note}>{isLive?fight?.stoppedReason?tr("Combat stopped"):fight?.searching?tr('Searching for an encounter...'):'':tr("HP, damage numbers and combat FX are synchronized presentation estimates. Rewards and settled health remain authoritative when you collect.")}</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({
 stage:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,overflow:'hidden'},
 header:{padding:12,flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:8},
 title:{...typography.title,color:C.text},challenge:{...typography.caption,fontWeight:'900',letterSpacing:.7},safety:{...typography.caption,textTransform:'capitalize',fontWeight:'600'},
 arena:{minHeight:218,overflow:'hidden',justifyContent:'center'},shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,12,20,.58)'},
 combatants:{flexDirection:'row',alignItems:'flex-start',padding:10,gap:4},side:{flex:1,minWidth:0,alignItems:'center',gap:4},
 portrait:{width:'100%',maxWidth:128,height:128,alignItems:'center',justifyContent:'flex-end',backgroundColor:'rgba(5,12,20,.6)',borderRadius:36,overflow:'hidden',position:'relative'},
 impactFlash:{...StyleSheet.absoluteFill,backgroundColor:'rgba(255,238,196,.78)'},slash:{position:'absolute',left:30,top:58,width:70,height:4,borderRadius:4},slashBright:{backgroundColor:'#fff1ad',shadowColor:'#ffd36e',shadowOpacity:.95,shadowRadius:5},slashSoft:{backgroundColor:'#ffd36e',height:3,shadowColor:'#fff1ad',shadowOpacity:.65,shadowRadius:3},enemySlash:{position:'absolute',left:26,top:60,width:72,height:4,borderRadius:4,backgroundColor:'#ff8790',shadowColor:'#ff8790',shadowOpacity:.7,shadowRadius:4},spark:{position:'absolute',left:62,top:61,width:5,height:5,borderRadius:2,backgroundColor:'#fff1ad',shadowColor:'#ffd36e',shadowOpacity:.9,shadowRadius:4},sparkSmall:{width:3,height:3},floatTextWrap:{position:'absolute',top:18,left:0,right:0,alignItems:'center'},
 damageDealt:{fontSize:18,lineHeight:22,color:'#ffd36e',fontWeight:'900',textShadowColor:'#120b03',textShadowRadius:3},
 damageTaken:{fontSize:17,lineHeight:21,color:'#ff8790',fontWeight:'900',textShadowColor:'#180508',textShadowRadius:3},
 name:{...typography.bodyStrong,color:C.text,textAlign:'center'},hit:{...typography.caption,color:'#d5e0ec',textAlign:'center'},
 versus:{width:34,paddingTop:53,alignItems:'center',gap:4},vs:{...typography.caption,color:C.accent,fontWeight:'600'},motionHint:{fontSize:7,lineHeight:9,color:C.muted,fontWeight:'900',letterSpacing:.4,textAlign:'center'},
 details:{padding:10,gap:8},sub:{...typography.body,color:C.muted},
 passiveSummary:{gap:5},passiveLabel:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'900',letterSpacing:.65},
 passiveChips:{flexDirection:'row',flexWrap:'wrap',gap:6},
 passiveChip:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
 passiveChipText:{fontSize:10,lineHeight:14,color:C.text,fontWeight:'700'},
 companionPassive:{...typography.caption,color:C.text},
identity:{gap:6,padding:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},identityHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},identityLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},pressure:{fontSize:9,lineHeight:12,color:C.warning,fontWeight:'900',letterSpacing:.5},mechanics:{flexDirection:'row',flexWrap:'wrap',gap:5},mechanic:{paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},mechanicText:{fontSize:9,color:C.text,fontWeight:'800'},tactic:{...typography.caption,color:C.info,lineHeight:16},note:{...typography.caption,color:C.muted}
});
