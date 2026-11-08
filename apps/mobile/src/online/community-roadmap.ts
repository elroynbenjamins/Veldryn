import AsyncStorage from '@react-native-async-storage/async-storage';
import {CommunityRoadmapReadCache} from '../core/community-roadmap-read-cache';
import {communityRoadmapFeatureVisible} from '../core/community-roadmap-release-visibility';
import {supabase,supabasePublicEndpoint} from './supabase';

export type CommunityRoadmapStatus='considering'|'planned'|'in_progress'|'released';
export type CommunityRoadmapFeature={
 id:string;
 title:string;
 description:string;
 category:string;
 status:CommunityRoadmapStatus;
 release_version:string|null;
 votes:number;
 voted:boolean;
};
export type CommunityRoadmapSnapshot={
 features:CommunityRoadmapFeature[];
 votes_used:number;
 vote_limit:number;
};

function parseSnapshot(value:unknown):CommunityRoadmapSnapshot{
 if(!value||typeof value!=='object')throw new Error('Invalid roadmap response.');
 const row=value as Record<string,unknown>;
 if(!Array.isArray(row.features)||typeof row.votes_used!=='number'||typeof row.vote_limit!=='number'){
   throw new Error('Invalid roadmap response.');
 }
 const features=row.features.map((item:unknown)=>{
   if(!item||typeof item!=='object')throw new Error('Invalid roadmap feature.');
   const feature=item as Record<string,unknown>;
   if(typeof feature.id!=='string'||typeof feature.title!=='string'||typeof feature.description!=='string'||
      typeof feature.category!=='string'||typeof feature.votes!=='number'||typeof feature.voted!=='boolean'||
      !['considering','planned','in_progress','released'].includes(String(feature.status))){
     throw new Error('Invalid roadmap feature.');
   }
   return {
     id:feature.id,title:feature.title,description:feature.description,category:feature.category,
     status:feature.status as CommunityRoadmapStatus,
     release_version:typeof feature.release_version==='string'?feature.release_version:null,
     votes:Math.max(0,feature.votes),voted:feature.voted,
   };
 }).filter(feature=>communityRoadmapFeatureVisible(feature.id));
 return {features,votes_used:Math.max(0,row.votes_used),vote_limit:Math.max(0,row.vote_limit)};
}

const roadmapReadCache=new CommunityRoadmapReadCache<CommunityRoadmapSnapshot>(
 AsyncStorage,parseSnapshot,'veldryn.community-roadmap.v3',
);
const roadmapScope=(accountId:string|null)=>`${supabasePublicEndpoint??'not_configured'}:${accountId??'signed_out'}`;

async function roadmapViewerScope():Promise<string>{
 if(!supabase)throw new Error('Connect to Veldryn to view the roadmap.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw new Error('Could not verify the current roadmap viewer.');
 return roadmapScope(session?.user.id??null);
}

/** Public aggregate only. A persisted cache avoids refetching on every visit,
 * across tab navigation and app restarts, until two hours after the last
 * completed fetch (or a vote response). Concurrent opens share one request. */
export async function fetchCommunityRoadmap():Promise<CommunityRoadmapSnapshot>{
 const scope=await roadmapViewerScope();
 const result=await roadmapReadCache.read(scope,async()=>{
   if(!supabase)throw new Error('Connect to Veldryn to view the roadmap.');
   const {data,error}=await supabase.rpc('community_roadmap_snapshot');
   if(error)throw new Error('Could not load the community roadmap. Please try again.');
   return parseSnapshot(data);
 });
 return result.value;
}

/** Vote ownership, the 3-vote budget, and per-account concurrency are enforced in Postgres. */
export async function toggleCommunityRoadmapVote(featureId:string):Promise<CommunityRoadmapSnapshot>{
 if(!supabase)throw new Error('Connect to Veldryn to vote.');
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError||!session)throw new Error('Sign in or continue as a guest to vote.');
 const {data,error}=await supabase.rpc('community_roadmap_toggle_vote',{p_feature_id:featureId});
 if(error){
   if(error.message.includes('All three votes'))throw new Error('All three votes are in use. Remove a vote first.');
   if(error.message.includes('not open for voting'))throw new Error('This expansion is no longer open for voting.');
   throw new Error('Could not save your vote. Please try again.');
 }
 const snapshot=parseSnapshot(data);
 // No follow-up snapshot RPC: the vote RPC is already authoritative.
 // Keep the next screen visit within the same two-hour cache window.
 await roadmapReadCache.record(roadmapScope(session.user.id),snapshot);
 return snapshot;
}
