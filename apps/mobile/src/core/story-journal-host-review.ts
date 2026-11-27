/** Hidden navigation bridge, not mounted in App.tsx.
 * Produces host view intents only. Never starts an activity, travels, or claims.
 * Exact scouting report navigation requires the Exploration 2.0 host.
 */
type Identity={accountId:string;characterId:string};
type ReturnLink=Identity&{screen:'Journal';tab:'story'|'quests';questId:string};
type Destination={screen:string;zoneId?:string;regionId?:string;areaId?:string;monsterId?:string;skillId?:string;gatheringId?:string;section?:string;routeId?:string;assignmentId?:string;returnTo:ReturnLink};
type Intent=
 |{tab:'World';goalRegionId?:string;regionalAreaId?:string;goalMonsterId?:string}
 |{tab:'Skills';selectedSkill:string;skillsMode:'gathering'|'crafting'|'faith';goalActionId?:string;regionalAreaId?:string}
 |{tab:'Inventory'}
 |{tab:'ExplorationReview';section:'Routes'|'Reports';routeId:string;assignmentId?:string};
type Result={status:'review';intent:Intent;returnTo:ReturnLink;authorizesAccess:false;authorizesReward:false}|{status:'unavailable';reason:string;authorizesAccess:false;authorizesReward:false};
const flags={authorizesAccess:false,authorizesReward:false} as const;
const unavailable=(reason:string):Result=>({status:'unavailable',reason,...flags});
const valid=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=160;
export function journalHostIntentReview(destination:Destination,identity:Identity,knownQuestIds:readonly string[],explorationHostReady=false):Result{
 const r=destination?.returnTo;
 if(!valid(identity?.accountId)||!valid(identity?.characterId)||!r||r.screen!=='Journal'||r.accountId!==identity.accountId||r.characterId!==identity.characterId||!['story','quests'].includes(r.tab)||!knownQuestIds.includes(r.questId))return unavailable('stale_return_context');
 let intent:Intent;
 if(destination.screen==='World'){
  if(destination.monsterId&&(!valid(destination.monsterId)||!valid(destination.zoneId)))return unavailable('invalid_encounter');
  // World host uses actual zone ID, not narrative region label.
  intent={tab:'World',goalRegionId:destination.zoneId,regionalAreaId:destination.areaId,goalMonsterId:destination.monsterId};
 }else if(destination.screen==='Inventory')intent={tab:'Inventory'};
 else if(destination.screen==='Skills'){
  if(destination.skillId==='exploration'){
   if(!explorationHostReady||!valid(destination.routeId)||!['Routes','Reports'].includes(destination.section??''))return unavailable('exploration_host_pending');
   intent={tab:'ExplorationReview',section:destination.section as 'Routes'|'Reports',routeId:destination.routeId,assignmentId:destination.assignmentId};
  }else{
   if(!destination.skillId||!['mining','woodcutting','fishing','herbalism','smithing','cooking','tailoring','alchemy','enchanting','faith'].includes(destination.skillId))return unavailable('unknown_skill');
   const mode=destination.skillId==='faith'?'faith':['mining','woodcutting','fishing','herbalism'].includes(destination.skillId)?'gathering':'crafting';
   intent={tab:'Skills',selectedSkill:destination.skillId,skillsMode:mode,goalActionId:destination.gatheringId,regionalAreaId:destination.areaId};
  }
 }else return unavailable('unsupported_destination');
 return {status:'review',intent,returnTo:{...r},...flags};
}
