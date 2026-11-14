import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionContent,companionMessage,companionTranslator,companionLabel,companionError} from '../i18n/companions';
import {companionMissionDisplayName} from '../i18n/companion-missions-de';
import {localizedItemName} from '../i18n/starter-item-names';
import {formatLocalizedNumber} from '../i18n/translator';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameCommand} from '../core/game-commands';
import type {GameState} from '../core/types';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {assertCompanionIdle,companionView,recommendedCompanionMissionTeam} from '../core/companion-runtime';
import {COMPANION_MISSIONS,companionServerDefinition} from '../../../../backend/src/server/companions/content';
import {activeCompanionMissions,companionExpeditionPenCapacity,companionMissionRequirementSatisfied,validateCompanionMissionTeam} from '../../../../backend/src/server/companions/assignments';
import type {CompanionMissionDefinition,CompanionMissionRequirement} from '../../../../backend/src/server/companions/domain';
import {companionTeamPower} from '../../../../backend/src/server/companions/team';
import {GameButton} from './GameButton';
import {ResourceIcon} from './ResourceIcon';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {CompanionDisclosure,companionRarityBorder} from './CompanionPresentation';
import {companionArtSource} from '../theme/companion-art';
import {companionExpeditionStaminaCost} from '../core/companion-provisions';
import {companionAutoStaminaSelection,companionStaminaFoodOptions,companionStaminaSelectionTotal,type CompanionStaminaFoodSelection} from '../core/companion-stamina-selection';

function duration(ms:number){const h=Math.round(ms/3600000);return h+'h';}
function remaining(end:string,now:number){const sec=Math.max(0,Math.ceil((Date.parse(end)-now)/1000)),h=Math.floor(sec/3600),m=Math.ceil(sec%3600/60);return h?h+'h '+m+'m':m+'m';}



type ExpeditionFilter='all'|'short'|'long';
type ClaimedReward={missionId:string;name:string;grade?:string;reward:{companionEssence:number;gold:number;companionXp:number;bondXp:number;bondstones:number;materials:Record<string,number>;bonusRewardGranted?:boolean}};
function missionRequirements(req:CompanionMissionRequirement,t:ReturnType<typeof companionTranslator>,label:(value:string)=>string,fmt:(value:number)=>string){
 if(req.type==='role_count')return (req.count??1)+'× '+label(String(req.role));
 if(req.type==='affinity_count')return (req.count??1)+'× '+label(String(req.affinity))+' '+label('Affinity');
 if(req.type==='affinity_diversity')return (req.count??2)+'+ '+t('different Affinities');
 if(req.type==='affinity_unique')return t('All Affinities unique');
 if(req.type==='min_level')return (req.count===undefined?t('All')+' ':req.count+'× ')+t('Level {level}+',{level:req.value});
 if(req.type==='min_bond')return (req.count===undefined?t('All')+' ':req.count+'× ')+t('Bond {level}+',{level:req.value});
 if(req.type==='min_ascension')return (req.count===undefined?t('All')+' ':req.count+'× ')+t('Ascension')+' '+req.tier+'+';
 if(req.type==='min_rarity')return (req.count===undefined?t('All')+' ':req.count+'× ')+label(String(req.rarity))+'+';
 if(req.type==='max_rarity')return label(String(req.rarity))+' '+t('or lower');
 if(req.type==='origin_count')return (req.count??1)+'× '+({REG_001:'Asterfall',REG_SUNSCAR:'Sunscar',REG_FROSTMARCH:'Frostmarch',REG_ASHLANDS:'Ashlands'} as Record<string,string>)[req.originId];
 if(req.type==='min_team_power')return t('Power')+' '+fmt(req.value)+'+';
 if(req.type==='tag_count')return req.count+'× '+label(req.tag);
 if(req.type==='companion_id')return COMBAT_COMPANIONS.find(d=>d.id===req.companionId)?.name??req.companionId;
 return '';
}
export function CompanionExpeditionsV50Panel({state,now,onCommand}:{state:GameState;now:number;onCommand:(command:GameCommand)=>Promise<void>}){
 const language=useGameLanguage(),t=companionTranslator(language),label=(value:string)=>companionLabel(language,value);
 const fmt=(value:number)=>formatLocalizedNumber(language,value);
 const missionName=(id:string,name:string)=>companionMissionDisplayName(language,id,name);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {height:windowHeight}=useWindowDimensions();
 const view=companionView(state,now);
 const rotation=activeCompanionMissions(now),missions=rotation.definitions;
 const [missionId,setMissionId]=useState(missions[0]?.id??COMPANION_MISSIONS[0]?.id??'');
 const [filter,setFilter]=useState<ExpeditionFilter>('all');
 const [teamPickerOpen,setTeamPickerOpen]=useState(false),[foodOpen,setFoodOpen]=useState(false),[confirmOpen,setConfirmOpen]=useState(false);
 const [team,setTeam]=useState<string[]>(()=>{const first=missions[0];const result=first?recommendedCompanionMissionTeam(state,first.id,now):undefined;return result?.ready?result.ids:[];});
 const [foodSelection,setFoodSelection]=useState<CompanionStaminaFoodSelection[]>(()=>companionAutoStaminaSelection(state,companionExpeditionStaminaCost((missions[0]?.durationMs??7200000)/3600000)).selection);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[claimedReward,setClaimedReward]=useState<ClaimedReward|null>(null);
 const pendingClaim=useRef<string|null>(null),actionLock=useRef(false);
 const mission=missions.find(row=>row.id===missionId)??missions[0]??COMPANION_MISSIONS[0];
 const equipped=state.character?.equippedCombatCompanionId,trialRun=view.trial.progress.season.activeRun;
 const pens=state.account.companionSanctuary?.expeditionPensLevel??0,capacity=companionExpeditionPenCapacity(pens);
 const active=view.assignments.filter(row=>row.status==='active'&&Date.parse(row.endsAt)>now);
 const ready=view.assignments.filter(row=>row.status==='completed'||row.status==='active'&&Date.parse(row.endsAt)<=now);
 const assignments=[...ready,...active].sort((a,b)=>Date.parse(a.endsAt)-Date.parse(b.endsAt));
 const ownedIds=Object.keys(view.owned);
 const isIdle=(id:string)=>{if(id===equipped||trialRun?.teamCompanionIds?.includes(id))return false;try{assertCompanionIdle(state,id);return true;}catch{return false;}};
 const safeTeam=team.filter(id=>!!view.owned[id]);
 // Mirror the server's strict requirements; recommended power determines a reward grade, not entry.
 const requirementChecks=(row:CompanionMissionDefinition,ids:readonly string[])=>{
  const checks:{text:string;met:boolean}[]=[
   {text:t('Pens Lv {value0}',{value0:row.minimumPenLevel??1}),met:pens>=(row.minimumPenLevel??1)},
   {text:row.minCompanions===row.maxCompanions?row.minCompanions+' '+t('companions'):row.minCompanions+'–'+row.maxCompanions+' '+t('companions'),met:ids.length>=row.minCompanions&&ids.length<=row.maxCompanions},
  ];
  if(row.minimumLevel&&!row.requirements?.some(req=>req.type==='min_level'&&req.value>=row.minimumLevel!))checks.push({text:t('All')+'× '+t('Level {level}+',{level:row.minimumLevel}),met:ids.length>0&&ids.every(id=>(view.owned[id]?.level??0)>=row.minimumLevel!)});
  if(row.minimumBondLevel&&!row.requirements?.some(req=>req.type==='min_bond'&&req.value>=row.minimumBondLevel!))checks.push({text:t('All')+'× '+t('Bond {level}+',{level:row.minimumBondLevel}),met:ids.length>0&&ids.every(id=>(view.owned[id]?.bondLevel??0)>=row.minimumBondLevel!)});
  if(row.requiredRarities?.length)checks.push({text:row.requiredRarities.map(id=>label(id)).join(' / '),met:ids.length>0&&ids.every(id=>!!COMBAT_COMPANIONS.find(c=>c.id===id&&row.requiredRarities?.includes(c.rarity)))});
  if(row.requiredOriginId)checks.push({text:label(row.requiredOriginId),met:ids.length>0&&ids.every(id=>companionServerDefinition(id)?.originId===row.requiredOriginId)});
  for(const [role,count] of Object.entries(row.requiredRoles??{})){
   if(count&&!row.requirements?.some(req=>req.type==='role_count'&&req.role===role&&req.count>=count)){
    const req:CompanionMissionRequirement={type:'role_count',role:role as 'tank'|'damage'|'support',count};
    checks.push({text:missionRequirements(req,t,label,fmt),met:companionMissionRequirementSatisfied(req,ids,view.owned)});
   }
  }
  for(const req of row.requirements??[])checks.push({text:missionRequirements(req,t,label,fmt),met:ids.length>0&&companionMissionRequirementSatisfied(req,ids,view.owned)});
  return checks;
 };
 const mandatory=mission?requirementChecks(mission,safeTeam):[];
 const bonusChecks=mission?(mission.bonusRequirements??[]).map(req=>({text:missionRequirements(req,t,label,fmt),met:safeTeam.length>0&&companionMissionRequirementSatisfied(req,safeTeam,view.owned)})):[];
 const suggestion=mission?recommendedCompanionMissionTeam(state,mission.id,now):undefined;
 const check=mission?validateCompanionMissionTeam({missionId:mission.id,companionIds:safeTeam,owned:view.owned,assignments:view.assignments,equippedCompanionIds:new Set(equipped?[equipped]:[]),lockedTrialCompanionIds:new Set(trialRun?.teamCompanionIds??[]),expeditionPensLevel:pens}):{ok:false,reason:'NO_MISSION'};
 const power=companionTeamPower(safeTeam,view.owned);
 const requiredStamina=mission?companionExpeditionStaminaCost(mission.durationMs/3600000):100;
 const foodOptions=companionStaminaFoodOptions(state),staminaTotal=companionStaminaSelectionTotal(foodSelection),foodReady=staminaTotal>=requiredStamina;
 const hasCapacity=capacity>0&&active.length<capacity;
 const canSend=!!mission&&check.ok&&foodReady&&hasCapacity&&!busy;
 const visible=missions.filter(row=>filter==='all'||filter==='short'&&row.durationMs<=4*3600000||filter==='long'&&row.durationMs>4*3600000);
 const selectMission=(id:string)=>{
   if(busy)return;
   const next=missions.find(row=>row.id===id);if(!next)return;
   setMissionId(id);setMessage('');
   const recommended=recommendedCompanionMissionTeam(state,id,now);
   setTeam(recommended.ready?recommended.ids:[]);
   setFoodSelection(companionAutoStaminaSelection(state,companionExpeditionStaminaCost(next.durationMs/3600000)).selection);
 };
 const execute=async(command:GameCommand)=>{
   if(actionLock.current)return false;
   actionLock.current=true;setBusy(true);setMessage('');
   try{await onCommand(command);return true;}
   catch(error){setMessage(error instanceof Error?error.message:t('Unable to complete action.'));return false;}
   finally{actionLock.current=false;setBusy(false);}
 };
 const claim=async(id:string)=>{pendingClaim.current=id;const ok=await execute({type:'companion_assignment_claim',args:{id}});if(!ok)pendingClaim.current=null;};
 useEffect(()=>{
   const id=pendingClaim.current;if(!id)return;
   const row=view.assignments.find(item=>item.assignmentId===id);
   if(row?.status==='claimed'&&row.rewardSnapshot){
     const def=COMPANION_MISSIONS.find(item=>item.id===row.missionId);
     pendingClaim.current=null;
     setClaimedReward({missionId:row.missionId,name:def?.name??row.missionId,grade:row.performanceGrade,reward:row.rewardSnapshot});
   }
 },[state]);
 const start=async()=>{
   if(!canSend)return;
   const ok=await execute({type:'companion_assignment_start',args:{id:mission.id,ids:safeTeam,food:foodSelection}});
   if(ok){setConfirmOpen(false);setTeam([]);setFoodSelection([]);setMessage(t('Expedition started'));}
 };
 const toggleCompanion=(id:string)=>setTeam(current=>current.includes(id)?current.filter(value=>value!==id):!isIdle(id)?current:mission&&current.length>=mission.maxCompanions?[...current.slice(1),id]:[...current,id]);
 const setFoodQuantity=(itemId:string,quantity:number)=>{
   const option=foodOptions.find(row=>row.itemId===itemId);if(!option)return;
   const next=Math.max(0,Math.min(option.owned,Math.floor(quantity)));
   setFoodSelection(current=>[...current.filter(item=>item.itemId!==itemId),...(next?[{itemId,quantity:next}]:[])]);
 };
 const cost=(row:(typeof COMPANION_MISSIONS)[number])=><View style={s.costLine}><ResourceIcon resourceId="gold" size={17}/><Text style={s.value}>{fmt(row.costs.gold)}</Text>{Object.entries(row.costs.materials??{}).map(([id,quantity])=><View key={id} style={s.inline}><ResourceIcon resourceId={id} size={17}/><Text style={s.value}>{quantity}</Text></View>)}</View>;
 const rewards=(row:(typeof COMPANION_MISSIONS)[number])=><View style={s.rewardWrap}>
  <Text style={s.rewardText}>{fmt(row.baseRewards.companionEssence)} {t('Essence')}</Text>
  <Text style={s.rewardText}>{fmt(row.baseRewards.companionXp)} {t('Companion XP')}</Text>
  <Text style={s.rewardText}>{fmt(row.baseRewards.bondXp)} {t('Bond XP')}</Text>
  <Text style={s.rewardText}>{fmt(row.baseRewards.gold)} {t('Gold')}</Text>
 </View>;
 return <View style={s.root}>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.eyebrow}>{t('COMPANION SANCTUARY')}</Text><Text accessibilityRole="header" style={s.title}>{t('Expeditions')}</Text><Text style={s.meta}>{t('Send companions on missions.')}</Text></View>
   <View style={s.headerIcon}><Text style={s.headerGlyph}>✦</Text></View>
  </View>
  <View style={s.stats}>
   <View style={s.stat}><Text style={s.statNumber}>{active.length}/{capacity}</Text><Text style={s.meta}>{t('Active')}</Text></View>
   <View style={s.stat}><Text style={[s.statNumber,ready.length>0&&s.good]}>{ready.length}</Text><Text style={s.meta}>{t('Ready to claim')}</Text></View>
   <View style={[s.stat,s.lastStat]}><Text style={s.statNumber}>{missions.length}</Text><Text style={s.meta}>{t('Weekly Missions')}</Text></View>
  </View>
  {assignments.length?<View style={s.activeList}>
   {assignments.map(row=>{
    const def=COMPANION_MISSIONS.find(item=>item.id===row.missionId),completed=row.status==='completed'||Date.parse(row.endsAt)<=now;
    const total=Math.max(1,Date.parse(row.endsAt)-Date.parse(row.startedAt));
    const elapsed=now-Date.parse(row.startedAt);
    const percentage=Number.isFinite(elapsed)&&Number.isFinite(total)?Math.max(0,Math.min(100,elapsed/total*100)):0;
    return <View key={row.assignmentId} style={[s.assignment,completed&&s.claimPanel]}>
     <View style={s.between}><View style={s.flex}><Text style={[s.eyebrow,completed&&s.good]}>{completed?t('EXPEDITION COMPLETE'):t('IN PROGRESS')}</Text><Text numberOfLines={2} style={s.itemTitle}>{def?missionName(def.id,def.name):row.missionId}</Text></View>
      {completed?<GameButton compact title={t('Claim')} loading={busy&&pendingClaim.current===row.assignmentId} disabled={busy} onPress={()=>claim(row.assignmentId)}/>:<Text style={s.timer}>{remaining(row.endsAt,now)}</Text>}</View>
     {completed?<Text style={s.meta}>{t('Ready to claim')}</Text>:<><View style={s.progress}><View style={[s.progressFill,{width:(percentage+'%') as any}]}/></View><Text numberOfLines={1} style={s.meta}>{row.companionIds.map(id=>COMBAT_COMPANIONS.find(d=>d.id===id)?.name??id).join(' · ')}</Text></>}
    </View>;
   })}
  </View>:<View style={s.quiet}><Text style={s.meta}>{t('No active expeditions.')}</Text></View>}
  <View style={s.headingRow}><View style={s.flex}><Text style={s.sectionTitle}>{t('Mission Board')}</Text><Text style={s.meta}>{t('Choose a mission.')}</Text></View><Text style={s.meta}>{t('Weekly Missions')}</Text></View>
  <View style={s.filters}>{([{id:'all',title:t('All')},{id:'short',title:t('Short')+' · 2–4h'},{id:'long',title:t('Long')+' · 6h+'}] as const).map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:filter===option.id}} onPress={()=>setFilter(option.id)} style={({pressed})=>[s.filter,filter===option.id&&s.filterSelected,pressed&&s.pressed]}><Text style={[s.filterText,filter===option.id&&s.filterTextSelected]}>{option.title}</Text></Pressable>)}</View>
  <View style={s.missionList}>{visible.map(row=>{
   const selected=row.id===mission?.id,locked=pens<(row.minimumPenLevel??1);
   return <Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected,disabled:busy}} accessibilityLabel={missionName(row.id,row.name)+' · '+duration(row.durationMs)} disabled={busy} onPress={()=>selectMission(row.id)} style={({pressed})=>[s.missionRow,selected&&s.selectedMission,pressed&&s.pressed]}>
    <View style={s.between}><Text style={[s.itemTitle,s.flex]} numberOfLines={2}>{selected?'◉  ':'○  '}{missionName(row.id,row.name)}</Text><Text style={s.duration}>{duration(row.durationMs)}</Text></View>
    <View style={s.between}><Text style={s.meta}>{row.minCompanions}–{row.maxCompanions} {t('companions')} · {t('Power')} {fmt(row.recommendedPower)}</Text><Text style={[s.rewardHint,locked&&s.warning]}>{locked?t('Locked'):fmt(row.baseRewards.companionEssence)+' '+t('Essence')}</Text></View>
    <View style={s.missionRequirementsRow}>{(row.requirements??[]).slice(0,3).map((req,index)=><Text key={index} numberOfLines={1} style={s.missionRequirementChip}>{missionRequirements(req,t,label,fmt)}</Text>)}</View>
    <View style={s.between}>{cost(row)}{locked?<Text style={s.warning}>{t('Pens Lv {value0}',{value0:row.minimumPenLevel??1})}</Text>:null}</View>
   </Pressable>;
  })}</View>
  {mission?<><View style={s.headingRow}><Text style={s.sectionTitle}>{t('Prepare Expedition')}</Text><Text style={[s.status,check.ok?s.good:s.warning]}>{check.ok?'✓ '+t('Team ready'):t('Not ready')}</Text></View>
   <View style={s.prepareCard}>
    <View style={s.between}><View style={s.flex}><Text style={s.itemTitle}>{missionName(mission.id,mission.name)}</Text><Text style={s.meta}>{duration(mission.durationMs)} · {mission.minCompanions}–{mission.maxCompanions} {t('companions')}</Text></View><Text style={s.duration}>{duration(mission.durationMs)}</Text></View>
    <View style={s.divider}/>
    <View style={s.between}><Text style={s.fieldTitle}>{t('Entry requirements')}</Text><Text style={[s.status,mandatory.every(req=>req.met)?s.good:s.warning]}>{t('{value0}/{value1} met',{value0:mandatory.filter(req=>req.met).length,value1:mandatory.length})}</Text></View>
    <View style={s.missionRequirementsRow}>{mandatory.map((req,index)=><Text key={index} style={[s.requirementChip,req.met?s.requirementMet:s.requirementMissing]}>{req.met?'✓ ':'○ '}{req.text}</Text>)}</View>
    <View style={s.between}><Text style={s.fieldTitle}>{t('Prepare Team')}</Text><GameButton compact tone="secondary" title={t('Choose Team')} disabled={busy} onPress={()=>setTeamPickerOpen(true)}/></View>
    <View style={s.portraitRow}>{Array.from({length:mission.maxCompanions},(_,index)=>{
      const id=safeTeam[index],def=id?COMBAT_COMPANIONS.find(item=>item.id===id):undefined;
      return <Pressable key={id??'slot'+index} accessibilityRole="button" accessibilityLabel={def?def.name:t('Choose Team')} onPress={()=>setTeamPickerOpen(true)} style={[s.portraitBox,def&&{borderColor:companionRarityBorder(def.rarity,C.dark)}]}>
        {id?<Image resizeMode="contain" source={companionArtSource(id)} style={s.portrait}/>:<Text style={s.emptyPortrait}>+</Text>}
      </Pressable>;
    })}<View style={s.flex}><Text style={s.meta}>{safeTeam.length}/{mission.maxCompanions} {t('selected')}</Text><Text style={[s.meta,check.ok?s.good:s.warning]} numberOfLines={2}>{check.ok?t('Team ready'):companionError(language,check.reason)}</Text></View></View>
    <GameButton compact tone="secondary" title={t('Use suggested team')} disabled={busy||!suggestion?.ready} onPress={()=>suggestion?.ready&&setTeam(suggestion.ids)}/>
    <View style={s.divider}/>
    <View style={s.between}><Text style={s.fieldTitle}>{t('EXPEDITION TEAM FIT')}</Text><Text style={[s.value,power>=mission.recommendedPower?s.good:s.warning]}>{fmt(power)} / {fmt(mission.recommendedPower)}</Text></View>
    <View style={s.progress}><View style={[s.progressFill,{width:(Math.min(100,power/Math.max(1,mission.recommendedPower)*100)+'%') as any}]}/></View>
    <View style={s.between}><Text style={s.meta}>{check.ok&&'grade' in check?t('Projected grade {value0}',{value0:check.grade}):t('Meet requirements to see grade')}</Text><Text style={[s.meta,check.ok&&'bonusRequirementMet' in check&&check.bonusRequirementMet?s.good:s.warning]}>{check.ok&&'bonusRequirementMet' in check&&check.bonusRequirementMet?t('✓ Bonus active'):t('○ Bonus not active')}</Text></View>
    <Text style={s.meta}>{t('Grades C–S are rewards, not entry requirements.')}</Text>
    <View style={s.between}><Text style={s.fieldTitle}>{t('Optional bonus requirements')}</Text><Text style={s.meta}>{bonusChecks.filter(req=>req.met).length}/{bonusChecks.length}</Text></View>
    <View style={s.missionRequirementsRow}>{bonusChecks.map((req,index)=><Text key={index} style={[s.requirementChip,req.met?s.requirementMet:s.requirementOptional]}>{req.met?'✓ ':'○ '}{req.text}</Text>)}</View>
    <View style={s.divider}/>
    <View style={s.between}><View style={s.flex}><Text style={s.fieldTitle}>{t('Expedition Supplies')}</Text><Text style={[s.meta,foodReady?s.good:s.warning]}>{Math.min(staminaTotal,requiredStamina).toFixed(1)} / {requiredStamina} {t('Stamina')}</Text></View><GameButton compact tone="secondary" title={t('Edit Food')} disabled={busy} onPress={()=>setFoodOpen(true)}/></View>
    {!foodReady?<GameButton compact tone="secondary" title={t('Auto Select Food')} disabled={busy} onPress={()=>setFoodSelection(companionAutoStaminaSelection(state,requiredStamina).selection)}/>:null}
   </View>
   <View style={s.prepareCard}><Text style={s.eyebrow}>{t('BASE REWARDS')}</Text>{rewards(mission)}<View style={s.materials}>{Object.entries(mission.baseRewards.materials??{}).map(([id,amount])=><View key={id} style={s.inline}><ResourceIcon resourceId={id} size={19}/><Text style={s.meta}>{amount} {localizedItemName(language,id)}</Text></View>)}</View><View style={s.divider}/><View style={s.between}><Text style={s.eyebrow}>{t('COST')}</Text>{cost(mission)}</View></View>
   <GameButton title={busy?t('Sending…'):t('Start Expedition')+' · '+duration(mission.durationMs)} disabled={!canSend} loading={busy} onPress={()=>setConfirmOpen(true)}/>
   {!hasCapacity?<Text style={s.warning}>{capacity===0?t('Build Expedition Pens to unlock missions.'):t('All expedition slots are occupied.')}</Text>:null}
   <CompanionDisclosure title={t('Mission Details')} summary={t('Requirements')+' · '+t('Bonus Team')} icon="inventory"><View style={s.details}>
    <Text style={s.eyebrow}>{t('Entry requirements')}</Text><View style={s.chips}>{mandatory.map((req,index)=><Text key={'req'+index} style={[s.chip,req.met?s.requirementMet:s.requirementMissing]}>{req.met?'✓ ':'○ '}{req.text}</Text>)}</View>
    <Text style={s.eyebrow}>{t('Optional bonus requirements')}</Text><View style={s.chips}>{bonusChecks.map((req,index)=><Text key={'bonus'+index} style={[s.chip,req.met?s.requirementMet:s.requirementOptional]}>{req.met?'✓ ':'○ '}{req.text}</Text>)}</View>
    {mission.specialtyBonus?<Text style={s.meta}>{companionContent(language,mission.specialtyBonus.label)}</Text>:null}
    <Text style={s.meta}>{t('Recommended Power {value0}',{value0:fmt(mission.recommendedPower)})}</Text>
   </View></CompanionDisclosure>
  </>:null}
  {message?<Text accessibilityLiveRegion="polite" style={[s.message,message===t('Expedition started')?s.good:s.warning]}>{companionMessage(language,message)}</Text>:null}
  <GameModalSurface visible={teamPickerOpen} onClose={()=>setTeamPickerOpen(false)} reduceMotion={state.settings.reduceMotion} surfaceStyle={{maxHeight:windowHeight*.88}}>
   <GameModalHeader title={t('Choose Team')} onClose={()=>setTeamPickerOpen(false)}/>
   <View style={s.modalContent}><Text style={s.meta}>{safeTeam.length}/{mission.maxCompanions} {t('selected')} · {t('minimum')} {mission.minCompanions}</Text><ScrollView style={{flexShrink:1}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
    {[...ownedIds].sort((a,b)=>Number(safeTeam.includes(b))-Number(safeTeam.includes(a))||Number(isIdle(b))-Number(isIdle(a))).map(id=>{
      const def=COMBAT_COMPANIONS.find(item=>item.id===id),selected=safeTeam.includes(id),available=isIdle(id);if(!def)return null;
      return <Pressable key={id} accessibilityRole="checkbox" accessibilityLabel={def.name+' · '+label(def.role)} accessibilityState={{checked:selected,disabled:busy||!available}} disabled={busy||!available} onPress={()=>toggleCompanion(id)} style={({pressed})=>[s.companionRow,selected&&s.chosenCompanion,!available&&s.unavailable,pressed&&s.pressed]}>
       <Image source={companionArtSource(id)} resizeMode="contain" style={[s.companionPortrait,{borderColor:companionRarityBorder(def.rarity,C.dark)}]}/>
       <View style={s.flex}><Text style={s.itemTitle}>{def.name}</Text><Text style={s.meta}>{label(def.role)} · {t('Lv {value0}',{value0:view.owned[id].level})}{!available?' · '+(id===equipped?t('Equipped'):t('Busy')):''}</Text></View><Text style={selected?s.good:s.meta}>{selected?'✓':'+'}</Text>
      </Pressable>;
    })}{!ownedIds.length?<Text style={s.meta}>{t('Unlock a companion to begin.')}</Text>:null}
   </ScrollView><Text style={[s.meta,check.ok?s.good:s.warning]}>{check.ok?t('Team ready'):companionError(language,check.reason)}</Text><View style={s.modalActions}><GameButton compact tone="secondary" title={t('Use suggested team')} disabled={busy||!suggestion?.ready} onPress={()=>suggestion?.ready&&setTeam(suggestion.ids)}/><GameButton title={t('Done')} disabled={busy} onPress={()=>setTeamPickerOpen(false)}/></View></View>
  </GameModalSurface>
  <GameModalSurface visible={foodOpen} onClose={()=>setFoodOpen(false)} reduceMotion={state.settings.reduceMotion} surfaceStyle={{maxHeight:windowHeight*.82}}>
   <GameModalHeader title={t('Expedition Supplies')} onClose={()=>setFoodOpen(false)}/>
   <View style={s.modalContent}><View style={s.between}><Text style={s.fieldTitle}>{t('COMPANION STAMINA')}</Text><Text style={foodReady?s.good:s.warning}>{Math.min(staminaTotal,requiredStamina).toFixed(1)} / {requiredStamina}</Text></View>
    <Text style={s.meta}>{t('Food from Inventory or Bank · Extra stamina gives no bonus.')}</Text>
    <ScrollView style={{flexShrink:1}} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
      {foodOptions.map(option=>{const quantity=foodSelection.find(item=>item.itemId===option.itemId)?.quantity??0;return <View key={option.itemId} style={s.foodRow}><View style={s.flex}><Text style={s.itemTitle}>{localizedItemName(language,option.itemId)}</Text><Text style={s.meta}>{option.stamina} {t('Stamina')} · {option.owned} {t('owned')}</Text></View><View style={s.stepper}><Pressable accessibilityRole="button" accessibilityLabel={t('Remove')+' '+localizedItemName(language,option.itemId)} accessibilityState={{disabled:quantity===0}} disabled={quantity===0} onPress={()=>setFoodQuantity(option.itemId,quantity-1)} style={s.stepperButton}><Text style={s.stepperText}>−</Text></Pressable><Text style={s.stepperNumber}>{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Add')+' '+localizedItemName(language,option.itemId)} accessibilityState={{disabled:quantity>=option.owned}} disabled={quantity>=option.owned} onPress={()=>setFoodQuantity(option.itemId,quantity+1)} style={s.stepperButton}><Text style={s.stepperText}>+</Text></Pressable></View></View>})}
      {!foodOptions.length?<Text style={s.warning}>{t('No available food. Cook food before starting an expedition.')}</Text>:null}
    </ScrollView><View style={s.modalActions}><GameButton compact tone="secondary" title={t('Clear')} disabled={busy} onPress={()=>setFoodSelection([])}/><GameButton compact tone="secondary" title={t('Auto Select Food')} disabled={busy} onPress={()=>setFoodSelection(companionAutoStaminaSelection(state,requiredStamina).selection)}/><GameButton title={t('Done')} disabled={busy} onPress={()=>setFoodOpen(false)}/></View>
   </View>
  </GameModalSurface>
  <GameModalSurface visible={confirmOpen} presentation="dialog" dismissOnBackdrop={!busy} onClose={()=>!busy&&setConfirmOpen(false)} reduceMotion={state.settings.reduceMotion}>
   <GameModalHeader title={t('Confirm Expedition')} onClose={()=>!busy&&setConfirmOpen(false)} closeDisabled={busy}/>
   <View style={s.modalContent}><Text style={s.itemTitle}>{missionName(mission.id,mission.name)}</Text><Text style={s.meta}>{duration(mission.durationMs)} · {safeTeam.length} {t('companions')} · {requiredStamina} {t('Stamina')}</Text>
    {rewards(mission)}<View style={s.divider}/><View style={s.between}><Text style={s.eyebrow}>{t('COST')}</Text>{cost(mission)}</View>{message?<Text accessibilityLiveRegion="polite" style={s.warning}>{companionMessage(language,message)}</Text>:null}<View style={s.modalActions}><GameButton tone="secondary" title={t('Cancel')} disabled={busy} onPress={()=>setConfirmOpen(false)}/><GameButton title={t('Start Expedition')} loading={busy} disabled={!canSend} onPress={start}/></View>
   </View>
  </GameModalSurface>
  <GameModalSurface visible={!!claimedReward} presentation="dialog" onClose={()=>setClaimedReward(null)} reduceMotion={state.settings.reduceMotion}>
   <GameModalHeader title={t('Expedition Complete')} onClose={()=>setClaimedReward(null)}/>
   {claimedReward?<View style={s.modalContent}><Text style={s.itemTitle}>{missionName(claimedReward.missionId,claimedReward.name)}</Text><Text style={[s.good,s.itemTitle]}>{t('Rewards Collected')}{claimedReward.grade?' · '+t('Grade')+' '+claimedReward.grade:''}</Text>
    <View style={s.rewardWrap}><Text style={s.rewardText}>{fmt(claimedReward.reward.companionEssence)} {t('Essence')}</Text><Text style={s.rewardText}>{fmt(claimedReward.reward.companionXp)} {t('Companion XP')}</Text><Text style={s.rewardText}>{fmt(claimedReward.reward.bondXp)} {t('Bond XP')}</Text><Text style={s.rewardText}>{fmt(claimedReward.reward.gold)} {t('Gold')}</Text>{claimedReward.reward.bondstones>0?<Text style={s.rewardText}>{claimedReward.reward.bondstones} {t('Bondstones')}</Text>:null}</View>
    {Object.entries(claimedReward.reward.materials).map(([id,quantity])=><View key={id} style={s.inline}><ResourceIcon resourceId={id} size={22}/><Text style={s.value}>{quantity} {localizedItemName(language,id)}</Text></View>)}
    {claimedReward.reward.bonusRewardGranted?<Text style={s.good}>{t('✓ Bonus reward received')}</Text>:null}
    <GameButton title={t('Continue')} onPress={()=>setClaimedReward(null)}/></View>:null}
  </GameModalSurface>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12},flex:{flex:1,minWidth:0},headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 eyebrow:{fontSize:10,letterSpacing:1,fontWeight:'800',color:C.muted},title:{...typography.title,fontSize:23,lineHeight:29,color:C.text},headerIcon:{height:44,width:44,borderRadius:12,borderWidth:1,borderColor:C.accent,alignItems:'center',justifyContent:'center',backgroundColor:C.accentSurface},headerGlyph:{fontSize:23,fontWeight:'900',color:C.accent},
 meta:{fontSize:11,lineHeight:16,color:C.muted,flexShrink:1},sectionTitle:{fontSize:16,lineHeight:22,color:C.text,fontWeight:'800'},itemTitle:{fontSize:13,lineHeight:19,color:C.text,fontWeight:'800'},fieldTitle:{fontSize:12,lineHeight:18,fontWeight:'800',color:C.text},value:{fontSize:12,fontWeight:'800',color:C.text},good:{color:C.good},warning:{fontSize:11,color:C.warning},timer:{fontSize:12,fontWeight:'900',color:C.accent},
 stats:{flexDirection:'row',borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,overflow:'hidden'},stat:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:10,borderRightWidth:1,borderRightColor:C.line,gap:2},lastStat:{borderRightWidth:0},statNumber:{color:C.text,fontSize:20,lineHeight:25,fontWeight:'900'},
 activeList:{gap:8},assignment:{borderRadius:radii.md,borderColor:C.line,borderWidth:1,backgroundColor:C.panel,padding:11,gap:8},claimPanel:{borderColor:C.good,backgroundColor:C.goodSurface},quiet:{padding:11,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},progress:{height:6,borderRadius:6,overflow:'hidden',backgroundColor:C.bg},progressFill:{height:'100%',borderRadius:6,backgroundColor:C.good},filters:{flexDirection:'row',gap:6},filter:{flexGrow:1,alignItems:'center',justifyContent:'center',minHeight:44,paddingHorizontal:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},filterSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},filterText:{fontSize:11,fontWeight:'800',color:C.muted,textAlign:'center'},filterTextSelected:{color:C.text},pressed:{opacity:.78},
 missionRequirementsRow:{flexDirection:'row',flexWrap:'wrap',gap:5},missionRequirementChip:{fontSize:10,lineHeight:15,color:C.muted,borderWidth:1,borderColor:C.line,borderRadius:5,paddingHorizontal:6,paddingVertical:3,overflow:'hidden'},requirementChip:{fontSize:11,lineHeight:16,borderWidth:1,borderRadius:6,paddingHorizontal:7,paddingVertical:5,overflow:'hidden'},requirementMet:{color:C.good,borderColor:C.good},requirementMissing:{color:C.warning,borderColor:C.warning},requirementOptional:{color:C.muted,borderColor:C.line},
 missionList:{gap:7},missionRow:{padding:11,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,gap:7},selectedMission:{borderColor:C.accent,backgroundColor:C.accentSurface},duration:{fontSize:11,fontWeight:'900',color:C.accent,borderWidth:1,borderColor:C.line,borderRadius:5,paddingVertical:3,paddingHorizontal:7,overflow:'hidden'},rewardHint:{fontSize:11,fontWeight:'800',color:C.good},costLine:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},inline:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0},prepareCard:{padding:12,borderRadius:radii.lg,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:10},divider:{height:1,backgroundColor:C.line},status:{fontSize:11,fontWeight:'800'},portraitRow:{flexDirection:'row',alignItems:'center',gap:7},portraitBox:{height:44,width:44,borderWidth:1,borderStyle:'solid',borderColor:C.line,borderRadius:9,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center',overflow:'hidden'},portrait:{width:42,height:42},emptyPortrait:{fontSize:22,fontWeight:'500',color:C.muted},
 rewardWrap:{flexDirection:'row',flexWrap:'wrap',gap:6},rewardText:{fontSize:11,color:C.good,fontWeight:'800',borderRadius:6,borderWidth:1,borderColor:C.line,backgroundColor:C.goodSurface,paddingVertical:5,paddingHorizontal:7},materials:{gap:6},details:{padding:10,gap:8},chips:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{fontSize:11,color:C.text,borderColor:C.line,borderWidth:1,borderRadius:20,paddingHorizontal:9,paddingVertical:6,overflow:'hidden'},message:{fontSize:12,textAlign:'center',padding:8},
 modalContent:{paddingHorizontal:14,paddingBottom:Math.max(18,12),gap:12},modalScroll:{paddingBottom:12,gap:5},modalActions:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap',paddingTop:10},companionRow:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8,paddingVertical:6,borderRadius:radii.sm,borderWidth:1,borderColor:'transparent'},chosenCompanion:{borderColor:C.selectionLine,backgroundColor:C.selection},unavailable:{opacity:.45},companionPortrait:{width:44,height:44,borderRadius:8,borderWidth:1,backgroundColor:C.panelRaised},foodRow:{flexDirection:'row',alignItems:'center',gap:8,minHeight:61,borderBottomWidth:1,borderBottomColor:C.line},stepper:{flexDirection:'row',alignItems:'center',gap:4},stepperButton:{height:44,width:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},stepperText:{fontSize:20,fontWeight:'800',color:C.accent},stepperNumber:{fontSize:14,fontWeight:'800',minWidth:24,textAlign:'center',color:C.text}
});}
