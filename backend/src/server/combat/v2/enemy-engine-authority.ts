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
}
const issued=new WeakMap<object,ImmutableScope>();
const validId=(x:unknown):x is string=>
 typeof x==='string'&&x.length>0&&x.length<=128&&/^[A-Za-z0-9:_-]+$/.test(x);
const unique=(xs:readonly string[])=>new Set(xs).size===xs.length;
const invalid=(suffix:string):never=>{throw Error('combat_v2_enemy_authority_'+suffix);};
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
/** Hash the full post-compilation encounter input, not just actor IDs. A
 * persisted verifier must match this against the original sealed snapshot. */
const fingerprint=(input:CombatInput):string=>{
 try{
  const value=JSON.stringify(input,(_key,field)=>{
    if(typeof field==='number'&&!Number.isFinite(field))invalid('nonfinite_combat_input');
    if(typeof field==='function'||typeof field==='bigint')invalid('invalid_combat_input');
    return field;
  });
  if(!value)invalid('invalid_combat_input');
  return bytesToHex(sha256(utf8(value)));
 }catch{invalid('invalid_combat_input');}
};

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
 if(input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0||
    input.enemyDamageProfile!==undefined||
    input.players.some(p=>p.team!=='players'||!p.combatV2||p.combatV2.version!==2)||
    input.enemies.some(e=>e.team!=='enemies'||Boolean(e.boss)!==saved.bossIds.includes(e.id)))
  invalid('nonfresh_or_nonv2_encounter');
 return true;
}
