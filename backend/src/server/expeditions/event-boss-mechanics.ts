import type {AbilityDefinition,BossPhaseDefinition,DamageType,EncounterBossTuning} from '../combat/types';

export type EventBossMechanicTone='benefit'|'mixed'|'danger';

export interface EventBossMechanicProfile {
 profileId:string;
 label:string;
 summary:string;
 tone:EventBossMechanicTone;
 tuning:EncounterBossTuning;
}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const phase=(id:string,hpPct:number,name:string,damageType:DamageType,damageCoeff:number,debuffTag?:string,debuffValue?:number):BossPhaseDefinition=>({
 id:`${id}_${name.replace(/[^A-Z0-9]+/gi,'_').toUpperCase()}`,hpPct,target:'all_enemies',
 effects:[{kind:'damage',coeff:damageCoeff,damageType},...(debuffTag?[{kind:'debuff' as const,tag:debuffTag,value:debuffValue??0,durationMs:6500}]:[])],
});
const selfBuffPhase=(id:string,hpPct:number,index:number):BossPhaseDefinition=>({
 id:`${id}_FERAL_REGROWTH_${index+1}`,hpPct,target:'self',
 effects:[{kind:'buff',tag:'damage_done',value:.05,durationMs:10000},{kind:'buff',tag:'crit',value:.04,durationMs:10000}],
});
const ability=(id:string,name:string,damageType:DamageType,coeff:number,cooldownMs:number,castTimeMs:number):AbilityDefinition=>({
 id,name,cooldownMs,castTimeMs,target:'all_enemies',priority:96,interruptible:true,effects:[{kind:'damage',coeff,damageType}],
});

export function eventBossMechanicProfile(input:{eventId:string;objectiveCount:number;objectiveMax:number;mechanicStatus:'critical'|'steady'|'strong'}):EventBossMechanicProfile{
 const count=clamp(Math.trunc(input.objectiveCount),0,input.objectiveMax),missing=Math.max(0,input.objectiveMax-count);
 switch(input.eventId){
  case 'EVENT_TURNING_CHRONICLE_VAULT':{
   const thresholds=[.78,.55,.32],extra=thresholds.slice(0,missing).map((hp,index)=>phase('EVENT_TURNING_BOSS',hp,`Chronicle Fracture ${index+1}`,'arcane',.34,'damage_taken',.04));
   const reversal=input.mechanicStatus==='critical'?[ability('EVENT_TURNING_BOSS_TIME_REVERSAL','Time Reversal','arcane',.68,16000,1800)]:[];
   return {profileId:`turning-seals-${count}-${input.mechanicStatus}`,label:'Chronicle Fractures',summary:missing?(`${missing} unsealed fracture${missing===1?'':'s'} will erupt during The Last Hour${reversal.length?' and critical stability enables Time Reversal.':'.'}`):'All Chronicle Fractures are sealed; The Last Hour loses its additional timeline eruptions.',tone:missing>=2||reversal.length?'danger':'benefit',tuning:{profileId:`turning-seals-${count}`,addPhases:extra,addAbilities:reversal}};
  }
  case 'EVENT_HEARTBOND_VOW_GARDEN':{
   const thresholds=[.8,.55,.3],extra=thresholds.slice(0,missing).map((hp,index)=>phase('EVENT_HEARTBOND_BOSS',hp,`Severed Promise ${index+1}`,'arcane',.26,'damage_taken',.03));
   const full=count>=input.objectiveMax,nova='EVENT_HEARTBOND_BOSS_NOVA';
   const multiplier=input.mechanicStatus==='critical'?1.15:input.mechanicStatus==='strong'?.9:1;
   return {profileId:`heartbond-vows-${count}-${input.mechanicStatus}`,label:'Severed Promises',summary:full?'All vows are restored: The Severed Vow cannot use its festival-wide Nova.':`${missing} broken promise${missing===1?'':'s'} will trigger extra Sorrow phases; current harmony modifies the Nova’s strength.`,tone:full?'benefit':missing>=2?'danger':'mixed',tuning:{profileId:`heartbond-vows-${count}`,addPhases:extra,removeAbilityIds:full?[nova]:[],abilityDamageMultipliers:full?{}:{[nova]:multiplier}}};
  }
  case 'EVENT_BLOOMWAKE_THORNHEART_GROVE':{
   const thresholds=[.82,.58,.34],extra=thresholds.slice(0,missing).map((hp,index)=>selfBuffPhase('EVENT_BLOOMWAKE_BOSS',hp,index));
   const thornburst=input.mechanicStatus==='critical'?[ability('EVENT_BLOOMWAKE_BOSS_THORNBURST','Feral Thornburst','nature',.58,15000,1300)]:[];
   return {profileId:`bloomwake-bonds-${count}-${input.mechanicStatus}`,label:'Feral Regrowth',summary:missing?(`${missing} unbound Heartroot knot${missing===1?'':'s'} will enrage the Thornheart Ancient during the fight${thornburst.length?'; critical Grove Balance also enables Feral Thornburst.':'.'}`):'All Heartroot knots are bound, suppressing the Thornheart Ancient’s extra regrowth enrages.',tone:missing>=2||thornburst.length?'danger':'benefit',tuning:{profileId:`bloomwake-bonds-${count}`,addPhases:extra,addAbilities:thornburst}};
  }
  case 'EVENT_SUNCREST_SHATTERED_ISLES':{
   const nova='EVENT_SUNCREST_BOSS_NOVA',full=count>=input.objectiveMax;
   const multiplier=count===0?1.1:count===1?.95:count===2?.85:1;
   const crowd=count===0?[phase('EVENT_SUNCREST_BOSS',.6,'Crowd Disfavor','fire',.4,'damage_taken',.03)]:[];
   return {profileId:`suncrest-laurels-${count}`,label:'Champion’s Reception',summary:full?'Aureon recognizes a complete Laurel set and fights an honorable duel without Solar Nova.':count===0?'No Laurels: the crowd turns hostile, empowering a Crowd Disfavor phase and a stronger Solar Nova.':`${count}/${input.objectiveMax} Laurels soften Aureon’s Solar Nova; a complete set changes the duel pattern.`,tone:full?'benefit':count===0?'danger':'mixed',tuning:{profileId:`suncrest-laurels-${count}`,removeAbilityIds:full?[nova]:[],abilityDamageMultipliers:full?{}:{[nova]:multiplier},addPhases:crowd}};
  }
  case 'EVENT_STARFALL_ASTRAL_RIFT':{
   const thresholds=[.82,.58,.34],extra=thresholds.slice(0,missing).map((hp,index)=>phase('EVENT_STARFALL_BOSS',hp,`Open Rift ${index+1}`,'arcane',.32,'damage_taken',.03));
   const collapse=count===0?[ability('EVENT_STARFALL_BOSS_RIFT_COLLAPSE','Rift Collapse','arcane',.78,16000,1800)]:[];
   return {profileId:`starfall-anchors-${count}`,label:'Open Rifts',summary:missing?(`${missing} major rift${missing===1?' remains':'s remain'} open, adding collapse phases${collapse.length?' and the Rift Collapse cast.':'.'}`):'All three Rift Anchors are active; the Constellation Eater cannot trigger additional collapse phases.',tone:missing>=2?'danger':missing===1?'mixed':'benefit',tuning:{profileId:`starfall-anchors-${count}`,addPhases:extra,addAbilities:collapse}};
  }
  case 'EVENT_VEILBREAK_GLOAM_BREACH':{
   const thresholds=[.78,.53,.28],extra=thresholds.slice(0,missing).map((hp,index)=>phase('EVENT_VEILBREAK_BOSS',hp,`Blackout ${index+1}`,'shadow',.3,'damage_done',-.05));
   const nova='EVENT_VEILBREAK_BOSS_NOVA',full=count>=input.objectiveMax,totalBlackout=count===0?[ability('EVENT_VEILBREAK_BOSS_TOTAL_BLACKOUT','Total Blackout','shadow',.7,17000,1750)]:[];
   return {profileId:`veilbreak-lanterns-${count}`,label:'Blackout Cycle',summary:full?'Every Ward Lantern is lit: Lantern Extinction is disabled and no additional Blackout phases occur.':`${missing} dark ward${missing===1?'':'s'} create extra Blackout phases${totalBlackout.length?' and enable Total Blackout.':'.'}`,tone:full?'benefit':missing>=2?'danger':'mixed',tuning:{profileId:`veilbreak-lanterns-${count}`,addPhases:extra,addAbilities:totalBlackout,removeAbilityIds:full?[nova]:[]}};
  }
  case 'EVENT_MERCHANT_GILDED_ROAD':{
   const thresholds=[.75,.5,.25],extra=thresholds.slice(0,count).map((hp,index)=>phase('EVENT_MERCHANT_BOSS',hp,`Plunder Attempt ${index+1}`,'physical',.28,'damage_taken',.025));
   const nova='EVENT_MERCHANT_BOSS_NOVA',empty=count===0;
   return {profileId:`merchant-cargo-${count}`,label:'Plunder Attempts',summary:empty?'No protected cargo remains: the Captain has nothing to plunder and loses Caravan Breaker, but the cargo payout is gone.':`${count} protected cargo lot${count===1?'':'s'} remain. Each one adds a Plunder Attempt phase, trading a harder fight for a larger delivery payout.`,tone:empty?'mixed':count>=2?'mixed':'benefit',tuning:{profileId:`merchant-cargo-${count}`,addPhases:extra,removeAbilityIds:empty?[nova]:[]}};
  }
  case 'EVENT_FROSTFALL_AURORA_HOLLOW':{
   const thresholds=[.8,.55,.3],extra=thresholds.slice(0,missing).map((hp,index)=>phase('EVENT_FROSTFALL_BOSS',hp,`Deep Freeze ${index+1}`,'ice',.3,'damage_done',-.04));
   const nova='EVENT_FROSTFALL_BOSS_NOVA',novaMultiplier=clamp(1-count*.08,.7,1),absoluteZero=count===0&&input.mechanicStatus==='critical'?[ability('EVENT_FROSTFALL_BOSS_ABSOLUTE_ZERO','Absolute Zero','ice',.72,17000,1800)]:[];
   return {profileId:`frostfall-hearths-${count}-${input.mechanicStatus}`,label:'Deep Freeze',summary:missing?(`${missing} unlit hearth${missing===1?'':'s'} allow extra Deep Freeze phases. Lit hearths reduce Aurora Shatter by ${Math.round((1-novaMultiplier)*100)}%${absoluteZero.length?'; critical Warmth also enables Absolute Zero.':'.'}`):'All Festival Hearths are lit: no extra Deep Freeze phases and Aurora Shatter is reduced by 24%.',tone:missing>=2||absoluteZero.length?'danger':missing===1?'mixed':'benefit',tuning:{profileId:`frostfall-hearths-${count}`,addPhases:extra,addAbilities:absoluteZero,abilityDamageMultipliers:{[nova]:novaMultiplier}}};
  }
  default:return {profileId:'event-boss-standard',label:'Seasonal Boss',summary:'No additional seasonal boss mechanic is active.',tone:'mixed',tuning:{profileId:'event-boss-standard'}};
 }
}
