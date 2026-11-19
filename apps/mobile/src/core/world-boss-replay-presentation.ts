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
export interface WorldBossReplayInput{
 bossId:string;
 phase:'armored'|'exposed'|'enraged';
 party:readonly WorldBossReplayPartyMember[];
 tonicItemId:string|null;
 events:readonly WorldBossReplayEventInput[];
 /** Shared boss HP before this attempt and the server-credited HP for it. */
 world:{maxHp:number;hpBefore:number;creditedHp:number};
 reduceMotion:boolean;
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
   actorName:string;targetName?:string;abilityId:string;amount:number;crit:boolean;scale:WorldBossBeatScale}
 |{kind:'boss_state';act:WorldBossReplayAct;state:'guard_break'|'guard_restored'|'exposed'|'status';abilityId:string;targetName?:string;amount:number;scale:WorldBossBeatScale}
 |{kind:'down';act:WorldBossReplayAct;targetName:string}
 |{kind:'finale';survived:boolean;worldHpBefore:number;worldHpAfter:number;creditedHp:number;
   thresholdsCrossed:number[];killingBlow:boolean;residualEcho:boolean}
 |{kind:'results'};

/** Internal pacing for the player component. It MUST NOT be summed or shown. */
export interface WorldBossReplayCue{beat:WorldBossReplayBeat;holdMs:number;shake:boolean;flash:boolean;}

const GLOBAL_THRESHOLDS=[.7,.3,0] as const;
const HOLD:Record<WorldBossReplayBeat['kind'],number>={
 entrance:3200,tonic:1400,telegraph:1600,boss_attack:900,party_action:620,
 boss_state:1100,down:1200,finale:4200,results:0,
};
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
 const push=(beat:WorldBossReplayBeat,shake=false,flash=false)=>cues.push({beat,holdMs:HOLD[beat.kind],
  shake:shake&&!input.reduceMotion,flash:flash&&!input.reduceMotion});

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
  if(e.type==='down'){push({kind:'down',act,targetName:nameOf(e.targetId)},true);continue;}
  if(e.type==='guard_break'){push({kind:'boss_state',act,state:'guard_break',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'arena'},true,true);continue;}
  if(e.type==='guard'){push({kind:'boss_state',act,state:'guard_restored',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'party'});continue;}
  if(e.type==='exposure'){push({kind:'boss_state',act,state:'exposed',abilityId:e.abilityId,amount:nonNegative(e.amount),scale:'arena'},false,true);continue;}
  if(e.type==='status_apply'||e.type==='status_tick'){
   push({kind:'boss_state',act,state:'status',abilityId:e.abilityId,targetName:nameOf(e.targetId),amount:nonNegative(e.amount),scale:'personal'});continue;
  }
  const action=e.type==='basic'?'strike':e.type;
  if(['strike','miss','heal','shield','cleanse','interrupt','mitigate'].includes(action)&&!isBoss(e.actorId)){
   const source=e.abilityId==='TONIC_WARD'?'tonic':e.actorId==='WAR_CAMP'?'war_camp':'party';
   push({kind:'party_action',act,action:action as 'strike',source,actorName:source==='party'?nameOf(e.actorId):'',
    targetName:e.targetId?nameOf(e.targetId):undefined,abilityId:e.abilityId,amount:nonNegative(e.amount),
    crit:e.detail==='crit',scale:action==='interrupt'?'arena':'personal'},false,e.detail==='crit');
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
 push({kind:'results'});
 return cues;
}
