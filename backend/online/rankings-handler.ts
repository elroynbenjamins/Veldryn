import type {GameplayServices} from './gameplay';

/** All Rankings endpoints are closed in the shipped server. Server-only constants,
 * never request parameters or editable client environment variables. */
export const RANKINGS_RELEASED=false;
export const FROZEN_RANKINGS_RELEASED=false;
export const ARENA_HISTORY_RELEASED=false;
export const WORLD_BOSS_HISTORY_RELEASED=false;
type Gates={rankings:boolean;frozen:boolean;arena:boolean;worldBoss:boolean};
const CLOSED:Gates={rankings:RANKINGS_RELEASED,frozen:FROZEN_RANKINGS_RELEASED,
  arena:ARENA_HISTORY_RELEASED,worldBoss:WORLD_BOSS_HISTORY_RELEASED};
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
    return json(await services.rpc('rankings_frozen_start_server_v1',{
      p_requester:accountId,p_board:board,p_page_size:integer(body?.limit,50,1,50)
    }));
   }
   if(action==='snapshot-page'){
    if(!gates.frozen)return json({error:'ranking_snapshots_disabled'},404);
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    const cursor=parseToken(url.searchParams.get('cursor'));
    if(!cursor)return json({error:'invalid_ranking_cursor'},400);
    return json(await services.rpc('rankings_frozen_page_server_v1',{
      p_requester:accountId,p_cursor:cursor
    }));
   }
   if(action==='arena-history'){
    if(!gates.arena)return json({error:'arena_history_disabled'},404);
    const seasonId=url.searchParams.get('seasonId');
    const metric=url.searchParams.get('metric');
    if(!seasonId||seasonId.length>120||!['arena_rating','arena_wins'].includes(metric??''))
      return json({error:'invalid_arena_history'},400);
    return json(await services.rpc('rankings_arena_final_history_server_v1',{
      p_requester:accountId,p_season_id:seasonId,p_metric:metric,
      p_limit:integer(url.searchParams.get('limit'),50,1,100),
      p_offset:integer(url.searchParams.get('offset'),0,0,10000)
    }));
   }
   if(action==='world-boss-history'){
    if(!gates.worldBoss)return json({error:'world_boss_history_disabled'},404);
    const bossId=parseToken(url.searchParams.get('bossId'));
    if(!bossId)return json({error:'invalid_world_boss_id'},400);
    return json(await services.rpc('leaderboards_world_boss_event_server_v1',{
      p_requester:accountId,p_boss_id:bossId,
      p_limit:integer(url.searchParams.get('limit'),50,1,100),
      p_offset:integer(url.searchParams.get('offset'),0,0,10000)
    }));
   }
   return json({error:'ranking_action_unknown'},404);
  }catch{
   // Do not expose backend SQL, account IDs or access-control internals.
   return json({error:'rankings_request_unavailable'},503);
  }
 };
}
