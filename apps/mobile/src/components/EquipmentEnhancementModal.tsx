import {useGameplayText} from '../i18n/gameplay';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {ITEMS,itemDef} from '../content/items';
import {combinedQuantity,enhancedGearStatsAtRank,gearEnhancement,gemEffectDescription,gemSocketCapacity,gemSocketKind,gemSocketState,MAX_UPGRADE_RANK,upgradeQuote} from '../core/equipment-enhancement';
import {equipmentDecisionModel} from '../core/equipment-decision';
import {GameState} from '../core/types';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {DISPLAY_STAT_MULTIPLIER} from '../core/stat-display';
import {equipmentTheme,radii,spacing,touchTargetPreferred,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';

import {ActionFeedback} from './ActionFeedback';
import {enhancementFeedback,enhancementPityBonusPct,type EnhancementFeedbackResult} from '../core/visual-feedback';
import {canonicalGemMetaV1,effectFamilyCopiesV1,formatGemRollRangeV1,formatGemValueV1,gemUnsocketCostForStateV1,recommendedEffectFamiliesV1,resonanceForFamilyV1} from '../core/gem-progression-v1';
import {GEM_GRADE_LABEL_V1,GEM_ROLL_MIN_PERCENT_V1,GEM_ROLL_MAX_PERCENT_V1,GEM_ROLL_STEP_PERCENT_V1} from '../content/gems-v1';
import {gemPouchText} from '../i18n/gem-pouch-ui';
import {GemArtwork} from './GemArtwork';
import {ItemArtwork} from './ItemArtwork';

type Action=()=>Promise<void>|void;
type PendingGemAction={kind:'replace'|'reroll';gemId:string;currentGemId:string}|{kind:'extract';index:number;currentGemId:string};
function CostRow({label,owned,needed}:{label:string;owned:number;needed:number}){
 const {gt,gl,language}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),enough=owned>=needed;return <View style={s.costRow}><Text style={s.costLabel}>{label}</Text><Text style={[s.costValue,!enough&&s.missing]}>{owned.toLocaleString()} / {needed.toLocaleString()}</Text><Text accessibilityLabel={enough?gt("Available"):gt("Missing")} style={[s.costMark,enough?s.ready:s.missing]}>{enough?'✓':'!'}</Text></View>}
function StatPreview({label,current,next}:{label:string;current:number;next:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),format=(value:number)=>Number.isInteger(value)?String(value):value.toFixed(1);if(!current&&!next)return null;return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.statCurrent}>{format(current)}</Text><Text style={s.arrow}>›</Text><Text style={s.statNext}>{format(next)}</Text></View>}
/** Keep precision for small regional gains; never round a positive 4% gain to zero. */
function formatGearStat(value:number,delta=value){if(!Number.isFinite(value))return '—';const scaled=value*DISPLAY_STAT_MULTIPLIER,magnitude=Math.abs(delta*DISPLAY_STAT_MULTIPLIER);const digits=magnitude>0&&magnitude<.01?4:magnitude<.1?3:2;return Number(scaled.toFixed(digits)).toLocaleString('en-US',{maximumFractionDigits:digits});}
function UpgradeResultMoment({feedback,itemId,state,reduceMotion}:{feedback:EnhancementFeedbackResult;itemId:string;state:GameState;reduceMotion:boolean}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current,shake=useRef(new Animated.Value(0)).current;
  const upgrade=feedback.kind==='upgrade_success'||feedback.kind==='upgrade_failure',success=feedback.kind==='upgrade_success';
  useEffect(()=>{
    scale.stopAnimation();shake.stopAnimation();scale.setValue(1);shake.setValue(0);
    if(!upgrade||reduceMotion)return;
    if(success)Animated.sequence([Animated.spring(scale,{toValue:1.045,damping:9,stiffness:240,mass:.55,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:220,mass:.7,useNativeDriver:true})]).start();
    else Animated.sequence([-5,5,-3,3,0].map(value=>Animated.timing(shake,{toValue:value,duration:55,useNativeDriver:true}))).start();
  },[feedback,reduceMotion,scale,shake,success,upgrade]);
  if(!upgrade)return null;
  const before=enhancedGearStatsAtRank(state,itemId,feedback.previousRank),after=enhancedGearStatsAtRank(state,itemId,feedback.rank),deltas=[['ATK',after.attack-before.attack],['DEF',after.defense-before.defense],['HP',after.hp-before.hp]].filter(([,value])=>(value as number)>0);
  const color=success?C.good:C.warning,surface=success?C.goodSurface:C.warningSurface;
  return <Animated.View accessibilityLiveRegion="polite" style={[s.resultMoment,{borderColor:color,backgroundColor:surface,transform:[{translateX:shake},{scale}]}]}>
    <View style={s.resultTop}><Text style={[s.resultTitle,{color}]}>{success?gt("UPGRADE SUCCESS"):gt("TEMPERING FAILED")}</Text><Text style={[s.resultRank,{color}]}>{success?`+${feedback.previousRank} → +${feedback.rank}`:`+${feedback.rank} PROTECTED`}</Text></View>
    {success?<Text style={s.resultCopy}>{deltas.length?deltas.map(([label,value])=>`${label} +${formatGearStat(value as number)}`).join(' · '):gt("Rank increased successfully.")}</Text>:<Text style={s.resultCopy}>{gt("Rank protected")} · +{Math.max(0,feedback.pityAfterPct-feedback.pityBeforePct)}% {gt("next attempt")}</Text>}
  </Animated.View>;
}

function gemResultDetail(state:GameState,gemId:string,previewItemId?:string,installed=false){
  const gem=itemDef(gemId),meta=canonicalGemMetaV1(gem.id);
  if(meta){
    const enhancement=installed&&previewItemId?gearEnhancement(state,previewItemId):undefined;
    const roll=enhancement?(meta.kind==='stat'?enhancement.statGemRollPercent:enhancement.effectGemRollPercent):undefined;
    const value=installed?formatGemValueV1(meta.familyId,meta.grade,roll):formatGemRollRangeV1(meta.familyId,meta.grade);
    return meta.kind==='stat'
      ?`${GEM_GRADE_LABEL_V1[meta.grade]} · ${value}`
      :`${value} · ${gemEffectDescription(gem.id)} · Resonance ${previewItemId?Math.min(3,effectFamilyCopiesV1(state,meta.familyId,previewItemId)+1):resonanceForFamilyV1(state,meta.familyId).resonance}/III`;
  }
  return gemSocketKind(gem.id)==='stat'&&gem.gemStat?`+${Number(((gem.gemPercent??0)*100).toFixed(3))}% ${gem.gemStat}`:gemEffectDescription(gem.id);
}
function GemRollQuality({percent}:{percent?:number}){
 const {language}=useGameplayText();const gp=(label:string)=>gemPouchText(language,label);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const actual=percent??100,perfected=actual===GEM_ROLL_MAX_PERCENT_V1;
 const steps=(GEM_ROLL_MAX_PERCENT_V1-GEM_ROLL_MIN_PERCENT_V1)/GEM_ROLL_STEP_PERCENT_V1+1;
 const filled=(actual-GEM_ROLL_MIN_PERCENT_V1)/GEM_ROLL_STEP_PERCENT_V1+1;
 return <View accessible accessibilityLabel={gp('Roll quality')+' '+actual+'%'+(perfected?' · '+gp('Maximum roll'):'')} style={s.gemRollMeter}>
   <Text style={[s.gemRollLabel,perfected&&{color:C.good}]}>{gp('Roll quality')+' · '+actual+'%'}{percent===undefined?' · '+gp('Original bonus'):perfected?' · MAX':''}</Text>
   <View style={s.gemRollTicks}>{Array.from({length:steps},(_,index)=><View key={index} style={[s.gemRollTick,index<filled&&s.gemRollTickFilled,perfected&&s.gemRollTickPerfect]}/>)}</View>
 </View>;
}
function GemSocketResultMoment({feedback,state,itemId,reduceMotion}:{feedback:EnhancementFeedbackResult;state:GameState;itemId:string;reduceMotion:boolean}){
 const {gt,gl,language}=useGameplayText();const gp=(label:string)=>gemPouchText(language,label);
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current,change=feedback.socketChange;
  useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(!change||reduceMotion)return;Animated.sequence([Animated.spring(scale,{toValue:1.035,damping:10,stiffness:230,mass:.6,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:17,stiffness:200,mass:.75,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[feedback,change,reduceMotion,scale]);
  if(!change)return <ActionFeedback message={feedback.message} tone={feedback.tone} reduceMotion={reduceMotion}/>;
  const current=change.gemId?itemDef(change.gemId):undefined,previous=change.previousGemId?itemDef(change.previousGemId):undefined;
  const color=change.socketKind==='effect'?C.special:C.info,title=change.action==='socketed'?gt("GEM SOCKETED"):change.action==='replaced'?gt("GEM REPLACED"):change.action==='improved'?gp('GEM IMPROVED'):gt("GEM EXTRACTED");
  const headline=change.action==='replaced'?`${previous?.name??gt("Previous gem")} → ${current?.name??gt("New gem")}`:change.action==='extracted'?(previous?.name??gt("Gem")):(current?.name??gt("Gem"));
  const meta=current?canonicalGemMetaV1(current.id):undefined;
  const detail=change.action==='extracted'?gp('Returned to Gem Pouch or available storage.'):change.action==='improved'&&meta
    ?formatGemValueV1(meta.familyId,meta.grade,change.previousRollPercent)+' → '+formatGemValueV1(meta.familyId,meta.grade,change.rollPercent)
    :current?gemResultDetail(state,current.id,itemId,true):feedback.message;
  return <Animated.View accessibilityLiveRegion="polite" style={[s.gemResult,{borderColor:color,transform:[{scale}]}]}>
    <View style={s.resultTop}><Text style={[s.resultTitle,{color}]}>{title}</Text><Text style={[s.gemSlotLabel,{color}]}>{change.socketKind==='stat'?'STAT':'EFFECT'}</Text></View>
    <View style={s.gemResultBody}>{(current?.id??previous?.id)?<GemArtwork itemId={(current?.id??previous!.id)} size={48} framed={false}/>:null}<View style={s.flex}><Text style={s.gemResultName}>{headline}</Text><Text style={s.resultCopy}>{detail}{change.action==='replaced'?' · Previous gem returned safely.':''}</Text></View></View>
  </Animated.View>;
}

export function EquipmentEnhancementModal({visible,state,itemId,onClose,onUpgrade,onSocket,onReplace,onUnsocket,onOpenCodex,initialTab='upgrade'}:{initialTab?:'upgrade'|'gems';visible:boolean;state:GameState;itemId:string;onClose:()=>void;onUpgrade:Action;onSocket:(gemId:string)=>Promise<void>|void;onReplace:(gemId:string)=>Promise<void>|void;onUnsocket:(index:number)=>Promise<void>|void;onOpenCodex:()=>void}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);const gp=(label:string)=>gemPouchText(language,label);
  const [tab,setTab]=useState<'upgrade'|'gems'>(initialTab),[busy,setBusy]=useState(false),[confirmRisk,setConfirmRisk]=useState(false),[riskApprovedTarget,setRiskApprovedTarget]=useState<number|null>(null),[pendingGemAction,setPendingGemAction]=useState<PendingGemAction|null>(null);
  const [activeSocketKind,setActiveSocketKind]=useState<'stat'|'effect'>('stat'),[showDetails,setShowDetails]=useState(false),[showGemHelp,setShowGemHelp]=useState(false),[showAllCandidates,setShowAllCandidates]=useState(false);
  const [gemPickerOpen,setGemPickerOpen]=useState(false),[selectedGemId,setSelectedGemId]=useState<string|null>(null),[rerollNotice,setRerollNotice]=useState('');
  const item=itemDef(itemId),enhancement=gearEnhancement(state,itemId),quote=upgradeQuote(state,itemId),capacity=gemSocketCapacity(itemId),socketState=gemSocketState(state,itemId),decision=equipmentDecisionModel(state,itemId),rarity=rarityMeta(decision.rarity);
  const [feedback,setFeedback]=useState<EnhancementFeedbackResult|null>(null),[actionError,setActionError]=useState<string|null>(null);
  const previous=useRef({itemId,rank:enhancement.rank,failures:enhancement.failures,gemIds:enhancement.gemIds,statGemId:enhancement.statGemId,effectGemId:enhancement.effectGemId,statGemRollPercent:enhancement.statGemRollPercent,effectGemRollPercent:enhancement.effectGemRollPercent});
  useEffect(()=>{
    const next={itemId,rank:enhancement.rank,failures:enhancement.failures,gemIds:enhancement.gemIds,statGemId:enhancement.statGemId,effectGemId:enhancement.effectGemId,statGemRollPercent:enhancement.statGemRollPercent,effectGemRollPercent:enhancement.effectGemRollPercent};
    const result=enhancementFeedback(previous.current,next);previous.current=next;
    if(visible&&result)setFeedback(result);
  },[itemId,enhancement.rank,enhancement.failures,enhancement.gemIds,enhancement.statGemId,enhancement.effectGemId,enhancement.statGemRollPercent,enhancement.effectGemRollPercent,visible]);
  useEffect(()=>{setFeedback(null);setRerollNotice('');if(visible)setTab(initialTab)},[itemId,visible,initialTab]);
  useEffect(()=>{if(!visible)return;const sockets=gemSocketState(state,itemId);setActiveSocketKind(sockets.statGemId&&!sockets.effectGemId?'effect':'stat');setShowDetails(false);setShowGemHelp(false);setShowAllCandidates(false);setGemPickerOpen(false);setSelectedGemId(null)},[itemId,visible]);
  const currentStats=enhancedGearStatsAtRank(state,itemId,enhancement.rank),nextStats=enhancedGearStatsAtRank(state,itemId,Math.min(MAX_UPGRADE_RANK,enhancement.rank+1));
  const dust=combinedQuantity(state,'TEMPERING_DUST'),cores=combinedQuantity(state,'TEMPERING_CORE'),gold=state.character!.gold;
  const missingMaterial=quote.materials.find(material=>combinedQuantity(state,material.itemId)<material.quantity);
  const canUpgrade=!quote.maxed&&gold>=quote.gold&&dust>=quote.dust&&cores>=quote.cores&&!missingMaterial;
  const totalChancePct=Math.round(quote.successChance*100),pityPct=enhancementPityBonusPct(enhancement.failures),baseChancePct=Math.max(0,totalChancePct-pityPct);
  const unavailable=quote.maxed?gt("All regional improvements are complete"):gold<quote.gold?`Missing ${(quote.gold-gold).toLocaleString()} gold`:dust<quote.dust?`Missing ${quote.dust-dust} Tempering Dust`:cores<quote.cores?`Missing ${quote.cores-cores} Tempering Cores`:missingMaterial?`Missing ${missingMaterial.quantity-combinedQuantity(state,missingMaterial.itemId)} ${itemDef(missingMaterial.itemId).name}`:'';
  const ownedGems=useMemo(()=>ITEMS.filter(entry=>entry.type==='gem'&&combinedQuantity(state,entry.id)>0).sort((a,b)=>(b.gemTier??0)-(a.gemTier??0)||a.name.localeCompare(b.name)),[state]);
  const recommendations=useMemo(()=>recommendedEffectFamiliesV1(state,state.character!.classId),[state]),recommendationRank=new Map(recommendations.map((row,index)=>[row.family.familyId,index]));
  const statGems=ownedGems.filter(gem=>gemSocketKind(gem.id)==='stat');
  const effectGems=ownedGems.filter(gem=>gemSocketKind(gem.id)==='effect').sort((a,b)=>{
    const af=a.gemFamilyId?recommendationRank.get(a.gemFamilyId)??999:999,bf=b.gemFamilyId?recommendationRank.get(b.gemFamilyId)??999:999;
    return af-bf||(b.gemTier??0)-(a.gemTier??0)||a.name.localeCompare(b.name);
  });
  useEffect(()=>{setConfirmRisk(false);setRiskApprovedTarget(null);setPendingGemAction(null);setGemPickerOpen(false);setSelectedGemId(null)},[itemId,enhancement.rank,tab,visible]);
  const run=async(action:Action)=>{if(busy)return;setBusy(true);setFeedback(null);setActionError(null);try{await action()}catch(error){setActionError(error instanceof Error?error.message:gt("The action could not be completed."))}finally{setBusy(false)}};
  const attempt=()=>{if(quote.targetRank>=4&&riskApprovedTarget!==quote.targetRank){if(!confirmRisk){setConfirmRisk(true);return;}setRiskApprovedTarget(quote.targetRank);}setConfirmRisk(false);void run(onUpgrade)};
  const close=()=>{if(busy)return;if(pendingGemAction){setPendingGemAction(null);return;}if(confirmRisk){setConfirmRisk(false);return;}if(gemPickerOpen){setGemPickerOpen(false);setSelectedGemId(null);return;}onClose();};
  const leading=hasEquipmentArtwork(item)?<EquipmentArtwork item={item} compact/>:<View style={[s.artFallback,{borderColor:rarity.color}]}><Text style={s.artMark}>◆</Text></View>;

  const openGemSelection=(kind:'stat'|'effect')=>{
    setRerollNotice('');setActiveSocketKind(kind);setGemPickerOpen(true);setSelectedGemId(null);
    setShowAllCandidates(false);setPendingGemAction(null);
  };
  const equippedGemId=activeSocketKind==='stat'?socketState.statGemId:socketState.effectGemId;
  // Prioritize the equipped family so a duplicate regrind is always easy to find.
  const candidates=(activeSocketKind==='stat'?statGems:effectGems).slice().sort((a,b)=>Number(b.id===equippedGemId)-Number(a.id===equippedGemId));
  const selectedGem=selectedGemId?candidates.find(gem=>gem.id===selectedGemId):undefined;
  const selectedMeta=selectedGem?canonicalGemMetaV1(selectedGem.id):undefined;
  const currentRollPercent=activeSocketKind==='stat'?enhancement.statGemRollPercent:enhancement.effectGemRollPercent;
  const selectedPerfected=Boolean(selectedGem&&selectedGem.id===equippedGemId&&(currentRollPercent??100)>=GEM_ROLL_MAX_PERCENT_V1);
  const selectedBlocked=Boolean(selectedPerfected||(selectedMeta&&activeSocketKind==='effect'&&effectFamilyCopiesV1(state,selectedMeta.familyId,itemId)>=3));
  const materialCosts=[{id:'gold',name:gt("Gold"),owned:gold,needed:quote.gold},{id:'TEMPERING_DUST',name:gt("Tempering Dust"),owned:dust,needed:quote.dust},
    ...(quote.cores>0?[{id:'TEMPERING_CORE',name:gt("Tempering Cores"),owned:cores,needed:quote.cores}]:[]),
    ...quote.materials.map(material=>({id:material.itemId,name:itemDef(material.itemId).name,owned:combinedQuantity(state,material.itemId),needed:material.quantity}))];
  const primaryGemAction=()=>{
    if(!selectedGem||selectedBlocked||busy)return;
    if(equippedGemId){setPendingGemAction({kind:selectedGem.id===equippedGemId?'reroll':'replace',gemId:selectedGem.id,currentGemId:equippedGemId});return;}
    void run(async()=>{await onSocket(selectedGem.id);setGemPickerOpen(false);setSelectedGemId(null)});
  };
  return <GameModalSurface visible={visible} reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel={gt("Close equipment enhancement")} surfaceStyle={[s.card,{borderColor:rarity.color}]}>
    <GameModalHeader eyebrow={rarity.label+' · '+item.slot} title={item.name} onClose={close} closeDisabled={busy} leading={leading}/>
    <View style={s.compactContext}>
      <Text style={s.compactContextText}>{gt("Equipment enhancement")}</Text>
      <Text style={s.compactRankBadge}>{'+'+enhancement.rank+' / '+MAX_UPGRADE_RANK}</Text>
    </View>
    <View accessibilityRole="tablist" style={s.tabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='upgrade'}} onPress={()=>setTab('upgrade')} style={[s.tab,tab==='upgrade'&&s.tabOn]}><Text style={[s.tabText,tab==='upgrade'&&s.tabTextOn]}>{gt("Enhance")}</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='gems'}} onPress={()=>setTab('gems')} style={[s.tab,tab==='gems'&&s.tabOn]}><Text style={[s.tabText,tab==='gems'&&s.tabTextOn]}>{gt("Gems")+' · '+socketState.filled+'/'+capacity}</Text></Pressable>
    </View>
    <ScrollView style={s.scroll} contentContainerStyle={s.compactBody} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      {actionError?<ActionFeedback message={actionError} tone="error" reduceMotion={state.settings.reduceMotion}/>:null}
      {feedback?.kind==='sockets'&&tab==='gems'&&!gemPickerOpen?<GemSocketResultMoment feedback={feedback} state={state} itemId={itemId} reduceMotion={state.settings.reduceMotion}/>:null}
      {rerollNotice&&feedback?.socketChange?.action!=='improved'&&tab==='gems'&&!gemPickerOpen?<ActionFeedback message={rerollNotice} tone="info" reduceMotion={state.settings.reduceMotion} compact/>:null}
      {tab==='upgrade'?<>
        <View style={s.compactRankPanel}>
          <View style={s.compactRankRow}><Text style={s.compactRankText}>{'+'+enhancement.rank+'  →  '+(quote.maxed?'MAX':'+'+quote.targetRank)}</Text><Text style={s.compactRankAside}>{enhancement.rank+' / '+MAX_UPGRADE_RANK}</Text></View>
          <View accessibilityLabel={'Enhancement rank '+enhancement.rank+' of '+MAX_UPGRADE_RANK} accessibilityRole="progressbar" style={s.rankSteps}>{Array.from({length:MAX_UPGRADE_RANK},(_,index)=>{const rank=index+1;return <View key={rank} style={[s.rankStep,rank<=enhancement.rank&&s.rankStepFilled,rank===quote.targetRank&&!quote.maxed&&s.rankStepNext]}/>})}</View>
        </View>
        {feedback&&<UpgradeResultMoment feedback={feedback} itemId={itemId} state={state} reduceMotion={state.settings.reduceMotion}/>}
        {quote.maxed?<View style={s.completedPanel}><Text style={s.completedTitle}>{gt("Fully enhanced")}</Text></View>:<>
          <Text style={s.section}>{gt("Gear stat gains")}</Text>
          <View style={s.compactStatGrid}>
            {([['ATK',currentStats.attack,nextStats.attack],['DEF',currentStats.defense,nextStats.defense],['HP',currentStats.hp,nextStats.hp]] as Array<[string,number,number]>).filter(([,before,after])=>after!==before).map(([name,before,after])=><View key={name} style={s.compactStatTile}><Text style={s.compactStatLabel}>{name}</Text><Text style={s.compactStatValue}>{'+'+formatGearStat(Math.max(0,after-before))}</Text><Text style={s.compactStatRange} numberOfLines={1}>{formatGearStat(before,after-before)+' → '+formatGearStat(after,after-before)}</Text></View>)}
          </View>
          <View style={s.compactChance}>
            <Text style={s.compactChancePct}>{totalChancePct+'%'}</Text>
            <View style={s.flex}><Text style={s.compactChanceTitle}>{gt("Success chance")}</Text><Text style={s.compactChanceNote}>{gt("Rank protected on failure")}</Text>{pityPct>0?<Text style={s.pityActive}>{'+'+pityPct+'% '+gt("failure bonus")}</Text>:null}</View>
          </View>
          <View style={s.compactSectionRow}><Text style={s.section}>{gt("Required materials")}</Text><Text style={[s.compactStatus,canUpgrade?s.ready:s.missing]}>{canUpgrade?gt("Ready"):gt("Missing materials")}</Text></View>
          <View style={s.compactCostGrid}>{materialCosts.map(cost=><View key={cost.id} style={[s.compactCostTile,cost.owned<cost.needed&&s.compactCostMissing]}>
            {cost.id==='gold'?<View style={s.compactGoldArt}><Text style={s.compactGoldMark}>●</Text></View>:<ItemArtwork itemId={cost.id} size={30}/>}
            <View style={s.flex}><Text numberOfLines={1} style={s.compactCostName}>{cost.name}</Text><Text style={[s.compactCostCount,cost.owned<cost.needed&&s.missing]}>{cost.owned.toLocaleString()+' / '+cost.needed.toLocaleString()}</Text></View>
          </View>)}</View>
          <Pressable accessibilityRole="button" accessibilityState={{expanded:showDetails}} onPress={()=>setShowDetails(value=>!value)} style={s.detailToggle}><Text style={s.detailToggleText}>{showDetails?gt("Hide details"):gt("Full cost & odds")}</Text><Text style={s.detailToggleMark}>{showDetails?'−':'+'}</Text></Pressable>
          {showDetails?<View style={s.compactDetails}>
            <View style={s.chanceHead}><Text style={s.section}>{gt("Success chance")}</Text><Text style={s.chanceValue}>{totalChancePct+'%'}</Text></View>
            <View style={s.track}><View style={[s.trackBase,{width:baseChancePct+'%'}]}/>{pityPct>0?<View style={[s.trackPity,{left:baseChancePct+'%',width:pityPct+'%'}]}/>:null}</View>
            <Text style={s.rule}>{gt("A failed tempering consumes its cost but never lowers your rank. Each miss improves the next chance, up to +10%.")}</Text>
            {decision.set?<Text style={s.rule}>{decision.set.tier+' · '+decision.set.name+' · '+decision.set.equippedPieces+'/'+decision.set.totalPieces+' '+gt("equipped")}</Text>:null}
          </View>:null}
          {confirmRisk?<View style={s.risk}><Text style={s.riskTitle}>{gt("FINAL IMPROVEMENT")}</Text><Text style={s.riskText}>{gt("Confirm spending these materials at {percent}% success.",{percent:totalChancePct})}</Text></View>:null}
        </>}
      </>:gemPickerOpen?<>
        <Pressable accessibilityRole="button" onPress={()=>{if(busy)return;if(pendingGemAction){setPendingGemAction(null);return;}setGemPickerOpen(false);setSelectedGemId(null)}} disabled={busy} style={s.compactBack}><Text style={s.compactBackText}>{'‹  '+gt("Back to sockets")}</Text></Pressable>
        <View style={s.compactSectionRow}><Text style={s.section}>{activeSocketKind==='stat'?gt("Choose a Stat Gem"):gt("Choose an Effect Gem")}</Text><GameButton compact title={gt("Gem Codex")} tone="secondary" disabled={busy} onPress={onOpenCodex}/></View>
        <Text style={s.compactHint}>{gt("Only gems you own are shown.")}</Text>
        {(showAllCandidates?candidates:candidates.slice(0,4)).map(gem=>{
          const meta=canonicalGemMetaV1(gem.id),gemRarity=rarityMeta(itemRarity(gem)),rec=meta&&activeSocketKind==='effect'?recommendations.find(row=>row.family.familyId===meta.familyId):undefined;
          const perfected=gem.id===equippedGemId&&(currentRollPercent??100)>=GEM_ROLL_MAX_PERCENT_V1;
          const blocked=Boolean(perfected||(meta&&activeSocketKind==='effect'&&effectFamilyCopiesV1(state,meta.familyId,itemId)>=3));
          return <Pressable key={gem.id} accessibilityRole="button" accessibilityState={{selected:selectedGemId===gem.id,disabled:blocked||busy}} onPress={()=>{setSelectedGemId(gem.id);setPendingGemAction(null)}} disabled={blocked||busy} style={[s.compactCandidate,selectedGemId===gem.id&&s.compactCandidateSelected]}>
            <GemArtwork itemId={gem.id} size={44} framed={false}/>
            <View style={s.flex}><Text numberOfLines={1} style={[s.socketTitle,{color:gemRarity.color}]}>{gem.name}</Text><Text style={s.compactCandidateMeta} numberOfLines={2}>{(meta?GEM_GRADE_LABEL_V1[meta.grade]+' · ':'')+gemResultDetail(state,gem.id,itemId)+' · ×'+combinedQuantity(state,gem.id)}</Text>{rec?<Text style={s.compactRecommended}>{'★ '+gt("Recommended")}</Text>:null}{gem.id===equippedGemId?<Text style={s.compactRecommended}>{gt("Equipped")}{perfected?' · '+gp('Maximum roll'):''}</Text>:null}{blocked&&!perfected?<Text style={s.missing}>{gt("Limit")}</Text>:null}</View>
            <Text style={s.compactChooseMark}>{perfected?'MAX':gem.id===equippedGemId?'✓':selectedGemId===gem.id?'●':'○'}</Text>
          </Pressable>
        })}
        {candidates.length===0?<Text style={s.reason}>{activeSocketKind==='stat'?gt("No Stat Gems owned."):gt("No Effect Gems owned. Visit the Codex to find more.")}</Text>:null}
        {candidates.length>4?<Pressable accessibilityRole="button" accessibilityState={{expanded:showAllCandidates}} onPress={()=>setShowAllCandidates(v=>!v)} style={s.detailToggle}><Text style={s.detailToggleText}>{showAllCandidates?gt("Show fewer gems"):gt("See all owned gems")}</Text><Text style={s.detailToggleMark}>{showAllCandidates?'−':'+'}</Text></Pressable>:null}
        {selectedGem&&!pendingGemAction?<View style={s.compactPreview}><Text style={s.section}>{gt("Change preview")}</Text>
          <View style={s.compactPreviewRow}><Text style={s.compactPreviewBefore} numberOfLines={2}>{equippedGemId?itemDef(equippedGemId).name:gt("Empty socket")}</Text><Text style={s.arrow}>→</Text><Text style={s.compactPreviewAfter} numberOfLines={2}>{selectedGem.name}</Text></View>
          <Text style={s.meta}>{gemResultDetail(state,selectedGem.id,itemId)}</Text>
          {equippedGemId&&equippedGemId!==selectedGem.id?<Text style={s.rule}>{gp('The replaced gem returns to storage without its previous socket roll.')}</Text>:null}
        </View>:null}
        {pendingGemAction&&(()=>{
          const current=itemDef(pendingGemAction.currentGemId),next=pendingGemAction.kind==='extract'?undefined:itemDef(pendingGemAction.gemId),fee=pendingGemAction.kind==='reroll'?{gold:0,dust:0}:gemUnsocketCostForStateV1(state,current.id),ownedNew=next?combinedQuantity(state,next.id):0,canAffordFee=gold>=fee.gold&&combinedQuantity(state,'GEM_DUST')>=fee.dust&&(!next||ownedNew>0);
          return <View style={s.gemConfirm}>
            <Text style={s.gemConfirmTitle}>{pendingGemAction.kind==='reroll'?gp('Improve gem roll?'):pendingGemAction.kind==='replace'?gt("Replace gem?"):gt("Extract gem?")}</Text>
            <View style={s.gemCompareArt}><GemArtwork itemId={current.id} size={44} framed={false}/>{next?<><Text style={s.gemCompareArrow}>→</Text><GemArtwork itemId={next.id} size={44} framed={false}/></>:null}<View style={s.flex}><Text style={s.gemConfirmText} numberOfLines={2}>{next?current.name+' → '+next.name:current.name}</Text><Text style={s.rule}>{pendingGemAction.kind==='reroll'?gp('One duplicate gem is consumed; the higher roll is kept.'):gp('The old gem returns to storage without its socket roll.')}</Text></View></View>
            {next?<Text style={s.gemConfirmCompare}>{gemResultDetail(state,current.id,itemId,true)} → {gemResultDetail(state,next.id,itemId)}</Text>:null}
            <Text style={[s.gemConfirmCost,!canAffordFee&&s.missing]}>{gt("Cost")+' · '+(next?'1× '+next.name+' + ':'')+(fee.gold?fee.gold.toLocaleString()+' '+gt("Gold"):gt("Free"))+(fee.dust?' + '+fee.dust+' '+gt("Gem Dust"):'')}</Text>
            {!canAffordFee?<Text style={s.reason}>{gt("Not enough materials for this change.")}</Text>:null}
            <Text style={s.compactHint}>{gt("Confirm below to apply this change.")}</Text>
          </View>;
        })()}
      </>:<>
        <View style={s.compactSectionRow}><Text style={s.section}>{gt("Gem sockets")}</Text><Text style={s.socketCount}>{socketState.filled+'/'+capacity}</Text></View>
        {([{kind:'stat' as const,label:gt("Stat Gem"),gemId:socketState.statGemId,index:0},{kind:'effect' as const,label:gt("Effect Gem"),gemId:socketState.effectGemId,index:1}]).map(slot=>{
          const gem=slot.gemId?itemDef(slot.gemId):undefined;
          return <View key={slot.kind} style={s.compactSocket}>
            <Pressable accessibilityRole="button" style={s.compactSocketSelect} onPress={()=>openGemSelection(slot.kind)} disabled={busy}>
              {gem?<GemArtwork itemId={gem.id} size={46} framed={false}/>:<View style={s.compactEmptyGem}><Text style={s.compactEmptyMark}>+</Text></View>}
              <View style={s.flex}><Text style={s.slotEyebrow}>{slot.label}</Text><Text numberOfLines={1} style={s.socketTitle}>{gem?.name??gt("Empty socket")}</Text><Text numberOfLines={2} style={s.compactCandidateMeta}>{gem?gemResultDetail(state,gem.id,itemId,true):slot.kind==='stat'?gt("Adds a stat bonus"):gt("Adds a combat effect")}</Text>
                {gem&&canonicalGemMetaV1(gem.id)?<GemRollQuality percent={slot.kind==='stat'?enhancement.statGemRollPercent:enhancement.effectGemRollPercent}/>:null}</View>
            </Pressable>
            <GameButton compact title={gem?gt("Change"):gt("Add gem")} disabled={busy} onPress={()=>openGemSelection(slot.kind)}/>
            {gem?<Pressable accessibilityRole="button" onPress={()=>{openGemSelection(slot.kind);setPendingGemAction({kind:'extract',index:slot.index,currentGemId:gem.id})}} style={s.compactExtract}><Text style={s.compactExtractText}>{gt("Extract")}</Text></Pressable>:null}
          </View>;
        })}
        <View style={s.compactHelpRow}><GameButton compact title={gt("Gem Codex")} tone="secondary" disabled={busy} onPress={onOpenCodex}/><Pressable accessibilityRole="button" onPress={()=>setShowGemHelp(value=>!value)}><Text style={s.detailToggleText}>{showGemHelp?gt("Hide gem rules"):gt("How gems work")}</Text></Pressable></View>
        {showGemHelp?<Text style={s.rule}>{gt("Each piece holds one Stat Gem and one Effect Gem. Replacing or extracting a gem returns the old gem to Gem Pouch, or Inventory/Bank if the pouch is full. Extraction can cost Gold and Gem Dust. Effect Gems may benefit from Resonance.")+' '+gp('New gems roll a bonus within the displayed range. Reapplying the same gem spends one duplicate and keeps the better roll.')}</Text>:null}
      </>}
    </ScrollView>
    {tab==='upgrade'&&!quote.maxed?<View style={s.actionFooter}>
      <GameButton title={confirmRisk?gt("Confirm attempt"):feedback?.kind==='upgrade_failure'?gt("Try again · ")+totalChancePct+'%':gt("Enhance to")+' +'+quote.targetRank} loading={busy} disabled={!canUpgrade} onPress={attempt}/>
      {!canUpgrade?<Text accessibilityLiveRegion="polite" style={s.reason}>{unavailable}</Text>:<Text style={s.compactFooterHint}>{gt("Rank protected on failure")}</Text>}
    </View>:null}
    {tab==='gems'&&gemPickerOpen&&pendingGemAction?(()=>{const pending=pendingGemAction;const fee=pending.kind==='reroll'?{gold:0,dust:0}:gemUnsocketCostForStateV1(state,pending.currentGemId);const affordable=gold>=fee.gold&&combinedQuantity(state,'GEM_DUST')>=fee.dust&&(pending.kind==='extract'||combinedQuantity(state,pending.gemId)>0);return <View style={s.actionFooter}><View style={s.gemConfirmActions}><View style={s.flex}><GameButton title={gt("Cancel")} tone="secondary" disabled={busy} onPress={()=>setPendingGemAction(null)}/></View><View style={s.flex}><GameButton title={pending.kind==='reroll'?gp('Confirm reroll'):pending.kind==='replace'?gt("Confirm replacement"):gt("Confirm extraction")} loading={busy} disabled={!affordable||busy} onPress={()=>void run(async()=>{await(pending.kind==='extract'?onUnsocket(pending.index):onReplace(pending.gemId));if(pending.kind==='reroll')setRerollNotice(gp('Gem consumed. Your best roll was kept.'));setPendingGemAction(null);setGemPickerOpen(false);setSelectedGemId(null)})}/></View></View></View>})():null}
    {tab==='gems'&&gemPickerOpen&&!pendingGemAction?<View style={s.actionFooter}>
      <GameButton title={selectedPerfected?gp('Maximum roll'):equippedGemId?(selectedGem?.id===equippedGemId?gp('Improve roll'):gt("Replace gem")):gt("Socket gem")} disabled={!selectedGem||selectedBlocked||busy} loading={busy} onPress={primaryGemAction}/>
    </View>:null}
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({compactContext:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:8,paddingHorizontal:spacing.sm},
compactContextText:{...typography.caption,color:C.muted},compactRankBadge:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
compactBody:{gap:spacing.sm,paddingVertical:spacing.sm,paddingBottom:spacing.md},
compactRankPanel:{padding:spacing.sm,borderWidth:1,borderColor:equipmentColors.line,borderRadius:radii.sm,backgroundColor:equipmentColors.stage,gap:4},
compactRankRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
compactRankText:{fontSize:25,fontWeight:'900',color:equipmentColors.goldSoft},compactRankAside:{...typography.caption,color:C.muted},
compactStatGrid:{flexDirection:'row',gap:spacing.sm},compactStatTile:{flex:1,minWidth:0,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,alignItems:'center',paddingVertical:spacing.sm,gap:2},
compactStatLabel:{...typography.caption,color:C.muted,fontWeight:'900'},compactStatValue:{...typography.title,color:C.good,fontWeight:'900'},compactStatRange:{fontSize:10,color:C.muted,textAlign:'center'},
compactChance:{flexDirection:'row',alignItems:'center',gap:spacing.md,borderWidth:1,borderColor:C.good,borderRadius:radii.sm,backgroundColor:C.goodSurface,padding:spacing.sm},
compactChancePct:{fontSize:26,fontWeight:'900',color:C.good},compactChanceTitle:{...typography.bodyStrong,color:C.text},compactChanceNote:{...typography.caption,color:C.muted},
compactSectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},compactStatus:{...typography.caption,fontWeight:'800'},
compactCostGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:6},
compactCostTile:{width:'49%',minHeight:60,flexDirection:'row',alignItems:'center',gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},compactCostMissing:{borderColor:C.bad},
compactCostName:{...typography.caption,color:C.text,fontWeight:'800'},compactCostCount:{...typography.caption,color:C.muted},
compactGoldArt:{width:30,height:30,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.selected,borderWidth:1,borderColor:equipmentColors.gold},
compactGoldMark:{color:equipmentColors.goldSoft,fontSize:20,fontWeight:'900'},compactDetails:{gap:spacing.sm,padding:spacing.sm,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
compactBack:{minHeight:touchTargetPreferred,justifyContent:'center'},compactBackText:{...typography.bodyStrong,color:C.info},
compactHint:{...typography.caption,color:C.muted},compactCandidate:{flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,borderRadius:radii.sm,padding:spacing.sm,minHeight:65},
compactCandidateSelected:{borderColor:C.info,borderWidth:2,backgroundColor:C.infoSurface},compactCandidateMeta:{...typography.caption,color:C.muted},compactRecommended:{...typography.caption,color:C.good,fontWeight:'800'},compactChooseMark:{fontSize:20,color:C.info},
compactPreview:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,borderRadius:radii.sm},
compactPreviewRow:{flexDirection:'row',alignItems:'center',gap:5},compactPreviewBefore:{flex:1,...typography.caption,color:C.muted},compactPreviewAfter:{flex:1,...typography.bodyStrong,color:C.good},
compactSocket:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
compactSocketSelect:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:spacing.sm,minHeight:58},
gemRollMeter:{gap:4,marginTop:4},gemRollLabel:{fontSize:9,lineHeight:12,color:C.info,fontWeight:'800'},
gemRollTicks:{flexDirection:'row',gap:3,maxWidth:164},gemRollTick:{flex:1,height:4,borderRadius:3,backgroundColor:C.line},gemRollTickFilled:{backgroundColor:C.info},gemRollTickPerfect:{backgroundColor:C.good},
compactEmptyGem:{width:46,height:46,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderStyle:'dashed',borderColor:C.line},
compactEmptyMark:{...typography.title,color:C.muted},compactExtract:{minHeight:touchTargetPreferred,justifyContent:'center',paddingHorizontal:spacing.sm,paddingVertical:4},compactExtractText:{...typography.caption,color:C.info},
compactHelpRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},
compactFooterHint:{...typography.caption,color:C.muted,textAlign:'center'},
card:{maxWidth:620,backgroundColor:equipmentColors.panel,borderWidth:2},socketSelect:{flex:1,flexDirection:'row',alignItems:'center',gap:spacing.sm,minWidth:0,minHeight:52},socketSelectionMark:{fontSize:18,fontWeight:'900',color:C.info},completedPanel:{padding:spacing.md,alignItems:'center',gap:4,backgroundColor:C.goodSurface,borderWidth:1,borderColor:C.good,borderRadius:radii.sm},completedTitle:{...typography.bodyStrong,color:C.good,fontWeight:'900'},scroll:{flexShrink:1,minHeight:0},actionFooter:{borderTopWidth:1,borderTopColor:C.line,paddingTop:spacing.sm,paddingBottom:spacing.xs,gap:4},priceStrip:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,flexWrap:'wrap',paddingVertical:spacing.sm},priceText:{...typography.bodyStrong,color:C.text,flexShrink:1},detailToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:spacing.sm,borderRadius:radii.sm,backgroundColor:C.panel2},detailToggleText:{...typography.caption,color:C.info,fontWeight:'800'},detailToggleMark:{fontSize:22,color:C.info,fontWeight:'800'},socketSelected:{borderColor:C.info,borderWidth:2,backgroundColor:C.infoSurface},flex:{flex:1,minWidth:0},meta:{...typography.caption,color:C.muted,textTransform:'capitalize'},setContext:{marginTop:spacing.sm,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:equipmentColors.line,backgroundColor:equipmentColors.stage,borderRadius:radii.sm},setName:{...typography.bodyStrong,color:equipmentColors.goldSoft},setSource:{...typography.caption,color:C.muted,maxWidth:'44%',textAlign:'right'},artFallback:{width:48,height:48,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg},artMark:{fontSize:22,color:C.muted},tabs:{flexDirection:'row',marginTop:spacing.md,borderBottomWidth:1,borderBottomColor:equipmentColors.line},tab:{flex:1,minHeight:touchTargetPreferred,alignItems:'center',justifyContent:'center'},tabOn:{borderBottomWidth:3,borderBottomColor:equipmentColors.selectedLine,backgroundColor:C.selection},tabText:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},tabTextOn:{color:equipmentColors.selectedLine},body:{gap:spacing.sm,paddingVertical:spacing.md,paddingBottom:spacing.xl},rankPanel:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.lg,padding:spacing.md,borderWidth:1,borderColor:equipmentColors.line,backgroundColor:equipmentColors.stage},rankNow:{fontSize:34,lineHeight:40,fontWeight:'900',color:C.text},rankNext:{fontSize:34,lineHeight:40,fontWeight:'900',color:equipmentColors.goldSoft},rankMiddle:{alignItems:'center'},rankLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},rankArrow:{fontSize:20,color:equipmentColors.gold},rankSteps:{height:8,flexDirection:'row',gap:3},rankStep:{flex:1,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},rankStepFilled:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selectedLine},rankStepNext:{borderColor:equipmentColors.gold,backgroundColor:equipmentColors.selected},stats:{borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},statRow:{minHeight:38,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},statLabel:{...typography.body,color:C.muted,flex:1},statCurrent:{...typography.bodyStrong,color:C.text,minWidth:46,textAlign:'right'},arrow:{fontSize:20,color:C.muted,paddingHorizontal:spacing.sm},statNext:{...typography.bodyStrong,color:C.good,minWidth:46},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},chanceHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},chanceValue:{...typography.title,color:equipmentColors.gold},track:{height:10,borderWidth:1,borderColor:C.line,backgroundColor:C.bg,overflow:'hidden',position:'relative'},trackBase:{position:'absolute',left:0,top:0,bottom:0,backgroundColor:equipmentColors.selectedLine},trackPity:{position:'absolute',top:0,bottom:0,backgroundColor:C.info},chanceBreakdown:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},baseChance:{...typography.caption,color:C.muted,fontWeight:'800'},pity:{...typography.caption,color:C.muted,fontWeight:'800'},pityActive:{color:C.info},resultMoment:{borderWidth:1,borderLeftWidth:4,borderRadius:radii.md,padding:spacing.sm,gap:4},resultTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},resultTitle:{...typography.bodyStrong,fontWeight:'900',letterSpacing:.7},resultRank:{...typography.title,fontWeight:'900'},resultCopy:{...typography.caption,color:C.text},gemResult:{borderWidth:1,borderLeftWidth:4,borderRadius:radii.md,padding:spacing.sm,gap:4,backgroundColor:C.panel2},gemResultBody:{flexDirection:'row',alignItems:'center',gap:spacing.sm},gemSlotLabel:{...typography.caption,fontWeight:'900',letterSpacing:.8},gemResultName:{...typography.bodyStrong,color:C.text,fontWeight:'900'},gemConfirm:{gap:spacing.xs,padding:spacing.sm,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},gemConfirmTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},gemCompareArt:{flexDirection:'row',alignItems:'center',gap:8},gemCompareArrow:{fontSize:18,color:C.warning,fontWeight:'900'},gemConfirmText:{...typography.bodyStrong,color:C.text},gemConfirmCompare:{...typography.caption,color:C.info,fontWeight:'800'},gemConfirmCost:{...typography.caption,color:C.warning,fontWeight:'800'},gemConfirmActions:{flexDirection:'row',gap:spacing.sm},costs:{borderWidth:1,borderColor:C.line},costRow:{minHeight:40,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},costLabel:{...typography.body,color:C.text,flex:1},costValue:{...typography.bodyStrong,color:C.text},costMark:{width:24,textAlign:'right',fontWeight:'900'},ready:{color:C.good},missing:{color:C.bad},rule:{...typography.caption,color:C.muted},reason:{...typography.caption,color:C.warning,textAlign:'center'},risk:{padding:spacing.sm,borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface},riskTitle:{...typography.caption,color:C.warning,fontWeight:'900'},riskText:{...typography.caption,color:C.text},socketSummary:{flexDirection:'row',justifyContent:'space-between'},socketCount:{...typography.bodyStrong,color:equipmentColors.gold},socket:{minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:1,padding:spacing.sm,backgroundColor:C.panel2},socketKind:{width:42,height:42,borderWidth:1,borderRadius:radii.sm,alignItems:'center',justifyContent:'center'},socketKindText:{fontSize:9,fontWeight:'900',letterSpacing:.6},slotEyebrow:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.7},gemOption:{minHeight:68,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:C.line,paddingVertical:spacing.sm},gem:{width:40,height:40,alignItems:'center',justifyContent:'center',borderWidth:1,backgroundColor:C.bg,transform:[{rotate:'45deg'}]},gemMark:{fontSize:20,transform:[{rotate:'-45deg'}]},socketTitle:{...typography.bodyStrong,color:C.text},codexRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm}});}
