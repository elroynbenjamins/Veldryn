import {versionedFetch as fetch} from './versioned-fetch';
import {supabase} from './supabase';
import type {RankingBoardId,RankingBoardSnapshot} from '../core/rankings';
declare const process:{env:Record<string,string|undefined>};
const apiBase=(process.env.EXPO_PUBLIC_RANKINGS_API_URL??process.env.EXPO_PUBLIC_PROFILE_API_URL??process.env.EXPO_PUBLIC_ARENA_API_URL??process.env.EXPO_PUBLIC_COOP_API_URL)?.replace(/\/$/,'');
const frozenApiBase=(process.env.EXPO_PUBLIC_RANKINGS_EDGE_URL??'').replace(/\/$/,'');
export const rankingsFrozenConfigured=Boolean(
  process.env.EXPO_PUBLIC_RANKINGS_V1==='true'
  &&process.env.EXPO_PUBLIC_RANKINGS_SNAPSHOT_V1==='true'
  &&frozenApiBase&&supabase
);
export const rankingsOnlineConfigured=Boolean(
  (process.env.EXPO_PUBLIC_RANKINGS_V1==='true'&&apiBase&&supabase)
  ||rankingsFrozenConfigured
);
async function request<T>(path:string):Promise<T>{if(!supabase||!apiBase)throw new Error('Rankings server is not configured.');const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to view Rankings.');const response=await fetch(`${apiBase}${path}`,{headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'}});const payload=await response.json();if(!response.ok)throw new Error(payload?.message??payload?.code??'Rankings request failed.');return payload as T;}
export const rankingsClient={board:(board:RankingBoardId,limit=50,offset=0)=>request<RankingBoardSnapshot>(`/rankings?board=${encodeURIComponent(board)}&limit=${Math.max(1,Math.min(100,Math.floor(limit)))}&offset=${Math.max(0,Math.min(10000,Math.floor(offset)))}`)};

// Frozen snapshots are independently gated on both server and client. A
// production build must supply the explicit Edge URL and feature flag;
// the backend's default-deny flags remain authoritative regardless.
export interface FrozenRankingBoardSnapshot extends RankingBoardSnapshot{
  frozen:true;cursor:string;nextCursor:string|null;hasNext:boolean;pageSize:number;expiresAtMs:number;
}
async function frozenRequest(path:string,body?:Record<string,unknown>):Promise<FrozenRankingBoardSnapshot>{
  if(!rankingsFrozenConfigured||!supabase)throw new Error('Frozen Rankings are not available.');
  const session=(await supabase.auth.getSession()).data.session;
  if(!session)throw new Error('Sign in to view Rankings.');
  const response=await fetch(`${frozenApiBase}${path}`,{
    method:body?'POST':'GET',
    headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const payload=await response.json();
  if(!response.ok)throw new Error(payload?.error??'ranking_snapshot_unavailable');
  if(payload?.frozen!==true||!Array.isArray(payload.entries))
    throw new Error('invalid_ranking_snapshot');
  return payload as FrozenRankingBoardSnapshot;
}
export const frozenRankingsClient={
  start:(board:RankingBoardId,limit=50)=>frozenRequest('?view=rankings&action=snapshot-start',{board,limit}),
  page:(cursor:string)=>frozenRequest(`?view=rankings&action=snapshot-page&cursor=${encodeURIComponent(cursor)}`)
};
