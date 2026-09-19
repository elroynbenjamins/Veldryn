export type GuildRole = 'guild_master'|'co_leader'|'officer'|'quartermaster'|'war_captain'|'recruiter'|'veteran'|'member'|'recruit';
export type GuildPermission =
  | 'invite' | 'kick' | 'edit_message' | 'start_project' | 'manage_project' | 'manage_vault'
  | 'set_war_roster' | 'set_defense' | 'start_guild_boss' | 'edit_ranks' | 'approve_applications'
  | 'manage_crest' | 'manage_description' | 'pin_guild_chat' | 'edit_bulletin' | 'manage_decree';

export interface GuildRoleDefinition {
  role: GuildRole;
  label: string;
  hierarchy: number;
  baseSlots: number;
  permissions: readonly GuildPermission[];
  canPromoteUpTo?: GuildRole;
}

const ALL: readonly GuildPermission[] = [
  'invite','kick','edit_message','start_project','manage_project','manage_vault','set_war_roster','set_defense',
  'start_guild_boss','edit_ranks','approve_applications','manage_crest','manage_description','pin_guild_chat','edit_bulletin','manage_decree'
];

export const GUILD_ROLES: readonly GuildRoleDefinition[] = [
  { role:'guild_master',label:'Guild Master',hierarchy:1,baseSlots:1,permissions:ALL,canPromoteUpTo:'co_leader' },
  { role:'co_leader',label:'Co-Leader',hierarchy:2,baseSlots:2,permissions:ALL,canPromoteUpTo:'officer' },
  { role:'officer',label:'Officer',hierarchy:3,baseSlots:4,permissions:['invite','kick','edit_message','start_project','manage_project','set_war_roster','set_defense','start_guild_boss','approve_applications','manage_description','pin_guild_chat','edit_bulletin','manage_decree'],canPromoteUpTo:'veteran' },
  { role:'quartermaster',label:'Quartermaster',hierarchy:4,baseSlots:2,permissions:['start_project','manage_project','manage_vault','edit_bulletin','manage_decree'] },
  { role:'war_captain',label:'War Captain',hierarchy:4,baseSlots:2,permissions:['set_war_roster','set_defense','pin_guild_chat'] },
  { role:'recruiter',label:'Recruiter',hierarchy:4,baseSlots:3,permissions:['invite','approve_applications'] },
  { role:'veteran',label:'Veteran',hierarchy:5,baseSlots:999,permissions:[] },
  { role:'member',label:'Member',hierarchy:6,baseSlots:999,permissions:[] },
  { role:'recruit',label:'Recruit',hierarchy:7,baseSlots:999,permissions:[] },
] as const;

export function roleDefinition(role: GuildRole): GuildRoleDefinition {
  const found = GUILD_ROLES.find((row) => row.role === role);
  if (!found) throw new Error('unknown_guild_role');
  return found;
}

export function roleHasPermission(role: GuildRole, permission: GuildPermission): boolean {
  return roleDefinition(role).permissions.includes(permission);
}

export function officerSlotCap(officerCorpsRank: number): number {
  return 4 + Math.max(0, Math.min(3, Math.floor(officerCorpsRank)));
}

export function validateGuildBulletin(text: string): string {
  const normalized = text.replace(/\r\n/g,'\n').trim();
  if (normalized.length > 280) throw new Error('guild_bulletin_too_long');
  return normalized;
}

export type GuildActivityFeedKind =
  | 'member_joined' | 'member_left' | 'member_promoted' | 'bulletin_updated'
  | 'project_started' | 'project_milestone' | 'project_completed' | 'project_expired'
  | 'decree_selected' | 'decree_activated' | 'decree_ended'
  | 'recruitment_updated' | 'guild_achievement';

export interface GuildActivityFeedEntry {
  id: string;
  guildId: string;
  kind: GuildActivityFeedKind;
  actorAccountId?: string;
  title: string;
  body?: string;
  payload?: Record<string,unknown>;
  createdAt: string;
}
