import {seasonalDungeonArtwork} from '../../theme/dungeon-preparation-art';
import {localizedSeasonalDungeonPreviewCopy} from '../../i18n/seasonal-dungeon-effects';
import {seasonalDungeonRoomTitle} from '../../i18n/seasonal-dungeon-copy';
import {DungeonHero,DungeonBossPreview,DungeonDisclosure,DungeonPartyRoles,DungeonReward} from './DungeonPreparation';
import {coopUiAssets} from '../../theme/coop-ui-assets';
import {liveEventDef} from '../../content/live-events';
import {liveEventVisuals} from '../../ui/live-event-visuals-active';
import {dungeonText as accountText} from '../../i18n/dungeon-preparation';
import {dungeonRewardPreviewText} from '../../i18n/dungeon-reward-preview';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useState,type ReactNode} from 'react';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopDungeonView,CoopRoomType,CoopTier} from '../../core/coop-dungeon-browsing';
import {coopTierEligibility,groupCoopDungeonsByRegion,highestEligibleCoopTier} from '../../core/coop-dungeon-browsing';
import type {CoopEventExpeditionPreview} from '../../core/coop-event-expeditions';
import type {CoopMode,CoopRunView} from '../../core/coop-presentation';
import {clt,coopPolicyText,ct,type CoopMessageKey,type Language} from '../../i18n';
import type {CoopUiAssetId} from '../../core/coop-ui-contract';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {CoopImageSlot,ExpeditionScreenShell,FantasyPanel,PrimaryAction,StateChip} from './CoopVisualKit';

const REGION_TAGLINE:Record<string,string>={
 Asterfall:'Starborn glades and lantern-lit vaults',
 Sunscar:'Sun-bleached ruins beneath a cracked observatory',
 Frostmarch:'Choir caves and shiverlakes beyond the pass',
 Ashlands:'Blackglass fens at the edge of the world',
};
const REGION_ACCENT:Record<string,'gold'|'cyan'|'violet'|'danger'>={
 Asterfall:'gold',Sunscar:'danger',Frostmarch:'cyan',Ashlands:'violet',
};
type BrowseProps={language:Language;dungeons:CoopDungeonView[];eventExpeditions:CoopEventExpeditionPreview[];mode:CoopMode;liveAvailable?:boolean;onMode:(mode:CoopMode)=>void;loading:boolean;error:string;activeRun?:CoopRunView;notice?:string;liveTools?:ReactNode;echoTools?:ReactNode;onQuickMatch?:()=>void;quickMatchBusy?:boolean;onBack:()=>void;onRetry:()=>void;onSelect:(dungeon:CoopDungeonView)=>void;onSelectEvent:(event:CoopEventExpeditionPreview)=>void;onResume:()=>void};
export function CoopDungeonList({language,dungeons,eventExpeditions,mode,liveAvailable=true,onMode,loading,error,activeRun,notice,liveTools,echoTools,onQuickMatch,quickMatchBusy=false,onBack,onRetry,onSelect,onSelectEvent,onResume}:BrowseProps){
 const {colors:coopColors,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),a=(value:string)=>accountText(language,value);
 const [showLocked,setShowLocked]=useState(false),[showLiveTools,setShowLiveTools]=useState(false),[showEchoTools,setShowEchoTools]=useState(false);
 const available=dungeons.filter(dungeon=>dungeon.available),locked=dungeons.filter(dungeon=>!dungeon.available);
 const hasUsableSnapshot=dungeons.length>0||eventExpeditions.length>0||!!activeRun;
 const showCatalog=(!loading&&!error)||hasUsableSnapshot;
 return <ExpeditionScreenShell compactHeader eyebrow="" title={st("Dungeons")} onBack={onBack} backLabel={a("Back")}>
   {notice?<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.error}>{notice}</Text></FantasyPanel>:null}
   {activeRun?<FantasyPanel variant="selected"><View style={s.modeHead}><Text style={[s.cardTitle,s.flex]}>{ct(language,'browse.resumeTitle')}</Text><PrimaryAction label={ct(language,'browse.resume')} onPress={onResume}/></View></FantasyPanel>:null}
   {showCatalog?<><Text style={s.catalogIntro}>{a('Choose a dungeon and plan your route.')}</Text><View style={s.filters}>
     <View style={s.flex}><PrimaryAction label={a("Solo")} tone="secondary" selected={mode==='qmode'} onPress={()=>onMode('qmode')}/></View>
     <View style={s.flex}><PrimaryAction label={a("Live")} tone="secondary" selected={mode==='live'} disabled={!liveAvailable} onPress={()=>onMode('live')}/></View>
   </View>
   <Text style={s.modeHint}>{mode==='live'?a("Play with three other players"):a("NPC or Echo allies fill the missing roles")}</Text>
   {mode==='live'&&onQuickMatch?<FantasyPanel variant="selected"><View style={s.quickMatch}><View style={s.flex}><Text style={s.cardTitle}>{st("Quick Match")}</Text><Text style={s.copy}>{a("Find an eligible party automatically")}</Text></View><PrimaryAction label={st("Find Party")} loading={quickMatchBusy} disabled={quickMatchBusy} onPress={onQuickMatch}/></View></FantasyPanel>:null}
   {mode==='live'&&liveTools?<><Pressable accessibilityRole="button" accessibilityState={{expanded:showLiveTools}} onPress={()=>setShowLiveTools(value=>!value)} style={({pressed})=>[s.liveToggle,pressed&&s.pressed]}><Text style={s.liveTitle}>{a("Group finder & options")}</Text><View style={s.flex}/><Text style={s.liveMark}>{showLiveTools?'−':'+'}</Text></Pressable>{showLiveTools?liveTools:null}</>:null}
   </>:null}
   {loading?<View accessibilityLiveRegion="polite" style={s.loading}><ActivityIndicator color={coopColors.cyan}/><Text style={s.copy}>{hasUsableSnapshot?a('Refreshing dungeon availability…'):ct(language,'browse.loading')}</Text></View>:null}
   {loading&&!hasUsableSnapshot?<View style={s.skeletonList}>{[0,1,2].map(index=><View key={index} style={s.skeletonCard}><View style={s.skeletonThumb}/><View style={s.skeletonCopy}><View style={s.skeletonLine}/><View style={[s.skeletonLine,s.skeletonLineShort]}/><View style={[s.skeletonLine,s.skeletonLineMid]}/></View></View>)}</View>:null}
   {error?<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.error}>{hasUsableSnapshot?a('Could not refresh. Showing previously loaded dungeons.')+' '+error:error}</Text><PrimaryAction label={ct(language,'browse.retry')} tone="secondary" onPress={onRetry}/></FantasyPanel>:null}
   {showCatalog&&available.length===0&&locked.length===0&&eventExpeditions.length===0?<Text style={s.copy}>{ct(language,'browse.empty')}</Text>:null}
   {showCatalog&&available.length>0?<View style={s.catalogHeading}><Text style={s.section}>{a('Ready now')}</Text><Text style={s.catalogCount}>{available.length} {st('Dungeons')} · {groupCoopDungeonsByRegion(available).length} {st('Regions')}</Text></View>:null}
   {showCatalog&&groupCoopDungeonsByRegion(available).map(group=>{const accent=REGION_ACCENT[group.region]??'gold';return <View key={group.region} style={s.regionGroup}>
     <View style={[s.regionBand,s[('regionBand_'+accent) as 'regionBand_gold']]}>
       <View style={s.regionBandHead}><Text style={[s.regionName,s[('regionName_'+accent) as 'regionName_gold']]}>{group.region}</Text><Text style={s.regionProgress}>{group.availableCount} {st('Ready')}</Text></View>
       {REGION_TAGLINE[group.region]?<Text style={s.regionTagline}>{st(REGION_TAGLINE[group.region])}</Text>:null}
     </View>
     {group.dungeons.map((dungeon,index)=><DungeonCard key={dungeon.id} language={language} dungeon={dungeon} featured={index===0} onPress={()=>onSelect(dungeon)}/>)}
   </View>;})}
   {showCatalog&&eventExpeditions.length>0?<View style={s.eventSection}><Text style={s.section}>{ct(language,'event.section')}</Text>{eventExpeditions.map(event=><EventExpeditionCard key={event.id} language={language} event={event} onPress={()=>onSelectEvent(event)}/>)}</View>:null}
   {showCatalog&&mode==='qmode'&&echoTools?<><Pressable accessibilityRole="button" accessibilityState={{expanded:showEchoTools}} onPress={()=>setShowEchoTools(value=>!value)} style={({pressed})=>[s.liveToggle,pressed&&s.pressed]}><Text style={s.liveTitle}>{a("My Echo & sharing")}</Text><View style={s.flex}/><Text style={s.liveMark}>{showEchoTools?'−':'+'}</Text></Pressable>{showEchoTools?echoTools:null}</>:null}
   {showCatalog&&locked.length>0?<><Pressable accessibilityRole="button" accessibilityState={{expanded:showLocked}} onPress={()=>setShowLocked(value=>!value)} style={({pressed})=>[s.liveToggle,pressed&&s.pressed]}><Text style={s.liveTitle}>{showLocked?a("Hide locked dungeons"):a("Locked dungeons")+' ('+locked.length+')'}</Text><View style={s.flex}/><Text style={s.liveMark}>{showLocked?'−':'+'}</Text></Pressable>{showLocked?groupCoopDungeonsByRegion(locked).map(group=>{const accent=REGION_ACCENT[group.region]??'gold';return <View key={group.region} style={s.regionGroup}>
     <View style={[s.regionBand,s[('regionBand_'+accent) as 'regionBand_gold']]}>
       <View style={s.regionBandHead}><Text style={[s.regionName,s[('regionName_'+accent) as 'regionName_gold']]}>{group.region}</Text><Text style={s.regionProgress}>{group.dungeons.length} {st('Locked')}</Text></View>
       {REGION_TAGLINE[group.region]?<Text style={s.regionTagline}>{st(REGION_TAGLINE[group.region])}</Text>:null}
     </View>
     {group.dungeons.map(dungeon=><DungeonCard key={dungeon.id} language={language} dungeon={dungeon} onPress={()=>onSelect(dungeon)}/>)}
   </View>;}):null}</>:null}
 </ExpeditionScreenShell>;
}

function DungeonCard({language,dungeon,onPress,featured=false}:{language:Language;dungeon:CoopDungeonView;onPress:()=>void;featured?:boolean}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
  const status=dungeon.available?ct(language,'browse.available'):`${ct(language,'browse.locked')}: ${dungeon.lockedReason}`;
  const inDev=dungeon.lockedReason==='In Development';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${dungeon.name}. ${status}. ${ct(language,'browse.levels',{min:dungeon.minLevel,recommended:dungeon.recommendedLevel})}`} accessibilityHint={ct(language,'browse.open')} onPress={onPress} style={({pressed})=>[s.questCard,featured&&dungeon.available&&s.featuredQuest,!dungeon.available&&s.lockedQuest,pressed&&s.pressed]}>
    <View style={s.cardRow}>
      <View style={s.cardThumbHolder}>
        <CoopImageSlot assetId={dungeon.id==='EXP_001'?'rootbound_hero':dungeon.artId} size="thumbnail" fallbackLabel={ct(language,'details.artUnavailable')} accessibilityLabel={dungeon.name}/>
        {inDev?<View style={s.ribbon}><Text style={s.ribbonText}>{st('Soon')}</Text></View>:null}
      </View>
      <View style={s.cardCopy}><View style={s.cardNameRow}><Text numberOfLines={2} style={[s.cardTitle,s.flex]}>{dungeon.name}</Text>{featured&&dungeon.available?<StateChip label={ct(language,'browse.available')} tone="success"/>:null}</View><Text style={s.questMeta}>{ct(language,'browse.requiresLevel',{level:dungeon.minLevel})} · {dungeon.estimatedMinutes.min}–{dungeon.estimatedMinutes.max} {accountText(language,'min')}</Text><Text numberOfLines={2} style={dungeon.available?s.routeHint:s.lock}>{dungeon.available?`${dungeon.preBossRoomMin===dungeon.preBossRoomMax?dungeon.preBossRoomMin:`${dungeon.preBossRoomMin}–${dungeon.preBossRoomMax}`} ${accountText(language,'rooms before the boss')}${dungeon.expectedMarksByTier?.[1]?` · ~${dungeon.expectedMarksByTier[1]} ${accountText(language,'Expedition Marks')}`:''}`:dungeon.lockedReason}</Text></View>
      <Text style={s.cardChevron}>›</Text>
    </View>
  </Pressable>;
}

function EventExpeditionCard({language,event,onPress}:{language:Language;event:CoopEventExpeditionPreview;onPress:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
  const available=event.status==='available',definition=liveEventDef(event.liveEventId??''),visuals=definition?liveEventVisuals(definition.visualKey):seasonalIdentity(event)?liveEventVisuals('veilbreak'):undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={event.name+'. '+(available?ct(language,'browse.available'):event.lockedReason??ct(language,'event.preview'))} onPress={onPress} style={({pressed})=>[s.cardPress,pressed&&s.pressed]}>
   <FantasyPanel><View style={s.cardRow}>{visuals?<Image source={seasonalDungeonArtwork(event.id,visuals.heroBackground)} resizeMode="cover" style={{width:72,height:88,borderRadius:10}}/>:null}<View style={s.cardCopy}><Text style={s.eventName}>{event.eventName}</Text><Text style={s.cardTitle}>{event.name}</Text><Text style={s.levels}>{ct(language,'browse.requiresLevel',{level:event.minLevel})}</Text></View></View><View style={s.modeHead}><View style={s.flex}><DungeonReward source={visuals?.commonCurrencyIcon} title={event.rewardMarks+' '+(definition?.currencyName??accountText(language,'event currency'))}/></View><StateChip label={available?st('LIVE'):ct(language,'event.preview')} tone={available?'success':'warning'}/></View>{!available&&event.lockedReason?<Text style={s.lock}>{event.lockedReason}</Text>:null}</FantasyPanel>
  </Pressable>;
}

function seasonalIdentity(event:CoopEventExpeditionPreview){
  if(event.id.includes('VEILBREAK')||event.eventName.toLowerCase().includes('veilbreak')) return {label:'GLOAM BREACH',short:'Ward lanterns weaken Blackout phases'};
  return undefined;
}

type EventDetailsProps={language:Language;event:CoopEventExpeditionPreview;currentLevel?:number;loadoutReady?:boolean;notice?:string;busy?:boolean;onBack:()=>void;onLaunch:(tier:1|2|3|4|5)=>void;onRefresh?:()=>void};
export function CoopEventExpeditionDetails({language,event,currentLevel,loadoutReady=true,notice,busy=false,onBack,onLaunch,onRefresh}:EventDetailsProps){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
  const [selectedTier,setSelectedTier]=useState<1|2|3|4|5>(1),[preparing,setPreparing]=useState(false);
  const tierRequiredLevel=event.tierMinLevels?.[selectedTier-1]??event.minLevel;
  const tierReward=event.tierRewardMarks?.[selectedTier-1]??event.rewardMarks;
  const tierReady=currentLevel===undefined||currentLevel>=tierRequiredLevel;
  const available=event.status==='available',meetsLevel=currentLevel===undefined||currentLevel>=event.minLevel,canLaunch=available&&meetsLevel&&tierReady&&loadoutReady;
  const identity=seasonalIdentity(event),definition=liveEventDef(event.liveEventId??''),visuals=definition?liveEventVisuals(definition.visualKey):identity?liveEventVisuals('veilbreak'):undefined;
  const localizedMechanic=event.mechanic?localizedSeasonalDungeonPreviewCopy(language,event.mechanic):undefined;
  const localizedObjective=event.objective?localizedSeasonalDungeonPreviewCopy(language,event.objective):undefined;
  const a=(text:string)=>accountText(language,text);
  const locked=!available?(event.lockedReason??st("Seasonal expedition unavailable")):!meetsLevel||!tierReady?ct(language,'browse.requiresLevel',{level:tierRequiredLevel}):!loadoutReady?st("No verified expedition-ready loadout is available. Refresh your co-op loadout first."):undefined;
  return <ExpeditionScreenShell compactHeader titleInHero eyebrow={st("SEASONAL EVENT EXPEDITION")} title={event.name} onBack={preparing?()=>setPreparing(false):onBack} backLabel={preparing?a('Back'):ct(language,'details.backList')} stickyAction={<View style={s.stickyStack}>{notice?<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>:null}{locked?<Text accessibilityRole="alert" style={s.lock}>{locked}</Text>:null}<PrimaryAction label={preparing?st("Launch seasonal expedition"):a('Prepare expedition')} loading={busy} disabled={!canLaunch} onPress={preparing?()=>onLaunch(selectedTier):()=>setPreparing(true)}/></View>}>
    {!loadoutReady&&onRefresh?<PrimaryAction label={clt(language,'refresh')} tone="secondary" loading={busy} onPress={onRefresh}/>:null}<DungeonHero title={event.name} source={seasonalDungeonArtwork(event.id,visuals?.heroBackground)} label={event.eventName} description={event.description}/>
    <View style={s.eventTitleRow}><StateChip label={ct(language,'browse.requiresLevel',{level:event.minLevel})}/><StateChip label={available?st("LIVE"):ct(language,'event.preview')} tone={available?'success':'warning'}/></View>
    <FantasyPanel><DungeonReward source={visuals?.commonCurrencyIcon} title={tierReward.toLocaleString()+' '+(definition?.currencyName??a('event currency'))} detail={identity?'150 Veilshards + reputation · 250 with 80+ Lantern Light':a('Base completion reward')}/></FantasyPanel>
    {event.id==='EVENT_FROSTFALL_AURORA_HOLLOW'?<FantasyPanel><Text style={s.cardTitle}>{ct(language,'details.difficulty')}</Text><View style={[s.tiers,{flexWrap:'wrap'}]}>{([1,2,3,4,5] as const).map(value=><TierChoice key={value} value={value} levelLabel={clt(language,'level')} difficultyLabel={ct(language,'details.difficulty')} requiredLevel={event.tierMinLevels?.[value-1]??10+(value-1)*5} currentLevel={currentLevel??0} selected={value===selectedTier} onPress={()=>{setSelectedTier(value);setPreparing(false);}}/>)}</View><Text style={s.copy}>{ct(language,'browse.requiresLevel',{level:tierRequiredLevel})} · {tierReward} {a('event currency')}</Text></FantasyPanel>:null}
    {preparing?<FantasyPanel variant="selected"><Text style={s.cardTitle}>{a('Expedition preparation')}</Text><Text style={s.copy}>{a('Your verified character and current expedition-ready loadout will enter with three eligible Echo recruits.')}</Text><DungeonPartyRoles language={language}/></FantasyPanel>:<DungeonDisclosure title={ct(language,'details.party')}><DungeonPartyRoles language={language} note={a('Your verified character + three eligible Echo recruits')}/></DungeonDisclosure>}
    <DungeonDisclosure key={String(preparing)} title={ct(language,'event.route')} initiallyOpen={preparing}>
      {event.routeNodeCount?<Text style={s.copy}>{event.routeNodeCount} {a('themed stages + final boss')}</Text>:null}
      {event.routeHighlights.map((item,index)=><View key={item} style={s.routeStage}><View style={s.routeNumber}><Text style={s.levels}>{index+1}</Text></View><Text style={[s.copy,s.flex]}>{seasonalDungeonRoomTitle(language,item)}</Text></View>)}

    </DungeonDisclosure>
    <DungeonBossPreview name={event.finalBoss} label={ct(language,'event.finalBoss')}/>
    {event.mechanic||event.objective?<DungeonDisclosure title={a('Mechanics & objectives')}>
      {event.mechanic?<><Text style={s.eventSignature}>{localizedMechanic?.label}</Text><Text style={s.copy}>{localizedMechanic?.description}</Text><StateChip label={event.mechanic.startValue+'/'+event.mechanic.maxValue}/></>:null}
      {event.objective?<><Text style={s.eventSignature}>{localizedObjective?.label}</Text><Text style={s.copy}>{localizedObjective?.description}</Text><StateChip label={event.objective.startCount+'/'+event.objective.maxCount}/></>:null}
    </DungeonDisclosure>:null}
    {identity?<DungeonDisclosure key={`guide-${preparing}`} title="Your first Gloam Breach" initiallyOpen={preparing}><Text style={s.copy}>Reach 80+ Lantern Light before the boss for 250 Veilshards and 250 reputation; otherwise earn 150 of each. Battles drain 6 Light. Lantern and chapel rooms restore it. At 28 Light or less, the boss hits 15% harder.</Text><Text style={s.copy}>Combat level 15+. The lobby syncs everyone to its average level, clamped to 15–35; starter equipment is enough to enter. Two successful clears per account per UTC day. Failed attempts do not consume a clear.</Text><Text style={s.copy}>Light and wards are different: each of the three restored wards removes 5% of the boss’s health. Restore all three to remove Lantern Extinction. Missing wards add Blackout phases; no wards adds Total Blackout.</Text><Text style={s.copy}>At 70% boss health, Lanterns Dim damages the party over time. At 35%, Regent’s Decree threatens wounded allies. Combat plays automatically: prepare through route choices, use camp rooms to recover, and review the boss preview before entering.</Text><Text style={s.copy}>Rare reward: 5% chance per clear for “the Veilbreaker”, a permanent orange title. The roll is the same at either Light reward tier.</Text></DungeonDisclosure>:null}
    <DungeonDisclosure title={a('Rewards & entry rules')}><Text style={s.copy}>{a('Mechanic and signature-objective performance can change the final encounter or payout.')}</Text>


      <Text style={s.copy}>{st("Route choices and combat outcomes are saved online after every decision. Closing the app does not discard an active seasonal run.")}</Text>
    </DungeonDisclosure>
  </ExpeditionScreenShell>;
}

type DetailsProps={language:Language;dungeon:CoopDungeonView;onMode?:(mode:CoopMode)=>void;currentLevel:number;currentPower?:number;mode:CoopMode;tier?:CoopTier;readyToStart?:boolean;busy?:boolean;liveFellowshipRemaining?:number;rewardBudget?:{charges:number;chargeCapacity:number;weeklyRemaining:number;weeklyCapacity:number;nextChargeAtMs?:number|null;failureConsolationRemaining?:number;failureConsolationCapacity?:number};notice?:string;onBack:()=>void;onTier:(tier:CoopTier)=>void;onContinue:(tier:CoopTier)=>void};
export function CoopDungeonDetails({language,dungeon,currentLevel,currentPower=0,mode,tier,busy=false,liveFellowshipRemaining=3,rewardBudget,notice,onBack,onTier,onContinue}:DetailsProps){
 const st=useSocialText();
 const {styles:s}=useCoopStyles(makeStyles),a=(text:string)=>accountText(language,text);
 const autoTier=mode==='live'?(dungeon.recommendedLiveTier??highestEligibleCoopTier(dungeon,currentLevel,currentPower)):highestEligibleCoopTier(dungeon,currentLevel,currentPower),effectiveTier=mode==='live'?autoTier:tier,eligibility=effectiveTier?coopTierEligibility(dungeon,effectiveTier,currentLevel,currentPower):undefined,requiredLevel=eligibility?.requiredLevel??dungeon.minLevel,canContinue=dungeon.available&&!!eligibility?.eligible;
 const fullMarks=effectiveTier?dungeon.expectedMarksByTier?.[effectiveTier]:undefined;
 const enhanced=rewardBudget?rewardBudget.charges>0&&rewardBudget.weeklyRemaining>0:undefined;
 const estimatedMarks=fullMarks===undefined?undefined:enhanced===false?Math.round(fullMarks*.2):fullMarks;
 const liveBonus=fullMarks!==undefined&&mode==='live'&&liveFellowshipRemaining>0?Math.max(1,Math.round(fullMarks*.25)):0;
 const tierPower=effectiveTier?dungeon.tierMinPower[effectiveTier]:dungeon.tierMinPower[1];
 const roomCount=dungeon.preBossRoomMin===dungeon.preBossRoomMax?String(dungeon.preBossRoomMin):dungeon.preBossRoomMin+'–'+dungeon.preBossRoomMax;
 return <ExpeditionScreenShell compactHeader titleInHero eyebrow={ct(language,'details.kicker')} title={dungeon.name} onBack={onBack} backLabel={ct(language,'details.backList')} stickyAction={<View style={s.stickyStack}>{notice?<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>:null}<PrimaryAction label={a('Prepare Loadout')} disabled={!canContinue||busy} loading={busy} onPress={()=>effectiveTier&&canContinue&&onContinue(effectiveTier)}/></View>}>
  <DungeonHero title={dungeon.name} source={dungeon.heroArtId?coopUiAssets[dungeon.heroArtId]:undefined} label={dungeon.region??ct(language,'details.kicker')} description=""/>
  <View style={s.quickFacts}><StateChip label={ct(language,'browse.requiresLevel',{level:requiredLevel})}/><StateChip label={(mode==='live'?'3–5':dungeon.estimatedMinutes.min+'–'+dungeon.estimatedMinutes.max)+' '+a('min')}/><StateChip label={`${roomCount} ${a('rooms before the boss')}`}/><StateChip label={mode==='live'?a('Live'):a('Solo')} tone="selected"/></View>
  {!dungeon.available?<Text accessibilityRole="alert" style={s.lock}>{dungeon.lockedReason??ct(language,'browse.locked')}</Text>:null}
  {currentPower<tierPower?<Text style={s.notice}>{a('Required Combat Power')}: {tierPower.toLocaleString()} · {a('Current')}: {currentPower.toLocaleString()}</Text>:null}
  {mode==='qmode'?<FantasyPanel><View style={s.modeHead}><Text style={[s.cardTitle,s.flex]}>{ct(language,'details.difficulty')}</Text><Text style={s.questMeta}>{clt(language,'level')} {currentLevel}</Text></View><View style={s.tiers}>{dungeon.difficulties.filter(value=>value<=3).map(value=><TierChoice key={value} value={value} levelLabel={clt(language,'level')} difficultyLabel={ct(language,'details.difficulty')} requiredLevel={dungeon.tierMinLevels[value]} requiredPower={dungeon.tierMinPower[value]} currentLevel={currentLevel} currentPower={currentPower} selected={tier===value} marks={dungeon.expectedMarksByTier?.[value]} onPress={()=>onTier(value)}/>)}</View>{!dungeon.difficulties.length?<Text style={s.lock}>{ct(language,'details.noDifficulty')}</Text>:null}</FantasyPanel>:<Text style={s.levels}>{ct(language,'details.liveAutoSelected',{tier:autoTier??'—'})}</Text>}
  <FantasyPanel>
   <Text accessibilityRole="header" style={s.cardTitle}>{a('Clear reward')}</Text>
   <Text style={s.levels}>{dungeonRewardPreviewText(language,'Guaranteed on a successful clear')}</Text>
   <DungeonReward currencyKind="expedition" title={estimatedMarks!==undefined?`${estimatedMarks+liveBonus} ${a('Expedition Marks')}`:a('Expedition Marks')} detail={fullMarks!==undefined?st('Estimated clear reward · Tier {tier}',{tier:effectiveTier??1}):undefined}/>
   {rewardBudget?<View style={s.modeHead}>
    <StateChip label={`${rewardBudget.charges}/${rewardBudget.chargeCapacity} ${st('charges')}`} tone={enhanced?'success':'neutral'}/>
    <StateChip label={`${rewardBudget.weeklyRemaining}/${rewardBudget.weeklyCapacity} ${st('weekly rewards')}`} tone={rewardBudget.weeklyRemaining>0?'selected':'neutral'}/>
   </View>:null}
   {enhanced===false?<Text style={s.copy}>{st('After enhanced rewards: 20% Marks. Unlimited entries.')}</Text>:null}
  </FantasyPanel>
  <DungeonDisclosure title={dungeonRewardPreviewText(language,'Rewards & drop rates')}>
   <Text style={s.copy}>{dungeonRewardPreviewText(language,'100% on clear, not a 100% chance to win.')}</Text>
   <Text style={s.copy}>{dungeonRewardPreviewText(language,'Rewards must be claimed. After enhanced charges or the weekly cap, Marks are reduced to 20%.')}</Text>
   <View style={s.rewardDropSection}>
    <Text style={s.levels}>{dungeonRewardPreviewText(language,'Potential item drops')}</Text>
    {dungeon.bossVariants.length?<Text style={s.copy}>{a('Successful clear:')} {dungeon.bossVariants[0].rawGemPercent}% {a('chance of one unrefined Grade III gem (guaranteed after')} {dungeon.bossVariants[0].gemPityClears} {a('eligible clears without one). Effect recipe:')} {dungeon.bossVariants[0].recipePercent}% · {a('Regional Catalyst:')} {dungeon.bossVariants[0].catalystPercent}%.</Text>:null}
    {dungeon.bossVariants.map(boss=><View key={boss.bossId} style={s.rewardDropSection}>
     <Text style={s.levels}>{boss.name} · {boss.chancePercent}%</Text>
     <Text style={s.copy}>{a('Possible gem families:')} {boss.gemFamilies.map(family=>family.replace(/^(effect_|stat_)/,'').replace(/_/g,' ')).join(', ')}</Text>
    </View>)}
    {dungeon.itemDropRates.length?dungeon.itemDropRates.map(item=><View key={item.itemId} style={s.dropRow}>
     <Text style={[s.copy,s.flex]}>{item.name} · {item.minQuantity===item.maxQuantity?item.minQuantity:`${item.minQuantity}–${item.maxQuantity}`}</Text>
     <StateChip label={`${dungeonRewardPreviewText(language,'Drop chance')}: ${item.chancePercent.toLocaleString(language,{maximumFractionDigits:2})}%`} tone="neutral"/>
    </View>):<Text style={s.copy}>{dungeon.bossVariants.length?a('Other permanent item drops are not yet published.'):dungeonRewardPreviewText(language,'No permanent item drop rates are published for regular dungeons yet.')}</Text>}
   </View>
   {mode==='live'&&liveBonus>0?<Text style={s.copy}>{dungeonRewardPreviewText(language,'Live Fellowship bonus is conditional on remaining weekly bonuses.')}</Text>:null}
   <Text style={s.copy}>{dungeonRewardPreviewText(language,'Complete a dungeon to earn its clear reward. Failed runs may earn limited consolation Marks.')}</Text>
   {rewardBudget&&enhanced===false?<View style={s.stickyStack}>
    <Text style={s.copy}>{st('After enhanced rewards: 20% Marks. Unlimited entries.')}</Text>
    {rewardBudget.weeklyRemaining===0?<Text style={s.copy}>{st('Weekly enhanced reward limit reached. Runs still grant reduced Marks.')}</Text>
     :rewardBudget.charges===0?<Text style={s.copy}>{st('No enhanced reward charges available. One charge recovers every 8 hours.')}</Text>:null}
   </View>:null}
   {rewardBudget&&enhanced&&rewardBudget.charges<rewardBudget.chargeCapacity?<Text style={s.copy}>{st('One reward charge replenishes every 8 hours.')}</Text>:null}
   {mode==='live'?<View style={s.modeHead}><Text style={s.copy}>{coopPolicyText(language,'fellowshipLabel')}{liveBonus>0?` (+${liveBonus})`:''}</Text><StateChip label={Math.max(0,Math.min(3,liveFellowshipRemaining))+'/3'} tone={liveFellowshipRemaining>0?'success':'neutral'}/></View>:null}
  </DungeonDisclosure>
  <DungeonDisclosure title={ct(language,'details.party')}><DungeonPartyRoles language={language}/></DungeonDisclosure>
  {dungeon.bossVariants.length?<DungeonDisclosure title={a('Possible final bosses')}><Text style={s.copy}>{a('One final boss is selected by the server at the start of each run (50/50). Reconnecting never changes it.')}</Text>{dungeon.bossVariants.map(boss=><DungeonBossPreview key={boss.bossId} name={boss.name} label={boss.chancePercent+'%'}/>)}</DungeonDisclosure>:null}
  <DungeonDisclosure title={a('More information')}><Text style={s.copy}>{roomCount} {a('rooms before the boss')}</Text><Text style={s.copy}>{dungeon.rewardBudgetState??coopPolicyText(language,'rewardCadence')}</Text>{rewardBudget?.failureConsolationRemaining!==undefined?<Text style={s.copy}>{st('Failed runs do not spend charges. {remaining} of 12 weekly consolation rewards left.',{remaining:rewardBudget.failureConsolationRemaining})}</Text>:null}{dungeon.enabledRoomTypes.length?<View style={s.roomGrid}>{dungeon.enabledRoomTypes.map(room=><RoomTile key={room} language={language} room={room}/>)}</View>:null}</DungeonDisclosure>
 </ExpeditionScreenShell>;
}

function FactRow({label,value,last=false}:{label:string;value:string;last?:boolean}){
 const {styles:s}=useCoopStyles(makeStyles);return <View style={[s.factRow,last&&s.factRowLast]}><Text style={s.factLabel}>{label}</Text><Text style={s.factValue}>{value}</Text></View>}
const TIER_ROMAN:Record<number,string>={1:'I',2:'II',3:'III'};
function TierChoice({value,requiredLevel,requiredPower=0,currentLevel,currentPower=0,selected,levelLabel,difficultyLabel,marks,onPress}:{value:CoopTier;requiredLevel:number;requiredPower?:number;currentLevel:number;currentPower?:number;selected:boolean;levelLabel:string;difficultyLabel:string;marks?:number;onPress:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles);
 const locked=currentLevel<requiredLevel||currentPower<requiredPower;
 const pips='★'.repeat(value)+'☆'.repeat(Math.max(0,3-value));
 return <Pressable accessibilityRole="button" accessibilityLabel={`${difficultyLabel} ${value}, ${levelLabel} ${requiredLevel}${requiredPower>0?', '+requiredPower.toLocaleString()+' Combat Power':''}${marks?', ~'+marks+' Marks':''}`} accessibilityState={{selected,disabled:locked}} disabled={locked} onPress={onPress} style={({pressed})=>[s.tierChoice,selected&&s.tierChoiceSelected,locked&&s.tierChoiceLocked,pressed&&s.pressed]}>
  <Text style={[s.tierPips,selected&&s.tierNumberSelected]} numberOfLines={1}>{pips}</Text>
  <Text style={[s.tierNumber,selected&&s.tierNumberSelected]}>{TIER_ROMAN[value]??value}</Text>
  <Text numberOfLines={1} style={s.tierLevel}>{requiredPower>0?requiredPower.toLocaleString()+' CP':levelLabel+' '+requiredLevel}</Text>
  {marks?<Text numberOfLines={1} style={s.tierMarks}>~{marks} ★</Text>:null}
  {locked?<Text style={s.tierLock}>◆</Text>:null}
 </Pressable>;
}
function ModeChoice({selected,title,copy,onPress}:{selected:boolean;title:string;copy:string;onPress:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>pressed&&s.pressed}><FantasyPanel variant={selected?'selected':'default'}><View style={s.modeHead}><Text style={s.modeTitle}>{title}</Text>{selected?<StateChip label="✓" tone="selected"/>:null}</View><Text style={s.copy}>{copy}</Text></FantasyPanel></Pressable>}
const roomAsset:Record<CoopRoomType,CoopUiAssetId>={battle:'node_battle',elite:'node_elite',event:'node_event',shrine:'node_shrine',camp:'node_camp',treasure:'node_treasure',merchant:'node_merchant',echo:'node_echo',risk:'node_risk',boss:'node_boss'};
const roomKey:Record<CoopRoomType,CoopMessageKey>={battle:'room.battle',elite:'room.elite',event:'room.event',shrine:'room.shrine',camp:'room.camp',treasure:'room.treasure',merchant:'room.merchant',echo:'room.echo',risk:'room.risk',boss:'room.boss'};
function RoomTile({language,room}:{language:Language;room:CoopRoomType}){
 const {styles:s}=useCoopStyles(makeStyles);return <View style={s.room}><CoopImageSlot assetId={roomAsset[room]} size="node" accessibilityLabel={ct(language,roomKey[room])}/><Text numberOfLines={2} style={s.roomLabel}>{ct(language,roomKey[room])}</Text></View>}

const makeStyles=(coopColors:CoopColors)=>StyleSheet.create({
  catalogIntro:{...coopTypography.body,color:coopColors.textSecondary},catalogHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:8},catalogCount:{...coopTypography.meta,color:coopColors.textMuted},questCard:{minHeight:88,padding:10,borderWidth:1,borderColor:coopColors.line,borderRadius:12,backgroundColor:coopColors.surface},featuredQuest:{borderColor:coopColors.goldDim,backgroundColor:coopColors.surfaceRaised},cardNameRow:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0},lockedQuest:{opacity:.65},questMeta:{...coopTypography.meta,color:coopColors.textSecondary},routeHint:{fontSize:12,lineHeight:17,color:coopColors.gold,fontWeight:'600'},
  skeletonList:{gap:coopSpacing.sm},
  skeletonCard:{minHeight:88,padding:10,flexDirection:'row',gap:coopSpacing.md,alignItems:'center',borderWidth:1,borderColor:coopColors.line,borderRadius:12,backgroundColor:coopColors.surface,opacity:.55},
  skeletonThumb:{width:72,height:72,borderRadius:10,backgroundColor:coopColors.surfaceRaised},
  skeletonCopy:{flex:1,minWidth:0,gap:6},
  skeletonLine:{height:12,borderRadius:6,backgroundColor:coopColors.surfaceRaised},
  skeletonLineShort:{width:'48%'},
  skeletonLineMid:{width:'72%'},
  rewardDropSection:{gap:8,borderTopWidth:1,borderTopColor:coopColors.goldDim,paddingTop:10,marginTop:3},dropRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
  cardChevron:{fontSize:27,lineHeight:30,color:coopColors.gold,alignSelf:'center'},modeHint:{...coopTypography.meta,color:coopColors.textMuted,marginTop:-6},quickFacts:{flexDirection:'row',flexWrap:'wrap',gap:8},routeStage:{flexDirection:'row',gap:12,alignItems:'center'},routeNumber:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:coopColors.line,alignItems:'center',justifyContent:'center'},filters:{flexDirection:'row',gap:coopSpacing.sm},quickMatch:{gap:coopSpacing.sm},liveToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,padding:coopSpacing.sm,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:10,backgroundColor:coopColors.surfaceRaised},liveTitle:{fontSize:15,lineHeight:21,fontWeight:'700',color:coopColors.text},liveMark:{fontSize:23,lineHeight:26,color:coopColors.cyan,fontWeight:'600'},flex:{flex:1,minWidth:0},loading:{minHeight:80,alignItems:'center',justifyContent:'center',gap:coopSpacing.sm},error:{...coopTypography.body,color:coopColors.danger},copy:{...coopTypography.body,color:coopColors.textSecondary},regionGroup:{gap:coopSpacing.sm,marginTop:coopSpacing.sm},regionHeading:{flexDirection:'row',alignItems:'baseline',gap:coopSpacing.sm,marginTop:coopSpacing.xs},regionProgress:{...coopTypography.meta,color:coopColors.textMuted,marginLeft:'auto'},
  regionBand:{paddingVertical:coopSpacing.sm,paddingHorizontal:coopSpacing.md,gap:2,borderLeftWidth:3,borderLeftColor:coopColors.goldDim,borderRadius:8,backgroundColor:coopColors.surface},
  regionBand_gold:{borderLeftColor:coopColors.gold},regionBand_cyan:{borderLeftColor:coopColors.cyan},regionBand_violet:{borderLeftColor:coopColors.violet},regionBand_danger:{borderLeftColor:coopColors.danger},
  regionBandHead:{flexDirection:'row',alignItems:'baseline',gap:coopSpacing.sm},
  regionName:{...coopTypography.section,color:coopColors.gold,flexShrink:1},regionName_gold:{color:coopColors.gold},regionName_cyan:{color:coopColors.cyan},regionName_violet:{color:coopColors.violet},regionName_danger:{color:coopColors.danger},
  regionTagline:{...coopTypography.meta,color:coopColors.textSecondary,fontStyle:'italic'},cardPress:{borderRadius:12},pressed:{opacity:.72,transform:[{translateY:1}]},cardRow:{flexDirection:'row',gap:coopSpacing.md,alignItems:'center'},cardThumbHolder:{position:'relative'},
  ribbon:{position:'absolute',top:4,left:-6,paddingHorizontal:6,paddingVertical:2,borderRadius:3,backgroundColor:coopColors.violet,transform:[{rotate:'-6deg'}]},
  ribbonText:{fontSize:9,lineHeight:11,color:coopColors.text,fontWeight:'800',letterSpacing:.6,textTransform:'uppercase'},cardCopy:{flex:1,minWidth:0,gap:coopSpacing.xs,justifyContent:'center'},cardHeading:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},cardTitle:{...coopTypography.section,color:coopColors.text,flexShrink:1},region:{...coopTypography.meta,color:coopColors.gold,fontWeight:'600'},levels:{...coopTypography.meta,color:coopColors.cyan,fontWeight:'600'},lock:{...coopTypography.meta,color:coopColors.danger,fontWeight:'600'},description:{...coopTypography.body,color:coopColors.textSecondary},section:{...coopTypography.section,color:coopColors.gold,marginTop:coopSpacing.sm},eventSection:{gap:coopSpacing.sm,marginTop:coopSpacing.sm,paddingTop:coopSpacing.md,borderTopWidth:1,borderColor:coopColors.goldDim},eventHeading:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},eventIntro:{...coopTypography.meta,color:coopColors.textMuted},eventTitleRow:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},eventName:{...coopTypography.meta,color:coopColors.violet,fontWeight:'600',textTransform:'uppercase',letterSpacing:.6},eventSignature:{...coopTypography.meta,color:coopColors.violet,fontWeight:'600',textTransform:'uppercase',letterSpacing:.6},eventFacts:{gap:coopSpacing.xs,paddingTop:coopSpacing.xs,borderTopWidth:1,borderColor:coopColors.goldDim},eventFact:{...coopTypography.meta,color:coopColors.textSecondary},eventFactLabel:{color:coopColors.gold,fontWeight:'600'},factRow:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.md,paddingBottom:coopSpacing.sm,borderBottomWidth:1,borderBottomColor:coopColors.goldDim},factRowLast:{paddingBottom:0,borderBottomWidth:0},factLabel:{...coopTypography.meta,color:coopColors.gold,fontWeight:'600',width:76},factValue:{...coopTypography.body,color:coopColors.text,flex:1},roomGrid:{flexDirection:'row',flexWrap:'wrap',gap:coopSpacing.sm},room:{width:78,minHeight:84,alignItems:'center',justifyContent:'center',gap:coopSpacing.xs,paddingVertical:coopSpacing.xs,borderWidth:StyleSheet.hairlineWidth,borderColor:coopColors.line,borderRadius:10,backgroundColor:coopColors.surfaceRaised},roomLabel:{fontSize:11,lineHeight:14,color:coopColors.textSecondary,fontWeight:'600',textAlign:'center'},tiers:{flexDirection:'row',gap:coopSpacing.xs},tierChoice:{flex:1,minWidth:60,minHeight:84,alignItems:'center',justifyContent:'center',gap:2,paddingVertical:6,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:10,backgroundColor:coopColors.surfaceRaised},tierChoiceSelected:{borderWidth:2,borderColor:coopColors.cyan,backgroundColor:coopColors.selection},tierChoiceLocked:{opacity:.42},tierPips:{fontSize:11,lineHeight:14,letterSpacing:1,color:coopColors.gold},tierNumber:{...coopTypography.section,color:coopColors.text,fontWeight:'800'},tierNumberSelected:{color:coopColors.cyan},tierLevel:{fontSize:11,lineHeight:14,color:coopColors.textSecondary,fontWeight:'600'},tierMarks:{fontSize:10,lineHeight:12,color:coopColors.gold,fontWeight:'700'},tierLock:{position:'absolute',top:3,right:4,fontSize:8,color:coopColors.danger},modeHead:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},modeTitle:{...coopTypography.section,color:coopColors.text,flex:1},stickyStack:{gap:coopSpacing.xs},selection:{...coopTypography.meta,color:coopColors.textSecondary,textAlign:'center'},notice:{...coopTypography.meta,color:coopColors.gold,textAlign:'center'},
});
