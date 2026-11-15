import type {GameplayServices} from './gameplay';

/** All Rankings endpoints are closed in the shipped server. Server-only constants,
 * never request parameters or editable client environment variables. */
export const RANKINGS_RELEASED=false;
export const FROZEN_RANKINGS_RELEASED=false;
export const ARENA_HISTORY_RELEASED=false;
export const WORLD_BOSS_HISTORY_RELEASED=false;
export const PARTY_EVENT_HISTORY_RELEASED=false;
export const GUILD_PVE_HISTORY_RELEASED=false;
type Gates={rankings:boolean;frozen:boolean;arena:boolean;worldBoss:boolean;partyEvent:boolean;guildPve:boolean};
const CLOSED:Gates={rankings:RANKINGS_RELEASED,frozen:FROZEN_RANKINGS_RELEASED,
  arena:ARENA_HISTORY_RELEASED,worldBoss:WORLD_BOSS_HISTORY_RELEASED,
  partyEvent:PARTY_EVENT_HISTORY_RELEASED,guildPve:GUILD_PVE_HISTORY_RELEASED};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const integer=(v:unknown,def:number,min:number,max:number)=>{
  if(v===null||v===undefined||v==='')return def;
  const n=typeof v==='string'?Number(v):v;
  if(typeof n!=='number'||!Number.isSafeInteger(n)||n<min||n>max)
    throw new Error('INVALID_PAGE');
  return n;
};
const parseToken=(v:unknown)=>typeof v==='string'&&UUID.test(v)?v:null;

/** Strictly project a database result to public fields, even when future
 * service RPC revisions accidentally add internal IDs or receipt metadata. */
const PUBLIC_BOARD_FIELDS=[
 'board','title','description','unit','prestigeOnly','seasonId','generatedAtMs',
 'frozen','cursor','nextCursor','hasNext','expiresAtMs','pageSize',
 'mode','eventKey','metric','bracket','finalizedAtMs','bossId','bossName'
] as const;
const PUBLIC_ENTRY_FIELDS=[
 'rank','entityType','displayName','guildTag','guildTagColorId','subtitle',
 'detail','value','secondaryValue','isSelf','playerBadges'
] as const;
const PUBLIC_SELF_FIELDS=['listed','rank','value','secondaryValue','detail','reason'] as const;
const PUBLIC_BADGE_FIELDS=['staff','supporter','validUntilMs'] as const;
function only<T extends string>(value:Record<string,unknown>,fields:readonly T[]){
 const projected:Record<string,unknown>={};
 for(const field of fields)if(Object.prototype.hasOwnProperty.call(value,field))
   projected[field]=value[field];
 return projected;
}
function publicProjection(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
   throw new Error('INVALID_RANKINGS_PROJECTION');
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.entries)||raw.entries.length>100)
   throw new Error('INVALID_RANKINGS_ENTRIES');
 const rows=raw.entries.map((value:unknown)=>{
   if(!value||typeof value!=='object'||Array.isArray(value))
     throw new Error('INVALID_RANKINGS_ENTRY');
   const row=value as Record<string,unknown>;
   if(!Number.isSafeInteger(row.rank)||typeof row.displayName!=='string'
     ||!Number.isSafeInteger(row.value)
     ||row.value<0||!['account','guild','party'].includes(String(row.entityType)))
     throw new Error('INVALID_RANKINGS_ENTRY');
   const safe=only(row,PUBLIC_ENTRY_FIELDS);
   if(safe.playerBadges&&typeof safe.playerBadges==='object'
     &&!Array.isArray(safe.playerBadges))
     safe.playerBadges=only(safe.playerBadges as Record<string,unknown>,PUBLIC_BADGE_FIELDS);
   else delete safe.playerBadges;
   return safe;
 });
 const clean=only(raw,PUBLIC_BOARD_FIELDS);
 clean.entries=rows;
 if(raw.self&&typeof raw.self==='object'&&!Array.isArray(raw.self))
   clean.self=only(raw.self as Record<string,unknown>,PUBLIC_SELF_FIELDS);
 return clean;
}

/** Route only from an authenticated Edge environment that holds the service key.
 * The account ID always comes from verified auth, never the request body. */
export function rankingsHandler(services:Pick<GameplayServices,'authenticate'|'rpc'>,
  gates:Gates=CLOSED){
 return async(request:Request):Promise<Response>=>{
  if(!gates.rankings)return json({error:'rankings_unavailable'},404);
  if(!['GET','POST'].includes(request.method))return json({error:'method_not_allowed'},405);
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'auth_required'},401);
  const accountId=await services.authenticate(token);
  if(!accountId||!UUID.test(accountId))return json({error:'auth_required'},401);
  const url=new URL(request.url);
  const action=url.searchParams.get('action');
  try{
   if(action==='snapshot-start'){
    if(!gates.frozen)return json({error:'ranking_snapshots_disabled'},404);
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const body=await request.json() as {board?:unknown;limit?:unknown};
    const board=body?.board;
    const allowed=['profession_total','mining','woodcutting','fishing','smithing',
      'cooking','herbalism','alchemy','hunting','exploration','tailoring',
      'enchanting','faith','achievement_score','dungeon_tier','dungeon_clears',
      'arena_rating','arena_wins','guild'];
    if(typeof board!=='string'||!allowed.includes(board))return json({error:'invalid_ranking_board'},400);
    return json(publicProjection(await services.rpc('rankings_frozen_start_server_v1',{
      p_requester:accountId,p_board:board,p_page_size:integer(body?.limit,50,1,50)
    })));
   }
   if(action==='snapshot-page'){
    if(!gates.frozen)return json({error:'ranking_snapshots_disabled'},404);
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    const cursor=parseToken(url.searchParams.get('cursor'));
    if(!cursor)return json({error:'invalid_ranking_cursor'},400);
    return json(publicProjection(await services.rpc('rankings_frozen_page_server_v1',{
      p_requester:accountId,p_cursor:cursor
    })));
   }
   if(action==='arena-history'){
    if(!gates.arena)return json({error:'arena_history_disabled'},404);
    const seasonId=url.searchParams.get('seasonId');
    const metric=url.searchParams.get('metric');
    if(!seasonId||seasonId.length>120||!['arena_rating','arena_wins'].includes(metric??''))
      return json({error:'invalid_arena_history'},400);
    return json(publicProjection(await services.rpc('rankings_arena_final_history_server_v1',{
      p_requester:accountId,p_season_id:seasonId,p_metric:metric,
      p_limit:integer(url.searchParams.get('limit'),50,1,100),
      p_offset:integer(url.searchParams.get('offset'),0,0,10000)
    })));
   }
   if(action==='world-boss-history'){
    if(!gates.worldBoss)return json({error:'world_boss_history_disabled'},404);
    const bossId=parseToken(url.searchParams.get('bossId'));
    if(!bossId)return json({error:'invalid_world_boss_id'},400);
    return json(publicProjection(await services.rpc('leaderboards_world_boss_event_server_v1',{
      p_requester:accountId,p_boss_id:bossId,
      p_limit:integer(url.searchParams.get('limit'),50,1,100),
      p_offset:integer(url.searchParams.get('offset'),0,0,10000)
    })));
   }
   if(action==='party-event-history'||action==='guild-pve-history'){
    const isParty=action==='party-event-history';
    if(isParty&&!gates.partyEvent||!isParty&&!gates.guildPve)
      return json({error:'finalized_event_history_disabled'},404);
    const mode=isParty?'party_event':'guild_pve';
    const eventKey=url.searchParams.get('eventKey');
    const metric=url.searchParams.get('metric');
    const bracket=url.searchParams.get('bracket');
    const allowed=isParty?['damage','depth','support','shielding','mechanics']
      :['campaign_score','campaign_progress','contribution'];
    if(!eventKey||eventKey.length>120||!metric||!allowed.includes(metric)
      ||!bracket||!/^[-a-z0-9_:]{1,48}$/.test(bracket))
      return json({error:'invalid_event_history_scope'},400);
    return json(publicProjection(await services.rpc('rankings_final_mode_history_server_v1',{
      p_mode:mode,p_event_key:eventKey,p_metric:metric,p_bracket:bracket,
      p_limit:integer(url.searchParams.get('limit'),50,1,100),
      p_offset:integer(url.searchParams.get('offset'),0,0,10000)
    })));
   }
   return json({error:'ranking_action_unknown'},404);
  }catch{
   // Do not expose backend SQL, account IDs or access-control internals.
   return json({error:'rankings_request_unavailable'},503);
  }
 };
}
