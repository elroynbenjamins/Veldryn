import {createHash} from 'node:crypto';
import {SUNSCAR_DUNGEONS_V20,SUNSCAR_DUNGEON_NODES_V20} from './sunscar-dungeons-v20';
import {SUNSCAR_BOSSES_V20,SUNSCAR_COLLECTIBLE_UNLOCKS_V20,SUNSCAR_ECHO_CONDITIONS_V20,SUNSCAR_ENEMIES_V20,SUNSCAR_EQUIPMENT_POLICY_V20,SUNSCAR_QUESTLINE_V20,SUNSCAR_RELIC_HOOKS_V20,SUNSCAR_RESOURCES_V20,SUNSCAR_ZONES_V20} from './sunscar-region-v20';

export type RegionContentRecordTypeV20='region'|'zone'|'monster'|'boss'|'resource'|'quest'|'echo_condition'|'relic'|'collectible_unlock'|'live_dungeon'|'dungeon_node';
export interface RegionContentRecordV20 {recordType:RegionContentRecordTypeV20;recordId:string;sortOrder:number;payload:unknown;}
export interface RegionContentBundleV20 {contentVersion:string;regionId:string;schemaVersion:1;records:readonly RegionContentRecordV20[];contentHash:string;}

function canonical(value:unknown):string{
  if(value===null||typeof value!=='object') return JSON.stringify(value);
  if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object=value as Record<string,unknown>;
  return `{${Object.keys(object).sort().map(k=>`${JSON.stringify(k)}:${canonical(object[k])}`).join(',')}}`;
}

export function hashRegionContentV20(input:unknown):string{return createHash('sha256').update(canonical(input)).digest().toString('hex');}

export function buildSunscarRegionContentBundleV20(contentVersion='sunscar-v20.0.0'):RegionContentBundleV20{
  const records:RegionContentRecordV20[]=[
    {recordType:'region',recordId:'REG_002',sortOrder:0,payload:{id:'REG_002',name:'Sunscar Desert',levelMin:25,levelMax:45,unlockBossId:'BOSS_001',finalBossId:'BOSS_002',nextRegionId:'REG_003',equipmentPolicy:SUNSCAR_EQUIPMENT_POLICY_V20}},
    ...SUNSCAR_ZONES_V20.map((payload,i)=>({recordType:'zone' as const,recordId:payload.id,sortOrder:100+i,payload})),
    ...SUNSCAR_ENEMIES_V20.map((payload,i)=>({recordType:'monster' as const,recordId:payload.id,sortOrder:200+i,payload})),
    ...SUNSCAR_BOSSES_V20.map((payload,i)=>({recordType:'boss' as const,recordId:payload.id,sortOrder:300+i,payload})),
    ...SUNSCAR_RESOURCES_V20.map((payload,i)=>({recordType:'resource' as const,recordId:payload.id,sortOrder:400+i,payload})),
    ...SUNSCAR_QUESTLINE_V20.map((payload,i)=>({recordType:'quest' as const,recordId:payload.id,sortOrder:500+i,payload})),
    ...SUNSCAR_ECHO_CONDITIONS_V20.map((payload,i)=>({recordType:'echo_condition' as const,recordId:payload.id,sortOrder:550+i,payload})),
    ...SUNSCAR_RELIC_HOOKS_V20.map((payload,i)=>({recordType:'relic' as const,recordId:payload.id,sortOrder:560+i,payload})),
    ...SUNSCAR_COLLECTIBLE_UNLOCKS_V20.map((payload,i)=>({recordType:'collectible_unlock' as const,recordId:payload.id,sortOrder:570+i,payload})),
    ...SUNSCAR_DUNGEONS_V20.map((payload,i)=>({recordType:'live_dungeon' as const,recordId:payload.id,sortOrder:600+i,payload})),
    ...SUNSCAR_DUNGEON_NODES_V20.map((payload,i)=>({recordType:'dungeon_node' as const,recordId:payload.id,sortOrder:700+i,payload})),
  ];
  return {contentVersion,regionId:'REG_002',schemaVersion:1,records,contentHash:hashRegionContentV20({contentVersion,regionId:'REG_002',schemaVersion:1,records})};
}

export interface RegionContentStoreV20 {
  stageManifest(input:{contentVersion:string;regionId:string;schemaVersion:number;contentHash:string;minimumClientBuild:number}):Promise<void>;
  replaceDraftRecords(contentVersion:string,records:readonly RegionContentRecordV20[]):Promise<void>;
  publishManifest(contentVersion:string,expectedHash:string):Promise<void>;
}

export async function stageAndPublishSunscarV20(store:RegionContentStoreV20,input:{contentVersion?:string;minimumClientBuild:number;publish:boolean}):Promise<RegionContentBundleV20>{
  const bundle=buildSunscarRegionContentBundleV20(input.contentVersion);
  await store.stageManifest({contentVersion:bundle.contentVersion,regionId:bundle.regionId,schemaVersion:bundle.schemaVersion,contentHash:bundle.contentHash,minimumClientBuild:input.minimumClientBuild});
  await store.replaceDraftRecords(bundle.contentVersion,bundle.records);
  if(input.publish) await store.publishManifest(bundle.contentVersion,bundle.contentHash);
  return bundle;
}
