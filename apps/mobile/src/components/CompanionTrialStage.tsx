import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionMessage,companionTranslator,companionLabel,companionError} from '../i18n/companions';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {CompanionBattlePlaybackSnapshot} from '../core/companion-runtime';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {companionView} from '../core/companion-runtime';
import {companionTeamPower} from '../../../../backend/src/server/companions/team';
import {COMPANION_TRIAL_BOSS_INTERVAL,companionTrialRecommendedPower} from '../../../../backend/src/server/companions/content';
import {companionTrialBossPreview,companionTrialEncounterTheme} from '../../../../backend/src/server/companions/trials';
import {COMPANION_AFFINITIES,companionAffinity} from '../core/companion-affinities';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {companionRarityBorder} from './CompanionPresentation';
import {companionArtSource} from '../theme/companion-art';

const roleGlyph={damage:'⚔',tank:'◆',support:'✦'} as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pct=(current:number,max:number)=>clamp(max>0?current/max*100:0,0,100);
const time=(ms:number)=>`${(Math.max(0,ms)/1000).toFixed(1)}s`;

type PlaybackUnit={id:string;name:string;team:'players'|'enemies';role:string;maxHp:number;boss:boolean;hp:number;shield:number;alive:boolean;casting?:string};
function playbackState(playback:CompanionBattlePlaybackSnapshot,playhead:number){
 const units=new Map<string,PlaybackUnit>(playback.units.map(unit=>[unit.id,{...unit,hp:unit.maxHp,shield:0,alive:true}]));
 const visible=playback.events.filter(event=>event.atMs<=playhead);
 for(const event of visible){
  const target=event.targetId?units.get(event.targetId):undefined,actor=event.actorId?units.get(event.actorId):undefined;
  if((event.type==='damage'||event.type==='dot_tick')&&target){target.shield=Math.max(0,target.shield-(event.absorbed??0));target.hp=Math.max(0,target.hp-(event.amount??0));}
  if((event.type==='heal'||event.type==='hot_tick')&&target)target.hp=Math.min(target.maxHp,target.hp+(event.amount??0));
  if(event.type==='shield'&&target)target.shield+=event.amount??0;
  if((event.type==='down'||event.type==='death')&&target){target.hp=0;target.alive=false;}
  if(event.type==='cast_start'&&actor)actor.casting=playback.abilityNames[event.abilityId??'']??event.abilityId;
  if(event.type==='cast_complete'&&actor)actor.casting=undefined;
  if(event.type==='interrupt'&&target)target.casting=undefined;
 }
 return {units:[...units.values()],visible};
}
function eventText(playback:CompanionBattlePlaybackSnapshot,event:CompanionBattlePlaybackSnapshot['events'][number],language:import('../i18n/languages').Language){
 const t=companionTranslator(language),names=new Map(playback.units.map(unit=>[unit.id,unit.name]));
 const actor=event.actorId?names.get(event.actorId):undefined,target=event.targetId?names.get(event.targetId):undefined;
 const ability=playback.abilityNames[event.abilityId??'']??t('Ability'),amount=Math.round(event.amount??0);
 if(event.type==='damage')return (actor??t('Attack'))+' · '+ability+' → '+(target??t('Target'))+' −'+amount+(event.critical?t(' CRIT'):'');
 if(event.type==='dot_tick')return t('{target} suffers {amount} periodic damage',{target:target??t('Target'),amount});
 if(event.type==='heal'||event.type==='hot_tick')return t('{actor} restores {amount} HP to {target}',{actor:actor??t('Support'),amount,target:target??t('Ally')});
 if(event.type==='shield')return t('{actor} shields {target} for {amount}',{actor:actor??t('Support'),target:target??t('Ally'),amount});
 if(event.type==='cast_start')return t('{actor} begins {ability}',{actor:actor??t('Enemy'),ability});
 if(event.type==='cast_complete')return t('{actor} casts {ability}',{actor:actor??t('Enemy'),ability});
 if(event.type==='interrupt')return t('{actor} interrupts {target}',{actor:actor??t('Companion'),target:target??t('Enemy')});
 if(event.type==='phase')return t('PHASE · {ability}',{ability});
 if(event.type==='miss')return t('{actor} misses {target}',{actor:actor??t('Attacker'),target:target??t('Target')});
 if(event.type==='down')return t('{target} is down',{target:target??t('Companion')});
 if(event.type==='death')return t('{target} is defeated',{target:target??t('Enemy')});
 if(event.type==='combat_end')return event.detail==='victory'?t('Encounter cleared'):event.detail==='wipe'?t('Formation defeated'):t('Combat ended');
 return t('Combat event');
}

export function CompanionTrialStage({state,now,floor,teamIds}:{state:GameState;now:number;floor:number;teamIds:string[]}){
 const language=useGameLanguage(),t=companionTranslator(language),label=(value:string)=>companionLabel(language,value);

 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const view=companionView(state,now),team=teamIds.filter(id=>!!view.owned[id]),power=companionTeamPower(team,view.owned);
 const recommended=companionTrialRecommendedPower(floor),theme=companionTrialEncounterTheme(floor),boss=floor%COMPANION_TRIAL_BOSS_INTERVAL===0,preview=boss?companionTrialBossPreview(floor):undefined;
 const last=state.account.companionLastBattle,playback=last?.playback;
 const fresh=!!last&&!!playback&&now-last.atMs>=0&&now-last.atMs<90_000;
 const playbackRealMs=playback?Math.min(20_000,Math.max(8_000,playback.durationMs*.38)):0;
 const simPerRealMs=playback&&playbackRealMs?playback.durationMs/playbackRealMs:1;
 const [playhead,setPlayhead]=useState(()=>fresh?0:playback?.durationMs??0),startRef=useRef(Date.now()),impact=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(!playback||!fresh){setPlayhead(playback?.durationMs??0);return;}
  startRef.current=Date.now();setPlayhead(0);
  const id=setInterval(()=>setPlayhead(Math.min(playback.durationMs,(Date.now()-startRef.current)*simPerRealMs)),80);
  return()=>clearInterval(id);
 },[fresh,last?.atMs,playback?.durationMs,simPerRealMs]);
 const playbackView=useMemo(()=>playback?playbackState(playback,playhead):undefined,[playback,playhead]);
 const current=playbackView?.visible[playbackView.visible.length-1],finished=!!playback&&playhead>=playback.durationMs;
 useEffect(()=>{
  if(!current||state.settings.reduceMotion)return;
  if(!['damage','heal','shield','interrupt','phase','down','death'].includes(current.type))return;
  impact.setValue(0);Animated.sequence([Animated.timing(impact,{toValue:1,duration:90,useNativeDriver:true}),Animated.timing(impact,{toValue:0,duration:260,useNativeDriver:true})]).start();
 },[current?.atMs,current?.type,impact,state.settings.reduceMotion]);
 const scale=impact.interpolate({inputRange:[0,1],outputRange:[1,1.012]});
 const powerPct=Math.min(100,Math.round(power/Math.max(1,recommended)*100));

 if(playback&&fresh){
  const players=playbackView!.units.filter(unit=>unit.team==='players'),enemies=playbackView!.units.filter(unit=>unit.team==='enemies'),playbackTitle=enemies.find(unit=>unit.boss)?.name??last!.title;
  const feed=playbackView!.visible.filter(event=>!['combat_start','cast_complete'].includes(event.type)).slice(-5).reverse();
  const unitCard=(unit:PlaybackUnit)=>{
   const def=COMBAT_COMPANIONS.find(row=>row.id===unit.id),affinity=def?COMPANION_AFFINITIES[companionAffinity(def)]:undefined,art=def?companionArtSource(unit.id):undefined;
   const impactLabel=current?.targetId===unit.id?(current.type==='damage'||current.type==='dot_tick'?'-'+Math.round(current.amount??0):current.type==='heal'||current.type==='hot_tick'?t('+HP {amount}',{amount:Math.round(current.amount??0)}):current.type==='shield'?t('+SHIELD {amount}',{amount:Math.round(current.amount??0)}):undefined):undefined;
   return <View key={unit.id} style={[s.liveUnit,!unit.alive&&s.downedUnit,current?.targetId===unit.id&&s.targetUnit,def&&{borderColor:companionRarityBorder(def.rarity,C.dark)}]}><View style={s.liveUnitRow}><View style={s.unitIcon}>{art?<Image source={art} resizeMode="contain" style={s.unitArt}/>:<Text style={s.unitGlyph}>{unit.boss ? '♛' : def ? roleGlyph[def.role] : '◇'}</Text>}</View><View style={s.liveUnitBody}>
    <View style={s.unitHead}><Text numberOfLines={1} style={s.unitName}>{unit.name}</Text><Text style={s.hpText}>{Math.round(unit.hp).toLocaleString()}/ {Math.round(unit.maxHp).toLocaleString()}</Text></View>
    <View style={s.hpTrack}><View style={[s.hpFill,{width:(pct(unit.hp,unit.maxHp)+'%') as any}]}/>{unit.shield>0?<View style={[s.shieldFill,{width:(Math.min(100,unit.shield/unit.maxHp*100)+'%') as any}]}/>:null}</View>
    <Text style={s.unitMeta}>{def ? t("{value0} · {value1} {value2}", {value0: label(def.role).toLocaleUpperCase(language), value1: affinity?.glyph ?? '', value2: companionContent(language,affinity?.label??'')}) : (unit.boss?t('Boss').toLocaleUpperCase(language):t('Trial Echo').toLocaleUpperCase(language))}{unit.shield>0 ? t(" · {value0} shield", {value0: Math.round(unit.shield)}) : ''}</Text>
    {unit.casting?<Text style={s.castText}>{t("CASTING · {value0}", {value0: unit.casting})}</Text>:null}</View>{impactLabel?<Text style={[s.impactNumber,(current?.type==='heal'||current?.type==='hot_tick'||current?.type==='shield')&&s.impactPositive]}>{impactLabel}</Text>:null}</View></View>;
  };
  return <Animated.View style={[s.stage,{transform:[{scale}]}]}>
   <View style={s.stageHeader}><View style={s.flex}><Text style={s.kicker}>{t("LIVE TRIAL PLAYBACK · {value0}", {value0: last!.title.toUpperCase()})}</Text><Text style={s.title}>{playbackTitle}</Text></View><View style={s.timerBadge}><Text style={s.timerText}>{time(Math.min(playhead,playback.durationMs))}</Text><Text style={s.powerSub}>/ {time(playback.durationMs)}</Text></View></View>
   <View style={s.liveArena}><View style={s.liveColumn}><Text style={s.sideLabel}>{t("YOUR FORMATION")}</Text>{players.map(unitCard)}</View><View style={s.vs}><Text style={s.vsText}>{t("VS")}</Text></View><View style={s.liveColumn}><Text style={s.sideLabel}>{enemies.some(unit=>unit.boss) ? t("BOSS ENCOUNTER") : t("TRIAL FORMATION")}</Text>{enemies.map(unitCard)}</View></View>
   <View style={s.feed}><View style={s.feedHead}><Text style={s.feedTitle}>{t("COMBAT FEED")}</Text><Text style={s.feedMeta}>{t("{value0} authoritative events", {value0: playback.events.length})}</Text></View>{feed.length?feed.map((event,index)=><View key={event.atMs+':'+event.type+':'+index} style={s.feedRow}><Text style={s.feedTime}>{time(event.atMs)}</Text><Text numberOfLines={1} style={[s.feedText,event.type==='phase'&&s.phaseText,event.type==='interrupt'&&s.interruptText,event.critical&&s.critText]}>{eventText(playback,event,language)}</Text></View>):<Text style={s.enemyMeta}>{t("The formation enters the Trial…")}</Text>}</View>
   {!finished?<View style={s.playbackFooter}><Text style={s.combatHintText}>{t("Compressed playback of the already-resolved server simulation.")}</Text><Pressable accessibilityRole="button" onPress={()=>{startRef.current=Date.now()-playbackRealMs;setPlayhead(playback.durationMs)}} style={s.skip}><Text style={s.skipText}>{t("SKIP →")}</Text></Pressable></View>:<View style={[s.result,last!.won?s.resultWin:s.resultLoss]}><Text style={s.resultTitle}>{last!.won ? t("VICTORY") : t("DEFEAT")}· {last!.title}</Text><Text style={s.resultText}>{t("{value0}s simulated · +{value1} Essence · +{value2} Gold{value3}", {value0: (last!.durationMs/1000).toFixed(1), value1: last!.essence, value2: last!.gold, value3: last!.bondstones ? t(" · +{value0} Bondstones", {value0: last!.bondstones}) : ''})}</Text></View>}
  </Animated.View>;
 }

 return <View style={s.stage}>
  <View style={s.stageHeader}><View style={s.flex}><Text style={s.kicker}>{t("TOWER OF COMPANIONS · FLOOR {value0}", {value0: floor})}</Text><Text style={s.title}>{companionContent(language,theme.label)}</Text></View><View style={[s.powerBadge,power>=recommended?s.powerReady:s.powerLow]}><Text style={s.powerText}>{power.toLocaleString()}</Text><Text style={s.powerSub}>{t("/ {value0} POWER", {value0: recommended.toLocaleString()})}</Text></View></View>
  <View style={s.powerTrack}><View style={[s.powerFill,{width:(Math.max(3,powerPct)+'%') as any}]}/></View>
  <View style={s.arena}>
   <View style={s.teamColumn}><Text style={s.sideLabel}>{t("YOUR FORMATION")}</Text>{team.length?team.map(id=>{const def=COMBAT_COMPANIONS.find(row=>row.id===id),progress=view.owned[id];if(!def)return null;const affinity=COMPANION_AFFINITIES[companionAffinity(def)];const art=companionArtSource(id);return <View key={id} style={[s.unit,{borderColor:companionRarityBorder(def.rarity,C.dark)}]}><View style={s.previewIcon}>{art?<Image source={art} resizeMode="contain" style={s.previewArt}/>:<Text style={s.unitGlyph}>{roleGlyph[def.role]}</Text>}</View><View style={s.unitCopy}><Text numberOfLines={1} style={s.unitName}>{def.name}</Text><Text style={s.unitMeta}>{t("{value0} · {value1} {value2} · LV {value3} · B{value4}", {value0: label(def.role).toLocaleUpperCase(language), value1: affinity.glyph, value2: companionContent(language,affinity.label), value3: progress.level, value4: progress.bondLevel})}</Text><Text numberOfLines={1} style={s.ability}>{t("{value0} · {value1}s", {value0: def.activeAbility.name, value1: def.activeAbility.cooldownSeconds})}</Text></View></View>}):<View style={s.empty}><Text style={s.emptyText}>{t("Choose Tank · Damage · Support below to preview the formation.")}</Text></View>}</View>
   <View style={s.vs}><Text style={s.vsText}>{t("VS")}</Text></View>
   <View style={s.enemyColumn}><Text style={s.sideLabel}>{boss ? t("BOSS ENCOUNTER") : t("TRIAL ENCOUNTER")}</Text><View style={[s.enemySigil,boss&&s.bossSigil]}><Text style={s.enemyGlyph}>{boss ? '♛' : '◇'}</Text></View><Text style={s.enemyName}>{boss ? theme.bossName : t("Trial Echoes")}</Text><Text style={s.enemyMeta}>{boss ? t("Checkpoint boss") : t("Three-enemy combat formation")}</Text>{preview?.abilities.slice(0,2).map(ability=><Text key={ability.name} numberOfLines={1} style={s.enemyAbility}>• {ability.name}{ability.interruptible ? t(" · interruptible") : ''}</Text>)}</View>
  </View>
  <View style={s.combatHint}><Text style={s.combatHintLabel}>{t("COMBAT PRESENTATION")}</Text><Text style={s.combatHintText}>{t("Fight resolves server-side, then replays here from the authoritative event transcript.")}</Text></View>
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 stage:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:radii.lg,backgroundColor:C.stage,overflow:'hidden'},
 stageHeader:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},
 powerBadge:{minWidth:94,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderRadius:radii.sm,alignItems:'flex-end'},powerReady:{borderColor:C.good,backgroundColor:C.goodSurface},powerLow:{borderColor:C.warning,backgroundColor:C.warningSurface},powerText:{...typography.bodyStrong,color:C.text},powerSub:{fontSize:8,color:C.muted,fontWeight:'900'},timerBadge:{minWidth:80,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.info,borderRadius:radii.sm,alignItems:'flex-end',backgroundColor:C.panel2},timerText:{...typography.bodyStrong,color:C.info},
 powerTrack:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},powerFill:{height:'100%',backgroundColor:C.good},
 arena:{minHeight:210,flexDirection:'row',alignItems:'stretch',gap:6,paddingVertical:6},teamColumn:{flex:1.18,gap:6},enemyColumn:{flex:.82,alignItems:'center',justifyContent:'center',gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},sideLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},unit:{minHeight:52,flexDirection:'row',alignItems:'center',gap:7,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},unitCopy:{flex:1,minWidth:0},unitName:{fontSize:10,color:C.text,fontWeight:'900'},unitMeta:{fontSize:7,color:C.info,fontWeight:'800'},ability:{fontSize:8,color:C.muted,marginTop:2},vs:{width:22,alignItems:'center',justifyContent:'center'},vsText:{fontSize:10,color:C.accent,fontWeight:'900'},enemySigil:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.info,backgroundColor:C.panel2},bossSigil:{borderColor:C.accent,backgroundColor:C.accentSurface},enemyGlyph:{fontSize:30,color:C.accent},enemyName:{...typography.bodyStrong,color:C.text,textAlign:'center'},enemyMeta:{fontSize:9,color:C.muted,textAlign:'center'},enemyAbility:{fontSize:8,color:C.warning,textAlign:'center'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md},emptyText:{...typography.caption,color:C.muted,textAlign:'center'},
 combatHint:{padding:8,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2},combatHintLabel:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.8},combatHintText:{...typography.caption,color:C.muted},
 liveArena:{minHeight:210,flexDirection:'row',alignItems:'stretch',gap:5},liveColumn:{flex:1,gap:5},liveUnit:{gap:3,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},liveUnitRow:{flexDirection:'row',alignItems:'center',gap:5},liveUnitBody:{flex:1,minWidth:0},unitIcon:{width:34,height:34,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:C.stage},unitArt:{width:32,height:32},unitGlyph:{fontSize:17,color:C.accent,fontWeight:'900'},impactNumber:{fontSize:10,color:C.bad,fontWeight:'900'},impactPositive:{color:C.good},previewIcon:{width:38,height:38,alignItems:'center',justifyContent:'center'},previewArt:{width:36,height:36},targetUnit:{borderColor:C.warning},downedUnit:{opacity:.55},unitHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},hpText:{fontSize:7,color:C.muted,fontVariant:['tabular-nums']},hpTrack:{height:7,borderRadius:99,overflow:'hidden',backgroundColor:C.badSurface,position:'relative'},hpFill:{height:'100%',backgroundColor:C.good},shieldFill:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:C.info},castText:{fontSize:7,color:C.warning,fontWeight:'900',letterSpacing:.5},
 feed:{gap:4,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},feedHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},feedTitle:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.7},feedMeta:{fontSize:7,color:C.muted},feedRow:{flexDirection:'row',gap:6},feedTime:{width:31,fontSize:8,color:C.muted,fontVariant:['tabular-nums']},feedText:{flex:1,fontSize:8,color:C.text,fontWeight:'700'},phaseText:{color:C.info,fontWeight:'900'},interruptText:{color:C.good,fontWeight:'900'},critText:{color:C.warning,fontWeight:'900'},
 playbackFooter:{minHeight:30,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},skip:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},skipText:{fontSize:8,color:C.accent,fontWeight:'900'},result:{padding:9,borderWidth:1,borderRadius:radii.sm},resultWin:{borderColor:C.good,backgroundColor:C.goodSurface},resultLoss:{borderColor:C.bad,backgroundColor:C.badSurface},resultTitle:{...typography.bodyStrong,color:C.text},resultText:{...typography.caption,color:C.muted},
});}
