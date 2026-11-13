/**
 * World Boss v7 OFFLINE Echo matching prototype. No database, login or player access.
 * Candidates MUST be hydrated from a future server-side validated snapshot store.
 * This is a pure deterministic role+bracket allocator with explicit NPC fallback.
 */
import type {CombatRole,CombatantDefinition} from './types';
import {CombatRng} from './deterministic-rng';
import {launchPlayer} from './content/launch-combat';
import type {WorldBossSnapshotPrototype} from './world-boss-event-prototype';

export type WorldBossPowerBracket=1|2|3|4|5;
type PartyRole='tank'|'damage'|'support';
export interface WorldBossEchoCandidatePrototype extends WorldBossSnapshotPrototype {
 bracket:WorldBossPowerBracket;
 updatedAtUtcMs:number;
 /** Count of prior times this snapshot was selected; not a reward claim. */
 uses:number;
 eligible:boolean;
 /** Optional soft social preference; never overrides a much closer power bracket. */
 affinity?:'none'|'friend'|'guild';
}
export interface WorldBossEchoMatchPrototype {
 squad:readonly WorldBossSnapshotPrototype[];
 selectedRealEchoIds:readonly string[];
 npcSlots:number;
 matchedBracket:WorldBossPowerBracket;
}
export interface WorldBossEchoQueryPrototype {
 seed:string;
 accountId:string;
 atUtcMs:number;
 bracket:WorldBossPowerBracket;
 initiator:WorldBossSnapshotPrototype;
 candidateEchoes:readonly WorldBossEchoCandidatePrototype[];
 /** Client cannot choose NPC kits; this test fallback uses Veldryn's existing class role templates. */
}

const valid=(x:string)=>typeof x==='string'&&x.trim().length>0&&x.length<=160;
const role=(def:CombatantDefinition):PartyRole=>{
 if(def.role==='tank'||def.role==='damage'||def.role==='support')return def.role;
 throw Error('world_boss_echo_invalid_role');
};
function snapOk(s:WorldBossSnapshotPrototype):boolean{
 const d=s.resolvedCombatant;
 return valid(s.snapshotId)&&valid(s.ownerAccountId)&&Boolean(d)&&d.team==='players'&&
  valid(d.id)&&Number.isFinite(d.stats.maxHp)&&d.stats.maxHp>0&&
  Number.isFinite(d.stats.attackPower)&&d.stats.attackPower>0 &&
  ['tank','damage','support'].includes(d.role);
}
const BRACKETS=[1,2,3,4,5] as const;
const MAX_SNAPSHOT_AGE_MS=7*24*60*60*1000;
const npcDefaults:Record<PartyRole,string>={tank:'Bastion',damage:'Wayfinder',support:'Stonecaller'};
function npcFor(roleId:PartyRole,slot:number,bracket:WorldBossPowerBracket,initiator:WorldBossSnapshotPrototype):WorldBossSnapshotPrototype{
 const archetype=launchPlayer(npcDefaults[roleId],25);
 // Strictly a test-only tier proxy. Real NPC gear/stats must be generated from
 // the server's calibrated bracket baseline, NEVER from mobile-supplied power.
 const cap=initiator.resolvedCombatant.stats.attackPower;
 const scale=(.55+(bracket-1)*.15);
 const attack=Math.max(1,Math.min(archetype.stats.attackPower*scale,cap*1.15));
 const hp=Math.max(100,archetype.stats.maxHp*scale);
 const def:CombatantDefinition={
  ...archetype,id:'WB_NPC_'+roleId+'_'+slot,level:initiator.resolvedCombatant.level,
  stats:{...archetype.stats,attackPower:attack,maxHp:hp,
   healingPower:Math.min(archetype.stats.healingPower*scale,Math.max(0,initiator.resolvedCombatant.stats.attackPower*1.4)),
   defense:archetype.stats.defense*scale}
 };
 return {snapshotId:'wb_npc_'+roleId+'_'+slot+':bracket_'+bracket,
  ownerAccountId:'wb_npc_'+roleId+'_'+slot,npc:true,resolvedCombatant:def};
}
/**
 * A preference order is deterministic (same query/seed => same squad), but
 * not simply strongest-first. Adjacent bracket real players may be matched,
 * while incompatible power brackets fall back to calibrated NPC fixtures.
 * \`uses\` implements a soft least-used rotation, not a currency transfer.
 */
export function matchWorldBossEchoesPrototype(input:WorldBossEchoQueryPrototype):WorldBossEchoMatchPrototype{
 if(!valid(input.seed)||!valid(input.accountId)||!Number.isSafeInteger(input.atUtcMs)||
   !BRACKETS.includes(input.bracket)||!snapOk(input.initiator)||
   input.initiator.npc||input.initiator.ownerAccountId!==input.accountId)
  throw Error('world_boss_echo_invalid_query');
 const roles:Record<PartyRole,number>={tank:1,damage:2,support:1};
 roles[role(input.initiator.resolvedCombatant)]--;
 const selected:WorldBossSnapshotPrototype[]=[input.initiator];
 const owners=new Set([input.accountId]),snapshotIds=new Set([input.initiator.snapshotId]);
 const actors=new Set([input.initiator.resolvedCombatant.id]);
 const rng=new CombatRng(input.seed);
 let npcSlots=0;
 const validCandidates=input.candidateEchoes.filter(c=>
  c.eligible&&!c.npc&&snapOk(c)&&c.ownerAccountId!==input.accountId&&
  Number.isSafeInteger(c.updatedAtUtcMs)&&c.updatedAtUtcMs<=input.atUtcMs&&
  input.atUtcMs-c.updatedAtUtcMs<=MAX_SNAPSHOT_AGE_MS &&
  Number.isSafeInteger(c.uses)&&c.uses>=0&&BRACKETS.includes(c.bracket)&&
  Math.abs(c.bracket-input.bracket)<=1
 );
 for(const requiredRole of ['tank','damage','support'] as const){
  for(let slot=0;slot<roles[requiredRole];slot++){
   const pool=validCandidates.filter(c=>role(c.resolvedCombatant)===requiredRole &&
     !owners.has(c.ownerAccountId)&&!snapshotIds.has(c.snapshotId)&&!actors.has(c.resolvedCombatant.id));
   if(!pool.length){
    const npc=npcFor(requiredRole,npcSlots++,input.bracket,input.initiator);
    selected.push(npc);owners.add(npc.ownerAccountId);snapshotIds.add(npc.snapshotId);actors.add(npc.resolvedCombatant.id);
    continue;
   }
   // Prefer matched power first, fair borrowing second, guild/friend third;
   // seeded tie selection avoids picking the first database row each time.
   const sorted=[...pool].sort((a,b)=>
    Math.abs(a.bracket-input.bracket)-Math.abs(b.bracket-input.bracket)||
    a.uses-b.uses||
    ((a.affinity==='guild'||a.affinity==='friend')?0:1)-((b.affinity==='guild'||b.affinity==='friend')?0:1)||
    a.snapshotId.localeCompare(b.snapshotId));
   const best=sorted[0];
   const ties=sorted.filter(c=>Math.abs(c.bracket-input.bracket)===Math.abs(best.bracket-input.bracket)&&
    c.uses===best.uses&&Boolean(c.affinity==='guild'||c.affinity==='friend')===Boolean(best.affinity==='guild'||best.affinity==='friend'));
   // CombatRng.next currently yields [0, 0.5); preserve legacy replay RNG
   // semantics while rescaling the full tie pool, not just its first two.
   const random=rng.next(requiredRole+':'+slot+':echo')*2;
   const chosen=ties[Math.min(ties.length-1,Math.floor(random*ties.length))];
   selected.push(chosen);
   owners.add(chosen.ownerAccountId);snapshotIds.add(chosen.snapshotId);actors.add(chosen.resolvedCombatant.id);
  }
 }
 if(selected.length!==4)throw Error('world_boss_echo_invalid_squad_count');
 const selectedRoles=selected.map(c=>role(c.resolvedCombatant));
 if(selectedRoles.filter(x=>x==='tank').length!==1||selectedRoles.filter(x=>x==='damage').length!==2||
  selectedRoles.filter(x=>x==='support').length!==1)throw Error('world_boss_echo_role_invariant');
 return {squad:selected,selectedRealEchoIds:selected.filter((x,i)=>i>0&&!x.npc).map(x=>x.snapshotId),
  npcSlots,matchedBracket:input.bracket};
}
