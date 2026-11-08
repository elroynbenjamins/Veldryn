import {communityRoadmapFeatureVisible} from '../core/community-roadmap-release-visibility';
import {supabase} from './supabase';

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

/** Public aggregate only: the server never sends another player's vote rows. */
export async function fetchCommunityRoadmap():Promise<CommunityRoadmapSnapshot>{
 if(!supabase)throw new Error('Connect to Veldryn to view the roadmap.');
 const {data,error}=await supabase.rpc('community_roadmap_snapshot');
 if(error)throw new Error('Could not load the community roadmap. Please try again.');
 return parseSnapshot(data);
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
 return parseSnapshot(data);
}
