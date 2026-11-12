import type {PartyContractTierView} from './party-weekly-tiers';
import {PARTY_UNLOCK_LEVEL} from './feature-unlocks';
export type PartyRole = 'tank' | 'damage' | 'support';
/** Social Party preferences, independent of combat/dungeon roles. */
export type PartyActivityLevel='casual'|'active'|'tryhard';
export type PartyLanguage='any'|'en'|'nl'|'de'|'fr'|'es'|'it'|'ru'|'tr';
export interface PartyPreferences{activityLevel:PartyActivityLevel;language:PartyLanguage;minimumLevel:number}
export const DEFAULT_PARTY_PREFERENCES:PartyPreferences={activityLevel:'active',language:'any',minimumLevel:0};
export const PARTY_LANGUAGES:ReadonlyArray<{id:PartyLanguage;label:string}>=[{id:'any',label:'Any language'},{id:'en',label:'English'},{id:'nl',label:'Nederlands'},{id:'de',label:'Deutsch'},{id:'fr',label:'Français'},{id:'es',label:'Español'},{id:'it',label:'Italiano'},{id:'ru',label:'Русский'},{id:'tr',label:'Türkçe'}];
export const partyActivityLabel=(value:PartyActivityLevel)=>({casual:'Casual',active:'Active',tryhard:'Tryhard'})[value];
export function normalizedPartyPreferences(value?:Partial<PartyPreferences>|null):PartyPreferences{return {activityLevel:value?.activityLevel??DEFAULT_PARTY_PREFERENCES.activityLevel,language:value?.language??DEFAULT_PARTY_PREFERENCES.language,minimumLevel:value?.minimumLevel??0};}
export function recruitmentPaceForParty(value:PartyActivityLevel):'casual'|'active'|'hardcore'{return value==='tryhard'?'hardcore':value;}

export type PartyActivityPreference = PartyFocus;
export type PartyPlayStyle = 'casual' | 'balanced' | 'active' | 'competitive';
export type PartyGoalTag = 'weekly_contracts' | 'combat' | 'bosses' | 'skilling' | 'gathering' | 'crafting' | 'party_events' | 'dungeons' | 'social';
export type GuildFocusTag = 'social' | 'pve' | 'skilling' | 'progression' | 'collections' | 'events' | 'competitive' | 'new_player_friendly';
export type PartyFocus = 'combat' | 'skilling' | 'mixed';
export type RecruitmentFocus = PartyFocus | 'any';
export type RecruitmentPostType = 'looking_for_guild' | 'guild_recruiting' | 'looking_for_party' | 'party_recruiting';
export type RecruitmentActivityLevel = 'casual' | 'regular' | 'active' | 'hardcore';
export type RecruitmentActivityKind = 'dungeon' | 'boss' | 'quest' | 'skilling' | 'exploration' | 'pvp' | 'party_event' | 'other';
export type RecruitmentGoal = 'learn' | 'clear' | 'farm' | 'speedrun' | 'achievement' | 'casual';
export type RecruitmentStartMode = 'now' | 'next_hour' | 'scheduled' | 'recurring';
export type RecruitmentVoiceMode = 'none' | 'preferred' | 'required';
export type RecruitmentExperience = 'any' | 'new_players' | 'welcome' | 'experienced' | 'expert';
export type RecruitmentRoleCounts = Partial<Record<PartyRole, number>>;

export type LiveOpsEventStatus = 'scheduled' | 'active' | 'settling' | 'finalized' | 'archived';
export type LiveOpsActivityKind = 'combat' | 'gathering' | 'processing' | 'crafting' | 'fishing' | 'hunting' | 'alchemy' | 'delivery';
export interface LiveOpsMilestoneView { points: number; reached: boolean; claimed: boolean; }
export interface PartyEventMemberView { accountId: string; displayName: string; points: number; meaningful: boolean; rewardEligible: boolean; }
export interface PartyEventView { eventInstanceId: string; status: LiveOpsEventStatus; name: string; shortDescription: string; eventTags: string[]; personalPoints: number; personalPointsToday: number; personalDailyCap: number; partyId?: string; partyName?: string; partyScore: number; partyRank?: number; rankedEligible: boolean; rankedEligibilityMissing: string[]; personalMilestones: LiveOpsMilestoneView[]; partyMilestones: LiveOpsMilestoneView[]; members: PartyEventMemberView[]; }
export interface PartyEventLeaderboardEntry { partyId: string; partyName: string; rank: number; score: number; meaningfulContributors: number; percentile: number; isOwnParty?: boolean; }
export interface PartyEventLeaderboardView { audience: 'global' | 'friends' | 'guild'; entries: PartyEventLeaderboardEntry[]; ownParty?: PartyEventLeaderboardEntry; }
export interface EventContributionBreakdownRow { activityKind: LiveOpsActivityKind; points: number; }
export interface EventContributionDetail { activityKind: LiveOpsActivityKind; contentId: string; points: number; }
export interface EventContributionBreakdownView { totalPoints: number; byActivity: EventContributionBreakdownRow[]; topDetails: EventContributionDetail[]; }
export interface GuildRecruitmentRequirementsView { minTotalLevel?: number; minCombatLevel?: number; applicationRequired: boolean; }
export const eventActivityLabel: Record<LiveOpsActivityKind, string> = { combat:'Combat', gathering:'Gathering', processing:'Processing', crafting:'Crafting', fishing:'Fishing', hunting:'Hunting', alchemy:'Alchemy', delivery:'Deliveries' };
export function nextUnreachedMilestone(current: number, milestones: readonly LiveOpsMilestoneView[]): LiveOpsMilestoneView | undefined { return milestones.find(m => !m.reached && m.points > current) ?? milestones.find(m => !m.reached); }
export function milestoneProgressPercent(current: number, target: number): number { return target <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((current / target) * 100))); }

export interface PartyMemberSummary {
  playerBadges?:import('./player-badges').PlayerBadgeIdentity;
  accountId: string;
  characterId: string;
  characterName: string;
  className: string;
  role: PartyRole;
  isLeader: boolean;
}

export interface PersistentPartySummary {
  activityLevel?:PartyActivityLevel;
  language?:PartyLanguage;
  minimumLevel?:number;
  id: string;
  focus: PartyFocus;
  members: PartyMemberSummary[];
  maxMembers: 4;
}

/** Desired class composition for a complete, four-member persistent Party. */
export function partyHasRoleOverflow(members: readonly Pick<PartyMemberSummary,'role'>[]): boolean {
 const counts: Record<PartyRole,number> = {tank:0,damage:0,support:0};
 for (const member of members) {
  if (!(member.role in counts)) return true;
  counts[member.role]++;
 }
 return counts.tank>1 || counts.damage>2 || counts.support>1;
}

export function partyRoleVacancies(members: readonly Pick<PartyMemberSummary,'role'>[]): Record<PartyRole,number> {
 const counts:Record<PartyRole,number>={tank:1,damage:2,support:1};
 for(const member of members)if(member.role in counts)counts[member.role]--;
 return {tank:Math.max(0,counts.tank),damage:Math.max(0,counts.damage),support:Math.max(0,counts.support)};
}

export interface PartyMemberView {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  isLeader: boolean;
  online?: boolean;
}

export interface PartyView {
  id: string;
  name: string;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  members: PartyMemberView[];
  recruitmentOpen: boolean;
}

export interface PartyContractObjectiveView {
  id: string;
  label: string;
  progressUnits: number;
  targetUnits: number;
  normalizedPoints: number;
  pointBudget: number;
}

export interface PartyContractMemberContributionView {accountId:string;points:number}
export interface PartyContractView {
  /** Server-reported current member totals; absent on older read-only snapshots. */
  memberContributions?:PartyContractMemberContributionView[];
  tiers?: PartyContractTierView[];
  id: string;
  name: string;
  category?: PartyFocus;
  cadence?: 'weekly' | 'mini_event';
  endsAtMs?: number;
  totalPoints: number;
  targetPoints: number;
  minimumPersonalPoints?: number;
  personalPoints?: number;
  objectives?: PartyContractObjectiveView[];
  focus?: PartyActivityPreference;
  description?: string;
  combatPoints?: number;
  skillingPoints?: number;
  eligible?: boolean;
  complete?: boolean;
  expiresAt?: string;
  status?: 'active' | 'completed' | 'expired';
  rewards?: {id:string;reward:{gold:number};claimed:boolean}[];
}

export interface PartyRecruitmentCard {
  id: string;
  partyName: string;
  memberCount: number;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: PartyGoalTag[];
  description: string;
  compatibilityScore?: number;
}

export interface PartySeekerCard {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  activityPreference: PartyActivityPreference;
  playStyle: PartyPlayStyle;
  goalTags: PartyGoalTag[];
  description: string;
}

export interface GuildRecruitmentCard {
  guildId: string;
  guildName: string;
  memberCount: number;
  memberCap: number;
  focusTags: GuildFocusTag[];
  playStyle: PartyPlayStyle;
  description: string;
  compatibilityScore?: number;
}

export interface GuildSeekerCard {
  accountId: string;
  characterId: string;
  displayName: string;
  className?: string;
  combatLevel?: number;
  desiredFocusTags: GuildFocusTag[];
  playStyle: PartyPlayStyle;
  description: string;
}

export type RecruitmentPresentationTone='accent'|'good'|'info'|'muted';
export function recruitmentPostTypePresentation(type:RecruitmentPostType){
 switch(type){
  case'looking_for_party':return{shortLabel:'LFG',label:'Looking for Party',tone:'info' as const,subject:'PLAYER' as const};
  case'party_recruiting':return{shortLabel:'LFM',label:'Party recruiting',tone:'good' as const,subject:'PARTY' as const};
  case'looking_for_guild':return{shortLabel:'GUILD SEEKER',label:'Looking for Guild',tone:'info' as const,subject:'PLAYER' as const};
  case'guild_recruiting':return{shortLabel:'GUILD RECRUITING',label:'Guild recruiting',tone:'accent' as const,subject:'GUILD' as const};
 }
}

export interface RecruitmentCardView {
  playerBadges?:import('./player-badges').PlayerBadgeIdentity;
  id: string;
  ownerAccountId?: string;
  partyId?: string;
  guildId?: string;
  status?: 'active' | 'closed' | 'expired';
  postType: RecruitmentPostType;
  ownerName: string;
  guildTag?: string | null;
  guildTagColorId?: string | null;
  guildName?: string;
  partyName?: string;
  title: string;
  body: string;
  roles: PartyRole[];
  focus: RecruitmentFocus;
  activityTags: string[];
  playstyleTags: string[];
  availabilityTags: string[];
  guildInterestTags: string[];
  activityLevel?: RecruitmentActivityLevel;
  currentObjective?: string;
  openSpots?: number;
  language?: string;
  region?: string;
  minCombatLevel?: number;
  minTotalLevel?: number;
  expiresAtMs: number;
  activityKind?: RecruitmentActivityKind;
  goal?: RecruitmentGoal;
  startMode?: RecruitmentStartMode;
  sessionMinutes?: number;
  voiceMode?: RecruitmentVoiceMode;
  experience?: RecruitmentExperience;
  flexibleRoles?: boolean;
  scheduledAt?: string;
  requiredRoleCounts?: RecruitmentRoleCounts;
}

const encoded = (tags: readonly string[], prefix: string) => tags.find(tag => tag.startsWith(prefix))?.slice(prefix.length);
export function recruitmentStructuredTags(card: Pick<RecruitmentCardView,'activityTags'|'availabilityTags'|'playstyleTags'>) {
 const session = encoded(card.availabilityTags, 'session:');
  const scheduled = encoded(card.availabilityTags, 'at:');
  const roleCounts: RecruitmentRoleCounts = {};
  for (const role of ['tank','damage','support'] as const) { const value=encoded(card.playstyleTags,`need:${role}:`); if(value) roleCounts[role]=Number(value)||0; }
  return {
  activityKind: encoded(card.activityTags,'kind:') as RecruitmentActivityKind|undefined,
  goal: encoded(card.activityTags,'goal:') as RecruitmentGoal|undefined,
  startMode: encoded(card.availabilityTags,'start:') as RecruitmentStartMode|undefined,
  sessionMinutes: session ? Number(session)||undefined : undefined,
  voiceMode: encoded(card.playstyleTags,'voice:') as RecruitmentVoiceMode|undefined,
  experience: encoded(card.playstyleTags,'experience:') as RecruitmentExperience|undefined,
  flexibleRoles: card.playstyleTags.includes('roles:flexible'),
    scheduledAt: scheduled,
    requiredRoleCounts: roleCounts,
 };
}
export function recruitmentVisibleTags(tags: readonly string[]) { return tags.filter(tag => !/^(kind|goal|start|session|at|voice|experience|roles|need:):/.test(tag)); }

export function recruitmentContextLabels(card:RecruitmentCardView){
 const labels:string[]=[];
 const structured=recruitmentStructuredTags(card);
 if(structured.activityKind)labels.push(structured.activityKind.replace('_',' '));
 if(structured.goal)labels.push(structured.goal);
 if(structured.startMode)labels.push(structured.startMode==='now'?'Now':structured.startMode==='next_hour'?'Next hour':structured.startMode==='scheduled'?'Scheduled':'Recurring');
 if(structured.sessionMinutes)labels.push(`${structured.sessionMinutes}m`);
 if(structured.scheduledAt){ const time=Date.parse(structured.scheduledAt); labels.push(Number.isFinite(time)?`Starts ${new Date(time).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}`:'Scheduled time set'); }
 for(const role of ['tank','damage','support'] as const){ const count=structured.requiredRoleCounts[role]; if(count)labels.push(`${count} ${role}`); }
 if(structured.voiceMode==='required')labels.push('Voice required');else if(structured.voiceMode==='preferred')labels.push('Voice preferred');
 if(structured.experience&&structured.experience!=='any')labels.push(structured.experience.replace('_',' '));
 if(card.activityLevel)labels.push(card.activityLevel.charAt(0).toUpperCase()+card.activityLevel.slice(1));
 if(card.language)labels.push(card.language);
 if(card.region)labels.push(card.region.toUpperCase());
 if(card.minCombatLevel!==undefined)labels.push('Combat '+Math.max(0,Math.floor(card.minCombatLevel))+'+');
 if(card.minTotalLevel!==undefined)labels.push('Total '+Math.max(0,Math.floor(card.minTotalLevel))+'+');
 return labels;
}

export interface RecruitmentClientFilters {
  query: string;
  postTypes: RecruitmentPostType[];
  focuses: RecruitmentFocus[];
  roles: PartyRole[];
  activityTags: string[];
  playstyleTags?: string[];
  availabilityTags?: string[];
  guildInterestTags?: string[];
  activityLevels?: RecruitmentActivityLevel[];
  language?: string;
  region?: string;
  maxMinCombatLevel?: number;
  maxMinTotalLevel?: number;
  requireOpenPartySpot?: boolean;
}

export const EMPTY_RECRUITMENT_FILTERS: RecruitmentClientFilters = {
  query: '', postTypes: [], focuses: [], roles: [], activityTags: [],
};

export function partyOpenSpots(party: PersistentPartySummary): number {
  return Math.max(0, party.maxMembers - party.members.length);
}

export function shouldShowPartyChat(party: PersistentPartySummary | null, accountId: string): boolean {
  return !!party && party.members.some(member => member.accountId === accountId);
}

export function recruitmentTimeLabel(expiresAtMs: number, nowMs: number): { text: string; urgency: 'normal' | 'soon' | 'expired' } {
  const remaining = expiresAtMs - nowMs;
  if (remaining <= 0) return { text: 'Expired', urgency: 'expired' };
  const hours = Math.ceil(remaining / 3_600_000);
  if (hours <= 6) return { text: `${hours}h left`, urgency: 'soon' };
  if (hours < 24) return { text: `${hours}h left`, urgency: 'normal' };
  return { text: `${Math.ceil(hours / 24)}d left`, urgency: 'normal' };
}

/** Claim badges reflect only actual reward entitlement IDs. They disappear after
 * the server confirms a claim; unqualified players never receive false alerts.
 */
export function partyContractClaimableRewardIds(contracts:readonly PartyContractView[]):string[]{
 const ready=new Set<string>();
 for(const contract of contracts){
   for(const tier of contract.tiers??[]){
     if(tier.rewardId&&!tier.claimed&&tier.reached&&tier.qualified)ready.add(tier.rewardId);
   }
   if(!contract.tiers?.length&&contract.complete&&contract.eligible){
     for(const reward of contract.rewards??[]){
       if(!reward.claimed&&reward.id)ready.add(reward.id);
     }
   }
 }
 return [...ready];
}

export function contractProgressRatio(contract: PartyContractView): number {
  if (contract.targetPoints <= 0) return 0;
  return Math.max(0, Math.min(1, contract.totalPoints / contract.targetPoints));
}

export function personalContributionEligible(contract: PartyContractView): boolean {
  return (contract.personalPoints ?? 0) >= (contract.minimumPersonalPoints ?? 0);
}

export const activityPreferenceLabel:Record<PartyActivityPreference,string>={combat:'Combat',skilling:'Skilling',mixed:'Mixed'};
export const playStyleLabel:Record<PartyPlayStyle,string>={casual:'Casual',balanced:'Balanced',active:'Active',competitive:'Competitive'};
export function contractProgressPercent(contract:PartyContractView):number{return Math.max(0,Math.min(100,Math.round(contractProgressRatio(contract)*100)));}
export function contractEligibilityLabel(contract:PartyContractView):string{if(contract.eligible)return 'Reward eligible';if(contract.complete)return 'Contribute more to claim';return 'Keep contributing';}

function lower(value?: string): string { return (value ?? '').trim().toLocaleLowerCase(); }
function overlaps<T>(a: readonly T[], b: readonly T[]): boolean { return b.length === 0 || b.some(value => a.includes(value)); }

/** Client-side convenience filter for already-authorized active results. Server browse remains authoritative. */
export function filterRecruitmentCards(cards: readonly RecruitmentCardView[], filters: RecruitmentClientFilters, nowMs?: number): RecruitmentCardView[] {
  const query = lower(filters.query);
  return cards.filter(card => {
    if (card.status && card.status !== 'active') return false;
    if (nowMs !== undefined && card.expiresAtMs <= nowMs) return false;
    if (filters.postTypes.length && !filters.postTypes.includes(card.postType)) return false;
    if (filters.focuses.length && !filters.focuses.includes(card.focus)) return false;
    if (filters.roles.length && !overlaps(card.roles, filters.roles)) return false;
    if (filters.activityTags.length && !overlaps(card.activityTags, filters.activityTags)) return false;
    if (filters.playstyleTags?.length && !overlaps(card.playstyleTags,filters.playstyleTags)) return false;
    if (filters.availabilityTags?.length && !overlaps(card.availabilityTags,filters.availabilityTags)) return false;
    if (filters.guildInterestTags?.length && !overlaps(card.guildInterestTags,filters.guildInterestTags)) return false;
    if (filters.activityLevels?.length && (!card.activityLevel || !filters.activityLevels.includes(card.activityLevel))) return false;
    if (filters.language && lower(card.language)!==lower(filters.language)) return false;
    if (filters.region && lower(card.region)!==lower(filters.region)) return false;
    if (filters.maxMinCombatLevel!==undefined && (card.minCombatLevel??0)>filters.maxMinCombatLevel) return false;
    if (filters.maxMinTotalLevel!==undefined && (card.minTotalLevel??0)>filters.maxMinTotalLevel) return false;
    if (filters.requireOpenPartySpot && card.postType==='party_recruiting' && (card.openSpots??0)<1) return false;
    if (!query) return true;
    const haystack = [card.title, card.body, card.ownerName, card.guildName, card.partyName, card.focus, card.language, card.region,
      card.activityLevel, card.currentObjective, ...card.roles, ...card.activityTags, ...card.playstyleTags,
      ...card.availabilityTags, ...card.guildInterestTags].map(lower).join(' ');
    return haystack.includes(query);
  });
}

export const PARTY_SOCIAL_TUTORIAL_STEPS = [
  'Open Social. Party and Guild have separate tabs; Guild stays available even when Party is locked.',
  `At Level ${PARTY_UNLOCK_LEVEL} you can create or join a persistent Party. Recruitment is available inside the Party view.`,
  'My Party shows members and weekly progress. Claim available rewards there and expand details only if needed.',
  'Party options contain invitations and member management. Recruitment contains adverts, filters and player search.',
  'Party Chat appears only while you are a current Party member. Dungeon matchmaking is a separate group system.',
] as const;
