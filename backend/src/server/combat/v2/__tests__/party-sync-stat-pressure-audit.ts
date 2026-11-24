import {strict as assert} from 'node:assert';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {
 listPartySynchronizationsV2,planPartySynchronizationV2,
 partySynchronizationCapBpsV2,type SyncStatV2,
} from '../party-synchronization';

const classes=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const damage=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const roster=(ids:readonly ClassIdV2[])=>ids.map((classId,i)=>({
 characterId:'AUDIT_'+i,classId,
}));
const maxRaw=new Map<SyncStatV2,{rawBps:number;classes:ClassIdV2[];links:string[]}>();
const flexibleCapCases:Array<{classes:ClassIdV2[];capped:ReturnType<typeof planPartySynchronizationV2>['cappedStats']}>=[];
let flexibleCases=0,dungeonCases=0,dungeonCapCases=0;
const flexibleLinkHistogram:Record<number,number>={};

for(let a=0;a<classes.length;a++)
 for(let b=a;b<classes.length;b++)
  for(let c=b;c<classes.length;c++)
   for(let d=c;d<classes.length;d++){
    const ids=[classes[a],classes[b],classes[c],classes[d]];
    const plan=planPartySynchronizationV2('party_event',roster(ids));
    flexibleCases++;
    flexibleLinkHistogram[plan.active.length]=(flexibleLinkHistogram[plan.active.length]??0)+1;
    if(plan.cappedStats.length)flexibleCapCases.push({classes:[...ids],capped:plan.cappedStats});
    const raw:Partial<Record<SyncStatV2,number>>={};
    for(const link of plan.active)for(const [stat,bps] of link.bonuses)
      raw[stat]=(raw[stat]??0)+bps;
    for(const [stat,value] of Object.entries(raw) as [SyncStatV2,number][]){
      const previous=maxRaw.get(stat);
      if(!previous||value>previous.rawBps)
        maxRaw.set(stat,{rawBps:value,classes:[...ids],links:plan.active.map(x=>x.id)});
      assert.equal(plan.totalsBps[stat],Math.min(value,partySynchronizationCapBpsV2(stat)),
        'effective total must equal explicit cap calculation');
    }
   }

for(const tank of tanks)for(const support of supports)
 for(let a=0;a<damage.length;a++)for(let b=a+1;b<damage.length;b++){
  const ids=[tank,damage[a],damage[b],support];
  const plan=planPartySynchronizationV2('dungeon',roster(ids));
  dungeonCases++;
  dungeonCapCases+=Number(plan.cappedStats.length>0);
  assert.equal(plan.cappedStats.length,0,
   'strict dungeon composition must not silently lose Synchronization value: '+ids.join(':'));
 }

assert.equal(flexibleCases,495);
assert.deepEqual(flexibleLinkHistogram,{0:78,1:173,2:133,3:78,4:28,5:5});
// Six links are a theoretical four-character maximum, not achievable in this catalogue.
assert.equal(flexibleLinkHistogram[6]??0,0);
assert.equal(dungeonCases,36);
assert.equal(dungeonCapCases,0);
assert.equal(flexibleCapCases.length,1,
 'current catalogue should have exactly one explicit flexible-only cap-pressure composition');
const only=flexibleCapCases[0];
assert.deepEqual([...only.classes].sort(),
 ['BASTION','DAWNKEEPER','DREADGUARD','IRONWARDEN'].sort());
assert.deepEqual(only.capped,[{
 stat:'healing_received_pct',rawBps:1040,cappedBps:1000,discardedBps:40,
}]);

const catalogue=listPartySynchronizationsV2();
assert.equal(catalogue.length,18);
console.log(JSON.stringify({
 kind:'PARTY_SYNC_STAT_PRESSURE_AUDIT',
 flexibleCases,dungeonCases,dungeonCapCases,flexibleLinkHistogram,
 flexibleCapCases:flexibleCapCases.map(x=>({classes:x.classes,capped:x.capped})),
 maxRawByStat:Object.fromEntries([...maxRaw.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([stat,row])=>[stat,{...row,capBps:partySynchronizationCapBpsV2(stat)}])),
 policy:'caps must be explicit; strict dungeon rosters may not discard Synchronization value',
}));
