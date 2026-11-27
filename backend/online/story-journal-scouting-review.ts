/** Structural port of the Exploration #1723 server snapshot; no cross-branch import.
 * Only actual account discovery IDs and character-discovered routes are evidence.
 * Retained travel/access, timers, assignments and legacy reports are NOT discoveries.
 */
type Snapshot={account:{accountId:string;creditedDiscoveryIds:readonly string[]};character:{characterId:string;discoveredRouteIds:readonly string[];retainedRegionIds:readonly string[];retainedAreaIds:readonly string[]}};
type Identity={accountId:string;characterId:string};
const unique=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(s=>typeof s==='string'&&s.length>0)&&new Set(x).size===x.length;
export function journalScoutingEvidenceReview(snapshot:Snapshot,expected:Identity,knownRouteIds:readonly string[]){
 const unavailable={status:'unavailable' as const,released:false as const,authorizesAccess:false as const,authorizesReward:false as const};
 if(!expected?.accountId||!expected.characterId||snapshot?.account?.accountId!==expected.accountId||snapshot?.character?.characterId!==expected.characterId||!unique(snapshot.account.creditedDiscoveryIds)||!unique(snapshot.character.discoveredRouteIds)||!unique(snapshot.character.retainedRegionIds)||!unique(snapshot.character.retainedAreaIds)||!unique(knownRouteIds))return unavailable;
 const known=new Set(knownRouteIds),actualAccountMaps=snapshot.account.creditedDiscoveryIds.filter(id=>known.has(id));
 const discovered=snapshot.character.discoveredRouteIds.filter(id=>known.has(id));
 // Inconsistent snapshots must refresh; never infer shared discoveries from access.
 if(discovered.some(id=>!actualAccountMaps.includes(id)))return unavailable;
 return {status:'review' as const,...expected,actualAccountMaps,characterDiscoveredRoutes:discovered,
  retainedRegions:[...snapshot.character.retainedRegionIds],retainedAreas:[...snapshot.character.retainedAreaIds],
  released:false as const,authorizesAccess:false as const,authorizesReward:false as const};
}
