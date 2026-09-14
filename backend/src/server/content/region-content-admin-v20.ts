/**
 * Command/config registrations for the existing v17.3 schema-driven Control Center.
 * Handlers must call the authoritative publisher/registry services; the browser never writes region rows directly.
 */
export const REGION_CONTENT_ADMIN_COMMANDS_V20=[
  {key:'region_content.validate_version',risk:'medium',ownerApproval:false,reasonRequired:false,handler:'validateRegionContentVersion'},
  {key:'region_content.publish_version',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'publishRegionContentVersion'},
  {key:'region_content.retire_version',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'retireRegionContentVersion'},
] as const;

export const SUNSCAR_CONTENT_REMOTE_CONFIG_V20=[
  {key:'content.sunscar.enabled',type:'boolean',defaultValue:true,critical:false},
] as const;
