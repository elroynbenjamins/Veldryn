import {supabase} from './supabase';
import type {RankingBoardId,RankingBoardSnapshot} from '../core/rankings';
declare const process:{env:Record<string,string|undefined>};
const apiBase=(process.env.EXPO_PUBLIC_RANKINGS_API_URL??process.env.EXPO_PUBLIC_PROFILE_API_URL??process.env.EXPO_PUBLIC_ARENA_API_URL??process.env.EXPO_PUBLIC_COOP_API_URL)?.replace(/\/$/,'');
export const rankingsOnlineConfigured=Boolean(process.env.EXPO_PUBLIC_RANKINGS_V1==='true'&&apiBase&&supabase);
async function request<T>(path:string):Promise<T>{if(!supabase||!apiBase)throw new Error('Rankings server is not configured.');const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error('Sign in to view Rankings.');const response=await fetch(`${apiBase}${path}`,{headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'}});const payload=await response.json();if(!response.ok)throw new Error(payload?.message??payload?.code??'Rankings request failed.');return payload as T;}
export const rankingsClient={board:(board:RankingBoardId,limit=50,offset=0)=>request<RankingBoardSnapshot>(`/rankings?board=${encodeURIComponent(board)}&limit=${Math.max(1,Math.min(100,Math.floor(limit)))}&offset=${Math.max(0,Math.min(10000,Math.floor(offset)))}`)};
