import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,Image,Modal,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';
import type {Language} from '../i18n/languages';
import {formatLocalizedNumber} from '../i18n/translator';
import {worldBossAbilityName,worldBossBattleText,type WorldBossBattleKey} from '../i18n/world-boss-battle';
import {worldBossPresentationFor} from '../core/world-boss-presentation';
import {WORLD_BOSS_REPLAY_POLICY,worldBossReplayCues,type WorldBossReplayBeat,type WorldBossReplayInput,
 type WorldBossReplayPartyMember,type WorldBossHonor} from '../core/world-boss-replay-presentation';
import {playHaptic} from '../storage/haptics';
import {playSound,useMusicOverride} from '../storage/audio';
import {worldBossMusicFor} from '../core/encounter-music';
import {useGameTheme} from '../theme/ThemeContext';
import {SCENE_BACKGROUNDS,type PixelBiome} from '../theme/pixel-scene-assets';
import {classEmblemIconArtwork} from '../theme/class-emblem-assets';
import {radii,spacing,touchTargetMin,typography,type ThemeColors} from '../theme/theme';
import {CombatImpactBurst,type CombatImpactKind} from './CombatImpactBurst';
import {GameButton} from './GameButton';

export interface WorldBossBattlePartyMember extends WorldBossReplayPartyMember{maxHp:number;}
export interface WorldBossBattleInput extends Omit<WorldBossReplayInput,'party'|'reduceMotion'>{
 party:readonly WorldBossBattlePartyMember[];
}

const BIOME:Record<string,PixelBiome>={hollowroot:'asterfall',sunscar:'sunscar',frostmarch:'frostmarch'};
const HONOR_LABEL:Record<WorldBossHonor,WorldBossBattleKey>={vanguard:'Vanguard',bulwark:'Bulwark',lifebinder:'Lifebinder',spellbreaker:'Spellbreaker',purifier:'Purifier'};
const PHASE_LABEL:Record<WorldBossReplayInput['phase'],WorldBossBattleKey>={armored:'Armored',exposed:'Exposed',enraged:'Enraged'};

/**
 * Hidden World Boss fight screen. Plays the committed server replay as a set-piece,
 * following WORLD_BOSS_REPLAY_POLICY: no skip, no speed control, no timer or round
 * count, pauses in the background, results only after the finale. `bossArt` is the
 * slot for the commissioned boss sprite; until then a framed placeholder is shown.
 */
export function WorldBossBattleStage({input,language,reduceMotion,bossArt,onClose}:{
 input:WorldBossBattleInput;language:Language;reduceMotion:boolean;bossArt?:ImageSourcePropType;onClose:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const w=(key:WorldBossBattleKey,params?:Record<string,string|number>)=>worldBossBattleText(language,key,params);
 const n=(value:number)=>formatLocalizedNumber(language,Math.round(value));
 const cues=useMemo(()=>worldBossReplayCues({...input,reduceMotion}),[input,reduceMotion]);
 const boss=worldBossPresentationFor(input.bossId)!;
 const [index,setIndex]=useState(0);
 useMusicOverride('world_boss',worldBossMusicFor(input.bossId));
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 useEffect(()=>{const sub=AppState.addEventListener('change',next=>setForeground(next==='active'));return()=>sub.remove();},[]);
 // Advance one beat at a time. Backgrounding pauses the fight so nothing is missed.
 useEffect(()=>{
  if(!foreground||index>=cues.length-1)return;
  const timer=setTimeout(()=>setIndex(i=>Math.min(cues.length-1,i+1)),cues[index].holdMs);
  return()=>clearTimeout(timer);
 },[index,foreground,cues]);
 const cue=cues[index],beat=cue.beat;

 // Party HP follows the real log: boss hits, damage ticks, heals and downs.
 const hp=useMemo(()=>{
  const map=new Map(input.party.map(m=>[m.characterId,m.maxHp]));
  const max=new Map(input.party.map(m=>[m.characterId,m.maxHp]));
  const change=(id:string|undefined,delta:number)=>{if(!id||!map.has(id))return;map.set(id,Math.max(0,Math.min(max.get(id)!,map.get(id)!+delta)));};
  for(let i=0;i<=index;i++){
   const b=cues[i].beat;
   if(b.kind==='boss_attack')for(const hit of b.hits)change(hit.targetId,-hit.amount);
   if(b.kind==='boss_state'&&b.hpLoss)change(b.targetId,-b.hpLoss);
   if(b.kind==='party_action'&&b.action==='heal')change(b.targetId,b.amount);
   if(b.kind==='down'&&map.has(b.targetId))map.set(b.targetId,0);
  }
  return map;
 },[cues,index,input.party]);

 // Shake, flash and haptics on the beats the model marks as big.
 const shake=useRef(new Animated.Value(0)).current,flash=useRef(new Animated.Value(0)).current;
 const worldBar=useRef(new Animated.Value(input.world.maxHp>0?input.world.hpBefore/input.world.maxHp:0)).current;
 useEffect(()=>{
  if(cue.shake){
   Animated.sequence([-8,8,-5,5,0].map(toValue=>Animated.timing(shake,{toValue,duration:55,useNativeDriver:true}))).start();
   playHaptic('heavy');
  }else if(beat.kind==='down')playHaptic('warning');
  if(cue.flash){flash.setValue(.55);Animated.timing(flash,{toValue:0,duration:420,useNativeDriver:true}).start();}
  // Beat sounds. Ordinary hits, heals and shields come from CombatImpactBurst.
  if(beat.kind==='entrance')playSound('boss_entrance');
  else if(beat.kind==='tonic')playSound('tonic');
  else if(beat.kind==='telegraph')playSound('boss_telegraph');
  else if(beat.kind==='boss_attack'&&beat.special)playSound('boss_special');
  else if(beat.kind==='boss_state'&&beat.state==='guard_break')playSound('guard_break');
  else if(beat.kind==='role_moment')playSound('role_moment');
  else if(beat.kind==='finale')playSound(beat.killingBlow?'killing_blow':beat.residualEcho?'ui_confirm':'world_hp_drop');
  else if(beat.kind==='results'&&beat.honors.length)playSound('honor');
  if(beat.kind==='finale'){
   const to=input.world.maxHp>0?beat.worldHpAfter/input.world.maxHp:0;
   Animated.timing(worldBar,{toValue:to,duration:reduceMotion?0:1800,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
   if(beat.killingBlow)playHaptic('success');
  }
 },[index]); // eslint-disable-line react-hooks/exhaustive-deps

 const banner=bannerFor(beat,w);
 const impact=impactFor(beat);
 const climax='act' in beat&&beat.act==='climax';
 const worldWidth=worldBar.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
 const results=beat.kind==='results'?beat:undefined;
 const partyDamage=(input.ledger??[]).reduce((sum,row)=>sum+Math.max(0,row.bossHpDamage),0);

 return <Modal visible transparent={false} animationType={reduceMotion?'none':'fade'}
  // Leaving mid-fight would be a skip; the system back gesture only closes the results.
  onRequestClose={()=>{if(results)onClose();}}>
  <Animated.View style={[s.root,{transform:[{translateX:shake}]}]}>
   <Image source={SCENE_BACKGROUNDS.forest[BIOME[input.bossId]??'asterfall']} resizeMode="cover" style={s.backdrop} accessible={false}/>
   <View style={[s.shade,climax&&s.shadeClimax]} pointerEvents="none"/>
   <View style={s.worldHeader} accessible accessibilityLabel={w('WORLD HP')+' '+n(input.world.hpBefore)}>
    <Text style={s.worldLabel}>{w('WORLD HP')}</Text>
    <View style={s.worldTrack}><Animated.View style={[s.worldFill,{width:worldWidth}]}/></View>
   </View>
   <View style={s.bossArea}>
    <Text style={s.bossMotif}>{boss.motif}</Text>
    <Text style={s.bossName} accessibilityRole="header">{boss.name}</Text>
    <Text style={s.phaseChip}>{w(PHASE_LABEL[input.phase])}</Text>
    <View style={[s.bossFrame,climax&&s.bossFrameClimax]}>
     {bossArt?<Image source={bossArt} resizeMode="contain" style={s.bossArt}/>:<Text style={s.bossGlyph} accessible={false}>✦</Text>}
     {impact&&impact.at==='boss'?<CombatImpactBurst eventId={'b'+index} kind={impact.kind} reduceMotion={reduceMotion} size={120}/>:null}
    </View>
   </View>
   <View style={s.bannerArea} accessibilityLiveRegion="polite">
    {banner?<Text style={[s.banner,banner.tone==='danger'&&s.bannerDanger,banner.tone==='hero'&&s.bannerHero]}>{banner.text}</Text>:null}
    {banner?.detail?<Text style={s.bannerDetail}>{banner.detail}</Text>:null}
   </View>
   <View style={s.party}>
    <Text style={s.partyLabel}>{w('YOUR PARTY')}</Text>
    <View style={s.partyRow}>
     {input.party.map(member=>{
      const current=hp.get(member.characterId)??0,fraction=member.maxHp>0?current/member.maxHp:0;
      const struck=beat.kind==='boss_attack'&&beat.hits.some(h=>h.targetId===member.characterId);
      return <View key={member.characterId} style={[s.member,current<=0&&s.memberDown]}>
       <Image source={classEmblemIconArtwork[member.classId as ClassId]} style={s.emblem} accessible={false}/>
       {struck&&impact?<CombatImpactBurst eventId={'p'+index+member.characterId} kind={impact.kind} reduceMotion={reduceMotion} size={56}/>:null}
       <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
       <View style={s.hpTrack}><View style={[s.hpFill,{width:`${Math.round(fraction*100)}%`},fraction<.3&&s.hpLow]}/></View>
       {input.tonicItemId?<Text style={s.tonicDot} accessible={false}>◆</Text>:null}
      </View>;
     })}
    </View>
   </View>
   <Animated.View pointerEvents="none" style={[s.flash,{opacity:flash}]}/>
   {results?<View style={s.results}>
    <Text style={s.resultsTitle} accessibilityRole="header">{w('BATTLE RESULTS')}</Text>
    <View style={s.resultRow}><Text style={s.resultLabel}>{w('World HP credit')}</Text><Text style={s.resultValue}>{n(input.world.creditedHp)}</Text></View>
    <View style={s.resultRow}><Text style={s.resultLabel}>{w('Party damage')}</Text><Text style={s.resultValue}>{n(partyDamage)}</Text></View>
    {results.honors.length?<>
     <Text style={s.honorsTitle}>{w('PARTY HONORS')}</Text>
     {results.honors.map(h=><View key={h.honor} style={s.resultRow}><Text style={s.honorName}>{w(HONOR_LABEL[h.honor])}</Text><Text style={s.resultValue}>{h.name} · {n(h.value)}</Text></View>)}
    </>:null}
    <GameButton title={w('Continue')} onPress={onClose}/>
   </View>:null}
  </Animated.View>
 </Modal>;

 function bannerFor(b:WorldBossReplayBeat,t:typeof w):{text:string;detail?:string;tone:'normal'|'danger'|'hero'}|undefined{
  switch(b.kind){
   case 'entrance':return {text:boss.name,detail:boss.region,tone:'hero'};
   case 'tonic':return {text:t('Tonic active'),tone:'hero'};
   case 'telegraph':return {text:t('Incoming: {ability}',{ability:worldBossAbilityName(b.abilityId)}),detail:b.targetNames.join(' · '),tone:'danger'};
   case 'boss_attack':return b.special?{text:worldBossAbilityName(b.abilityId),detail:n(b.hits.reduce((x,h)=>x+h.amount,0)),tone:'danger'}:undefined;
   case 'role_moment':{
    const key:WorldBossBattleKey=b.moment==='guarded'?'Guarded!':b.moment==='cleansed'?'Cleansed!':'Interrupted!';
    return {text:t(key),detail:[b.actorName,b.targetName].filter(Boolean).join(' → '),tone:'hero'};
   }
   case 'boss_state':
    if(b.state==='guard_break')return {text:t('Guard broken!'),tone:'hero'};
    if(b.state==='exposed')return {text:t('Weak point exposed!'),tone:'hero'};
    if(b.state==='special_cancelled')return {text:t('Special cancelled'),tone:'hero'};
    return undefined;
   case 'down':return {text:t('{name} has fallen',{name:b.targetName}),tone:'danger'};
   case 'finale':
    if(b.residualEcho)return {text:t('Residual Echo: no world HP damage'),tone:'normal'};
    if(b.killingBlow)return {text:t('Final blow!'),detail:n(b.creditedHp),tone:'hero'};
    if(b.thresholdsCrossed.length)return {text:t('World HP below {percent}%',{percent:Math.round(b.thresholdsCrossed[b.thresholdsCrossed.length-1]*100)}),detail:n(b.creditedHp),tone:'hero'};
    return {text:t('World HP credit'),detail:n(b.creditedHp),tone:'normal'};
   default:return undefined;
  }
 }
}

function impactFor(b:WorldBossReplayBeat):{kind:CombatImpactKind;at:'boss'|'party'}|undefined{
 if(b.kind==='boss_attack')return {kind:b.special?'critical':'damage',at:'party'};
 if(b.kind==='party_action'){
  if(b.action==='strike')return {kind:b.crit?'critical':'damage',at:'boss'};
  if(b.action==='heal')return {kind:'heal',at:'party'};
  if(b.action==='shield'||b.action==='mitigate')return {kind:'shield',at:'party'};
  return undefined;
 }
 if(b.kind==='role_moment')return {kind:b.moment==='guarded'?'shield':b.moment==='cleansed'?'heal':'interrupt',at:b.moment==='interrupted'?'boss':'party'};
 if(b.kind==='boss_state'&&(b.state==='guard_break'||b.state==='exposed'))return {kind:'phase',at:'boss'};
 if(b.kind==='down')return {kind:'down',at:'party'};
 return undefined;
}

// The policy is a contract for this screen; keep it referenced so it cannot drift silently.
void WORLD_BOSS_REPLAY_POLICY;

function styles(C:ThemeColors){return StyleSheet.create({
 root:{flex:1,backgroundColor:'#050403'},
 backdrop:{...StyleSheet.absoluteFill,width:'100%',height:'100%',opacity:.55},
 shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(4,3,2,.55)'},
 shadeClimax:{backgroundColor:'rgba(40,6,4,.6)'},
 worldHeader:{paddingTop:spacing.xl*2,paddingHorizontal:spacing.lg,gap:spacing.xs},
 worldLabel:{...typography.caption,color:'#E8D7B0',fontWeight:'900',letterSpacing:1},
 worldTrack:{height:12,borderRadius:6,backgroundColor:'rgba(255,255,255,.12)',overflow:'hidden',borderWidth:1,borderColor:'rgba(232,182,107,.5)'},
 worldFill:{height:'100%',backgroundColor:'#B8452F'},
 bossArea:{alignItems:'center',paddingTop:spacing.lg,gap:2},
 bossMotif:{...typography.caption,color:'#C9A86A',letterSpacing:2,fontWeight:'800'},
 bossName:{...typography.hero,color:'#F4E3BB',textAlign:'center'},
 phaseChip:{...typography.caption,color:'#F2C38B',borderWidth:1,borderColor:'#8C5A34',borderRadius:radii.sm,paddingHorizontal:spacing.sm,marginTop:spacing.xs},
 bossFrame:{marginTop:spacing.md,width:'78%',aspectRatio:1.15,borderRadius:radii.lg,borderWidth:2,borderColor:'#6B4A2E',
  backgroundColor:'rgba(20,14,10,.6)',alignItems:'center',justifyContent:'center',overflow:'hidden'},
 bossFrameClimax:{borderColor:'#C0432C'},
 bossArt:{width:'100%',height:'100%'},
 bossGlyph:{fontSize:96,color:'#9C6B47'},
 bannerArea:{minHeight:76,alignItems:'center',justifyContent:'center',paddingHorizontal:spacing.lg},
 banner:{...typography.title,color:'#F4E3BB',textAlign:'center'},
 bannerDanger:{color:'#FF9A7A'},
 bannerHero:{color:'#FFD98A'},
 bannerDetail:{...typography.bodyStrong,color:'#E8D7B0',textAlign:'center'},
 party:{marginTop:'auto',paddingHorizontal:spacing.md,paddingBottom:spacing.xl,gap:spacing.xs},
 partyLabel:{...typography.caption,color:'#C9A86A',fontWeight:'900',letterSpacing:1},
 partyRow:{flexDirection:'row',gap:spacing.sm},
 member:{flex:1,minWidth:0,alignItems:'center',gap:3,padding:spacing.xs,borderRadius:radii.md,backgroundColor:'rgba(12,9,7,.75)',borderWidth:1,borderColor:'rgba(232,182,107,.25)'},
 memberDown:{opacity:.35},
 emblem:{width:40,height:40},
 memberName:{...typography.caption,color:'#F4E3BB',fontWeight:'700'},
 hpTrack:{alignSelf:'stretch',height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,.12)',overflow:'hidden'},
 hpFill:{height:'100%',backgroundColor:'#5FB36B'},
 hpLow:{backgroundColor:'#D9534F'},
 tonicDot:{position:'absolute',top:4,right:6,fontSize:10,color:'#7FD6E8'},
 flash:{...StyleSheet.absoluteFill,backgroundColor:'#FFF1C9'},
 results:{position:'absolute',left:spacing.lg,right:spacing.lg,bottom:spacing.xl,padding:spacing.lg,gap:spacing.sm,borderRadius:radii.lg,
  backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.lineStrong},
 resultsTitle:{...typography.title,color:C.text},
 resultRow:{flexDirection:'row',justifyContent:'space-between',gap:spacing.sm,minHeight:touchTargetMin/2},
 resultLabel:{...typography.body,color:C.muted},
 resultValue:{...typography.bodyStrong,color:C.text},
 honorsTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,marginTop:spacing.sm},
 honorName:{...typography.bodyStrong,color:C.accent},
});}
