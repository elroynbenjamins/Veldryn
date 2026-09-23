import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Easing,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import type {GameState} from '../core/types';
import type {FallenKnightBattleResult,StoryBossEvent} from '../core/story-boss';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';
import {GameButton} from './GameButton';

function pct(current:number,max:number){return Math.max(0,Math.min(100,max>0?current/max*100:0));}
function timeLabel(ms:number){return `${(Math.max(0,ms)/1000).toFixed(1)}s`;}

export function StoryBossBattleModal({state,battle,message,onClose}:{state:GameState;battle:FallenKnightBattleResult;message:string;onClose:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),monster=MONSTERS.find(row=>row.id==='FALLEN_KNIGHT')!,region=WORLD_ZONES.find(row=>row.name==="King's Road");
  const reduceMotion=state.settings.reduceMotion;
  const playbackRealMs=Math.min(38_000,Math.max(12_000,battle.durationMs));
  const simPerRealMs=battle.durationMs/playbackRealMs;
  const [playhead,setPlayhead]=useState(0);
  const startRef=useRef(Date.now());
  const enemyImpact=useRef(new Animated.Value(0)).current,playerImpact=useRef(new Animated.Value(0)).current,phasePulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    startRef.current=Date.now();setPlayhead(0);
    const id=setInterval(()=>setPlayhead(Math.min(battle.durationMs,(Date.now()-startRef.current)*simPerRealMs)),80);
    return()=>clearInterval(id);
  },[battle.durationMs,simPerRealMs]);
  const visible=useMemo(()=>battle.events.filter(event=>event.atMs<=playhead),[battle.events,playhead]);
  const current=visible[visible.length-1]??battle.events[0];
  const previous=visible.length>1?visible[visible.length-2]:undefined;
  const finished=playhead>=battle.durationMs;
  const bossHp=current?.bossHp??battle.bossMaxHp,playerHp=current?.playerHp??battle.playerMaxHp;
  const phase=current?.phase??1;
  const recent=visible.filter(event=>!['battle_start'].includes(event.type)).slice(-4).reverse();

  useEffect(()=>{
    if(!current||current===previous||reduceMotion)return;
    const pulse=(value:Animated.Value)=>{value.setValue(0);Animated.sequence([
      Animated.timing(value,{toValue:1,duration:90,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      Animated.timing(value,{toValue:0,duration:380,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    ]).start();};
    if(current.type==='player_hit')pulse(enemyImpact);
    if(current.type==='boss_hit')pulse(playerImpact);
    if(current.type==='phase')pulse(phasePulse);
  },[current?.atMs,current?.type,enemyImpact,phasePulse,playerImpact,previous,reduceMotion]);

  const flash=(value:Animated.Value)=>value.interpolate({inputRange:[0,.12,1],outputRange:[0,.72,0]});
  const floatY=(value:Animated.Value)=>value.interpolate({inputRange:[0,1],outputRange:[0,-26]});
  const slashOpacity=enemyImpact.interpolate({inputRange:[0,.08,.55,1],outputRange:[0,1,.55,0]});
  const slashScale=enemyImpact.interpolate({inputRange:[0,.18,1],outputRange:[.2,1,1.18]});
  const shake=playerImpact.interpolate({inputRange:[0,.2,.45,.7,1],outputRange:[0,3,-3,1,0]});
  const phaseScale=phasePulse.interpolate({inputRange:[0,1],outputRange:[1,1.025]});
  const telegraph=current?.type==='telegraph'?current:undefined;
  const damageEvent=current?.type==='player_hit'||current?.type==='boss_hit'?current:undefined;

  const skip=()=>setPlayhead(battle.durationMs);
  const eventText=(event:StoryBossEvent)=>{
    if(event.type==='player_hit')return `${event.critical?'CRIT · ':''}You hit for ${event.amount?.toLocaleString()??0}`;
    if(event.type==='boss_hit')return `${event.critical?'CRIT · ':''}${event.label} hits for ${event.amount?.toLocaleString()??0}`;
    if(event.type==='heal')return `Auto-eat restores ${event.amount?.toLocaleString()??0} HP`;
    if(event.type==='phase'||event.type==='telegraph')return event.label;
    if(event.type==='player_miss'||event.type==='boss_miss')return event.label;
    if(event.type==='victory'||event.type==='defeat')return event.label;
    return event.label;
  };

  return <Modal visible transparent animationType="fade" onRequestClose={finished?onClose:skip}>
    <View style={s.backdrop}>
      <View style={s.modal}>
        <View style={s.top}>
          <View><Text style={s.kicker}>ASTERFALL STORY BOSS</Text><Text accessibilityRole="header" style={s.title}>The Fallen Knight</Text></View>
          <View style={[s.phaseBadge,phase===3&&s.phaseDanger]}><Text style={s.phaseText}>PHASE {phase}</Text></View>
        </View>

        <Animated.View style={[s.arena,{transform:[{translateX:shake},{scale:phaseScale}]}]}>
          <RegionArtwork regionId={region?.id??'KINGS_ROAD'}/>
          <View style={s.shade}/>
          {telegraph&&<View style={s.telegraph}><Text style={s.telegraphLabel}>⚠ TELEGRAPH</Text><Text style={s.telegraphText}>{telegraph.label}</Text></View>}
          <View style={s.combatants}>
            <View style={s.side}>
              <View style={s.portrait}>
                <CharacterPortrait state={state} style={{width:104,height:132}}/>
                <Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(playerImpact)}]}/>
                {damageEvent?.type==='boss_hit'&&<Animated.View pointerEvents="none" style={[s.floatWrap,{opacity:playerImpact,transform:[{translateY:floatY(playerImpact)}]}]}><Text style={s.damageTaken}>{damageEvent.critical?'CRIT ':''}−{damageEvent.amount?.toLocaleString()}</Text></Animated.View>}
              </View>
              <Text numberOfLines={1} style={s.name}>{state.character?.name??'Adventurer'}</Text>
              <Text style={s.sub}>ACC {Math.round(battle.player.hitChance*100)}% · CRIT {Math.round(battle.player.critChance*100)}%</Text>
            </View>

            <View style={s.vsWrap}><Text style={s.vs}>VS</Text><Text style={s.timer}>{timeLabel(Math.min(playhead,battle.durationMs))}</Text></View>

            <View style={s.side}>
              <View style={s.portrait}>
                <MonsterPortraitFrame monster={monster} size={118} active reduceMotion={reduceMotion} framed={false}/>
                <Animated.View pointerEvents="none" style={[s.impactFlash,{opacity:flash(enemyImpact)}]}/>
                <Animated.View pointerEvents="none" style={[s.slash,s.slashA,{opacity:slashOpacity,transform:[{rotate:'-34deg'},{scaleX:slashScale}]}]}/>
                <Animated.View pointerEvents="none" style={[s.slash,s.slashB,{opacity:slashOpacity,transform:[{rotate:'31deg'},{scaleX:slashScale}]}]}/>
                <Animated.View pointerEvents="none" style={[s.spark,{opacity:slashOpacity,transform:[{translateX:floatY(enemyImpact)}]}]}/>
                {damageEvent?.type==='player_hit'&&<Animated.View pointerEvents="none" style={[s.floatWrap,{opacity:enemyImpact,transform:[{translateY:floatY(enemyImpact)}]}]}><Text style={damageEvent.critical?s.critDamage:s.damageDealt}>{damageEvent.critical?'CRIT ':''}−{damageEvent.amount?.toLocaleString()}</Text></Animated.View>}
              </View>
              <Text style={s.name}>Fallen Knight</Text>
              <Text style={s.sub}>ACC {Math.round(battle.boss.accuracy*100)}% · CRIT {Math.round(battle.boss.critChance*100)}%</Text>
            </View>
          </View>
        </Animated.View>

        <View style={s.bars}>
          <View style={s.barBlock}><View style={s.barHead}><Text style={s.barLabel}>FALLEN KNIGHT</Text><Text style={s.barValue}>{Math.round(bossHp).toLocaleString()} / {battle.bossMaxHp.toLocaleString()}</Text></View><View style={s.track}><View style={[s.bossFill,{width:`${pct(bossHp,battle.bossMaxHp)}%` as `${number}%`}]}/></View></View>
          <View style={s.barBlock}><View style={s.barHead}><Text style={s.barLabel}>{state.character?.name?.toUpperCase()??'PLAYER'}</Text><Text style={s.barValue}>{Math.round(playerHp).toLocaleString()} / {battle.playerMaxHp.toLocaleString()}</Text></View><View style={s.track}><View style={[s.playerFill,{width:`${pct(playerHp,battle.playerMaxHp)}%` as `${number}%`}]}/></View></View>
        </View>

        <View style={s.log}>
          <View style={s.logHead}><Text style={s.logTitle}>COMBAT FEED</Text><Text style={s.logMeta}>{battle.foodConsumed} food used · {battle.phasesReached.length}/3 phases</Text></View>
          {recent.length?recent.map((event,index)=><View key={event.atMs+':'+event.type+':'+index} style={s.logRow}><Text style={s.logTime}>{timeLabel(event.atMs)}</Text><Text numberOfLines={1} style={[s.logText,event.type==='telegraph'&&s.warn,event.type==='phase'&&s.phaseLog,event.critical&&s.critLog]}>{eventText(event)}</Text></View>):<Text style={s.sub}>The duel begins…</Text>}
        </View>

        {finished?<View style={[s.result,battle.won?s.win:s.loss]}><Text style={s.resultTitle}>{battle.won?'VICTORY':'DEFEAT'}</Text><Text style={s.resultCopy}>{message}</Text>{battle.won&&<Text style={s.reward}>+900 Gold · +3,000 XP · +40 Essence · +1 Bondstone · Fallen Knight Sigil</Text>}</View>:<Text style={s.note}>Boss outcome is already resolved by the deterministic combat simulation. Playback can be skipped.</Text>}

        <View style={s.actions}>{finished?<GameButton title="Continue" onPress={onClose}/>:<><View style={s.actionFlex}><GameButton title="Skip fight" tone="secondary" onPress={skip}/></View><Text style={s.live}>LIVE</Text></>}</View>
      </View>
    </View>
  </Modal>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(2,6,12,.88)',justifyContent:'center',padding:14},
  modal:{maxHeight:'94%',overflow:'hidden',gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.lg,backgroundColor:C.bg},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  kicker:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:1},title:{...typography.hero,color:C.text},
  phaseBadge:{paddingHorizontal:9,paddingVertical:5,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},phaseDanger:{borderColor:C.bad,backgroundColor:C.badSurface},phaseText:{fontSize:9,color:C.text,fontWeight:'900',letterSpacing:.7},
  arena:{minHeight:226,overflow:'hidden',borderRadius:radii.md,borderWidth:1,borderColor:C.line,justifyContent:'center'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(4,8,16,.64)'},
  telegraph:{position:'absolute',zIndex:8,top:8,left:10,right:10,paddingVertical:6,paddingHorizontal:9,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:'rgba(45,29,10,.92)',alignItems:'center'},telegraphLabel:{fontSize:8,color:C.warning,fontWeight:'900',letterSpacing:.9},telegraphText:{...typography.bodyStrong,color:C.text},
  combatants:{flexDirection:'row',alignItems:'center',gap:4,paddingTop:34,paddingHorizontal:8},side:{flex:1,minWidth:0,alignItems:'center',gap:4},portrait:{width:'100%',maxWidth:136,height:136,alignItems:'center',justifyContent:'flex-end',overflow:'hidden',position:'relative',borderRadius:34,backgroundColor:'rgba(4,10,18,.66)'},
  impactFlash:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,238,196,.72)'},slash:{position:'absolute',left:30,top:64,width:76,height:4,borderRadius:4},slashA:{backgroundColor:'#fff0a8',shadowColor:'#ffd36e',shadowOpacity:.9,shadowRadius:5},slashB:{height:3,backgroundColor:'#ffd36e',shadowColor:'#fff0a8',shadowOpacity:.7,shadowRadius:3},spark:{position:'absolute',left:68,top:66,width:6,height:6,borderRadius:3,backgroundColor:'#fff4c7'},
  floatWrap:{position:'absolute',left:0,right:0,top:18,alignItems:'center'},damageDealt:{fontSize:19,lineHeight:23,color:'#ffd36e',fontWeight:'900',textShadowColor:'#120b03',textShadowRadius:3},critDamage:{fontSize:20,lineHeight:24,color:'#fff0a8',fontWeight:'900',textShadowColor:'#a96113',textShadowRadius:5},damageTaken:{fontSize:18,lineHeight:22,color:'#ff8790',fontWeight:'900',textShadowColor:'#180508',textShadowRadius:3},
  name:{...typography.bodyStrong,color:C.text,textAlign:'center'},sub:{...typography.caption,color:C.muted,textAlign:'center'},vsWrap:{width:38,alignItems:'center',gap:4},vs:{...typography.caption,color:C.accent,fontWeight:'900'},timer:{fontSize:8,color:C.muted,fontWeight:'900'},
  bars:{gap:7},barBlock:{gap:3},barHead:{flexDirection:'row',justifyContent:'space-between',gap:8},barLabel:{fontSize:9,color:C.text,fontWeight:'900',letterSpacing:.6},barValue:{fontSize:9,color:C.muted,fontWeight:'800',fontVariant:['tabular-nums']},track:{height:8,overflow:'hidden',borderRadius:99,backgroundColor:C.panel2},bossFill:{height:'100%',backgroundColor:C.bad},playerFill:{height:'100%',backgroundColor:C.good},
  log:{gap:4,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},logHead:{flexDirection:'row',justifyContent:'space-between',gap:8},logTitle:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.7},logMeta:{fontSize:9,color:C.muted,fontWeight:'800'},logRow:{flexDirection:'row',gap:8},logTime:{width:34,fontSize:9,color:C.muted,fontVariant:['tabular-nums']},logText:{flex:1,fontSize:10,color:C.text,fontWeight:'700'},warn:{color:C.warning},phaseLog:{color:C.info,fontWeight:'900'},critLog:{color:C.warning,fontWeight:'900'},
  result:{gap:4,padding:9,borderLeftWidth:4,borderRadius:radii.sm},win:{borderLeftColor:C.good,backgroundColor:C.goodSurface},loss:{borderLeftColor:C.bad,backgroundColor:C.badSurface},resultTitle:{...typography.title,color:C.text},resultCopy:{...typography.body,color:C.text},reward:{...typography.caption,color:C.good,fontWeight:'900'},note:{...typography.caption,color:C.muted},
  actions:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10},actionFlex:{flex:1},live:{fontSize:9,color:C.bad,fontWeight:'900',letterSpacing:1.2},
});}
