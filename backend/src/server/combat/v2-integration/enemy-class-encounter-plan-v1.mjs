/**
 * Hidden Class/Skills + Enemy/Boss 2.0 reconciliation plan.
 * Does not change live engine, types, state, Q-mode, dungeons or rewards.
 */
export const COMBAT_V2_ENEMY_CLASS_GATE='combat-v2-enemy-class-preflight-v1';
export const ENEMY_V2_RULESET='enemy-v2-prototype-1';
const roles=Object.freeze({
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
});
/* Reconcile eight Skills-v2 PVE archetypes with six Enemy-v2 trait kits.
 * Both existing branch compilers cannot independently add kits to one enemy. */
export const LEGACY_ENEMY_TO_TRAITS_ARCHETYPE_V2=Object.freeze({
 guardian:'bulwark',bruiser:'berserker',executioner:'berserker',
 assassin:'predator',swarm:'predator',caster:'spellcaster',
 hexer:'hexer',support:'mender',
});
/* Exact implemented trait subsets from the hidden enemy prototype. */
const implemented=Object.freeze({
 bulwark:['stonehide','fortified'],
 berserker:['savage','rending'],
 predator:['swift','keen','rending'],
 spellcaster:['hexing','venomous'],
 hexer:['hexing','venomous'],
 mender:['regenerating','fortified'],
});
const group=Object.freeze({
 savage:'offense',swift:'offense',keen:'offense',stonehide:'defense',
 fortified:'defense',regenerating:'defense',rending:'control',
 venomous:'control',hexing:'control',
});
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const record=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const string=(v)=>typeof v==='string'&&v.trim().length>0;
const deny=(code)=>{throw new Error('combat_v2_enemy_class_'+code);};
const validStatusRow=(value)=>record(value)&&Object.keys(value).length<=14&&
 Object.values(value).every(x=>x===null||['string','number','boolean'].includes(typeof x))&&
 Object.values(value).every(x=>typeof x!=='number'||Number.isFinite(x));
const seal=(value)=>{
 if(Array.isArray(value)){for(const x of value)seal(x);return Object.freeze(value);}
 if(record(value)){for(const x of Object.values(value))seal(x);return Object.freeze(value);}
 return value;
};
export function canonicalEnemyTraitsArchetypeV2(tag){
 if(!string(tag)||!tag.startsWith('pve:archetype:'))deny('missing_pve_archetype');
 const original=tag.slice('pve:archetype:'.length);
 if(!has(LEGACY_ENEMY_TO_TRAITS_ARCHETYPE_V2,original))deny('unsupported_pve_archetype');
 return LEGACY_ENEMY_TO_TRAITS_ARCHETYPE_V2[original];
}
/* New solo 2.0 encounter ONLY. Existing Q-mode/legacy dungeon/raid
 * snapshots are forbidden. The verifier must be supplied by trusted
 * authenticated server code, never the incoming request body.
 * Returns a non-runnable plan rather than a live CombatInput. */
export function planHiddenEnemyClassEncounterV2(snapshot,authority){
 if(!record(snapshot)||!record(authority)||
    typeof authority.verifyPersistedSnapshot!=='function')
   deny('trusted_snapshot_verifier_required');
 if(snapshot.version!==2||snapshot.ruleset!==ENEMY_V2_RULESET||
    snapshot.source!=='server-persisted-v2'||snapshot.mode!=='solo'||
    !['asterfall','sunscar','frostmarch'].includes(snapshot.region)||
    ![2,3,4,5].includes(snapshot.equipmentTier)||
    !string(snapshot.encounterId)||!string(snapshot.serverSeed)||
    !Number.isSafeInteger(snapshot.snapshotRevision)||snapshot.snapshotRevision<1)
   deny('invalid_server_snapshot');
 if(snapshot.initialPlayerState!==undefined||snapshot.enemyDamageProfile!==undefined||
    snapshot.experimentalRuleset!==undefined||snapshot.legacyReplay!==undefined)
   deny('legacy_state_requires_versioned_migration');
 if(!Array.isArray(snapshot.actors)||snapshot.actors.length!==1||
    !Array.isArray(snapshot.enemies)||snapshot.enemies.length<1||snapshot.enemies.length>4)
   deny('unsupported_encounter_composition');
 let trusted=false;
 try{trusted=authority.verifyPersistedSnapshot(snapshot)===true;}catch{trusted=false;}
 if(!trusted)deny('unverified_server_snapshot');
 const actor=snapshot.actors[0];
 if(!record(actor)||!string(actor.actorId)||!string(actor.characterId)||
    !has(roles,actor.classId)||actor.role!==roles[actor.classId]||
    !string(actor.classPolicyVersion)||!string(actor.skillBuildVersion)||
    !record(actor.equipmentEvidence)||actor.equipmentEvidence.schema!=='eq2-cv2-exact-source-v1'||
    actor.equipmentEvidence.combatReady!==false||
    actor.equipmentEvidence.actorCharacterId!==actor.characterId||
    actor.equipmentEvidence.classId!==actor.classId||
    actor.equipmentEvidence.role!==actor.role||
    actor.equipmentEvidence.scaling!=='exact-pre-scaled-do-not-reapply-rarity-or-quality')
   deny('missing_authoritative_class_or_equipment_source');
 const seen=new Set(),previews=[];
 for(const enemy of snapshot.enemies){
  if(!record(enemy)||!string(enemy.id)||seen.has(enemy.id)||
     !string(enemy.pveArchetypeTag)||!['normal','elite'].includes(enemy.kind)||
     enemy.team!=='enemies'||(enemy.boss!==undefined&&enemy.boss!==false)||
     !Array.isArray(enemy.traits)||enemy.traits.length>2||
     enemy.preparedByAnotherCompiler===true||
     (enemy.tags!==undefined&&(!Array.isArray(enemy.tags)||
       enemy.tags.some(tag=>typeof tag!=='string'||tag==='combat-v2-enemy'||tag.startsWith('enemy-v2:')))))
    deny('enemy_identity_or_duplicate_compiler');
  seen.add(enemy.id);
  const canonical=canonicalEnemyTraitsArchetypeV2(enemy.pveArchetypeTag);
  const maxTraits=enemy.kind==='elite'&&snapshot.equipmentTier>=3?2:1;
  if(enemy.traits.length>maxTraits)deny('trait_count_exceeds_tier_policy');
  const allowed=implemented[canonical];
  const selected=new Set(),usedGroups=new Set();
  for(const id of enemy.traits){
   if(!allowed.includes(id)||selected.has(id))deny('unimplemented_or_duplicate_trait');
   selected.add(id);
   const g=group[id];
   if(g!=='control'&&usedGroups.has(g))deny('multiple_major_trait_groups');
   usedGroups.add(g);
  }
  /* No seed, rolls, damage coefficients or private combat stats in previews. */
  previews.push({enemyId:enemy.id,archetype:canonical,traitIds:[...selected]});
 }
 return seal({
  schema:COMBAT_V2_ENEMY_CLASS_GATE,encounterId:snapshot.encounterId,
  snapshotRevision:snapshot.snapshotRevision,mode:'new-v2-solo-only',
  region:snapshot.region,equipmentTier:snapshot.equipmentTier,
  ruleset:ENEMY_V2_RULESET,characterId:actor.characterId,
  classId:actor.classId,classPolicyVersion:actor.classPolicyVersion,
  skillBuildVersion:actor.skillBuildVersion,
  equipmentSchema:actor.equipmentEvidence.schema,
  enemies:previews,legacyRulesUntouched:true,
  singleEnemyCompilerRequired:true,runnable:false,
  blockedOn:['server-owned-combat-snapshot','combined-skill-and-enemy-engine',
   'stored-replay-parity','dungeon-migration','nine-class-balance'],
 });
}
/* Pure deterministic status projection, NOT a live CombatantState writer. */
export function projectEnemyV2StatusV1(input){
 if(!record(input)||!Array.isArray(input.existing)||input.existing.length>32||
    !record(input.next)||!Number.isSafeInteger(input.nowMs)||input.nowMs<0||
    !['players','enemies'].includes(input.targetTeam)||input.sourceTeam!=='enemies')
   deny('invalid_status_context');
 const now=input.nowMs,next=input.next;
 if(!validStatusRow(next)||!string(next.sourceId)||!string(next.tag)||
    !['dot','hot','buff','debuff'].includes(next.kind)||
    !Number.isSafeInteger(next.expiresAt)||next.expiresAt<=now)
   deny('invalid_status_payload');
 const allowed=(next.kind==='dot'&&['bleed','poison'].includes(next.tag))||
    (next.kind==='hot'&&next.tag==='regeneration')||
    (['buff','debuff'].includes(next.kind)&&
     ['damage_done','healing_received','damage_taken'].includes(next.tag));
 if(!allowed)deny('unsupported_status_effect');
 if(input.existing.some(x=>!validStatusRow(x)||!string(x.sourceId)||!string(x.tag)||
   !['dot','hot','buff','debuff'].includes(x.kind)||
   !Number.isSafeInteger(x.expiresAt)))deny('invalid_existing_status');
 const entries=input.existing.filter(x=>x.expiresAt>now).map(x=>({...x}));
 const same=(x)=>x.sourceId===next.sourceId&&x.kind===next.kind&&x.tag===next.tag;
 const slots=entries.map((x,i)=>same(x)?i:-1).filter(i=>i>=0);
 const limit=next.kind==='dot'?3:1;
 if(slots.length>limit)deny('corrupt_existing_stack');
 let refreshed=false;
 if(slots.length===limit){
  const slot=slots.reduce((best,i)=>entries[i].expiresAt<entries[best].expiresAt?i:best);
  entries[slot]={...next};refreshed=true;
 }else entries.push({...next});
 return seal({entries,refreshed,activeStacks:Math.min(limit,slots.length+(refreshed?0:1))});
}
export function projectEnemyV2ShieldV1({targetTeam,maxHp,currentShield,requested}){
 if(targetTeam!=='enemies')deny('shield_target_must_be_enemy');
 for(const v of [maxHp,currentShield,requested])
  if(typeof v!=='number'||!Number.isFinite(v)||v<0)deny('invalid_shield_amount');
 if(maxHp<=0||maxHp>1e9||requested>1e9||currentShield>1e9)
   deny('unbounded_shield');
 return Math.max(0,Math.min(requested,maxHp*.10-currentShield));
}
