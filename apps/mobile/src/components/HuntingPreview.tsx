import {Animated,Easing,Image,Platform,StyleSheet,Text,View} from 'react-native';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../core/types';
import type {MonsterDef} from '../content/monsters';
import {combatBaselineProjection} from '../core/balance-projection';
import {combatSustainProjection} from '../core/game';
import {useLiveHuntProjection} from './useLiveHuntProjection';
import {liveHuntNarration} from '../core/combat-narration';
import {classSkillsFor} from '../content/class-skills';
import {characterClassSkills} from '../core/class-skills';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {companionCombatContribution} from '../core/combat-companions';
import {dungeonCombatClassFx} from '../core/dungeon-combat-fx';
import {huntStrikePresentation} from '../core/hunt-strike-presentation';
import {itemDef} from '../content/items';
import {formatGameNumber} from '../core/number-format';
import {displayStat,displayStatPrecise} from '../core/stat-display';
import {useGameTheme} from '../theme/ThemeContext';
import {COMBAT_ARROW,COMBAT_FX,PIXEL_UNIT} from '../theme/pixel-scene-assets';
import {battleText} from '../i18n/battle';
import {progressionT} from '../i18n/progression';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {HuntAbilityCues} from './HuntAbilityCues';
import {RegionArtwork} from './RegionArtwork';
import {PixelFx,SpriteFrames} from './anim/SpriteFrames';
import {useLoopProgress,useMotionEnabled} from './anim/motion';

const BOLT_SHEET={frameWidth:COMBAT_FX.bolt.frameSize,frameHeight:COMBAT_FX.bolt.frameSize,frames:COMBAT_FX.bolt.frames,durationsMs:[1,1,1,1]};

/** An encounter preview with character-specific reward estimates when available. */
export function HuntingPreview({state,monster,regionId,sceneOnly=false}:{state:GameState;monster:MonsterDef;regionId:string;sceneOnly?:boolean}){
 const C=useGameTheme(),sustain=useMemo(()=>monster.boss?undefined:combatSustainProjection(state,monster.id),[state,monster.id,monster.boss]);
 const pace=sustain?{killsPerHour:sustain.killsPerHour,xpPerHour:sustain.xpPerHour,goldPerHour:sustain.goldPerHour}:combatBaselineProjection(monster);
 const active=state.activity?.kind==='combat'&&state.activity.targetId===monster.id;
 const {clock,fight}=useLiveHuntProjection(state,active);
 const lastHit=!fight?.searching&&fight?.lastHit&&clock-fight.lastHit.atMs<3500?fight.lastHit:undefined;
 const recentSkillEffects=active&&!fight?.searching?(fight?.lastSkillEffects??[]).filter(effect=>clock-effect.atMs>=0&&clock-effect.atMs<2700).slice(-2):[];
 const classSkillLevels=useMemo(()=>state.character?characterClassSkills(state.character):[],[state.character]);
 const classSkillDefs=state.character?classSkillsFor(state.character.classId):[];
 const equippedCompanion=useMemo(()=>{
  const contribution=companionCombatContribution(state);
  return contribution.contributionPct>0?COMBAT_COMPANIONS.find(def=>def.id===state.character?.equippedCombatCompanionId):undefined;
 },[state]);
 // Every effect below replays a strike the hit projection already resolved. Nothing here
 // rolls damage, predicts an outcome or delays the hunt.
 const animate=useMotionEnabled(state.settings.reduceMotion,active);
 const strike=useMemo(()=>huntStrikePresentation(dungeonCombatClassFx(state.character?.classId)),[state.character?.classId]);
 const lastAnimatedHitAtMs=useRef<number|undefined>(undefined);
 const playerImpact=useRef(new Animated.Value(0)).current,enemyImpact=useRef(new Animated.Value(0)).current;
 const missFloat=useRef(new Animated.Value(0)).current;
 const playerStrike=useRef(new Animated.Value(0)).current,enemyStrike=useRef(new Animated.Value(0)).current;
 const shake=useRef(new Animated.Value(0)).current,presence=useRef(new Animated.Value(1)).current;
 const [arenaWidth,setArenaWidth]=useState(0);
 useEffect(()=>{
  const hit=lastHit;
  if(!active||!animate||!hit){for(const value of [playerImpact,enemyImpact,playerStrike,enemyStrike,shake,missFloat]){value.stopAnimation();value.setValue(0);}return;}
  // The replay cursor retains the previous strike while searching for the next
  // monster. Do not replay that old strike as a phantom opening attack.
  if(lastAnimatedHitAtMs.current===hit.atMs)return;
  lastAnimatedHitAtMs.current=hit.atMs;
  const byPlayer=hit.actor==='player';
  // A missed attack animates its attacker but never flashes, recoils, or
  // plays impact FX on the monster.
  const impact=byPlayer?(hit.missed?missFloat:enemyImpact):playerImpact,attack=byPlayer?playerStrike:enemyStrike;
  // A shot or spell lands after its flight; a melee blow lands at the end of the lunge.
  const landsAfterMs=byPlayer?strike.travelMs:90;
  // An alternating strike may interrupt the previous fade. Clear BOTH sides
  // or the interrupted impact flash / recoil can remain frozen on screen.
  for(const value of [playerImpact,enemyImpact,playerStrike,enemyStrike,shake,missFloat]){value.stopAnimation();value.setValue(0);}
  const animation=Animated.parallel([
   Animated.timing(attack,{toValue:1,duration:byPlayer?strike.attackMs:300,easing:Easing.linear,useNativeDriver:true}),
   Animated.sequence([
    Animated.delay(landsAfterMs),
    Animated.timing(impact,{toValue:1,duration:1,useNativeDriver:true}),
    Animated.timing(impact,{toValue:0,duration:680,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   ]),
   ...(byPlayer&&hit.critical?[Animated.sequence([
    Animated.delay(landsAfterMs),
    Animated.timing(shake,{toValue:2,duration:40,useNativeDriver:true}),
    Animated.timing(shake,{toValue:-2,duration:50,useNativeDriver:true}),
    Animated.timing(shake,{toValue:1,duration:40,useNativeDriver:true}),
    Animated.timing(shake,{toValue:0,duration:50,useNativeDriver:true}),
   ])]:[]),
  ]);
  animation.start();
  return()=>animation.stop();
 },[active,animate,fight?.searching,lastHit?.atMs,lastHit?.actor,lastHit?.critical,lastHit?.missed,strike,playerImpact,enemyImpact,playerStrike,enemyStrike,shake,missFloat]);
 // The enemy steps in when an encounter is found and falls away when it is defeated.
 const searching=!!fight?.searching;
 useEffect(()=>{
  if(!animate){presence.stopAnimation();presence.setValue(searching?0:1);return;}
  const animation=Animated.timing(presence,{toValue:searching?0:1,duration:searching?240:280,easing:Easing.out(Easing.quad),useNativeDriver:true});
  animation.start();
  return()=>animation.stop();
 },[searching,animate,presence]);
 const kills=fight?.cursor.projected.activity?.sessionKills??0,seenKills=useRef<number|undefined>(undefined);
 const [defeatKey,setDefeatKey]=useState<number|undefined>(undefined);
 useEffect(()=>{
  // Only a kill that happens while this view is open plays the defeat burst.
  if(seenKills.current!==undefined&&kills>seenKills.current)setDefeatKey(kills);
  seenKills.current=active?kills:undefined;
  if(!active)setDefeatKey(undefined);
 },[kills,active]);
 const idle=useLoopProgress(1_800,animate&&searching);
 const number=(value:number)=>formatGameNumber(Math.round(value),state.settings.numberMode,state.settings.language);
 const hpText=(value:number)=>number(displayStat(value));
 // Show real fractional damage ticks precisely, on the same tenfold UI scale.
 const damageText=(value:number)=>displayStatPrecise(value);
 // Zero-damage defended strikes are not negative damage or an accuracy miss.
 const damageFloat=(value:number)=>value>0?`−${damageText(value)}`:'0';
 const font=Platform.OS==='web'?'system-ui':Platform.OS==='android'?'sans-serif':'System';
 const tr=(text:string,params?:Record<string,string|number>)=>battleText(state.settings.language,text,params);
 const narration=fight&&!fight.searching&&state.character?liveHuntNarration({classId:state.character.classId,monster,nowMs:clock,startedAtMs:state.activity?.startedAtMs??clock,lastHit:fight.lastHit,stoppedReason:fight.stoppedReason,playerHp:fight.playerHp,playerMaxHp:fight.playerMaxHp,enemyHp:fight.enemyHp,enemyMaxHp:fight.enemyMaxHp,damageText}):undefined;
 const playerHitKey=lastHit?.actor==='player'&&!lastHit.missed?lastHit.atMs:undefined,enemyHitKey=lastHit?.actor==='enemy'?lastHit.atMs:undefined;
 const critical=lastHit?.actor==='player'&&lastHit.critical;
 const accent=strike.accent==='gold'?C.warning:strike.accent==='cyan'?C.info:strike.accent==='danger'?C.bad:strike.accent==='violet'?C.special:C.good;
 const flight=Math.max(0,arenaWidth*.5-24);
 return <View style={{borderWidth:1,borderColor:C.line,borderRadius:16,overflow:'hidden',backgroundColor:C.panel}}>
  <View style={{height:196,justifyContent:'flex-end'}}>
   {regionId==='IRONWOOD'?<Image source={require('../../assets/combat-scenes/ironwood-clearing-v1.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>:<RegionArtwork regionId={regionId}/>}
   <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(3,7,10,.35)'}]}/>
   <View style={{position:'absolute',top:10,left:12,right:12,alignItems:'center',gap:2}}><Text style={{fontFamily:font,color:'#ADC8BC',fontSize:10,fontWeight:'700',letterSpacing:1}}>{state.activity?.kind==='combat'&&state.activity.targetId===monster.id?progressionT(state.settings.language,'HUNTING'):tr('Combat preview')}</Text><Text style={{fontFamily:font,color:'#F0F3F4',fontSize:21,fontWeight:'700'}}>{monster.name}</Text><Text style={{fontFamily:font,color:'#BAC3CA',fontSize:12}}>{tr(active?(fight?.searching?'Searching for an encounter...':'Live combat'):'Combat preview')}</Text></View>
   <Animated.View onLayout={event=>{const width=Math.round(event.nativeEvent.layout.width);setArenaWidth(current=>current===width?current:width);}} style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',padding:10,gap:8,transform:[{translateX:shake}]}}>
    <View style={{flex:1,alignItems:'center',gap:5}}><Animated.View style={{borderWidth:2,borderColor:'#A5B4AA',borderRadius:50,backgroundColor:'rgba(4,9,12,.8)',padding:3,position:'relative',transform:[
      {translateX:playerStrike.interpolate({inputRange:[0,.18,.45,1],outputRange:[0,-strike.windUpPx,strike.lungePx,0]})},
      {translateX:playerImpact.interpolate({inputRange:[0,1],outputRange:[0,-5]})},
      {translateY:idle.interpolate({inputRange:[0,.5,1],outputRange:[0,-2,0]})},
     ]}}><CharacterPortrait state={state} style={{width:72,height:72}}/><Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:50,backgroundColor:'#FF8995',opacity:playerImpact.interpolate({inputRange:[0,1],outputRange:[0,.35]})}]}/>
      {strike.castGlow?<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:50,borderWidth:2,borderColor:accent,opacity:playerStrike.interpolate({inputRange:[0,.15,.6,1],outputRange:[0,.9,.5,0]}),transform:[{scale:playerStrike.interpolate({inputRange:[0,1],outputRange:[.92,1.14]})}]}]}/>:null}
      <View pointerEvents="none" style={[fx.center,{transform:[{scaleX:-1}]}]}><PixelFx name="slash" color={C.bad} eventKey={enemyHitKey} delayMs={90} enabled={animate}/></View>
      <Animated.View pointerEvents="none" style={{position:'absolute',top:9,left:-6,right:-6,alignItems:'center',opacity:playerImpact,transform:[{translateY:playerImpact.interpolate({inputRange:[0,1],outputRange:[-18,0]})}]}}><Text style={{fontSize:16,fontWeight:'900',color:'#FF8995',textShadowColor:'#210809',textShadowRadius:4}}>{lastHit?.actor==='enemy'?damageFloat(lastHit.damage):null}</Text></Animated.View></Animated.View><Text style={{fontFamily:font,color:'#E8ECEF',fontSize:11,fontWeight:'700',marginTop:-12,paddingHorizontal:7,paddingVertical:2,borderRadius:5,borderWidth:1,borderColor:'#758D88',backgroundColor:'#111B20'}}>Lv {state.character?.level}</Text></View>
    <Text style={{color:'#C9CED2',fontWeight:'800',alignSelf:'center'}}>VS</Text>
    <Animated.View style={{flex:1,alignItems:'center',gap:5,position:'relative',transform:[
      {translateX:enemyStrike.interpolate({inputRange:[0,.18,.45,1],outputRange:[0,3,-9,0]})},
      {translateX:enemyImpact.interpolate({inputRange:[0,1],outputRange:[0,strike.targetRecoilPx]})},
     ]}}><Animated.View style={{opacity:presence.interpolate({inputRange:[0,1],outputRange:[.18,1]}),transform:[{translateY:presence.interpolate({inputRange:[0,1],outputRange:[6,0]})}]}}><MonsterPortraitFrame monster={monster} size={116} framed={false} reduceMotion={state.settings.reduceMotion}/></Animated.View>{fight?.searching?<Animated.Text style={{position:'absolute',top:28,fontSize:30,color:'#F0F3F4',fontWeight:'800',opacity:animate?idle.interpolate({inputRange:[0,.5,1],outputRange:[.5,1,.5]}):1}}>?</Animated.Text>:null}<Animated.View pointerEvents="none" style={{position:'absolute',top:10,left:6,right:6,height:112,backgroundColor:'#FFDA8F',borderRadius:56,opacity:enemyImpact.interpolate({inputRange:[0,1],outputRange:[0,.25]})}}/>
      <View pointerEvents="none" style={fx.center}><PixelFx name={critical?'crit':strike.impactFx} color={critical?C.warning:accent} eventKey={playerHitKey} delayMs={strike.travelMs} durationMs={critical?460:360} enabled={animate}/></View>
      <View pointerEvents="none" style={fx.center}><PixelFx name="smash" color={C.warning} eventKey={defeatKey} durationMs={420} enabled={animate}/></View>
      <Animated.View pointerEvents="none" style={{position:'absolute',top:12,left:-4,right:-4,alignItems:'center',opacity:lastHit?.missed?missFloat:enemyImpact,transform:[{translateY:(lastHit?.missed?missFloat:enemyImpact).interpolate({inputRange:[0,1],outputRange:[-20,0]})},{scale:enemyImpact.interpolate({inputRange:[0,.75,1],outputRange:[1,1,critical?1.3:1.1]})}]}}><Text style={{fontSize:critical?20:17,fontWeight:'900',color:lastHit?.missed?'#D1D8DE':critical?'#FFF1AD':'#FFDA8F',textShadowColor:'#241306',textShadowRadius:4}}>{lastHit?.actor==='player'?(lastHit.missed?tr('MISS'):`${damageFloat(lastHit.damage)}${lastHit.damage>0&&lastHit.critical?'!':''}`):null}</Text></Animated.View></Animated.View>
    {/* A ranged or spell strike visibly crosses the gap before it lands. */}
    {animate&&strike.projectile&&flight>0?<Animated.View pointerEvents="none" style={{position:'absolute',left:'25%',top:'46%',opacity:playerStrike.interpolate({inputRange:[0,.02,strike.travelMs/strike.attackMs,Math.min(1,strike.travelMs/strike.attackMs+.02)],outputRange:[0,1,1,0],extrapolate:'clamp'}),transform:[{translateX:playerStrike.interpolate({inputRange:[0,strike.travelMs/strike.attackMs],outputRange:[0,flight],extrapolate:'clamp'})}]}}>
     {strike.projectile==='arrow'
      ?<Image source={COMBAT_ARROW.source} fadeDuration={0} resizeMode="stretch" style={{width:COMBAT_ARROW.width*PIXEL_UNIT,height:COMBAT_ARROW.height*PIXEL_UNIT}}/>
      :<View style={{width:BOLT_SHEET.frameWidth*PIXEL_UNIT,height:BOLT_SHEET.frameHeight*PIXEL_UNIT}}>
        <SpriteFrames sheet={{...BOLT_SHEET,source:COMBAT_FX.bolt.tint}} progress={playerStrike} tintColor={accent} style={fx.layer}/>
        <SpriteFrames sheet={{...BOLT_SHEET,source:COMBAT_FX.bolt.core}} progress={playerStrike} style={fx.layer}/>
       </View>}
    </Animated.View>:null}
   </Animated.View>
  </View>
  {!sceneOnly&&fight?<View style={{paddingHorizontal:12,paddingVertical:10,gap:8,borderTopWidth:1,borderColor:C.line,backgroundColor:C.panel}}>
   <Text style={{fontFamily:font,color:C.text,fontSize:12,fontWeight:'800'}}>{tr(fight.stoppedReason?'Combat stopped':fight.searching?'Searching for an encounter...':'Live combat')}</Text>
   {(fight.searching
      ?[{label:state.character?.name??'You',hp:fight.playerHp,max:fight.playerMaxHp,color:C.good}]
      :[{label:state.character?.name??'You',hp:fight.playerHp,max:fight.playerMaxHp,color:C.good},{label:monster.name,hp:fight.enemyHp,max:fight.enemyMaxHp,color:C.bad}]
   ).map(row=><View key={row.label} style={{gap:3}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
     <Text numberOfLines={1} style={{fontFamily:font,color:C.text,fontSize:11,fontWeight:'700',flex:1}}>{row.label}</Text>
     <Text style={{fontFamily:font,color:C.muted,fontSize:11}}>{hpText(row.hp)} / {hpText(row.max)}</Text>
    </View>
    <View style={{height:8,borderRadius:8,backgroundColor:C.line,overflow:'hidden'}}>
     <View style={{width:`${Math.max(0,Math.min(100,row.hp/Math.max(1,row.max)*100))}%` as `${number}%`,height:'100%',backgroundColor:row.color,borderRadius:8}}/>
    </View>
   </View>)}
   <HuntAbilityCues effects={recentSkillEffects} language={state.settings.language} classId={state.character!.classId} formatAmount={damageText}/>
   {narration&&!fight.stoppedReason&&!fight.searching?<Text accessibilityLiveRegion={narration.hit?'polite':'none'} numberOfLines={2} style={{fontFamily:font,fontSize:12,lineHeight:17,fontWeight:narration.hit?'700':'600',color:narration.tone==='danger'?C.bad:narration.tone==='accent'?C.accent:C.muted}}>
    {tr(narration.key,narration.params)}{narration.critical&&fight.lastHit?.actor==='player'?` · ${tr('CRITICAL!')}`:''}
   </Text>:null}
   {state.character?<View style={{gap:4,borderTopWidth:1,borderTopColor:C.line,paddingTop:6}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
     <Text style={{fontFamily:font,fontSize:9,fontWeight:'800',color:C.muted}}>{tr('CLASS SKILLS · PASSIVE')}</Text>
     {classSkillLevels.map((skill,index)=><Text key={skill.skillId} numberOfLines={1} style={{fontFamily:font,fontSize:10,color:C.text,borderWidth:1,borderColor:C.lineStrong,borderRadius:5,paddingHorizontal:6,paddingVertical:2}}>{tr(classSkillDefs[index]?.name??skill.skillId)} · {tr('Lv. {level}',{level:skill.level})}</Text>)}
    </View>
    {equippedCompanion?<Text numberOfLines={1} style={{fontFamily:font,fontSize:10,color:C.muted}}>{tr('COMPANION · PASSIVE BONUS')} · {equippedCompanion.name}</Text>:null}
   </View>:null}
  </View>:null}
  {!sceneOnly&&!monster.boss?<View accessibilityLabel={progressionT(state.settings.language,sustain?'ESTIMATED REWARDS':'BASELINE REWARDS')} style={{margin:8,marginTop:0,padding:11,gap:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>{[[pace.killsPerHour,'kills/hr'],[pace.xpPerHour,'XP/hr'],[pace.goldPerHour,'Gold/hr']].map(([value,label],index)=><Text key={label} style={{fontFamily:font,color:C.text,fontWeight:'600',fontSize:13}}>{index?'·  ':''}~{number(value as number)} {label}</Text>)}</View>
   <Text style={{fontFamily:font,color:C.muted,fontSize:11,lineHeight:15,textAlign:'center'}}>{sustain?.foodId?`${itemDef(sustain.foodId).name} · ~${sustain.foodPerHour.toFixed(1)} food/hr`:progressionT(state.settings.language,'Equip cooked food for sustained hunts.')}</Text>
  </View>:null}
 </View>;
}
const fx=StyleSheet.create({
 center:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center'},
 layer:{position:'absolute',left:0,top:0},
});
