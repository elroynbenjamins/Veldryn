import React,{useEffect,useState} from 'react';
import {ImageBackground,Modal,StyleSheet,Text,View} from 'react-native';
import {ActiveActivity,RewardBundle} from '../core/types';
import {itemDef} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {environmentEffectForActivity,environmentForActivity} from '../core/world-weather';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';
import {formatGameNumber} from '../core/number-format';

function duration(seconds:number){const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60),rest=seconds%60;return hours?`${hours}h ${minutes}m`:minutes?`${minutes}m ${rest}s`:`${rest}s`;}
function activityName(activity:ActiveActivity|null){return MONSTERS.find(entry=>entry.id===activity?.targetId)?.name||GATHERING.find(entry=>entry.id===activity?.targetId)?.name||'Asterfall activity';}

/** A short, deterministic settlement presentation. Rewards are committed before it starts. */
export function RewardPopup({reward,activity,reduceMotion=false,numberMode='abbreviated',onClose}:{reward:RewardBundle|null;activity:ActiveActivity|null;reduceMotion?:boolean;numberMode?:'abbreviated'|'exact';onClose:()=>void}){
  const [phase,setPhase]=useState<'calculating'|'summary'>('calculating');
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    if(!reward){setPhase('calculating');setProgress(0);return;}
    if(reduceMotion){setPhase('summary');setProgress(100);return;}
    setPhase('calculating');setProgress(0);let value=0;
    const timer=setInterval(()=>{value=Math.min(100,value+6);setProgress(value);if(value===100){clearInterval(timer);setPhase('summary');}},55);
    return()=>clearInterval(timer);
  },[reward,activity?.startedAtMs,reduceMotion]);
  const environment=activity?environmentForActivity(activity):undefined;
  const effect=activity?environmentEffectForActivity(activity).effect:undefined;
  const visibleEventDrops=reward?.eventDrops?.filter(drop=>drop.quantity>0)??[];
  const eventDiscoveries=reward?.eventDiscoveries?.filter(find=>find.quantity>0)??[];
  const stage=progress<34?'Settling elapsed time':progress<68?'Resolving actions and combat':progress<92?'Rolling materials and loot':'Banking rewards';
  return <Modal transparent visible={reward!==null} animationType={reduceMotion?'none':'fade'} onRequestClose={()=>{if(phase==='summary')onClose()}}>
    <View style={s.backdrop}>
      <ImageBackground source={require('../../assets/world/asterfall-map-v1.png')} resizeMode="cover" imageStyle={s.mapImage} style={s.world} accessibilityLabel="Asterfall expedition calculation">
        <View style={s.worldShade}/><View style={s.grid}/>
        {phase==='calculating'&&<View style={s.loadingCard} accessibilityLiveRegion="polite">
          <Text style={s.eyebrow}>ASTERFALL LEDGER</Text><Text style={s.loadingTitle}>Calculating expedition</Text><Text style={s.loadingSub}>{activityName(activity)} · {stage}</Text>
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Calculating activity rewards" accessibilityValue={{min:0,max:100,now:progress}} style={s.track}><View style={[s.fill,{width:`${progress}%`}]} /></View>
          <View style={s.progressRow}><Text style={s.step}>◆ Time</Text><Text style={s.step}>◆ Actions</Text><Text style={s.step}>◆ Loot</Text><Text style={s.percent}>{progress}%</Text></View>
          <Text style={s.loadingHint}>Your rewards are secured before this summary appears.</Text>
        </View>}
        {phase==='summary'&&reward&&<View style={s.card} accessibilityLiveRegion="polite">
          <Text style={s.eyebrow}>ACTIVITY COMPLETE</Text><Text style={s.title}>{activityName(activity)}</Text>
          <Text style={s.summary}>{duration(reward.elapsedSeconds)} settled · {formatGameNumber(reward.kills,numberMode)} {activity?.kind==='combat'?'encounters':'actions'}</Text>
          {environment&&<View style={[s.environment,{borderColor:environment.weatherColor}]}><Text style={[s.environmentTitle,{color:environment.weatherColor}]}>{environment.seasonSymbol} {environment.seasonName} · {environment.weatherSymbol} {environment.weatherName}</Text><Text style={s.environmentText}>{effect?.notes.join(' · ')}</Text></View>}
          <View style={s.totals}><View style={s.total}><Text style={s.totalNumber}>+{formatGameNumber(reward.xp,numberMode)}</Text><Text style={s.totalLabel}>XP</Text></View><View style={s.total}><Text style={[s.totalNumber,s.gold]}>+{formatGameNumber(reward.gold,numberMode)}</Text><Text style={s.totalLabel}>GOLD</Text></View><View style={s.total}><Text style={s.totalNumber}>{reward.items.length+visibleEventDrops.length+eventDiscoveries.length}</Text><Text style={s.totalLabel}>LOOT TYPES</Text></View></View>
          {activity?.kind==='combat'&&<Text style={s.combat}>{reward.stoppedReason?reward.stoppedReason:`Finished at ${reward.endHp??'—'} HP · ${reward.foodConsumed??0} food used`}</Text>}
          <View style={s.loot}><Text style={s.lootLabel}>REWARD BREAKDOWN</Text>{reward.items.map(x=><View key={x.itemId} style={s.lootRow}><Text style={s.item}>◆ {itemDef(x.itemId).name}</Text><Text style={s.quantity}>×{formatGameNumber(x.quantity,numberMode)}</Text></View>)}{visibleEventDrops.map(x=><View key={`${x.eventId}:${x.currencyId}`} style={[s.lootRow,s.eventRow]}><Text style={s.eventItem}>✦ {x.name}</Text><Text style={s.eventQuantity}>+{formatGameNumber(x.quantity,numberMode)}</Text></View>)}{eventDiscoveries.map(x=><View key={`${x.eventId}:${x.discoveryId}`} style={[s.lootRow,s.discoveryRow]}><Text style={s.discoveryItem}>◇ Rare discovery · {x.name}</Text><Text style={s.discoveryItem}>×{formatGameNumber(x.quantity,numberMode)}</Text></View>)}{!reward.items.length&&!visibleEventDrops.length&&!eventDiscoveries.length?<Text style={s.none}>No material, equipment, or event drops this time.</Text>:null}</View>
          <GameButton title="Continue" onPress={onClose}/>
        </View>}
      </ImageBackground>
    </View>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'#05090f',justifyContent:'center'},world:{flex:1,justifyContent:'center',padding:spacing.xl},mapImage:{opacity:.45},worldShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(3,9,17,.58)'},grid:{...StyleSheet.absoluteFillObject,opacity:.2,borderWidth:1,borderColor:C.accent},loadingCard:{backgroundColor:'rgba(12,20,31,.96)',borderWidth:1,borderColor:C.accent,borderRadius:radii.lg,padding:spacing.xl,gap:spacing.md},card:{backgroundColor:'rgba(16,26,39,.97)',borderWidth:1,borderColor:C.accent,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},loadingTitle:{...typography.hero,color:C.text},loadingSub:{...typography.body,color:C.info},track:{height:18,backgroundColor:C.bg,borderWidth:1,borderColor:C.line,borderRadius:9,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.good,borderRadius:9},progressRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,alignItems:'center'},step:{...typography.caption,color:C.muted,fontWeight:'800'},percent:{...typography.bodyStrong,color:C.accent,marginLeft:'auto'},loadingHint:{...typography.caption,color:C.muted},title:{...typography.hero,color:C.text},summary:{...typography.bodyStrong,color:C.good},environment:{borderLeftWidth:3,backgroundColor:C.panel2,padding:spacing.sm,gap:2},environmentTitle:{...typography.bodyStrong},environmentText:{...typography.caption,color:C.muted},totals:{flexDirection:'row',gap:spacing.sm},total:{flex:1,alignItems:'center',backgroundColor:C.panel2,borderRadius:radii.sm,padding:spacing.sm},totalNumber:{...typography.title,color:C.good},totalLabel:{...typography.caption,color:C.muted,fontWeight:'900'},gold:{color:C.accent},combat:{...typography.caption,color:C.info},loot:{gap:spacing.xs,paddingVertical:spacing.xs},lootLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},lootRow:{flexDirection:'row',justifyContent:'space-between',gap:spacing.sm,borderBottomWidth:1,borderColor:C.line,paddingVertical:spacing.xs},eventRow:{backgroundColor:'rgba(217,149,63,.10)',paddingHorizontal:spacing.xs},eventItem:{...typography.bodyStrong,color:'#efbd69',flex:1},eventQuantity:{...typography.bodyStrong,color:'#efbd69'},discoveryRow:{backgroundColor:'rgba(168,107,234,.12)',paddingHorizontal:spacing.xs},discoveryItem:{...typography.bodyStrong,color:'#cba0f5'},item:{...typography.body,color:C.text,flex:1},quantity:{...typography.bodyStrong,color:C.good},none:{...typography.body,color:C.muted}});
