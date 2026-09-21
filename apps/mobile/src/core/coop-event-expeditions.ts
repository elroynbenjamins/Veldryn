import type {CoopRole} from './coop-ui-contract';
import {validateCoopRunView,type CoopRunView} from './coop-presentation';

export type CoopEventExpeditionStatus='preview'|'available';

/** Server-projected seasonal content. Only the authenticated co-op entry endpoint may
 * promote an expedition to available; calendar dates in the client remain preview metadata. */
export interface CoopEventExpeditionPreview{
  id:string;
  eventName:string;
  name:string;
  description:string;
  routeHighlights:string[];
  finalBoss:string;
  status:CoopEventExpeditionStatus;
  minLevel:number;
  rewardMarks:number;
  routeNodeCount?:number;
  mechanic?:{id:string;label:string;description:string;startValue:number;maxValue:number;lowThreshold:number;highThreshold:number};
  objective?:{id:string;label:string;description:string;startCount:number;maxCount:number;effect:'boss_attack_down'|'boss_hp_down'|'boss_defense_down'|'reward_bonus'|'preboss_heal';perPoint:number};
  lockedReason?:string;
  /** Present only when this expedition matches the authoritative active LiveOps runtime. */
  liveEventId?:string;
}

export interface CoopEventRunServerProjection{
  runId:string;
  eventExpeditionId:string;
  liveEventId:string;
  eventName:string;
  dungeonName:string;
  phase:string;
  stateVersion:number;
  decisionId?:string;
  decisionRevision?:number;
  team:Array<{memberId:string;displayName:string;role:CoopRole;classId:string;kind:'controller'|'echo';effectiveLevel:number;downed?:boolean}>;
  options:Array<{nodeId:string;kind:string;risk:number;rewardTag:string;title?:string;mechanicDelta?:number;objectiveDelta?:number;reactionLabel?:string}>;
  mechanic?:{id:string;label:string;description:string;value:number;maxValue:number;lowThreshold:number;highThreshold:number;status:'critical'|'steady'|'strong';bossAttackMultiplier:number;rewardBonus:number;bossEffect:string};
  objective?:{id:string;label:string;description:string;count:number;maxCount:number;effect:string;completed:boolean;bossAttackMultiplier:number;bossHpMultiplier:number;bossDefenseMultiplier:number;rewardBonus:number;preBossHealPct:number;effectText:string};
  bossMechanic?:{profileId:string;label:string;summary:string;tone:'benefit'|'mixed'|'danger';telegraph?:{bossName:string;phases:Array<{id:string;label:string;hpPct:number;objectiveSensitive:boolean}>;castAbilities:Array<{id:string;label:string;castMs:number;cooldownMs:number;interruptible:boolean;objectiveSensitive:boolean}>;suppressedAbilities:Array<{id:string;label:string}>}};
  bossRecap?:{durationMs:number;downs:number;phasesTriggered:string[];abilitiesCast:string[]};
  settlement:{status:'pending'|'claimed';rewardMarks?:number};
}

export interface SeasonalEventExpeditionIdentity{
  seriesId:string;
  expeditionId:string;
  eventName:string;
  name:string;
  description:string;
  routeHighlights:readonly string[];
  questline:readonly string[];
  enemies:readonly string[];
  finalBoss:string;
  minLevel:number;
  rewardMarks:number;
}

const EVENT_EXPEDITION_IDENTITIES:Readonly<Record<string,SeasonalEventExpeditionIdentity>>={
  EVT_ANNUAL_001:{seriesId:'EVT_ANNUAL_001',expeditionId:'EVENT_TURNING_CHRONICLE_VAULT',eventName:'Turning of the Age',name:'The Chronicle Vault',description:'Descend through fractured archives where memories of the closing age have become hostile echoes.',routeHighlights:['Shattered Archive','Hourglass Causeway','First Dawn Observatory'],questline:['Chronicle the Closing Age','Recover the Broken Hours','Guard the First Dawn'],enemies:['Yearshade Archivist','Hourglass Golem','Dawnless Warden'],finalBoss:'The Last Hour',minLevel:50,rewardMarks:110},
  EVT_ANNUAL_002:{seriesId:'EVT_ANNUAL_002',expeditionId:'EVENT_HEARTBOND_VOW_GARDEN',eventName:'Heartbond Festival',name:'The Broken Vow Garden',description:'Follow a sabotaged festival route through rose gardens and lantern bridges twisted by broken vows.',routeHighlights:['Rosebridge','Vow Garden','Lantern Promenade'],questline:['Mend the Festival Routes','Recover the Vow Tokens','Restore the Vow Garden'],enemies:['Vowbreaker Brigand','Thorned Effigy','Sorrowbound Shade'],finalBoss:'The Severed Vow',minLevel:30,rewardMarks:92},
  EVT_ANNUAL_003:{seriesId:'EVT_ANNUAL_003',expeditionId:'EVENT_BLOOMWAKE_THORNHEART_GROVE',eventName:'Bloomwake',name:'Thornheart Grove',description:'Push into an overgrown sacred grove where awakened spring magic has grown feral and predatory.',routeHighlights:['Overgrown Shrine','Pollen Hollow','Rootbound Grove'],questline:['Wake the Old Groves','Clear the Feral Bloom','Restore the Heartroot'],enemies:['Briarling Swarm','Pollenmaw','Rootbound Stag'],finalBoss:'The Thornheart Ancient',minLevel:30,rewardMarks:98},
  EVT_ANNUAL_006:{seriesId:'EVT_ANNUAL_006',expeditionId:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:'Suncrest Games',name:'The Shattered Isles',description:'Island arenas, pirate camps and sun shrines form a summer expedition route.',routeHighlights:['Coastal Ruins','Sun Shrine','Pirate Camp'],questline:['Enter the Island Trials','Break the Corsair Line','Challenge the First Champion'],enemies:['Suncrest Corsair','Shoreline Colossus','Solar Reef Warden'],finalBoss:'Aureon, First Champion',minLevel:45,rewardMarks:96},
  EVT_ANNUAL_008:{seriesId:'EVT_ANNUAL_008',expeditionId:'EVENT_STARFALL_ASTRAL_RIFT',eventName:'Starfall Nights',name:'Astral Rift Expedition',description:'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.',routeHighlights:['Meteor Field','Star Shrine','Rift Gate'],questline:['Survey the Meteor Field','Stabilize the Star Shrine','Seal the Astral Rift'],enemies:['Astral Marauder','Meteoric Sentinel','Riftbound Herald'],finalBoss:'The Constellation Eater',minLevel:70,rewardMarks:118},
  EVT_ANNUAL_010:{seriesId:'EVT_ANNUAL_010',expeditionId:'EVENT_VEILBREAK_GLOAM_BREACH',eventName:'The Veilbreak',name:'The Gloam Breach',description:'Enter a ruptured ward district where shades are extinguishing lanterns and pulling the streets into the Gloam.',routeHighlights:['Lantern Gate','Hollow Chapel','Gloam Crossing'],questline:['Relight the Lantern Gate','Seal the Hollow Chapel','Hunt the Hollow Regent'],enemies:['Veilshade Stalker','Lantern-Eater','Hollow Warden'],finalBoss:'The Hollow Regent',minLevel:35,rewardMarks:102},
  EVT_ANNUAL_011:{seriesId:'EVT_ANNUAL_011',expeditionId:'EVENT_MERCHANT_GILDED_ROAD',eventName:'Merchant & Guild Festival',name:'The Gilded Road',description:'Escort a high-value guild caravan through sabotaged tollgates, raider camps and a seized counting house.',routeHighlights:['Broken Tollgate','Caravan Crossroads','Seized Counting House'],questline:['Secure the Broken Tollgate','Recover the Stolen Ledgers','Retake the Counting House'],enemies:['Road Reaver','Ledger Hexer','Iron Tollkeeper'],finalBoss:'The Coinbound Captain',minLevel:35,rewardMarks:100},
  EVT_ANNUAL_012:{seriesId:'EVT_ANNUAL_012',expeditionId:'EVENT_FROSTFALL_AURORA_HOLLOW',eventName:'Frostfall Festival',name:'Aurora Hollow',description:'Follow stolen festival bells into a frozen hollow where winter spirits have turned the celebration into a deadly procession.',routeHighlights:['Snowbell Pass','Frozen Giftworks','Aurora Belfry'],questline:['Recover the Snowbells','Clear the Frozen Giftworks','Ring the Aurora Belfry'],enemies:['Rimefang Marauder','Bellfrost Spirit','Giftwork Colossus'],finalBoss:'The Rimebell Colossus',minLevel:35,rewardMarks:104},
};

function eventSeriesId(liveEventId:string){return liveEventId.match(/^(EVT_ANNUAL_\d{3})(?:_|$)/)?.[1];}
export function seasonalEventExpeditionInfo(liveEventId:string):SeasonalEventExpeditionIdentity|undefined{
  const series=eventSeriesId(liveEventId);return series?EVENT_EXPEDITION_IDENTITIES[series]:undefined;
}

const EVENT_EXPEDITION_SERIES=new Set(Object.keys(EVENT_EXPEDITION_IDENTITIES));

export function seasonalEventHasExpedition(liveEventId:string):boolean{
  const series=eventSeriesId(liveEventId);
  return Boolean(series&&EVENT_EXPEDITION_SERIES.has(series));
}

export function validateCoopEventExpeditionPreview(value:CoopEventExpeditionPreview):void{
  if(!value.id.trim()||!value.eventName.trim()||!value.name.trim()||!value.description.trim()||!value.finalBoss.trim())throw new Error('invalid_event_expedition_preview');
  if(value.status!=='preview'&&value.status!=='available')throw new Error('invalid_event_expedition_status');
  if(!Number.isInteger(value.minLevel)||value.minLevel<1||!Number.isInteger(value.rewardMarks)||value.rewardMarks<0)throw new Error('invalid_event_expedition_requirements');
  if(value.status==='available'&&!value.liveEventId?.trim())throw new Error('available_event_requires_live_event');
  if(value.routeHighlights.length<3||new Set(value.routeHighlights.map(item=>item.trim().toLocaleLowerCase())).size!==value.routeHighlights.length||value.routeHighlights.some(item=>!item.trim()))throw new Error('invalid_event_route_highlights');
  if(value.routeNodeCount!==undefined&&(!Number.isInteger(value.routeNodeCount)||value.routeNodeCount<5||value.routeNodeCount>7))throw new Error('invalid_event_route_length');
  if(value.mechanic&&(!value.mechanic.id.trim()||!value.mechanic.label.trim()||!value.mechanic.description.trim()||!Number.isFinite(value.mechanic.startValue)||!Number.isFinite(value.mechanic.maxValue)||value.mechanic.maxValue<=0||value.mechanic.startValue<0||value.mechanic.startValue>value.mechanic.maxValue||value.mechanic.lowThreshold>=value.mechanic.highThreshold))throw new Error('invalid_event_mechanic');
  if(value.objective&&(!value.objective.id.trim()||!value.objective.label.trim()||!value.objective.description.trim()||!Number.isInteger(value.objective.startCount)||!Number.isInteger(value.objective.maxCount)||value.objective.maxCount<1||value.objective.startCount<0||value.objective.startCount>value.objective.maxCount||!Number.isFinite(value.objective.perPoint)||value.objective.perPoint<=0))throw new Error('invalid_event_objective');
}

export function presentEventExpeditionRun(projection:CoopEventRunServerProjection):CoopRunView{
  if(!projection.runId.trim()||!projection.eventExpeditionId.trim()||!projection.liveEventId.trim()||!projection.eventName.trim()||!projection.dungeonName.trim())throw new Error('invalid_event_run_projection');
  if(!Number.isInteger(projection.stateVersion)||projection.stateVersion<1||projection.team.length!==4)throw new Error('invalid_event_run_projection');
  const options=projection.options.map(option=>{
    if(!option.nodeId.trim()||!option.kind.trim()||!Number.isFinite(option.risk)||!option.rewardTag.trim())throw new Error('invalid_event_route_option');
    const title=option.title?.trim()||(option.kind==='boss'?'Final boss':option.kind.charAt(0).toUpperCase()+option.kind.slice(1));
    const mechanicDelta=option.mechanicDelta??0,objectiveDelta=option.objectiveDelta??0,effects:string[]=[];
    if(option.reactionLabel?.trim())effects.push(option.reactionLabel.trim());
    if(projection.mechanic&&mechanicDelta!==0)effects.push(`${projection.mechanic.label} ${mechanicDelta>0?'+':''}${mechanicDelta}`);
    if(projection.objective&&objectiveDelta!==0)effects.push(`${projection.objective.label} ${objectiveDelta>0?'+':''}${objectiveDelta}`);
    return {nodeId:option.nodeId,title,kind:option.kind,risk:`Risk ${option.risk}`,reward:effects.join(' · ')||option.rewardTag.replace(/_/g,' ')};
  });
  const marks=projection.settlement.rewardMarks??0;
  const run:CoopRunView={
    runId:projection.runId,
    mode:'qmode',
    modeLabel:projection.dungeonName,
    phase:projection.phase,
    syncedLevel:Math.min(...projection.team.map(member=>member.effectiveLevel)),
    roleSlots:projection.team.map(member=>({role:member.role,name:member.displayName,echo:member.kind==='echo',classId:member.classId,ready:member.downed===undefined?true:!member.downed})),
    options,
    mechanic:projection.mechanic?{label:projection.mechanic.label,description:projection.mechanic.description,value:projection.mechanic.value,maxValue:projection.mechanic.maxValue,status:projection.mechanic.status,bossEffect:projection.mechanic.bossEffect}:undefined,
    objective:projection.objective?{label:projection.objective.label,description:projection.objective.description,count:projection.objective.count,maxCount:projection.objective.maxCount,completed:projection.objective.completed,effectText:projection.objective.effectText}:undefined,
    bossMechanic:projection.bossMechanic?{label:projection.bossMechanic.label,summary:projection.bossMechanic.summary,tone:projection.bossMechanic.tone,telegraph:projection.bossMechanic.telegraph}:undefined,
    bossRecap:projection.bossRecap,
    stateVersion:projection.stateVersion,
    decisionId:projection.decisionId,
    decisionRevision:projection.decisionRevision,
    rewardText:projection.phase==='completed'?(projection.settlement.status==='claimed'?`${marks} event currency collected.`:`${marks} event currency ready to collect.`):undefined,
  };
  validateCoopRunView(run);
  return run;
}
