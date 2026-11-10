/**
 * World Boss round-scheduled PROTOTYPE (V6). Server-owned test utility only.
 * This is NOT imported by any live routes, event jobs, currency, or mobile UI.
 * It deliberately does NOT mutate the existing time-driven combat engine.
 * Numerical tuning and per-round action cadence are unapproved.
 */
import {clamp, damageAfterMitigation, defenseMitigation, hitChance, roleAdjustedAttackPower} from './calculations';
import {CombatRng} from './deterministic-rng';
import type {CombatantDefinition, AbilityDefinition, AbilityEffect} from './types';

export type WorldBossId='hollowroot'|'sunscar'|'frostmarch';
export type WorldBossPhase='armored'|'exposed'|'enraged';
export type WorldBossOrder='break_armor'|'hold_line'|'steady_assault';
export type WorldBossEventType='telegraph'|'basic'|'strike'|'miss'|'shield'|'guard'|'exposure'|'guard_break'|'heal'|'status_apply'|'status_tick'|'cleanse'|'interrupt'|'mitigate'|'down'|'battle_end';
export interface WorldBossRoundEvent {
  round:number;type:WorldBossEventType;abilityId:string;actorId?:string;targetId?:string;
  amount?:number;absorbed?:number;guardAbsorbed?:number;mitigated?:number;ownerId?:string;detail?:string;
}
export interface WorldBossRoleLedger {
  bossHpDamage:number;guardDamage:number;effectiveHealing:number;shieldConsumed:number;
  tankProtection:number;cleansePrevented:number;interrupts:number;survived:boolean;
}
export interface WorldBossRoundInput {
  seed:string;boss:WorldBossId;phase:WorldBossPhase;players:readonly CombatantDefinition[];
  order?:WorldBossOrder; pressure?:number;
}
export interface WorldBossRoundResult {
  boss:WorldBossId;phase:WorldBossPhase;roundsCompleted:number;survived:boolean;bossHpDamage:number;
  localGuardDamage:number;guardRestored:number;remainingGuard:number;events:WorldBossRoundEvent[];
  participants:Record<string,WorldBossRoleLedger>;
  /** A client MUST NOT use this value to debit community health; settlement is a separate atomic service. */
  proposedWorldDamage:number;
}

// Exact 14 cue positions per phase, authored to match the v3/v5 spreadsheets.
// All tell/special pairs are validated before any battle is simulated.
export const WORLD_BOSS_ROUND_SCRIPTS:Record<WorldBossId,Record<WorldBossPhase,readonly string[]>>={
 hollowroot:{
  armored:['THORN_SWEEP','ROOT_SLAM_TELL','ROOT_SLAM','HEART_EXPOSE','ROOT_SLAM_TELL','ROOT_SLAM','SPLINTER_TAP','ROOT_SLAM_TELL','ROOT_SLAM','HEART_EXPOSE','ROOT_SLAM_TELL','ROOT_SLAM','WITHERING_BARK','CLOSE'],
  exposed:['VINE_LASH','VINES_TELL','VINES','SPOREBURST_TELL','SPOREBURST','REGROWTH_TELL','REGROWTH','ROOT_SWIPE','ROOT_SLAM_TELL','ROOT_SLAM','HEART_EXPOSE','SPOREBURST_TELL','SPOREBURST','CLOSE'],
  enraged:['EMBERBARK','SPLINTERSTORM_TELL','SPLINTERSTORM','HEART_EXPOSE','ROOT_SLAM_TELL','ROOT_SLAM','WITHERING_TETHER','SPLINTERSTORM_TELL','SPLINTERSTORM','HEART_EXPOSE','SPLINTERSTORM_TELL','SPLINTERSTORM','FRACTURED_BARK','CLOSE'],
 },
 sunscar:{
  armored:['SANDLASH','SANDBREAKER_TELL','SANDBREAKER','SOLAR_PLATE_WINDOW','HEAT_HAZE_TELL','HEAT_HAZE','TAIL_RAKE','SANDBREAKER_TELL','SANDBREAKER','SOLAR_PLATE_WINDOW','SCORCH_MARK_TELL','SCORCH_MARK','DESERT_BITE','CLOSE'],
  exposed:['DUNE_FANG','BURNING_TEMPEST_TELL','BURNING_TEMPEST','SOLAR_PLATE_WINDOW','SCORCH_MARK_TELL','SCORCH_MARK','EMBER_SPIT','BURNING_TEMPEST_TELL','BURNING_TEMPEST','SOLAR_PLATE_WINDOW','SANDBREAKER_TELL','SANDBREAKER','EMBER_SPIT','CLOSE'],
  enraged:['FURY_BITE','SOLAR_COLLAPSE_TELL','SOLAR_COLLAPSE','SOLAR_PLATE_WINDOW','DESERT_FURY_TELL','DESERT_FURY','EMBER_SPORES','SOLAR_COLLAPSE_TELL','SOLAR_COLLAPSE','SOLAR_PLATE_WINDOW','DESERT_FURY_TELL','DESERT_FURY','SEARING_TAIL','CLOSE'],
 },
 frostmarch:{
  armored:['ICEBOUND_AEGIS','ICE_SPEAR_TELL','ICE_SPEAR','AEGIS_FRACTURE','SHARD_VOLLEY_TELL','SHARD_VOLLEY','COLD_GRASP','ICE_SPEAR_TELL','ICE_SPEAR','AEGIS_FRACTURE','SHARD_VOLLEY_TELL','SHARD_VOLLEY','CHILL_STRIKE','CLOSE'],
  exposed:['FROST_CLAW','FREEZING_CHAINS_TELL','FREEZING_CHAINS','FROSTBITE_TELL','FROSTBITE','AEGIS_REFRESH_TELL','AEGIS_REFRESH','FROST_CLAW','ICE_SPEAR_TELL','ICE_SPEAR','AEGIS_FRACTURE','FROSTBITE_TELL','FROSTBITE','CLOSE'],
  enraged:['WHITEOUT_PULSE','WHITEOUT_TELL','WHITEOUT','AEGIS_FRACTURE','GLACIAL_REPRISAL_TELL','GLACIAL_REPRISAL','SHIVERING_MARK','WHITEOUT_TELL','WHITEOUT','AEGIS_FRACTURE','GLACIAL_REPRISAL_TELL','GLACIAL_REPRISAL','WINTER_GRASP','CLOSE'],
 }
};
const specials=new Set(['ROOT_SLAM','SPLINTERSTORM','VINES','SPOREBURST','REGROWTH','SANDBREAKER','HEAT_HAZE','SCORCH_MARK','BURNING_TEMPEST','SOLAR_COLLAPSE','DESERT_FURY','ICE_SPEAR','SHARD_VOLLEY','FREEZING_CHAINS','FROSTBITE','AEGIS_REFRESH','WHITEOUT','GLACIAL_REPRISAL']);
export function validateWorldBossScripts():number{
 let total=0;
 for(const byPhase of Object.values(WORLD_BOSS_ROUND_SCRIPTS))for(const script of Object.values(byPhase)){
  if(script.length!==14)throw Error('world_boss_invalid_round_count');
  for(let i=0;i<script.length;i++){const id=script[i];if(specials.has(id)&&script[i-1]!==id+'_TELL')throw Error('world_boss_missing_telegraph:'+id+':'+(i+1));total++;}
 }
 return total;
}
type Shield={amount:number;ownerId:string};
type Status={id:string;kind:'burn'|'frostbite'|'root'|'freeze'|'hot'|'dot';value:number;tickRounds:number[];sourceId:string;};
type Player={def:CombatantDefinition;hp:number;shields:Shield[];statuses:Status[];cooldowns:Record<string,number>;buffs:Record<string,{value:number;until:number}>};
type Telegraph={id:string;targetIds:string[];resolvesRound:number;interruptible:boolean;cancelled:boolean};
const money=(n:number)=>Math.round(Math.max(0,n)*100)/100;
const living=(ps:Player[])=>ps.filter(p=>p.hp>0);
const bossName=(id:WorldBossId)=>id==='hollowroot'?'HOLLOWROOT':id==='sunscar'?'SUNSCAR':'FROSTMARCH';
const noRngBelow=(rng:CombatRng,label:string)=>rng.next(label)*2; // CombatRng historically returns [0, 0.5).
function emptyRole():WorldBossRoleLedger{return {bossHpDamage:0,guardDamage:0,effectiveHealing:0,shieldConsumed:0,tankProtection:0,cleansePrevented:0,interrupts:0,survived:true};}

export function simulateWorldBossRounds(input:WorldBossRoundInput):WorldBossRoundResult{
 validateWorldBossScripts();
 if(!input.seed||input.players.length!==4)throw Error('world_boss_requires_four_players_and_seed');
 const roles=input.players.map(x=>x.role);
 if(roles.filter(x=>x==='tank').length!==1||roles.filter(x=>x==='damage').length!==2||roles.filter(x=>x==='support').length!==1)throw Error('world_boss_invalid_roles');
 if(new Set(input.players.map(p=>p.id)).size!==4)throw Error('world_boss_duplicate_echo');
 if(input.players.some(p=>p.team!=='players'||p.stats.maxHp<=0||p.stats.attackPower<=0))throw Error('world_boss_invalid_resolved_snapshot');
 if(!Number.isFinite(input.pressure??1)||(input.pressure??1)<.1||(input.pressure??1)>5)throw Error('world_boss_invalid_pressure');
 const players:Player[]=input.players.map(def=>({def,hp:money(def.stats.maxHp),shields:[],statuses:[],cooldowns:{},buffs:{}}));
 const byId=new Map(players.map(p=>[p.def.id,p]));
 const ledger:Record<string,WorldBossRoleLedger>=Object.fromEntries(players.map(p=>[p.def.id,emptyRole()]));
 const rng=new CombatRng(input.seed),events:WorldBossRoundEvent[]=[];
 const script=WORLD_BOSS_ROUND_SCRIPTS[input.boss][input.phase];
 const order=input.order??'steady_assault';
 const squadAttack=players.reduce((n,p)=>n+p.def.stats.attackPower,0);
 const meanAttack=squadAttack/players.length;
 const bossAttack=meanAttack*1.1*(input.pressure??1);
 const bossDefense=players.reduce((n,p)=>n+p.def.stats.defense,0)/players.length*.55;
 const guardMax=money(squadAttack*(input.boss==='frostmarch'?3:input.boss==='sunscar'?2.2:1.8));
 let guard=input.phase==='armored'?guardMax:money(guardMax*.45),guardDamage=0,guardRestored=0,bossHpDamage=0,exposedThrough=0,roundsCompleted=0;
 let bossVulnerability=0,bossVulnerabilityThrough=0;
 let pending:Telegraph|undefined;
 const emit=(e:WorldBossRoundEvent)=>events.push(e);
 const aliveTank=()=>living(players).find(p=>p.def.role==='tank');
 const targetSet=(id:string,round:number):string[]=>{
  const live=living(players);if(!live.length)return[];
  if(['SPLINTERSTORM','SPOREBURST','BURNING_TEMPEST','SOLAR_COLLAPSE','SHARD_VOLLEY','WHITEOUT'].includes(id))return live.map(p=>p.def.id);
  if(['SCORCH_MARK','VINES','FREEZING_CHAINS','FROSTBITE','HEAT_HAZE'].includes(id)){
   const back=live.filter(p=>p.def.role!=='tank');
   const pool=back.length?back:live;
   const chosen=pool[Math.floor(noRngBelow(rng,round+':target:'+id)*pool.length)%pool.length];
   if(id==='HEAT_HAZE'&&pool.length>1){
    const other=pool.find(p=>p!==chosen)!;return [chosen.def.id,other.def.id];
   }
   return [chosen.def.id];
  }
  if(id==='REGROWTH'||id==='AEGIS_REFRESH')return[];
  const front=aliveTank()??live[0];
  if(['ROOT_SLAM','SANDBREAKER','DESERT_FURY','GLACIAL_REPRISAL'].includes(id))return [front.def.id,...live.filter(p=>p!==front).slice(0,2).map(p=>p.def.id)];
  return [front.def.id];
 };
 const applyDamage=(round:number,actor:Player|undefined,target:Player|undefined,abilityId:string,coeff:number,kind:'player'|'boss',tags:{dot?:boolean;guardBreak?:boolean}={})=>{
  if(kind==='player'){
   if(!actor||actor.hp<=0||!Number.isFinite(coeff)||coeff<=0)return;
   const acc=hitChance(actor.def.stats.accuracy,120,1400);
   if(noRngBelow(rng,round+':'+actor.def.id+':'+abilityId+':hit')>acc){
    emit({round,type:'miss',actorId:actor.def.id,abilityId,targetId:bossName(input.boss)});return;
   }
   const crit=noRngBelow(rng,round+':'+actor.def.id+':'+abilityId+':crit')<actor.def.stats.critChance;
   const ap=roleAdjustedAttackPower({team:'players',role:actor.def.role,attackPower:actor.def.stats.attackPower,defense:actor.def.stats.defense,maxHp:actor.def.stats.maxHp,healingPower:actor.def.stats.healingPower});
   const damage=money(damageAfterMitigation(ap,coeff,defenseMitigation(bossDefense,1200),.95+noRngBelow(rng,round+':damage_variance')*.1,crit,actor.def.stats.critMultiplier));
   const weak=round<=exposedThrough && guard<=0;
   const enhanced=money(damage*(weak?1.10:1)*(round<=bossVulnerabilityThrough?1+bossVulnerability:1));
   const guardCoeff=order==='break_armor'?1.05:1;
   const absorbed=money(Math.min(guard,enhanced*guardCoeff));
   guard=money(guard-absorbed);
   guardDamage=money(guardDamage+absorbed);ledger[actor.def.id].guardDamage=money(ledger[actor.def.id].guardDamage+absorbed);
   if(absorbed>0&&guard===0)emit({round,type:'guard_break',abilityId,actorId:actor.def.id,targetId:bossName(input.boss),amount:absorbed});
   const hp=money(Math.max(0,enhanced-(absorbed/guardCoeff)));
   bossHpDamage=money(bossHpDamage+hp);ledger[actor.def.id].bossHpDamage=money(ledger[actor.def.id].bossHpDamage+hp);
   emit({round,type:'strike',actorId:actor.def.id,targetId:bossName(input.boss),abilityId,amount:hp,guardAbsorbed:absorbed,detail:crit?'crit':undefined});
   return;
  }
  if(!target||target.hp<=0)return;
  const attack=bossAttack;
  const raw=money(attack*coeff);
  const mit=defenseMitigation(target.def.stats.defense,1200);
  let preShield=money(damageAfterMitigation(attack,coeff,mit,.95+noRngBelow(rng,round+':boss_variance')*.1,false,1));
  const blockedByDefense=money(Math.max(0,raw-preShield));
  let protectedAmount=0;
  if(target.def.role!=='tank'&&aliveTank()){
   // Do not award Tank Impact for shields which would have absorbed the strike
   // anyway: measure the real HP difference after existing shield coverage.
   const guardian=aliveTank()!;
   const coverage=target.shields.reduce((n,s)=>n+s.amount,0);
   const intercept=money(preShield*.10);
   const before=Math.min(target.hp,Math.max(0,preShield-coverage));
   const after=Math.min(target.hp,Math.max(0,preShield-intercept-coverage));
   protectedAmount=money(Math.max(0,before-after));
   preShield=money(preShield-intercept);
   if(protectedAmount>0){
    ledger[guardian.def.id].tankProtection=money(ledger[guardian.def.id].tankProtection+protectedAmount);
    emit({round,type:'mitigate',abilityId:'TANK_INTERCEPT',actorId:guardian.def.id,targetId:target.def.id,amount:protectedAmount});
   }
  }
  if(order==='hold_line')preShield=money(preShield*.95);
  let remaining=preShield,absorbed=0;
  for(const shield of target.shields){
   if(remaining<=0)break;
   const used=money(Math.min(remaining,shield.amount));shield.amount=money(shield.amount-used);remaining=money(remaining-used);absorbed=money(absorbed+used);
   if(ledger[shield.ownerId])ledger[shield.ownerId].shieldConsumed=money(ledger[shield.ownerId].shieldConsumed+used);
  }
  target.shields=target.shields.filter(s=>s.amount>0);
  const hpDamage=money(Math.min(target.hp,remaining));target.hp=money(target.hp-hpDamage);
  emit({round,type:'strike',abilityId,actorId:bossName(input.boss),targetId:target.def.id,amount:hpDamage,absorbed,mitigated:money(blockedByDefense+protectedAmount)});
  if(target.hp===0)emit({round,type:'down',abilityId,actorId:bossName(input.boss),targetId:target.def.id});
 };
 const applyHeal=(round:number,actor:Player,target:Player,abilityId:string,amount:number)=>{
  if(target.hp<=0)return;
  const healed=money(Math.min(money(amount),target.def.stats.maxHp-target.hp));
  target.hp=money(target.hp+healed);ledger[actor.def.id].effectiveHealing=money(ledger[actor.def.id].effectiveHealing+healed);
  emit({round,type:'heal',actorId:actor.def.id,targetId:target.def.id,abilityId,amount:healed});
 };
 const cleanse=(round:number,actor:Player,target:Player,abilityId:string)=>{
  const removable=target.statuses.filter(s=>['burn','frostbite','root','freeze','dot'].includes(s.kind));
  for(const s of removable){
   if(s.kind==='burn'||s.kind==='frostbite')ledger[actor.def.id].cleansePrevented=money(ledger[actor.def.id].cleansePrevented+s.value*s.tickRounds.filter(t=>t>=round).length);
   emit({round,type:'cleanse',abilityId,actorId:actor.def.id,targetId:target.def.id,detail:s.id});
  }
  target.statuses=target.statuses.filter(s=>!removable.includes(s));
 };
 const addStatus=(round:number,target:Player,kind:Status['kind'],abilityId:string,value:number,ticks:number[])=>{
  target.statuses.push({kind,id:abilityId,sourceId:bossName(input.boss),value:money(value),tickRounds:ticks});
  emit({round,type:'status_apply',abilityId,actorId:bossName(input.boss),targetId:target.def.id,amount:money(value),detail:kind});
 };
 const abilityReady=(actor:Player,ability:AbilityDefinition,round:number):boolean=>{
  if((actor.cooldowns[ability.id]??0)>round)return false;
  const live=living(players);
  const low=(v:number)=>live.some(p=>p.hp/p.def.stats.maxHp<v);
  const threatened=Boolean(pending && !pending.cancelled && pending.targetIds.some(id=>id===actor.def.id||live.some(p=>p.def.id===id)));
  switch(ability.aiCondition){
   case 'self_below_50': return actor.hp/actor.def.stats.maxHp<.5;
   case 'ally_below_50':return low(.5);
   case 'ally_below_50_or_dot':return low(.5)||live.some(p=>p.statuses.some(s=>['burn','frostbite','dot'].includes(s.kind)));
   case 'ally_below_80':return low(.8);
   case 'ally_below_80_or_targeted':return low(.8)||threatened;
   case 'target_casting':return Boolean(pending?.interruptible&&!pending.cancelled);
   case 'multiple_enemies':return false;
   default:return true;
  }
 };
 const chooseTarget=(actor:Player,ability:AbilityDefinition):Player=>{
  const live=living(players);
  if(ability.target==='self')return actor;
  // A cleanse must select a genuinely afflicted ally before an uninjured
  // lowest-HP ally, otherwise the skill fires but prevents no real status.
  if(ability.effects.some(effect=>effect.kind==='cleanse')){
   const afflicted=live.filter(p=>p.statuses.some(s=>['burn','frostbite','root','freeze','dot'].includes(s.kind)));
   if(afflicted.length)return afflicted.sort((a,b)=>
    a.hp/a.def.stats.maxHp-b.hp/b.def.stats.maxHp||a.def.id.localeCompare(b.def.id))[0];
  }
  if(ability.target==='lowest_hp_ally')return live.reduce((a,b)=>a.hp/a.def.stats.maxHp<=b.hp/b.def.stats.maxHp?a:b);
  if(ability.target==='threatened_ally')return live.find(p=>pending?.targetIds.includes(p.def.id))??live.reduce((a,b)=>a.hp/a.def.stats.maxHp<=b.hp/b.def.stats.maxHp?a:b);
  return actor;
 };
 const playerTurn=(round:number,actor:Player)=>{
  if(actor.hp<=0)return;
  const control=actor.statuses.find(s=>s.kind==='freeze'||s.kind==='root');
  const reduced=control?.value??0;
  if(control)actor.statuses=actor.statuses.filter(s=>s!==control);
  const abilities=[...actor.def.abilities].sort((a,b)=>b.priority-a.priority);
  const chosen=abilities.find(a=>abilityReady(actor,a,round));
  if(!chosen){applyDamage(round,actor,undefined,'BASIC',actor.def.basicAttackCoeff*(1-reduced),'player');return;}
  actor.cooldowns[chosen.id]=round+Math.max(1,Math.ceil(chosen.cooldownMs/5000));
  const target=chooseTarget(actor,chosen);
  for(const effect of chosen.effects){
   if(effect.kind==='damage')applyDamage(round,actor,undefined,chosen.id,(effect.coeff??0)*(1-reduced),'player');
   if(effect.kind==='heal')applyHeal(round,actor,target,chosen.id,actor.def.stats.healingPower*(effect.coeff??0)*(1-reduced)+(effect.flat??0));
   if(effect.kind==='shield' && target.hp>0){
    const amount=money((actor.def.stats.healingPower*(effect.coeff??0)+(effect.flat??0))*(1-reduced));
    target.shields.push({amount,ownerId:actor.def.id});
    emit({round,type:'shield',actorId:actor.def.id,targetId:target.def.id,abilityId:chosen.id,amount});
   }
   if(effect.kind==='cleanse')cleanse(round,actor,target,chosen.id);
   if(effect.kind==='interrupt'&&pending?.interruptible&&!pending.cancelled){
    pending.cancelled=true;ledger[actor.def.id].interrupts++;
    emit({round,type:'interrupt',actorId:actor.def.id,abilityId:chosen.id,targetId:bossName(input.boss),detail:pending.id});
   }
   if(effect.kind==='dot'){
    const tickPower=money(actor.def.stats.attackPower*(effect.coeff??0));
    for(let t=round+1;t<=Math.min(14,round+Math.max(1,Math.round((effect.durationMs??4000)/(effect.tickMs??2000))));t++){
     // This prototype resolves player DoTs directly against the boss on their scheduled tick,
     // but only the real HP / local guard ledger may be credited.
     // Stored as a special status on the source actor, not an automatic free hit.
     actor.statuses.push({kind:'dot',id:chosen.id,sourceId:actor.def.id,value:tickPower,tickRounds:[t]});
    }
   }
   if(effect.kind==='hot'){
    const count=Math.max(1,Math.round((effect.durationMs??4000)/(effect.tickMs??2000)));
    for(let i=1;i<=count;i++)if(round+i<=14)target.statuses.push({kind:'hot',id:chosen.id,sourceId:actor.def.id,value:money(actor.def.stats.healingPower*(effect.coeff??0)),tickRounds:[round+i]});
   }
   if(effect.kind==='debuff'&&effect.tag==='damage_taken'){
    bossVulnerability=clamp(effect.value??0,0,.25);bossVulnerabilityThrough=round+1; // Verified damage_taken debuff; does not bypass local guard.
   }
  }
 };
 const special=(round:number,id:string,ids:string[])=>{
  const alive=ids.map(x=>byId.get(x)).filter((p):p is Player=>Boolean(p&&p.hp>0));
  if(id==='REGROWTH'||id==='AEGIS_REFRESH'){
   const restored=money(Math.min(guardMax-guard,guardMax*.08));guard=money(guard+restored);guardRestored=money(guardRestored+restored);
   emit({round,type:'guard',abilityId:id,actorId:bossName(input.boss),amount:restored,detail:'local_only'});return;
  }
  if(id==='VINES'||id==='FREEZING_CHAINS'){
   for(const p of alive)addStatus(round,p,id==='VINES'?'root':'freeze',id,.5,[]);
   return;
  }
  if(['SPOREBURST','FROSTBITE','SCORCH_MARK','HEAT_HAZE'].includes(id)){
   const pct=id==='SPOREBURST'?.035:.025;
   for(const p of alive){
    if(id==='SCORCH_MARK')applyDamage(round,undefined,p,id,1.0,'boss');
    addStatus(round,p,id==='FROSTBITE'?'frostbite':'burn',id,p.def.stats.maxHp*pct,[round,round+1].filter(r=>r<=14));
   }
   return;
  }
  const frontCoeff=id==='DESERT_FURY'?1.5:id==='GLACIAL_REPRISAL'?1.45:id==='ROOT_SLAM'&&input.phase==='enraged'?1.45:id==='ICE_SPEAR'?1.3:1.35;
  if(['ROOT_SLAM','SANDBREAKER','DESERT_FURY','GLACIAL_REPRISAL'].includes(id)){
   alive.forEach((p,i)=>applyDamage(round,undefined,p,id,i===0?frontCoeff:(id==='DESERT_FURY'?.55:id==='GLACIAL_REPRISAL'?.45:.45),'boss'));
  } else if(['SPLINTERSTORM','SOLAR_COLLAPSE','WHITEOUT','BURNING_TEMPEST','SHARD_VOLLEY'].includes(id)){
   const coeff=id==='SOLAR_COLLAPSE'?.8:id==='BURNING_TEMPEST'?.6:id==='SHARD_VOLLEY'?.5:.7;
   alive.forEach(p=>applyDamage(round,undefined,p,id,coeff,'boss'));
  }
 };
 for(let round=1;round<=14;round++){
  if(!living(players).length)break;
  roundsCompleted=round;
  const cue=script[round-1];
  // Cues occur before player turns, so a real class interrupt can cancel a scheduled channel.
  if(cue.endsWith('_TELL')){
   const id=cue.slice(0,-5);
   pending={id,targetIds:targetSet(id,round),resolvesRound:round+1,
    interruptible:id==='REGROWTH'||id==='AEGIS_REFRESH',cancelled:false};
   emit({round,type:'telegraph',abilityId:id,actorId:bossName(input.boss),detail:pending.targetIds.join(',')});
  }
  if(cue==='HEART_EXPOSE'||cue==='SOLAR_PLATE_WINDOW'||cue==='AEGIS_FRACTURE'){
   exposedThrough=round+1;
   emit({round,type:'exposure',abilityId:cue,actorId:bossName(input.boss),amount:guard===0?1:0,detail:'conditional_on_guard_break'});
  }
  if(cue==='ICEBOUND_AEGIS')emit({round,type:'guard',abilityId:cue,actorId:bossName(input.boss),amount:guard,detail:'local_only'});
  // Support can cleanse an already-applied control before allies take their
  // next action. Every actor still receives at most one turn; no bonus attacks.
  const turns=[...players].sort((a,b)=>
   Number(b.def.role==='support')-Number(a.def.role==='support')||
   Number(b.def.role==='tank')-Number(a.def.role==='tank')||
   a.def.id.localeCompare(b.def.id));
  for(const p of turns)if(p.hp>0)playerTurn(round,p);
  if(specials.has(cue)){
   if(!pending||pending.id!==cue||pending.resolvesRound!==round)throw Error('world_boss_invalid_pending_special:'+cue);
   if(!pending.cancelled)special(round,cue,pending.targetIds);
   else emit({round,type:'interrupt',abilityId:cue,actorId:bossName(input.boss),detail:'cancelled_special'});
   pending=undefined;
  }else if(cue!=='CLOSE'){
   // Authored telegraphs remain one-round warnings for the SPECIAL, but do
   // not disable the boss's ordinary attack. Distinguish BASIC visibly in
   // replay so players never mistake it for the telegraphed spike.
   const target=aliveTank()??living(players)[0];
   const ordinary=cue.endsWith('_TELL')||['HEART_EXPOSE','SOLAR_PLATE_WINDOW','AEGIS_FRACTURE','ICEBOUND_AEGIS'].includes(cue);
   applyDamage(round,undefined,target,ordinary?'BASIC':cue,.60,'boss');
  }
  // Status ticks are real HP/guard operations, not narrative or client-side estimates.
  for(const p of players){
   for(const s of [...p.statuses]){
    if(!s.tickRounds.includes(round))continue;
    if(s.kind==='burn'||s.kind==='frostbite'){
     if(p.hp>0){const amount=money(Math.min(p.hp,s.value));p.hp=money(p.hp-amount);
      emit({round,type:'status_tick',abilityId:s.id,actorId:bossName(input.boss),targetId:p.def.id,amount,detail:s.kind});
      if(p.hp===0)emit({round,type:'down',abilityId:s.id,targetId:p.def.id});
     }
    }else if(s.kind==='hot'&&p.hp>0){
     const owner=byId.get(s.sourceId);if(owner)applyHeal(round,owner,p,s.id,s.value);
    }else if(s.kind==='dot'&&p.hp>0){
     const owner=byId.get(s.sourceId);if(owner)applyDamage(round,owner,undefined,s.id,s.value/Math.max(1,owner.def.stats.attackPower),'player');
    }
   }
   p.statuses=p.statuses.filter(s=>s.tickRounds.some(r=>r>round)||(['freeze','root'].includes(s.kind)));
  }
 }
 for(const p of players)ledger[p.def.id].survived=p.hp>0;
 const survived=living(players).length>0;
 emit({round:roundsCompleted,type:'battle_end',abilityId:'END',detail:survived?'survived':'wiped'});
 // This is only a possible *future* battle contribution, not an event-global HP write.
 return {boss:input.boss,phase:input.phase,roundsCompleted,survived,bossHpDamage,
  localGuardDamage:guardDamage,guardRestored,remainingGuard:guard,
  events,participants:ledger,proposedWorldDamage:bossHpDamage};
}
