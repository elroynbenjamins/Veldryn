import {useGameplayText} from '../i18n/gameplay';
import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {fetchRegionalCombatCadenceV1,runRegionalCombatV1,type RegionalCombatCadenceProjectionV1,type RegionalCombatResultV1} from '../online/regional-combat';
import {regionalCombatAvailabilityV1,regionalGemIntelV1,SUNSCAR_REGIONAL_ENCOUNTERS_V1} from '../core/regional-combat-catalog-v1';
import {itemDef} from '../content/items';
import {displayStat} from '../core/stat-display';

function cueText(cue:RegionalCombatResultV1['result']['replayCues'][number],text:(source:string)=>string){
 const seconds=(cue.atMs/1000).toFixed(1)+'s',ability=cue.abilityName?' · '+text(cue.abilityName):'';
 if(cue.type==='phase')return seconds+' · '+text('Boss phase')+ability;
 if(cue.type==='cast')return seconds+' · '+text('Cast')+ability;
 if(cue.type==='interrupt')return seconds+' · '+text('Interrupt')+ability;
 if(cue.type==='down')return seconds+' · '+(cue.targetName??text('Combatant'))+' '+text('down');
 if(cue.type==='victory'||cue.type==='wipe'||cue.type==='timeout')return seconds+' · '+text(cue.type.toUpperCase());
 if(cue.type==='damage')return seconds+' · '+(cue.actorName??text('Attack'))+ability+' · '+displayStat(cue.amount??0).toLocaleString()+(cue.critical?' '+text('CRIT'):'');
 if(cue.type==='heal')return seconds+' · '+(cue.actorName??text('Heal'))+ability+' · +'+displayStat(cue.amount??0).toLocaleString();
 return seconds+' · '+(cue.actorName??text('Shield'))+ability+' · '+displayStat(cue.amount??0).toLocaleString();
}
function compactDuration(ms:number){
 const seconds=Math.max(0,Math.ceil(ms/1000));
 if(seconds<60)return seconds+'s';
 const minutes=Math.ceil(seconds/60);
 if(minutes<60)return minutes+'m';
 const hours=Math.floor(minutes/60),rest=minutes%60;return hours+'h'+(rest?(' '+rest+'m'):'');
}
function rewardText(result:RegionalCombatResultV1,text:(source:string)=>string){
 const reward=result.reward;if(!result.result.victory)return result.result.reason==='timeout'?text('The encounter timed out. Improve your loadout and try again.'):text('Your character was defeated. Improve gear, Gems or class progression and retry.');
 if(!reward?.eligible)return text('Victory recorded. No Gem reward was rolled on this clear.');
 const parts:string[]=[];
 if(reward.gemItemId){let name=reward.gemItemId;try{name=itemDef(reward.gemItemId).name}catch{}parts.push((reward.pityTriggered?text('Pity guaranteed · '):'')+text(name));}
 if(reward.recipeUnlockedId)parts.push(text('New Effect Gem recipe discovered'));
 if(reward.duplicateRecipeDust)parts.push(text('Duplicate recipe · +')+reward.duplicateRecipeDust+' '+text('Gem Dust'));
 if(reward.regionalCatalysts)parts.push('+'+reward.regionalCatalysts+' '+text('Regional Catalyst'));
 return parts.length?parts.join(' · '):text('Victory recorded. Gem pity progress updated.');
}

export function RegionalCombatPanel({state,onRewardsChanged}:{state:GameState;onRewardsChanged?:()=>Promise<void>|void}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>styles(C),[C]);
 const [expanded,setExpanded]=useState(false);
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[last,setLast]=useState<{encounterId:string;result:RegionalCombatResultV1}|null>(null);
 const [cadence,setCadence]=useState<{projection:RegionalCombatCadenceProjectionV1;receivedAtMs:number}|null>(null),[tick,setTick]=useState(Date.now());
 const level=state.character?.level??0;
 const refreshCadence=async()=>{try{const projection=await fetchRegionalCombatCadenceV1();setCadence({projection,receivedAtMs:Date.now()});setTick(Date.now());}catch{/* The start endpoint remains authoritative if cadence projection is temporarily unavailable. */}};
 useEffect(()=>{if(!expanded)return;let active=true;void fetchRegionalCombatCadenceV1().then(projection=>{if(active){setCadence({projection,receivedAtMs:Date.now()});setTick(Date.now());}}).catch(()=>{});const id=setInterval(()=>setTick(Date.now()),1000);return()=>{active=false;clearInterval(id);};},[expanded]);
 const gradeRoman={1:'I',2:'II',3:'III'} as const;
 const run=async(encounterId:string)=>{
  if(!state.character||busy)return;setBusy(encounterId);setNotice('');
  try{
   const result=await runRegionalCombatV1(state.character.id,encounterId);setLast({encounterId,result});setNotice(rewardText(result,gl));
   await onRewardsChanged?.();await refreshCadence();
  }catch(error){setNotice(error instanceof Error?error.message:gt("Regional encounter failed. Please retry."));await refreshCadence();}
  finally{setBusy('');}
 };
 return <Panel accentSurface={E.panel}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={s.head}>
    <View style={s.flex}><Text style={s.eyebrow}>{gl('SUNSCAR · OPTIONAL')}</Text><Text style={s.title}>{gl('Special encounters')}</Text></View>
    <Text style={s.level}>{gl(expanded?'HIDE':'SHOW')}</Text>
  </Pressable>
  {expanded&&<><Text style={s.copy}>{gl('Optional battles for rare gems and materials, separate from idle hunts.')}</Text>
  <View style={s.list}>{SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(encounter=>{
   const locked=level<encounter.level,active=busy===encounter.id,recent=last?.encounterId===encounter.id,intel=regionalGemIntelV1(encounter,state.account.gemPityBySource);
   const projectedNow=cadence?cadence.projection.serverNow+(tick-cadence.receivedAtMs):tick,cadenceRow=cadence?.projection.encounters.find(row=>row.encounterId===encounter.id),availability=regionalCombatAvailabilityV1(encounter,cadenceRow,projectedNow),cadenceLocked=availability.coolingDown||availability.dailyCapped;
   const statusText=locked?gl('LV')+' '+encounter.level:availability.dailyCapped?gt("DAILY CAP"):availability.coolingDown?gl('READY IN')+' '+compactDuration(availability.readyInMs):gt("Ready").toLocaleUpperCase(language);
   const chance=(intel.chance*100).toFixed(intel.chance<.01?2:1)+'%';
   return <View key={encounter.id} style={[s.card,recent&&s.recent]}>
    <View style={s.row}><View style={s.flex}><Text style={s.kind}>{encounter.kind==='regional_boss'?gt("REGIONAL BOSS"):gl(encounter.kind.charAt(0).toUpperCase()+encounter.kind.slice(1)).toLocaleUpperCase(language)} · {gl('ZONE')} {encounter.zoneId.slice(-3)}</Text><Text style={s.name}>{gl(encounter.name)}</Text></View><Text style={locked||cadenceLocked?s.locked:s.ready}>{statusText}</Text></View>
    <Text style={s.description}>{gl(encounter.summary)}</Text>
    <View style={s.rewardIntel}><View style={s.row}><Text style={s.rewardLabel}>{gl('GEM · GRADE')} {gradeRoman[intel.grade]} · {chance}</Text>{intel.pityAt?<Text style={s.pityValue}>{gt("Pity").toLocaleUpperCase(language)} {intel.misses}/{intel.pityAt}</Text>:<Text style={s.pityValue}>{gl('Independent roll')}</Text>}</View>
    {intel.pityAt?<><View accessibilityLabel={`${gl('Gem pity')} ${intel.misses} ${gl('of')} ${intel.pityAt}; ${gl('guaranteed within')} ${intel.remaining} ${gl('eligible victories')}`} style={s.pityTrack}><View style={[s.pityFill,{width:(Math.max(3,intel.progress*100)+'%') as any}]}/></View><Text style={s.pityMeta}>{gl('Guaranteed in ≤')}{intel.remaining} {gl('eligible')} {gl(intel.remaining===1?'victory':'victories')}{intel.recipeChance?' · '+gl('Recipe')+' '+Math.round(intel.recipeChance*100)+'%':''}{intel.catalystChance?' · '+gl('Catalyst')+' '+Math.round(intel.catalystChance*100)+'%':''}</Text></>:<Text style={s.pityMeta}>{gl("Each victory has its own drop chance.")}</Text>}<Text style={s.pityMeta}>{gl('Cadence')} · {encounter.cooldownSeconds>=60?Math.round(encounter.cooldownSeconds/60)+'m':encounter.cooldownSeconds+'s'} {gl('between starts')}{availability.dailyRemaining!==undefined?' · '+availability.dailyRemaining+'/'+(cadenceRow?.dailyCap??encounter.dailyVictoryCap)+' '+gl('boss clears remaining'):''}{availability.dailyCapped&&availability.resetInMs!==undefined?' · '+gl('resets in')+' '+compactDuration(availability.resetInMs):''}</Text></View>
    {recent&&last?<View style={s.resultCard}>
      <View style={s.row}><Text style={last.result.result.victory?s.victory:s.defeat}>{last.result.result.victory?gt("VICTORY"):gt("DEFEAT")} · {Math.max(1,Math.round(last.result.result.durationMs/1000))}s</Text><Text style={s.resultMetric}>{displayStat(last.result.result.damageDone).toLocaleString()} {gl('DMG')}</Text></View>
      <View style={s.combatants}><View style={s.combatant}><Text style={s.combatantName}>{last.result.result.playerName}</Text><View style={s.hpTrack}><View style={[s.hpFill,{width:(Math.max(0,Math.min(100,last.result.result.playerHp/Math.max(1,last.result.result.playerMaxHp)*100))+'%') as any}]}/></View><Text style={s.hpText}>{displayStat(last.result.result.playerHp).toLocaleString()} / {displayStat(last.result.result.playerMaxHp).toLocaleString()} {gl('HP')}</Text></View>
      <View style={s.combatant}><Text style={s.combatantName}>{last.result.result.enemyName}</Text><View style={s.hpTrack}><View style={[s.hpFill,{width:(Math.max(0,Math.min(100,last.result.result.enemyHp/Math.max(1,last.result.result.enemyMaxHp)*100))+'%') as any}]}/></View><Text style={s.hpText}>{displayStat(last.result.result.enemyHp).toLocaleString()} / {displayStat(last.result.result.enemyMaxHp).toLocaleString()} {gl('HP')}</Text></View></View>
      {!!last.result.result.replayCues.length&&<View style={s.timeline}><Text style={s.timelineTitle}>{gt("KEY MOMENTS")}</Text>{last.result.result.replayCues.slice(-6).map((cue,index)=><Text key={cue.atMs+':'+cue.type+':'+index} style={s.timelineRow}>{cueText(cue,gl)}</Text>)}</View>}
      <View style={s.rewardReveal}><Text style={s.timelineTitle}>{gt("REWARD")}</Text><Text style={s.rewardResult}>{rewardText(last.result,gl)}</Text></View>
    </View>:null}
    <GameButton compact disabled={locked||cadenceLocked||Boolean(busy)} loading={active} title={active?gt("Resolving…"):availability.dailyCapped?gt("Daily cap reached"):availability.coolingDown?gl('Ready in')+' '+compactDuration(availability.readyInMs):encounter.kind==='regional_boss'?gt("Challenge boss"):gt("Challenge")} tone={encounter.kind==='regional_boss'?'primary':'secondary'} onPress={()=>run(encounter.id)}/>
   </View>;
  })}</View>
  {!!notice&&<View accessibilityRole="alert" style={s.notice}><Text style={s.noticeText}>{gl(notice)}</Text></View>}
  <Text style={s.foot}>{gl('Rewards are granted automatically after a victory.')}</Text></>}
 </Panel>;
}
function styles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm},eyebrow:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},level:{...typography.caption,color:C.info,fontWeight:'900'},copy:{...typography.body,color:C.muted,marginTop:4},list:{gap:7,marginTop:8},card:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},recent:{borderColor:C.info},kind:{fontSize:9,lineHeight:12,color:E.goldSoft,fontWeight:'900',letterSpacing:.65},name:{...typography.bodyStrong,color:C.text,fontWeight:'900'},description:{...typography.caption,color:C.muted,lineHeight:16},locked:{...typography.caption,color:C.muted,fontWeight:'900'},ready:{...typography.caption,color:C.good,fontWeight:'900'},rewardIntel:{gap:4,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.bg},rewardLabel:{...typography.caption,color:C.info,fontWeight:'900'},pityValue:{...typography.caption,color:C.muted,fontWeight:'900'},pityTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.line},pityFill:{height:'100%',borderRadius:99,backgroundColor:C.special},pityMeta:{...typography.caption,color:C.muted},victory:{...typography.caption,color:C.good,fontWeight:'900'},defeat:{...typography.caption,color:C.warning,fontWeight:'900'},resultCard:{gap:7,padding:8,borderWidth:1,borderColor:C.info,borderRadius:radii.sm,backgroundColor:C.bg},resultMetric:{...typography.caption,color:C.info,fontWeight:'900',marginLeft:'auto'},combatants:{gap:6},combatant:{gap:3},combatantName:{...typography.caption,color:C.text,fontWeight:'800'},hpTrack:{height:6,borderRadius:99,overflow:'hidden',backgroundColor:C.line},hpFill:{height:'100%',borderRadius:99,backgroundColor:C.good},hpText:{...typography.caption,color:C.muted,textAlign:'right'},timeline:{gap:2,paddingTop:2},timelineTitle:{fontSize:9,lineHeight:12,color:E.goldSoft,fontWeight:'900',letterSpacing:.7},timelineRow:{...typography.caption,color:C.muted},rewardReveal:{gap:2,paddingTop:5,borderTopWidth:1,borderTopColor:C.line},rewardResult:{...typography.caption,color:C.text,fontWeight:'800'},notice:{padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:radii.sm,marginTop:8},noticeText:{...typography.body,color:C.text},foot:{...typography.caption,color:C.muted,lineHeight:15,marginTop:7}
 });}
