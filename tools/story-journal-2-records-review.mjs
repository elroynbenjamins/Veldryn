/** Read-only Journal bridge. Existing challenge settlement and monthly ledger remain authoritative.
 * Discovery and lore share the Exploration owner's entitlement identities, no second payout. */
const flags={released:false,authorizesReward:false,authorizesAccess:false};
const id=x=>typeof x==='string'&&x.length>0;
const natural=x=>Number.isSafeInteger(x)&&x>=0;
const scoped=(s,e)=>!!s&&!!e&&id(e.accountId)&&id(e.characterId)&&s.accountId===e.accountId&&s.characterId===e.characterId;
const deny=reason=>({...flags,status:'unavailable',reason});
export function discoveryRecordsReview(books,policy,snapshot,expected){
 if(!scoped(snapshot,expected)||policy?.released!==false||policy.discoveryPolicy?.owner!=='exploration2'||policy.discoveryPolicy?.journalReward!=='none'||!Array.isArray(snapshot.actualAccountMaps)||!Array.isArray(snapshot.explorationClaimedEntitlementIds))return deny('unverified_discovery');
 const groups=['ASTERFALL','SUNSCAR','FROSTMARCH'];
 const actual=new Set(snapshot.actualAccountMaps),claimed=new Set(snapshot.explorationClaimedEntitlementIds),seenRoutes=new Set();
 const regions=[];
 for(const regionId of groups){
  const book=books.find(b=>b.regionId===regionId);
  if(!book||book.released!==false||!book.zones?.length)return deny('missing_region');
  const routeIds=book.zones.map(z=>z.routeId);
  if(routeIds.some(r=>!id(r)||seenRoutes.has(r))||new Set(routeIds).size!==routeIds.length)return deny('invalid_route_identity');
  routeIds.forEach(r=>seenRoutes.add(r));
  const entitlementId='scouting2:collection:'+regionId.toLowerCase()+':v1';
  const count=routeIds.filter(r=>actual.has(r)).length;
  regions.push({regionId,count,total:routeIds.length,entitlementId,claimed:claimed.has(entitlementId),complete:count===routeIds.length,destination:{screen:'Skills',skillId:'exploration',section:'Discoveries'},...flags});
 }
 const realmId='scouting2:collection:realm:v1';
 return {...flags,status:'review',regions,realm:{entitlementId:realmId,count:regions.filter(r=>r.complete).length,total:regions.length,claimed:claimed.has(realmId),...flags}};
}
const periods=['daily','weekly','monthly'];
export function challengeJournalReview(snapshot,expected,period='daily'){
 if(!scoped(snapshot,expected)||!Array.isArray(snapshot.challenges)||!Array.isArray(snapshot.monthlyMilestones)||!periods.includes(period))return deny('unverified_challenges');
 const ids=new Set();
 for(const q of snapshot.challenges){
  if(!id(q.id)||ids.has(q.id)||!periods.includes(q.period)||!id(q.periodKey)||!id(q.title)||!natural(q.progress)||!natural(q.required)||q.required===0||!['active','ready','claimed'].includes(q.status))return deny('invalid_challenge');
  if(q.status==='ready'&&q.progress<q.required)return deny('inconsistent_challenge');
  ids.add(q.id);
 }
 const months=new Set();
 for(const m of snapshot.monthlyMilestones){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.key)||months.has(m.key)||!natural(m.points)||!Array.isArray(m.claimed)||m.claimed.some(x=>![30,60,100].includes(x))||!natural(m.claimUntilMs))return deny('invalid_monthly_milestone');
  months.add(m.key);
 }
 const rows=snapshot.challenges.filter(q=>q.period===period).map(q=>({id:q.id,periodKey:q.periodKey,title:q.title,status:q.status,progress:Math.min(q.progress,q.required),required:q.required,primary:q.status==='claimed'?'View completed':q.status==='ready'?'Review rewards':'View challenge',destination:{screen:'ExistingChallenges',questId:q.id,period:q.period},...flags}));
 const summary=periods.map(p=>({period:p,ready:snapshot.challenges.filter(q=>q.period===p&&q.status==='ready').length,total:snapshot.challenges.filter(q=>q.period===p).length}));
 return {...flags,status:'review',period,summary,rows,monthlyMilestones:snapshot.monthlyMilestones.map(m=>({...m,claimed:[...m.claimed],destination:{screen:'ExistingChallenges',section:'MonthlyMilestones'},...flags}))};
}
