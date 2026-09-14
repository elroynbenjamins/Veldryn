export const REGION_CONTENT_ADMIN_COMMANDS_V21=[
  {key:'region_content.activate_version',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'activateRegionContentVersion'},
  {key:'region_content.rollback_active_version',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'rollbackRegionContentVersion'},
] as const;
export const REGION_CONTENT_REMOTE_CONFIG_V21=[
  {key:'content.frostmarch.enabled',type:'boolean',defaultValue:true,critical:false},
  {key:'content.sunscar.side_content.enabled',type:'boolean',defaultValue:true,critical:false},
] as const;
export interface RegionActivationStoreV21{getActive(regionId:string):Promise<string|undefined>;activate(regionId:string,contentVersion:string):Promise<void>;isPublishedForRegion(regionId:string,contentVersion:string):Promise<boolean>;}
export async function activateRegionContentVersionV21(store:RegionActivationStoreV21,input:{regionId:string;contentVersion:string}):Promise<{previous?:string;active:string}>{if(!await store.isPublishedForRegion(input.regionId,input.contentVersion))throw new Error('invalid_or_unpublished_region_content');const previous=await store.getActive(input.regionId);await store.activate(input.regionId,input.contentVersion);return {previous,active:input.contentVersion};}
