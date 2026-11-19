/**
 * Read-only, hidden Bosses 2.0 encounter preview. It is NOT mounted in live
 * combat screens, routes, World Boss panels or any dungeon/party UI.
 * Only a verified stored SOLO snapshot may supply the preview and replay data.
 * Never calculate damage, stats, combat decisions or timers on the device.
 */
import React from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography} from '../theme/theme';
import {bossV2LocalizedCast,bossV2Words,
 BOSS_V2_PREVIEW_PUBLIC_ENABLED} from '../content/boss-v2-preview-locales';
import {projectBossV2Replay,
 type BossV2SafePreview,type BossV2ReplayEvent} from '../content/boss-v2-replay-preview';

const BOSS_NAMES:Readonly<Record<string,string>>={
 BOSS_EXP_ROOT:'Rootbound Heart',
 BOSS_EXP_BELL:'Bell-Warden',
 BOSS_EXP_SOLAR:'The Buried Heliarch',
 BOSS_EXP_SPHINX:'The Veiled Sphinx',
 BOSS_EXP_BELLBEAST:'The Bellbeast of Shiverlake',
 BOSS_EXP_CANTOR:'The Frozen Cantor',
};
const sec=(ms:number)=>(Math.ceil(ms/100)/10).toFixed(1)+'s';

export function BossV2CounterplayPreview({
 preview,events,serverCursorMs,locale='en',
}:{
 preview:BossV2SafePreview|null;
 events:readonly BossV2ReplayEvent[];
 serverCursorMs:number;
 locale?:string;
}){
 const C=useGameTheme();
 const {width,fontScale}=useWindowDimensions();
 const compact=width<360||fontScale>=1.3;
 const state=projectBossV2Replay(preview,events,serverCursorMs);
 const words=bossV2Words(locale);
 // Defense in depth: never display unsupported boss IDs or raw server text.
 // No client flag can activate gameplay. This is a preview-only component.
 if(BOSS_V2_PREVIEW_PUBLIC_ENABLED||!state||!preview||
    !BOSS_NAMES[preview.bossId])return null;
 const current=state.currentCast;
 const activeName=current?bossV2LocalizedCast(current.abilityId,locale)?.name:null;
 return <Panel style={[styles.root,{borderColor:C.lineStrong}]}>
  <View style={[styles.heading,compact&&styles.headingCompact]}>
   <View style={styles.grow}>
    <Text style={[typography.title,{color:C.text}]}>{words.title}</Text>
    <Text style={[typography.bodyStrong,{color:C.text}]}>{BOSS_NAMES[preview.bossId]}</Text>
   </View>
   <Text style={[typography.caption,{color:C.muted}]}>
    Preview only · server replay
   </Text>
  </View>
  {current&&activeName?
   <View style={[styles.active,{borderColor:C.lineStrong,backgroundColor:C.panel2}]}
    accessibilityLiveRegion="polite">
    <Text style={[typography.bodyStrong,{color:C.accent}]}>
     {activeName} · {current.remainingMs>0
       ?words.remaining+' '+sec(current.remainingMs):words.resolving}
    </Text>
    <View accessibilityRole="progressbar"
     accessibilityLabel={activeName+', '+words.remaining}
     accessibilityValue={{
      min:0,max:current.durationMs,now:current.durationMs-current.remainingMs,
     }}
     style={[styles.track,{backgroundColor:C.lineStrong}]}>
     <View style={[styles.fill,{
      backgroundColor:C.accent,
      width:`${Math.max(0,Math.min(100,
       (current.durationMs-current.remainingMs)/current.durationMs*100))}%` as `${number}%`,
     }]}/>
    </View>
   </View>:null}
  <Text style={[typography.bodyStrong,{color:C.text}]}>{words.upcoming}</Text>
  {preview.casts.map(cast=>{
   const translation=bossV2LocalizedCast(cast.abilityId,locale);
   if(!translation)return null;
   return <View key={cast.abilityId}
    style={[styles.cast,{borderColor:C.line}]}>
    <View style={[styles.heading,compact&&styles.headingCompact]}>
     <Text style={[typography.bodyStrong,styles.grow,{color:C.text}]}>
      {translation.name}
     </Text>
     <Text style={[typography.caption,{color:C.muted}]}>
      {cast.interruptible?words.interruptible:words.uninterruptible}
     </Text>
    </View>
    <Text style={[typography.body,{color:C.text}]}>{translation.tell}</Text>
    <Text style={[typography.caption,{color:C.accent}]}>{translation.counter}</Text>
    <Text style={[typography.caption,{color:C.muted}]}>{translation.fallback}</Text>
   </View>;
  })}
  <View style={[styles.phase,{borderColor:C.line}]}>
   <Text style={[typography.bodyStrong,{color:C.text}]}>
    {words.phase}: 70% / 35%
   </Text>
   <Text style={[typography.caption,{color:C.muted}]}>{words.legacyMoves}</Text>
   {state.latestPhase?
    <Text style={[typography.caption,{color:C.accent}]}>
     {words.complete}: {state.latestPhase.hpPercent}%
    </Text>:null}
  </View>
 </Panel>;
}
const styles=StyleSheet.create({
 root:{gap:spacing.sm,borderWidth:1},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
  gap:spacing.sm},
 headingCompact:{alignItems:'flex-start',flexDirection:'column'},
 grow:{flex:1},
 cast:{borderTopWidth:1,paddingTop:spacing.sm,gap:4},
 phase:{borderTopWidth:1,paddingTop:spacing.sm,gap:4},
 active:{borderWidth:1,borderRadius:radii.sm,padding:spacing.sm,gap:6},
 track:{height:8,borderRadius:radii.sm,overflow:'hidden'},
 fill:{height:'100%',borderRadius:radii.sm},
});
