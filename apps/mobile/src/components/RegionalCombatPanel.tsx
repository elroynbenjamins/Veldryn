import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {fetchRegionalCombatCadenceV1,runRegionalCombatV1,type RegionalCombatCadenceProjectionV1,type RegionalCombatResultV1} from '../online/regional-combat';
import {regionalCombatAvailabilityV1,regionalGemIntelV1,SUNSCAR_REGIONAL_ENCOUNTERS_V1} from '../core/regional-combat-catalog-v1';
import {itemDef} from '../content/items';

function cueText(cue:RegionalCombatResultV1['result']['replayCues'][number]){
 const seconds=(cue.atMs/1000).toFixed(1)+'s',ability=cue.abilityName?' · '+cue.abilityName:'';
 if(cue.type==='phase')return seconds+' · Boss phase'+ability;
 if(cue.type==='cast')return seconds+' · Cast'+ability;
 if(cue.type==='interrupt')return seconds+' · Interrupt'+ability;
 if(cue.type==='down')return seconds+' · '+(cue.targetName??'Combatant')+' down';
 if(cue.type==='victory'||cue.type==='wipe'||cue.type==='timeout')return seconds+' · '+cue.type.toUpperCase();
 if(cue.type==='damage')return seconds+' · '+(cue.actorName??'Attack')+ability+' · '+Math.round(cue.amount??0).toLocaleString()+(cue.critical?' CRIT':'');
 if(cue.type==='heal')return seconds+' · '+(cue.actorName??'Heal')+ability+' · +'+Math.round(cue.amount??0).toLocaleString();
 return seconds+' · '+(cue.actorName??'Shield')+ability+' · '+Math.round(cue.amount??0).toLocaleString();
}
function compactDuration(ms:number){
 const seconds=Math.max(0,Math.ceil(ms/1000));
 if(seconds<60)return seconds+'s';
 const minutes=Math.ceil(seconds/60);
 if(minutes<60)return minutes+'m';
 const hours=Math.floor(minutes/60),rest=minutes%60;return hours+'h'+(rest?(' '+rest+'m'):'');
}
function rewardText(result:RegionalCombatResultV1){
 const reward=result.reward;if(!result.result.victory)return result.result.reason==='timeout'?'The encounter timed out. Improve your loadout and try again.':'Your character was defeated. Improve gear, Gems or class progression and retry.';
 if(!reward?.eligible)return 'Victory recorded. No Gem reward was rolled on this clear.';
 const parts:string[]=[];
 if(reward.gemItemId){let name=reward.gemItemId;try{name=itemDef(reward.gemItemId).name}catch{}parts.push((reward.pityTriggered?'Pity guaranteed · ':'')+name);}
 if(reward.recipeUnlockedId)parts.push('New Effect Gem recipe discovered');
 if(reward.duplicateRecipeDust)parts.push('Duplicate recipe · +'+reward.duplicateRecipeDust+' Gem Dust');
 if(reward.regionalCatalysts)parts.push('+'+reward.regionalCatalysts+' Regional Catalyst');
 return parts.length?parts.join(' · '):'Victory recorded. Gem pity progress updated.';
}

export function RegionalCombatPanel({state,onRewardsChanged}:{state:GameState;onRewardsChanged?:()=>Promise<void>|void}){
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>styles(C),[C]);
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[last,setLast]=useState<{encounterId:string;result:RegionalCombatResultV1}|null>(null);
 const [cadence,setCadence]=useState<{projection:RegionalCombatCadenceProjectionV1;receivedAtMs:number}|null>(null),[tick,setTick]=useState(Date.now());
 const level=state.character?.level??0;
 const refreshCadence=async()=>{try{const projection=await fetchRegionalCombatCadenceV1();setCadence({projection,receivedAtMs:Date.now()});setTick(Date.now());}catch{/* The start endpoint remains authoritative if cadence projection is temporarily unavailable. */}};
 useEffect(()=>{let active=true;void fetchRegionalCombatCadenceV1().then(projection=>{if(active){setCadence({projection,receivedAtMs:Date.now()});setTick(Date.now());}}).catch(()=>{});const id=setInterval(()=>setTick(Date.now()),1000);return()=>{active=false;clearInterval(id);};},[]);
 const gradeRoman={1:'I',2:'II',3:'III'} as const;
 const run=async(encounterId:string)=>{
  if(!state.character||busy)return;setBusy(encounterId);setNotice('');
  try{
   const result=await runRegionalCombatV1(state.character.id,encounterId);setLast({encounterId,result});setNotice(rewardText(result));
   await onRewardsChanged?.();await refreshCadence();
  }catch(error){setNotice(error instanceof Error?error.message:'Regional encounter failed. Please retry.');await refreshCadence();}
  finally{setBusy('');}
 };
 return <Panel accentSurface={E.panel}>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>SERVER-VERIFIED · SUNSCAR</Text><Text style={s.title}>Regional Encounters</Text></View><Text style={s.level}>LV {level}</Text></View>
  <Text style={s.copy}>These are active combat encounters, not idle hunts. Your current equipment, companion and Effect Gems are frozen server-side when the fight starts.</Text>
  <View style={s.list}>{SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(encounter=>{
   const locked=level<encounter.level,active=busy===encounter.id,recent=last?.encounterId===encounter.id,intel=regionalGemIntelV1(encounter,state.account.gemPityBySource);
   const projectedNow=cadence?cadence.projection.serverNow+(tick-cadence.receivedAtMs):tick,cadenceRow=cadence?.projection.encounters.find(row=>row.encounterId===encounter.id),availability=regionalCombatAvailabilityV1(encounter,cadenceRow,projectedNow),cadenceLocked=availability.coolingDown||availability.dailyCapped;
   const statusText=locked?'LV '+encounter.level:availability.dailyCapped?'DAILY CAP':availability.coolingDown?'READY IN '+compactDuration(availability.readyInMs):'READY';
   const chance=(intel.chance*100).toFixed(intel.chance<.01?2:1)+'%';
   return <View key={encounter.id} style={[s.card,recent&&s.recent]}>
    <View style={s.row}><View style={s.flex}><Text style={s.kind}>{encounter.kind==='regional_boss'?'REGIONAL BOSS':encounter.kind.toUpperCase()} · ZONE {encounter.zoneId.slice(-3)}</Text><Text style={s.name}>{encounter.name}</Text></View><Text style={locked||cadenceLocked?s.locked:s.ready}>{statusText}</Text></View>
    <Text style={s.description}>{encounter.summary}</Text>
    <View style={s.rewardIntel}><View style={s.row}><Text style={s.rewardLabel}>GEM · GRADE {gradeRoman[intel.grade]} · {chance}</Text>{intel.pityAt?<Text style={s.pityValue}>PITY {intel.misses}/{intel.pityAt}</Text>:<Text style={s.pityValue}>NO PITY</Text>}</View>
    {intel.pityAt?<><View accessibilityLabel={`Gem pity ${intel.misses} of ${intel.pityAt}; guaranteed within ${intel.remaining} eligible victories`} style={s.pityTrack}><View style={[s.pityFill,{width:(Math.max(3,intel.progress*100)+'%') as any}]}/></View><Text style={s.pityMeta}>Guaranteed in ≤{intel.remaining} eligible {intel.remaining===1?'victory':'victories'}{intel.recipeChance?' · Recipe '+Math.round(intel.recipeChance*100)+'%':''}{intel.catalystChance?' · Catalyst '+Math.round(intel.catalystChance*100)+'%':''}</Text></>:<Text style={s.pityMeta}>Each verified victory rolls independently.</Text>}<Text style={s.pityMeta}>Cadence · {encounter.cooldownSeconds>=60?Math.round(encounter.cooldownSeconds/60)+'m':encounter.cooldownSeconds+'s'} between starts{availability.dailyRemaining!==undefined?' · '+availability.dailyRemaining+'/'+(cadenceRow?.dailyCap??encounter.dailyVictoryCap)+' boss clears remaining':''}{availability.dailyCapped&&availability.resetInMs!==undefined?' · resets in '+compactDuration(availability.resetInMs):''}</Text></View>
    {recent&&last?<View style={s.resultCard}>
      <View style={s.row}><Text style={last.result.result.victory?s.victory:s.defeat}>{last.result.result.victory?'VICTORY':'DEFEAT'} · {Math.max(1,Math.round(last.result.result.durationMs/1000))}s</Text><Text style={s.resultMetric}>{Math.round(last.result.result.damageDone).toLocaleString()} DMG</Text></View>
      <View style={s.combatants}><View style={s.combatant}><Text style={s.combatantName}>{last.result.result.playerName}</Text><View style={s.hpTrack}><View style={[s.hpFill,{width:(Math.max(0,Math.min(100,last.result.result.playerHp/Math.max(1,last.result.result.playerMaxHp)*100))+'%') as any}]}/></View><Text style={s.hpText}>{Math.round(last.result.result.playerHp).toLocaleString()} / {Math.round(last.result.result.playerMaxHp).toLocaleString()} HP</Text></View>
      <View style={s.combatant}><Text style={s.combatantName}>{last.result.result.enemyName}</Text><View style={s.hpTrack}><View style={[s.hpFill,{width:(Math.max(0,Math.min(100,last.result.result.enemyHp/Math.max(1,last.result.result.enemyMaxHp)*100))+'%') as any}]}/></View><Text style={s.hpText}>{Math.round(last.result.result.enemyHp).toLocaleString()} / {Math.round(last.result.result.enemyMaxHp).toLocaleString()} HP</Text></View></View>
      {!!last.result.result.replayCues.length&&<View style={s.timeline}><Text style={s.timelineTitle}>KEY MOMENTS</Text>{last.result.result.replayCues.slice(-6).map((cue,index)=><Text key={cue.atMs+':'+cue.type+':'+index} style={s.timelineRow}>{cueText(cue)}</Text>)}</View>}
      <View style={s.rewardReveal}><Text style={s.timelineTitle}>REWARD</Text><Text style={s.rewardResult}>{rewardText(last.result)}</Text></View>
    </View>:null}
    <GameButton compact disabled={locked||cadenceLocked||Boolean(busy)} loading={active} title={active?'Resolving…':availability.dailyCapped?'Daily cap reached':availability.coolingDown?'Ready in '+compactDuration(availability.readyInMs):encounter.kind==='regional_boss'?'Challenge boss':'Challenge'} tone={encounter.kind==='regional_boss'?'primary':'secondary'} onPress={()=>void run(encounter.id)}/>
   </View>;
  })}</View>
  {!!notice&&<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{notice}</Text></View>}
  <Text style={s.foot}>Gem rolls, pity, recipes and catalysts are settled by the server after a verified victory. Failed fights do not advance Gem pity.</Text>
 </Panel>;
}
function styles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm},eyebrow:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},level:{...typography.caption,color:C.info,fontWeight:'900'},copy:{...typography.body,color:C.muted,marginTop:4},list:{gap:7,marginTop:8},card:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},recent:{borderColor:C.info},kind:{fontSize:9,lineHeight:12,color:E.goldSoft,fontWeight:'900',letterSpacing:.65},name:{...typography.bodyStrong,color:C.text,fontWeight:'900'},description:{...typography.caption,color:C.muted,lineHeight:16},locked:{...typography.caption,color:C.muted,fontWeight:'900'},ready:{...typography.caption,color:C.good,fontWeight:'900'},rewardIntel:{gap:4,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.bg},rewardLabel:{...typography.caption,color:C.info,fontWeight:'900'},pityValue:{...typography.caption,color:C.muted,fontWeight:'900'},pityTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.line},pityFill:{height:'100%',borderRadius:99,backgroundColor:C.special},pityMeta:{...typography.caption,color:C.muted},victory:{...typography.caption,color:C.good,fontWeight:'900'},defeat:{...typography.caption,color:C.warning,fontWeight:'900'},resultCard:{gap:7,padding:8,borderWidth:1,borderColor:C.info,borderRadius:radii.sm,backgroundColor:C.bg},resultMetric:{...typography.caption,color:C.info,fontWeight:'900',marginLeft:'auto'},combatants:{gap:6},combatant:{gap:3},combatantName:{...typography.caption,color:C.text,fontWeight:'800'},hpTrack:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.line},hpFill:{height:'100%',borderRadius:99,backgroundColor:C.good},hpText:{...typography.caption,color:C.muted,textAlign:'right'},timeline:{gap:2,paddingTop:2},timelineTitle:{fontSize:9,lineHeight:12,color:E.goldSoft,fontWeight:'900',letterSpacing:.7},timelineRow:{...typography.caption,color:C.muted},rewardReveal:{gap:2,paddingTop:5,borderTopWidth:1,borderTopColor:C.line},rewardResult:{...typography.caption,color:C.text,fontWeight:'800'},notice:{padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:radii.sm,marginTop:8},noticeText:{...typography.body,color:C.text},foot:{...typography.caption,color:C.muted,lineHeight:15,marginTop:7}
 });}
