import {CROSS_SKILL_DISCOVERIES_V45,applyCrossSkillSnapshot,newCrossSkillState} from '../src/core/cross-skill-discoveries-v45';
import {COLLECTION_SETS_V45,applyCollectionSetSnapshot,collectionMemberKey,newCollectionSetState} from '../src/core/collection-sets-v45';
import {applyRareDiscoverySettlement,newRareDiscoveryState,type RareDiscoveryPool} from '../src/core/rare-idle-discoveries-v46';
import {buildWelcomeBackProgressReport} from '../src/core/welcome-back-v46';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
equal(CROSS_SKILL_DISCOVERIES_V45.length,7,'Only currently-bindable cross-skill discoveries are enabled');
const cross=newCrossSkillState('acct');
const result=applyCrossSkillSnapshot(cross,'c1',{skillLevels:{mining:30,smithing:30}},100);
ok(result.newlyUnlockedDiscoveryIds.includes('ore_and_flame'),'Mining + Smithing unlocks Ore & Flame');
equal(applyCrossSkillSnapshot(cross,'c1',{skillLevels:{mining:30,smithing:30}},101).grants.length,0,'Cross-skill unlock is idempotent in state');

ok(COLLECTION_SETS_V45.length>=2,'Runtime collection sets are authored from current IDs');
const collection=newCollectionSetState('acct');
const cuisine=COLLECTION_SETS_V45.find(row=>row.id==='asterfall_cuisine_runtime')!;
const owned=Object.fromEntries(cuisine.members.map(member=>[collectionMemberKey(member),true])) as Record<string,true>;
const completion=applyCollectionSetSnapshot(collection,{ownedKeys:owned},200);
ok(completion.newlyCompletedSetIds.includes(cuisine.id),'Collection set completes from canonical ownership snapshot');
equal(applyCollectionSetSnapshot(collection,{ownedKeys:owned},201).grants.length,0,'Collection reward grants only once');

const pool:RareDiscoveryPool={id:'test',name:'Test',enabled:true,sourceKind:'mining',activityIds:['IRON'],opportunitySeconds:1800,baseChanceBps:10000,pityStartsAfterMisses:0,pityStepBps:0,maxChanceBps:10000,candidates:[{id:'geode',name:'Geode',description:'Test find',rarity:'rare',weight:1,unique:false,reward:{kind:'item_grant',ref:'GEODE',label:'Geode',quantity:1}}]};
const rareA=newRareDiscoveryState('acct');
const one=applyRareDiscoverySettlement(rareA,{eventId:'e1',accountId:'acct',characterId:'c1',sourceKind:'mining',activityId:'IRON',settlementKind:'offline',elapsedSeconds:1800,actions:10,settledAtMs:300},{},()=>0,[pool]);
equal(one.finds.length,1,'30 minutes gives one discovery opportunity');
const rareB=newRareDiscoveryState('acct');
const half1=applyRareDiscoverySettlement(rareB,{eventId:'e2a',accountId:'acct',characterId:'c1',sourceKind:'mining',activityId:'IRON',settlementKind:'offline',elapsedSeconds:900,actions:5,settledAtMs:301},{},()=>0,[pool]);
const half2=applyRareDiscoverySettlement(rareB,{eventId:'e2b',accountId:'acct',characterId:'c1',sourceKind:'mining',activityId:'IRON',settlementKind:'offline',elapsedSeconds:900,actions:5,settledAtMs:302},{},()=>0,[pool]);
equal(half1.finds.length,0,'First 15 minutes does not create a roll');
equal(half2.finds.length,1,'Two 15-minute settlements equal one 30-minute opportunity');

const welcome=buildWelcomeBackProgressReport({elapsedSeconds:3600,activityName:'Iron Vein',actions:100,xp:1000,gold:50,items:[],beforeSkills:{mining:{level:10,xp:100}},afterSkills:{mining:{level:11,xp:1100}},beforeWeeklyOrders:{o:{title:'Mine Iron',progress:5,target:10}},afterWeeklyOrders:{o:{title:'Mine Iron',progress:10,target:10}},rareDiscoveries:[{findId:'f',name:'Geode',rarity:'rare',rewardLabel:'Geode'}]});
ok(welcome.skillChanges[0].afterLevel===11,'Welcome Back includes skill changes');
ok(welcome.weeklyOrderChanges[0].completed,'Welcome Back includes Weekly Order completion');
equal(welcome.rareDiscoveries.length,1,'Welcome Back elevates rare discoveries');
console.log('PASS: reconciled V45 cross-skill/collection sets and V46 rare idle discovery/Welcome Back behavior');
