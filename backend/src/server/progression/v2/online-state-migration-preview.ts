/**
 * READ ONLY — actual online_game_states JSON snapshot migration adapter.
 * Existing production skill rows live in state.skills and
 * state.otherCharacters[].skills (NOT necessarily public.character_skills).
 *
 * No writes. This is an isolated V2 backfill projection. The caller must
 * load a single current state with authenticated account ownership and
 * compare the revision before committing any future migration transaction.
 */
import {PROFESSION_IDS_V2,type ProfessionIdV2} from './character-progression';
import {previewLegacyCareerMigrationV2} from './legacy-migration-preview';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KNOWN:ReadonlySet<string>=new Set(PROFESSION_IDS_V2);
const object=(value:unknown):Record<string,unknown>|null=>
  value!==null && typeof value==='object'&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
const isXp=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const isLevel=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<=100;
const isUuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);

export interface OnlineSnapshotRowV1{
  readonly account_id:unknown;
  readonly character_id:unknown;
  readonly revision:unknown;
  readonly state:unknown;
}
export interface CharacterMigrationProjectionV2{
  readonly characterId:string;
  readonly savedCombatLevel:number;
  readonly savedCombatXp:number;
  readonly overallCharacterXp:number;
  readonly originalLegacySkills:Readonly<Partial<Record<ProfessionIdV2,{xp:number;level:number}>>>;
  readonly mappedProfessionXp:Readonly<Partial<Record<ProfessionIdV2,number>>>;
}
export interface OnlineSnapshotMigrationV2{
  readonly accountId:string;
  readonly expectedSnapshotRevision:number;
  readonly characters:readonly CharacterMigrationProjectionV2[];
  readonly preservesSourceSnapshot:true;
}

function projectCharacter(characterRaw:unknown,skillsRaw:unknown):CharacterMigrationProjectionV2{
  const character=object(characterRaw);
  if(!character||!isUuid(character.id)||!isLevel(character.level)||!isXp(character.xp)||
     !Array.isArray(skillsRaw))throw Error('state_migration_v2_invalid_character');
  const original:Partial<Record<ProfessionIdV2,{xp:number;level:number}>>={};
  const xp:Partial<Record<ProfessionIdV2,number>>={};
  const levels:Partial<Record<ProfessionIdV2,number>>={};
  for(const row of skillsRaw){
    const skill=object(row);
    if(!skill||typeof skill.skillId!=='string'||!KNOWN.has(skill.skillId)||
       !isXp(skill.xp)||!isLevel(skill.level)||
       Object.prototype.hasOwnProperty.call(original,skill.skillId))
      throw Error('state_migration_v2_invalid_skill');
    const id=skill.skillId as ProfessionIdV2;
    original[id]={xp:skill.xp,level:skill.level};
    xp[id]=skill.xp;
    levels[id]=skill.level;
  }
  const proposal=previewLegacyCareerMigrationV2({
    combatLevel:character.level,combatLifetimeXp:character.xp,
    professionLifetimeXp:xp,professionSavedLevels:levels,
  });
  return {
    characterId:character.id.toLowerCase(),
    savedCombatLevel:character.level,
    savedCombatXp:character.xp,
    overallCharacterXp:proposal.overallCharacterXp,
    originalLegacySkills:original,
    mappedProfessionXp:proposal.professionXpV2,
  };
}

/** Accept only a persisted state snapshot, never a client-submitted state. */
export function previewOnlineSnapshotMigrationV2(row:OnlineSnapshotRowV1):OnlineSnapshotMigrationV2{
  if(!row||!isUuid(row.account_id)||
     !(row.character_id===null||isUuid(row.character_id))||
     !Number.isSafeInteger(row.revision)||Number(row.revision)<0)
    throw Error('state_migration_v2_invalid_row');
  const state=object(row.state);
  if(!state||!Array.isArray(state.otherCharacters))
    throw Error('state_migration_v2_invalid_state');
  const result:CharacterMigrationProjectionV2[]=[];
  const seen=new Set<string>();
  const active=state.character;
  if(active!==null&&active!==undefined){
    const entry=projectCharacter(active,state.skills);
    if(!isUuid(row.character_id)||entry.characterId!==row.character_id.toLowerCase())
      throw Error('state_migration_v2_active_character_mismatch');
    result.push(entry);
    seen.add(entry.characterId);
  }else if(row.character_id!==null){
    throw Error('state_migration_v2_active_character_mismatch');
  }
  if(state.otherCharacters.length>4)throw Error('state_migration_v2_excessive_roster');
  for(const raw of state.otherCharacters){
    const saved=object(raw);
    if(!saved)throw Error('state_migration_v2_invalid_parked_entry');
    const entry=projectCharacter(saved.character,saved.skills);
    if(seen.has(entry.characterId))throw Error('state_migration_v2_duplicate_character');
    result.push(entry);
    seen.add(entry.characterId);
  }
  return {
    accountId:row.account_id.toLowerCase(),
    expectedSnapshotRevision:row.revision as number,
    characters:result,
    preservesSourceSnapshot:true,
  };
}
