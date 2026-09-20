import type {
  PartyContractView,
  PartyFocus,
  PartyRole,
  PersistentPartySummary,
  RecruitmentCardView,
  RecruitmentClientFilters,
  RecruitmentFocus,
  RecruitmentPostType,
  PartyEventView,
} from '../core/party-social';
import {supabase} from './supabase';
import {guildIdentities} from './social';

export interface PublishRecruitmentInput {
  postType: RecruitmentPostType;
  title: string;
  body: string;
  durationDays?: 1 | 3;
  roles?: PartyRole[];
  focus?: RecruitmentFocus;
  activityTags?: string[];
  playstyleTags?: string[];
  availabilityTags?: string[];
  guildInterestTags?: string[];
  activityLevel?: 'casual' | 'regular' | 'active' | 'hardcore';
  currentObjective?: string;
  openSpots?: number;
  language?: string;
  region?: string;
  minCombatLevel?: number;
  minTotalLevel?: number;
  partyId?: string;
  guildId?: string;
  ownerCharacterId?: string;
}

export interface PartySocialRepository {
  getMyParty(): Promise<PersistentPartySummary | null>;
  createParty(input: { characterId: string; role: PartyRole; focus: PartyFocus; idempotencyKey: string }): Promise<PersistentPartySummary>;
  joinParty(input: { partyId: string; characterId: string; role: PartyRole; idempotencyKey: string }): Promise<PersistentPartySummary>;
  leaveParty(input: { partyId: string; idempotencyKey: string }): Promise<void>;
  getPartyContracts(partyId: string): Promise<PartyContractView[]>;
  browseRecruitment(filters: RecruitmentClientFilters): Promise<RecruitmentCardView[]>;
  publishRecruitment(input: PublishRecruitmentInput): Promise<RecruitmentCardView>;
  refreshRecruitment(postId: string, durationDays?: 1 | 3): Promise<RecruitmentCardView>;
  closeRecruitment(postId: string): Promise<void>;
}

/**
 * Production adapters must derive account identity from the authenticated session. Never send
 * accountId, contract points, reward amounts, verified kills/gathers/crafts, or ranking scores
 * from the client as authoritative values.
 */
export const PARTY_SOCIAL_SERVER_AUTHORITY_NOTE = true;

export interface PartySocialSnapshot {party:PersistentPartySummary|null;contracts:PartyContractView[];serverTime:string}
export interface PartyRanking {event_key:string;name:string;party_id:string;normalized_points:number;rank:number;ends_at:string}
function client(){if(!supabase)throw new Error('Online services are not configured.');return supabase;}
async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{const {data,error}=await client().rpc(name,args);if(error)throw new Error(error.message);return data as T;}
export function partyCommandKey(){return `party-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;}
export const partySocialSnapshot=()=>rpc<PartySocialSnapshot>('party_social_state_v16');
type RecruitmentRow={id:string;post_type:RecruitmentCardView['postType'];owner_account_id:string;owner_name?:string;party_id?:string;guild_id?:string;guild_name?:string;title:string;body:string;roles:PartyRole[];focus:RecruitmentFocus;activity_tags:string[];playstyle_tags:string[];availability_tags:string[];guild_interest_tags:string[];activity_level?:RecruitmentCardView['activityLevel'];current_objective?:string;open_spots?:number;actual_open_spots?:number;language?:string;region?:string;min_combat_level?:number;min_total_level?:number;expires_at:string;status:RecruitmentCardView['status']};
function card(row:RecruitmentRow):RecruitmentCardView{return {id:row.id,postType:row.post_type,ownerAccountId:row.owner_account_id,ownerName:row.owner_name??'Your advert',partyId:row.party_id??undefined,guildId:row.guild_id??undefined,guildName:row.guild_name??undefined,title:row.title,body:row.body,roles:row.roles,focus:row.focus,activityTags:row.activity_tags,playstyleTags:row.playstyle_tags,availabilityTags:row.availability_tags,guildInterestTags:row.guild_interest_tags,activityLevel:row.activity_level??undefined,currentObjective:row.current_objective??undefined,openSpots:row.actual_open_spots??row.open_spots??undefined,language:row.language??undefined,region:row.region??undefined,minCombatLevel:row.min_combat_level??undefined,minTotalLevel:row.min_total_level??undefined,expiresAtMs:Date.parse(row.expires_at),status:row.status};}
async function cardsWithGuildIdentity(rows:RecruitmentRow[]){const identities=await guildIdentities(rows.map(row=>row.owner_account_id));return rows.map(row=>{const view=card(row),identity=identities.get(row.owner_account_id);return {...view,guildTag:identity?.guild_tag??null,guildTagColorId:identity?.guild_tag_color_id??null};});}
export const partySocialRepository:PartySocialRepository={
 getMyParty:async()=>(await partySocialSnapshot()).party,
 createParty:async input=>{await rpc('create_persistent_party_v16',{p_leader_character_id:input.characterId,p_role:input.role,p_focus:input.focus,p_idempotency_key:input.idempotencyKey});const state=await partySocialSnapshot();if(!state.party)throw new Error('Party no longer active.');return state.party;},
 joinParty:async input=>{await rpc('join_persistent_party_v16',{p_party_id:input.partyId,p_character_id:input.characterId,p_role:input.role,p_idempotency_key:input.idempotencyKey});const state=await partySocialSnapshot();if(!state.party)throw new Error('Party no longer active.');return state.party;},
 leaveParty:async input=>{await rpc('leave_persistent_party_v16',{p_party_id:input.partyId,p_idempotency_key:input.idempotencyKey});},
 getPartyContracts:async partyId=>{const state=await partySocialSnapshot();return state.party?.id===partyId?state.contracts:[];},
 browseRecruitment:async filters=>cardsWithGuildIdentity(await rpc<RecruitmentRow[]>('browse_recruitment_v16',{p_filters:filters})),
 publishRecruitment:async input=>(await cardsWithGuildIdentity([await rpc<RecruitmentRow>('publish_recruitment_post_v16',{
  p_post_type:input.postType,p_title:input.title,p_body:input.body,p_duration_days:input.durationDays??null,p_owner_character_id:input.ownerCharacterId??null,p_guild_id:input.guildId??null,p_party_id:input.partyId??null,p_roles:input.roles??[],p_focus:input.focus??'any',p_activity_tags:input.activityTags??[],p_playstyle_tags:input.playstyleTags??[],p_availability_tags:input.availabilityTags??[],p_guild_interest_tags:input.guildInterestTags??[],p_activity_level:input.activityLevel??null,p_current_objective:input.currentObjective??null,p_open_spots:input.openSpots??null,p_language:input.language??null,p_region:input.region??null,p_min_combat_level:input.minCombatLevel??null,p_min_total_level:input.minTotalLevel??null})]))[0],
 refreshRecruitment:async(id,days)=>card(await rpc<RecruitmentRow>('refresh_recruitment_post',{p_post_id:id,p_duration_days:days??null})),
 closeRecruitment:async id=>{await rpc('close_recruitment_post_v16',{p_post_id:id});},
};
export async function partySocialIdentity(){const c=client();const {data:{user},error}=await c.auth.getUser();if(error)throw error;if(!user)return null;
 const profile=await c.from('player_profiles').select('active_character_id').eq('account_id',user.id).maybeSingle();if(profile.error)throw profile.error;
 const characters=await c.from('characters').select('id').eq('account_id',user.id).order('created_at').limit(1);if(characters.error)throw characters.error;
 return {accountId:user.id,characterId:(profile.data?.active_character_id??characters.data?.[0]?.id??null) as string|null};}
export async function ownRecruitmentPosts(){const identity=await partySocialIdentity();if(!identity)return [];const {data,error}=await client().from('recruitment_posts').select('*').eq('owner_account_id',identity.accountId).order('created_at',{ascending:false}).limit(20);if(error)throw error;return cardsWithGuildIdentity(data as RecruitmentRow[]);}
export const partyRankings=()=>rpc<PartyRanking[]>('party_rankings_board_v16');
export const claimPartyContractReward=(id:string,characterId:string)=>rpc('claim_party_contract_reward_v16',{p_entitlement_id:id,p_character_id:characterId});
export const transferPartyLeadership=(partyId:string,targetAccountId:string)=>rpc<'transferred'>('transfer_party_leadership_v1',{p_party_id:partyId,p_target_account_id:targetAccountId});
export const removePartyMember=(partyId:string,targetAccountId:string)=>rpc<'removed'>('remove_party_member_v1',{p_party_id:partyId,p_target_account_id:targetAccountId});
export const cancelPartyInvitation=(invitationId:string)=>rpc<'cancelled'>('cancel_party_invitation_v1',{p_invitation_id:invitationId});
export const disbandParty=(partyId:string)=>rpc<'disbanded'>('disband_party_v1',{p_party_id:partyId});
export const sendPartyChat=(id:string,body:string,key:string)=>rpc('send_persistent_party_chat_v16',{p_party_id:id,p_body:body,p_idempotency_key:key});
export type PartyChatMessage={id:string;account_id:string;sender_name:string;body:string;created_at:string;guild_tag?:string|null;guild_tag_color_id?:string|null};
export async function partyChatMessages(id:string){const {data,error}=await client().from('chat_messages').select('id,account_id,sender_name,body,created_at').eq('channel_type','party').eq('channel_id',id).order('created_at',{ascending:false}).limit(50);if(error)throw error;const rows=(data??[]).reverse() as PartyChatMessage[],identities=await guildIdentities(rows.map(row=>row.account_id));return rows.map(row=>({...row,...identities.get(row.account_id)}));}

export async function activePartyEvent(): Promise<PartyEventView|null>{
 const identity=await partySocialIdentity(); if(!identity)return null;
 const c=client(); const partyState=await partySocialSnapshot(); const {data:instances,error}=await c.from('liveops_event_instances').select('id,event_id,definition_snapshot,status,starts_at,ends_at').in('status',['scheduled','active','settling']).order('starts_at',{ascending:false}).limit(1); if(error)throw error;
 const instance=instances?.[0] as any; if(!instance)return null;
 const partyId=partyState?.party?.id??null;
 const [{data:account,error:accountError},{data:todayRows,error:todayError},{data:party,error:partyError}]=await Promise.all([
   c.from('liveops_event_account_progress').select('personal_points').eq('event_instance_id',instance.id).eq('account_id',identity.accountId).maybeSingle(),
   c.from('liveops_event_contribution_receipts').select('credited_points').eq('event_instance_id',instance.id).eq('account_id',identity.accountId).eq('date_key',new Date().toISOString().slice(0,10)),
   partyId?c.from('liveops_event_party_progress').select('party_id,party_name_snapshot,score,ranked_eligible,meaningful_contributors').eq('event_instance_id',instance.id).eq('party_id',partyId).maybeSingle():Promise.resolve({data:null,error:null} as any),
 ]); if(accountError)throw accountError;if(partyError)throw partyError;
 if(todayError)throw todayError;
 const d=instance.definition_snapshot??{}; const personal=Number(account?.personal_points??0); const today=(todayRows??[]).reduce((sum: number,row:any)=>sum+Number(row.credited_points??0),0); const partyScore=Number(party?.score??0);
 const milestone=(points:number,current:number)=>({points,reached:current>=points,claimed:false});
 return {eventInstanceId:instance.id,status:instance.status,name:d.name??instance.event_id,shortDescription:d.shortDescription??'',eventTags:d.eventTags??[],personalPoints:personal,personalPointsToday:today,personalDailyCap:Number(d.dailyAccountCreditCap??2400),partyId:party?.party_id??undefined,partyName:party?.party_name_snapshot??undefined,partyScore,rankedEligible:Boolean(party?.ranked_eligible),rankedEligibilityMissing:[],personalMilestones:[250,750,1500,2500].map(p=>milestone(p,personal)),partyMilestones:[2000,4000,6000,9000].map(p=>milestone(p,partyScore)),members:[]};
}
