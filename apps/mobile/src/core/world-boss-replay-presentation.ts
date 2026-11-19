import {worldBossPresentationFor,worldBossReplayActorDisplayName} from './world-boss-presentation';

/**
 * World Boss replay direction (approved 19 Nov 2026), enforced by this model:
 *
 * - One account raid: 1–5 of the player's OWN characters fight together.
 * - The fight is resolved by the server first, then played as a set-piece.
 *   There is no skip, no speed control, and nothing that reveals how long the
 *   replay is: no timer, no "round x/14", no progress bar. Results appear only
 *   after the finale.
 * - It must feel grander than the Chapter 1 Fallen Knight battle: an entrance,
 *   the party's tonic moment, arena-scale specials and a finale that lands the
 *   party's real credit on the shared world HP bar.
 *
 * Every number shown comes from the committed server event log. This module
 * only orders and groups those events; it never invents damage.
 */
export const WORLD_BOSS_REPLAY_POLICY=Object.freeze({
 skippable:false,
 speedControls:false,
 showsDuration:false,
 showsRoundCount:false,
 pausesWhenBackgrounded:true,
 resultsAfterFinale:true,
} as const);

/** Subset of the server V25 replay event the client may receive. */
export interface WorldBossReplayEventInput{
 round:number;type:string;abilityId:string;actorId?:string;targetId?:string;
 amount?:number;absorbed?:number;detail?:string;
}
export interface WorldBossReplayPartyMember{characterId:string;name:string;classId:string;}
/** Per-character server ledger (V25 characterLedger); drives Party Honors. */
export interface WorldBossReplayLedgerRow{
 characterId:string;bossHpDamage:number;effectiveHealing:number;shieldConsumed:number;
 tankProtection:number;cleansePrevented:number;interrupts:number;survived:boolean;
}
export type WorldBossHonor='vanguard'|'bulwark'|'lifebinder'|'spellbreaker'|'purifier';
export interface WorldBossHonorAward{honor:WorldBossHonor;characterId:string;name:string;value:number;}
export interface WorldBossReplayInput{
 bossId:string;
 phase:'armored'|'exposed'|'enraged';
 party:readonly WorldBossReplayPartyMember[];
 tonicItemId:string|null;
 events:readonly WorldBossReplayEventInput[];
 /** Shared boss HP before this attempt and the server-credited HP for it. */
 world:{maxHp:number;hpBefore:number;creditedHp:number};
 reduceMotion:boolean;
 ledger?:readonly WorldBossReplayLedgerRow[];
}

export type WorldBossReplayAct='opening'|'onslaught'|'climax';
export type WorldBossBeatScale='personal'|'party'|'arena';
export interface WorldBossReplayHit{targetId:string;targetName:string;amount:number;absorbed:number;}
export type WorldBossReplayBeat=
 |{kind:'entrance';bossName:string;motif:string;region:string;phase:WorldBossReplayInput['phase'];worldHpFraction:number;partyNames:string[]}
 |{kind:'tonic';itemId:string}
 |{kind:'telegraph';act:WorldBossReplayAct;abilityId:string;targetNames:string[];scale:WorldBossBeatScale}
 |{kind:'boss_attack';act:WorldBossReplayAct;abilityId:string;special:boolean;hits:WorldBossReplayHit[];scale:WorldBossBeatScale}
 |{kind:'party_action';act:WorldBossReplayAct;action:'strike'|'miss'|'heal'|'shield'|'cleanse'|'interrupt'|'mitigate';
   /** party = a character's own action; war_camp / tonic = shared buffs, shown without an actor. */
   source:'party'|'war_camp'|'tonic';
   actorName:string;targetName?:string;targetId?:string;abilityId:string;amount:number;crit:boolean;scale:WorldBossBeatScale}
 |{kind:'boss_state';act:WorldBossReplayAct;state:'guard_break'|'guard_restored'|'exposed'|'status'|'special_cancelled';abilityId:string;targetName?:string;
   /** Party member hit by a damage tick (status_tick); used to move their HP bar. */
   targetId?:string;hpLoss?:number;amount:number;scale:WorldBossBeatScale}
 /** A role answering the boss: Tank intercepting a telegraphed special, a cleanse, an interrupt. */
 |{kind:'role_moment';act:WorldBossReplayAct;moment:'guarded'|'cleansed'|'interrupted';actorName:string;targetName?:string;
   abilityId:string;amount:number;scale:WorldBossBeatScale}
 |{kind:'down';act:WorldBossReplayAct;targetName:string;targetId:string}
 |{kind:'finale';survived:boolean;worldHpBefore:number;worldHpAfter:number;creditedHp:number;
   thresholdsCrossed:number[];killingBlow:boolean;residualEcho:boolean}
 |{kind:'results';honors:WorldBossHonorAward[]};

/** Internal pacing for the player component. It MUST NOT be summed or shown. */
export interface WorldBossReplayCue{beat:WorldBossReplayBeat;holdMs:number;shake:boolean;flash:boolean;}

const GLOBAL_THRESHOLDS=[.7,.3,0] as const;
const HOLD:Record<WorldBossReplayBeat['kind'],number>={
 entrance:3200,tonic:1400,telegraph:1600,boss_attack:900,party_action:520,
 boss_state:1100,role_moment:1300,down:1200,finale:4200,results:0,
};
// Pacing for an unskippable fight: small beats move fast so big ones can breathe.
const STATUS_HOLD=380,FLURRY_HOLD=260;
const nonNegative=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0?n:0;

export function worldBossReplayCues(input:WorldBossReplayInput):WorldBossReplayCue[]{
 const boss=worldBossPresentationFor(input.bossId);
 if(!boss)throw new Error('world_boss_replay_unknown_boss');
 const names=new Map(input.party.map(m=>[m.characterId,m.name]));
 // Never surface raw protocol IDs (e.g. WAR_CAMP) as names.
 const nameOf=(id:string|undefined)=>id===undefined?'':names.get(id)??worldBossReplayActorDisplayName(id)??'';
 const isBoss=(id:string|undefined)=>id!==undefined&&worldBossReplayActorDisplayName(id)!==null;
 const lastRound=Math.max(1,...input.events.map(e=>Number.isSafeInteger(e.round)?e.round:1));
 // Three acts by position, so the screen can escalate without revealing a round count.
 const actOf=(round:number):WorldBossReplayAct=>round<=lastRound/3?'opening':round<=lastRound*2/3?'onslaught':'climax';
 const cues:WorldBossReplayCue[]=[];
 const push=(beat:WorldBossReplayBeat,shake=false,flash=false,holdMs=HOLD[beat.kind])=>cues.push({beat,holdMs,
  shake:shake&&!input.reduceMotion,flash:flash&&!input.reduceMotion});
 let flurryRound=-1;

 const {maxHp}=input.world;
 const before=Math.min(nonNegative(input.world.hpBefore),nonNegative(maxHp));
 push({kind:'entrance',bossName:boss.name,motif:boss.motif,region:boss.region,phase:input.phase,
  worldHpFraction:maxHp>0?before/maxHp:0,partyNames:input.party.map(m=>m.name)});
 if(input.tonicItemId)push({kind:'tonic',itemId:input.tonicItemId},false,true);

 let telegraphed:string|undefined,survived=true;
 for(let i=0;i<input.events.length;i++){
  const e=input.events[i],act=actOf(e.round);
  if(e.type==='battle_end'){survived=e.detail!=='wiped';continue;}
  if(e.type==='telegraph'){
   telegraphed=e.abilityId;
   const targets=(e.detail??'').split(',').filter(Boolean).map(nameOf);
   push({kind:'telegraph',act,abilityId:e.abilityId,targetNames:targets,scale:targets.length>1?'arena':'party'});
   continue;
  }
  if(e.type==='strike'&&isBoss(e.actorId)){
   // A multi-target special arrives as consecutive strikes; land it as one arena-wide impact.
   const hits:WorldBossReplayHit[]=[];
   let j=i;
   while(j<input.events.length){
    const n=input.events[j];
    if(n.type!=='strike'||n.round!==e.round||n.actorId!==e.actorId||n.abilityId!==e.abilityId)break;
    hits.push({targetId:n.targetId??'',targetName:nameOf(n.targetId),amount:nonNegative(n.amount),absorbed:nonNegative(n.absorbed)});
    j++;
   }
   i=j-1;
   const special=e.abilityId===telegraphed;
   if(special)telegraphed=undefined;
   push({kind:'boss_attack',act,abilityId:e.abilityId,special,hits,
    scale:special||hits.length>1?'arena':'party'},special,special);
   continue;
  }
  if(e.type==='down'){push({kind:'down',act,targetName:nameOf(e.targetId),targetId:e.targetId??''},true);continue;}
  if(e.type==='guard_break'){push({kind:'boss_state',act,state:'guard_break',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'arena'},true,true);continue;}
  if(e.type==='guard'){push({kind:'boss_state',act,state:'guard_restored',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'party'});continue;}
  if(e.type==='exposure'){push({kind:'boss_state',act,state:'exposed',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'arena'},false,true);continue;}
  if(e.type==='status_apply'||e.type==='status_tick'){
   push({kind:'boss_state',act,state:'status',abilityId:e.abilityId,targetName:nameOf(e.targetId),targetId:e.targetId,
    hpLoss:e.type==='status_tick'?nonNegative(e.amount):0,amount:nonNegative(e.amount),scale:'personal'},false,false,STATUS_HOLD);continue;
  }
  // Role moments: real ledger-backed answers to the boss, shown bigger than ordinary actions.
  if(e.type==='mitigate'&&e.abilityId==='TANK_INTERCEPT'&&e.detail==='telegraphed_ward'){
   push({kind:'role_moment',act,moment:'guarded',actorName:nameOf(e.actorId),targetName:nameOf(e.targetId),
    abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'arena'},true,true);continue;
  }
  if(e.type==='cleanse'&&!isBoss(e.actorId)){
   push({kind:'role_moment',act,moment:'cleansed',actorName:nameOf(e.actorId),targetName:nameOf(e.targetId),
    abilityId:e.abilityId,amount:0,scale:'party'},false,true);continue;
  }
  if(e.type==='interrupt'&&!isBoss(e.actorId)){
   push({kind:'role_moment',act,moment:'interrupted',actorName:nameOf(e.actorId),
    abilityId:e.detail??e.abilityId,amount:0,scale:'arena'},true,true);continue;
  }
  if(e.type==='interrupt'&&isBoss(e.actorId)){
   push({kind:'boss_state',act,state:'special_cancelled',abilityId:e.abilityId,amount:0,scale:'arena'});continue;
  }
  const action=e.type==='basic'?'strike':e.type;
  if(['strike','miss','heal','shield','cleanse','interrupt','mitigate'].includes(action)&&!isBoss(e.actorId)){
   const source=e.abilityId==='TONIC_WARD'?'tonic':e.actorId==='WAR_CAMP'?'war_camp':'party';
   // Follow-up party strikes in the same round play as a quick flurry.
   const strikeLike=action==='strike'||action==='miss';
   const prev=cues[cues.length-1]?.beat;
   const flurry=strikeLike&&flurryRound===e.round&&prev?.kind==='party_action'&&(prev.action==='strike'||prev.action==='miss');
   flurryRound=strikeLike?e.round:-1;
   push({kind:'party_action',act,action:action as 'strike',source,actorName:source==='party'?nameOf(e.actorId):'',
    targetName:e.targetId?nameOf(e.targetId):undefined,targetId:e.targetId,abilityId:e.abilityId,amount:nonNegative(e.amount),
    crit:e.detail==='crit',scale:action==='interrupt'?'arena':'personal'},false,e.detail==='crit',flurry?FLURRY_HOLD:HOLD.party_action);
  }
  // Unknown future event types are ignored rather than shown as fake actions.
 }

 const credited=Math.min(nonNegative(input.world.creditedHp),before);
 const after=before-credited;
 const fraction=(hp:number)=>maxHp>0?hp/maxHp:0;
 const thresholdsCrossed=GLOBAL_THRESHOLDS.filter(t=>fraction(before)>t&&fraction(after)<=t);
 push({kind:'finale',survived,worldHpBefore:before,worldHpAfter:after,creditedHp:credited,
  thresholdsCrossed:[...thresholdsCrossed],killingBlow:before>0&&after===0,residualEcho:before===0},
  thresholdsCrossed.length>0,thresholdsCrossed.length>0);
 push({kind:'results',honors:worldBossPartyHonors(input.party,input.ledger??[])});
 return cues;
}

const HONOR_METRIC:Record<WorldBossHonor,(row:WorldBossReplayLedgerRow)=>number>={
 vanguard:r=>r.bossHpDamage,
 bulwark:r=>r.tankProtection,
 lifebinder:r=>r.effectiveHealing+r.shieldConsumed,
 spellbreaker:r=>r.interrupts,
 purifier:r=>r.cleansePrevented,
};
/**
 * Party Honors from the server ledger: one per category, awarded to the party
 * member with the highest real value. Categories nobody contributed to are not
 * awarded; ties go to the earlier character in roster order. Honors are
 * presentation only and carry no reward.
 */
export function worldBossPartyHonors(party:readonly WorldBossReplayPartyMember[],ledger:readonly WorldBossReplayLedgerRow[]):WorldBossHonorAward[]{
 const order=new Map(party.map((m,i)=>[m.characterId,i]));
 const rows=ledger.filter(r=>order.has(r.characterId)).sort((a,b)=>order.get(a.characterId)!-order.get(b.characterId)!);
 const awards:WorldBossHonorAward[]=[];
 for(const honor of Object.keys(HONOR_METRIC) as WorldBossHonor[]){
  let best:WorldBossReplayLedgerRow|undefined,bestValue=0;
  for(const row of rows){const v=nonNegative(HONOR_METRIC[honor](row));if(v>bestValue){best=row;bestValue=v;}}
  if(best)awards.push({honor,characterId:best.characterId,name:party[order.get(best.characterId)!].name,value:Math.round(bestValue)});
 }
 return awards;
}
