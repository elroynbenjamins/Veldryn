import { createHash } from 'node:crypto';
import { GUILD_DEVELOPMENT_PROJECTS, GUILD_WEEKLY_PROJECT_POOL, type GuildProjectDefinition } from './guild-projects';

function canonicalize(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalize(v)]));
  return value;
}
export function guildProjectDefinitionHash(definition:GuildProjectDefinition):string{return createHash('sha256').update(JSON.stringify(canonicalize(definition))).digest().toString('hex');}

export interface GuildProjectDefinitionRepository {
  findDefinition(templateId:string,version:number):Promise<{configHash:string}|undefined>;
  insertDefinition(definition:GuildProjectDefinition,configHash:string):Promise<void>;
  contentExists(entityType:'item'|'building'|'unlock',entityKey:string):Promise<boolean>;
}

export async function validateGuildProjectDefinition(repo:GuildProjectDefinitionRepository,definition:GuildProjectDefinition):Promise<string[]>{
  const missing:string[]=[];
  if(definition.requiredBuildingKey && !(await repo.contentExists('building',definition.requiredBuildingKey)))missing.push(`building:${definition.requiredBuildingKey}`);
  if(definition.completionUnlockKey && !(await repo.contentExists('unlock',definition.completionUnlockKey)))missing.push(`unlock:${definition.completionUnlockKey}`);
  for(const req of definition.donationRequirements??[]){if(req.resourceKind==='item' && !(await repo.contentExists('item',req.resourceId)))missing.push(`item:${req.resourceId}`)}
  return missing;
}

export async function publishGuildProjectDefinition(repo:GuildProjectDefinitionRepository,definition:GuildProjectDefinition):Promise<{inserted:boolean;configHash:string}>{
  const missing=await validateGuildProjectDefinition(repo,definition);
  if(missing.length)throw new Error(`guild_project_missing_content:${missing.join(',')}`);
  const configHash=guildProjectDefinitionHash(definition);
  const existing=await repo.findDefinition(definition.id,definition.version);
  if(existing){if(existing.configHash!==configHash)throw new Error('guild_project_definition_version_conflict');return {inserted:false,configHash};}
  await repo.insertDefinition(definition,configHash);return {inserted:true,configHash};
}

export async function publishDefaultGuildProjectDefinitions(repo:GuildProjectDefinitionRepository):Promise<{published:number;existing:number}>{
  let published=0,existing=0;
  for(const definition of [...GUILD_WEEKLY_PROJECT_POOL,...GUILD_DEVELOPMENT_PROJECTS]){
    const result=await publishGuildProjectDefinition(repo,definition);if(result.inserted)published++;else existing++;
  }
  return {published,existing};
}
