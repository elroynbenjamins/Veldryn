/**
 * Unreleased, server-only Enemy 2.0 authority for the draft Classes 2.0 engine.
 *
 * Only an authenticated persistence adapter may provide verifyPersisted.
 * The issued object is not a serializable JSON switch, and its scope is held
 * inside a private WeakMap. Never expose this factory on an HTTP/Edge route.
 */
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
import type {CombatInput} from '../types';
import type {PartyV2RunBindingReview} from './party-dungeon-persistence-review';

const brand:unique symbol=Symbol('combat-v2-enemy-snapshot');
export type EnemyV2EngineAuthority=Readonly<{readonly [brand]:true}>;
export const ENEMY_V2_ENGINE_RULESET='enemy-v2-prototype-1' as const;

export interface ServerEnemyV2Snapshot {
 readonly source:'server-persisted-v2';
 readonly version:2;
 readonly ruleset:typeof ENEMY_V2_ENGINE_RULESET;
 readonly mode:'solo';
 readonly encounterId:string;
 readonly revision:number;
 readonly seed:string;
 readonly playerIds:readonly string[];
 readonly enemyIds:readonly string[];
 /** Explicitly authored solo boss IDs, never inferred from client flags. */
 readonly bossIds?:readonly string[];
}
interface ImmutableScope{
 readonly encounterId:string;
 readonly revision:number;
 readonly seed:string;
 readonly playerIds:readonly string[];
 readonly enemyIds:readonly string[];
 readonly inputDigest:string;
 readonly bossIds:readonly string[];
 readonly mode:'solo'|'party';
 readonly allowPersistedState:boolean;
}
const issued=new WeakMap<object,ImmutableScope>();
const validId=(x:unknown):x is string=>
 typeof x==='string'&&x.length>0&&x.length<=128&&/^[A-Za-z0-9:_-]+$/.test(x);
const unique=(xs:readonly string[])=>new Set(xs).size===xs.length;
function invalid(suffix:string):never{throw Error('combat_v2_enemy_authority_'+suffix);}
/** Shared-engine-compatible UTF-8. Hermes does not always expose TextEncoder. */
const utf8=(value:string):Uint8Array=>{
 const bytes:number[]=[];
 for(const character of value){
  let n=character.codePointAt(0)!;
  if(n>=0xd800&&n<=0xdfff)n=0xfffd;
  if(n<0x80)bytes.push(n);
  else if(n<0x800)bytes.push(0xc0|(n>>6),0x80|(n&63));
  else if(n<0x10000)bytes.push(0xe0|(n>>12),0x80|((n>>6)&63),0x80|(n&63));
  else bytes.push(0xf0|(n>>18),0x80|((n>>12)&63),0x80|((n>>6)&63),0x80|(n&63));
 }
 return new Uint8Array(bytes);
};
/** Canonical digest over *all* post-compilation actor, skill and enemy fields.
 * Key sorting makes JSONB/persistence reorder safe. Reject hidden executable
 * values, cycles and nonfinite numeric state instead of omitting them. */
export function enemyV2SnapshotDigest(value:unknown):string{
 const visited=new WeakSet<object>();
 const canonical=(entry:unknown,depth:number):unknown=>{
  if(depth>24)invalid('invalid_combat_input');
  if(entry===null||typeof entry==='string'||typeof entry==='boolean')return entry;
  if(typeof entry==='number'){
   if(!Number.isFinite(entry))invalid('nonfinite_combat_input');
   return entry;
  }
  if(Array.isArray(entry)){
   if(visited.has(entry)||entry.length>1024)invalid('invalid_combat_input');
   visited.add(entry);
   const result=entry.map(child=>{
    if(child===undefined)invalid('invalid_combat_input');
    return canonical(child,depth+1);
   });
   visited.delete(entry);
   return result;
  }
  if(entry&&typeof entry==='object'){
   if(visited.has(entry)||Object.keys(entry).length>256||
      (Object.getPrototypeOf(entry)!==Object.prototype&&Object.getPrototypeOf(entry)!==null))
     invalid('invalid_combat_input');
   visited.add(entry);
   const result:Record<string,unknown>={};
   for(const key of Object.keys(entry).sort()){
    if(key==='__proto__'||key==='prototype'||key==='constructor')invalid('invalid_combat_input');
    const child=(entry as Record<string,unknown>)[key];
    if(child!==undefined)result[key]=canonical(child,depth+1);
   }
   visited.delete(entry);
   return result;
  }
  invalid('invalid_combat_input');
 };
 const serialized=JSON.stringify(canonical(value,0));
 if(!serialized||serialized.length>1000000)invalid('invalid_combat_input');
 return bytesToHex(sha256(utf8(serialized)));
}
const fingerprint=(input:CombatInput):string=>enemyV2SnapshotDigest(input);

export function issueEnemyV2EngineAuthority(
 snapshot:ServerEnemyV2Snapshot,
 input:CombatInput,
 verifyPersisted:(value:ServerEnemyV2Snapshot,inputDigest:string)=>boolean,
):EnemyV2EngineAuthority{
 if(typeof verifyPersisted!=='function')invalid('trusted_verifier_required');
 if(!snapshot||snapshot.source!=='server-persisted-v2'||snapshot.version!==2||
   snapshot.ruleset!==ENEMY_V2_ENGINE_RULESET||snapshot.mode!=='solo'||
   !validId(snapshot.encounterId)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||
   typeof snapshot.seed!=='string'||snapshot.seed.length<1||snapshot.seed.length>256||
   !Array.isArray(snapshot.playerIds)||snapshot.playerIds.length!==1||
   !Array.isArray(snapshot.enemyIds)||snapshot.enemyIds.length<1||snapshot.enemyIds.length>4||
   [...snapshot.playerIds,...snapshot.enemyIds].some(id=>!validId(id))||
   !unique([...snapshot.playerIds,...snapshot.enemyIds])||
   (snapshot.bossIds!==undefined&&(
     !Array.isArray(snapshot.bossIds)||snapshot.bossIds.length>1||
     !unique(snapshot.bossIds)||snapshot.bossIds.some(id=>!snapshot.enemyIds.includes(id)))))
  invalid('invalid_persisted_scope');
 if(!input||input.seed!==snapshot.seed||
    input.players.length!==snapshot.playerIds.length||
    input.enemies.length!==snapshot.enemyIds.length||
    input.players.some((actor,i)=>actor.id!==snapshot.playerIds[i])||
    input.enemies.some((actor,i)=>actor.id!==snapshot.enemyIds[i]))
  invalid('scope_does_not_match_combat_input');
 const inputDigest=fingerprint(input);
 let accepted=false;
 try{accepted=verifyPersisted(snapshot,inputDigest)===true;}catch{accepted=false;}
 if(!accepted)invalid('unverified_persisted_scope');
 const token=Object.freeze({[brand]:true}) as EnemyV2EngineAuthority;
 issued.set(token,Object.freeze({
  encounterId:snapshot.encounterId,revision:snapshot.revision,seed:snapshot.seed,
  playerIds:Object.freeze([...snapshot.playerIds]),
  enemyIds:Object.freeze([...snapshot.enemyIds]),
  bossIds:Object.freeze([...(snapshot.bossIds??[])]),inputDigest,
  mode:'solo',allowPersistedState:false,
 }));
 return token;
}

/** No authority means precise legacy/ordinary V2 behavior; malformed supplied
 * authorities throw rather than silently bypassing missing provenance. */
export function authorizeEnemyV2EngineExecution(
 input:CombatInput,
 authority?:EnemyV2EngineAuthority,
):boolean{
 if(authority===undefined)return false;
 if(!authority||typeof authority!=='object'||!issued.has(authority))
  invalid('token_not_server_issued');
 const saved=issued.get(authority)!;
 if(input.seed!==saved.seed||
    input.players.length!==saved.playerIds.length||
    input.enemies.length!==saved.enemyIds.length||
    input.players.some((p,i)=>p.id!==saved.playerIds[i])||
    input.enemies.some((e,i)=>e.id!==saved.enemyIds[i])||
    fingerprint(input)!==saved.inputDigest)
  invalid('scope_does_not_match_combat_input');
 if((!saved.allowPersistedState&&input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0)||
    input.enemyDamageProfile!==undefined||
    input.players.some(p=>p.team!=='players'||!p.combatV2||p.combatV2.version!==2)||
    input.enemies.some(e=>e.team!=='enemies'||Boolean(e.boss)!==saved.bossIds.includes(e.id)))
  invalid('nonfresh_or_nonv2_encounter');
 return true;
}


/** Separate persisted-party issuer. Existing solo snapshots remain one-player
 * and fresh-state only; this path requires the reviewed committed run binding. */
export function issuePersistedPartyEnemyV2EngineAuthority(
 input:CombatInput,
 binding:PartyV2RunBindingReview,
 enemyIds:readonly string[],
 bossIds:readonly string[],
 verifyPersisted:(binding:PartyV2RunBindingReview,inputDigest:string)=>boolean,
):EnemyV2EngineAuthority{
 if(typeof verifyPersisted!=='function'||!binding||
   binding.source!=='server-persisted-party-v2-review'||
   binding.policy!=='party-v2-run-binding-review-1'||
   binding.seed!==input?.seed||binding.combatInputDigest!==fingerprint(input)||
   input.players.length!==4||input.enemyDamageProfile!==undefined||
   binding.members.length!==4||binding.members.some((m,i)=>m.actorId!==input.players[i]?.id)||
   !Array.isArray(enemyIds)||enemyIds.length<1||enemyIds.length>4||
   !Array.isArray(bossIds)||bossIds.length>1||
   [...enemyIds,...bossIds].some(id=>!validId(id))||
   !unique(enemyIds)||!unique(bossIds)||bossIds.some(id=>!enemyIds.includes(id))||
   input.enemies.length!==enemyIds.length||
   input.enemies.some((e,i)=>e.team!=='enemies'||e.id!==enemyIds[i]||
     Boolean(e.boss)!==bossIds.includes(e.id))||
   input.players.some(p=>p.team!=='players'||p.combatV2?.version!==2))
  invalid('invalid_party_persisted_scope');
 const carried=Object.keys(input.initialPlayerState??{}).sort();
 if(carried.length){
  const expected=input.players.map(p=>p.id).sort();
  if(carried.length!==4||carried.some((id,i)=>id!==expected[i]))
   invalid('party_persistent_state_mismatch');
 }
 const inputDigest=fingerprint(input);
 const bindingDigest=enemyV2SnapshotDigest(binding);
 const enemyIdsDigest=enemyV2SnapshotDigest(enemyIds);
 const bossIdsDigest=enemyV2SnapshotDigest(bossIds);
 let accepted=false;
 try{accepted=verifyPersisted(binding,inputDigest)===true;}catch{accepted=false;}
 if(!accepted||fingerprint(input)!==inputDigest||
    enemyV2SnapshotDigest(binding)!==bindingDigest||
    enemyV2SnapshotDigest(enemyIds)!==enemyIdsDigest||
    enemyV2SnapshotDigest(bossIds)!==bossIdsDigest)
  invalid('unverified_party_persisted_scope');
 const token=Object.freeze({[brand]:true}) as EnemyV2EngineAuthority;
 issued.set(token,Object.freeze({
  encounterId:binding.runId+':'+binding.nodeId,
  revision:binding.encounterRevision,seed:binding.seed,
  playerIds:Object.freeze(input.players.map(p=>p.id)),
  enemyIds:Object.freeze([...enemyIds]),bossIds:Object.freeze([...bossIds]),
  inputDigest,mode:'party',allowPersistedState:true,
 }));
 return token;
}
