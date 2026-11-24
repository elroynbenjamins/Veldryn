import {strict as assert} from 'node:assert';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {
 planPartySynchronizationV2,partySynchronizationEquivalentLinkBudgetV2,
} from '../party-synchronization';

const classes=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const damage=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const rows=new Map<ClassIdV2,{appearances:number;sumLinks:number;sumBudget:number;minBudget:number;maxBudget:number}>();
for(const c of classes)rows.set(c,{appearances:0,sumLinks:0,sumBudget:0,minBudget:Infinity,maxBudget:0});
const histogram:Record<number,number>={};
let cases=0,minLinks=Infinity,maxLinks=0;

for(const tank of tanks)for(const support of supports)
 for(let a=0;a<damage.length;a++)for(let b=a+1;b<damage.length;b++){
  const ids=[tank,damage[a],damage[b],support];
  const plan=planPartySynchronizationV2('dungeon',ids.map((classId,i)=>({
   characterId:'FAIR_'+i,classId,
  })));
  const links=plan.active.length,budget=partySynchronizationEquivalentLinkBudgetV2(links);
  minLinks=Math.min(minLinks,links);maxLinks=Math.max(maxLinks,links);
  histogram[links]=(histogram[links]??0)+1;
  assert.equal(plan.cappedStats.length,0);
  for(const c of ids){
   const row=rows.get(c)!;
   row.appearances++;row.sumLinks+=links;row.sumBudget+=budget;
   row.minBudget=Math.min(row.minBudget,budget);row.maxBudget=Math.max(row.maxBudget,budget);
  }
  cases++;
 }

assert.equal(cases,36);
assert.deepEqual(histogram,{2:10,3:19,4:7});
assert.equal(minLinks,2);
assert.equal(maxLinks,4);
assert.equal(histogram[5]??0,0);
assert.equal(histogram[6]??0,0);

const summary=Object.fromEntries(classes.map(c=>{
 const row=rows.get(c)!;
 const expected=CLASS_ROLES_V2[c]==='tank'?12:18;
 assert.equal(row.appearances,expected,c+' dungeon appearance count');
 return [c,{
  role:CLASS_ROLES_V2[c],appearances:row.appearances,
  avgLinks:Number((row.sumLinks/row.appearances).toFixed(4)),
  avgEquivalentLinkBudget:Number((row.sumBudget/row.appearances).toFixed(4)),
  minEquivalentLinkBudget:row.minBudget,maxEquivalentLinkBudget:row.maxBudget,
 }];
}));
const averages=Object.values(summary).map(x=>x.avgEquivalentLinkBudget);
const spread=Math.max(...averages)-Math.min(...averages);
// Equal degree alone is not enough; role restrictions must also keep the
// expected party-wide Synchronization budget close across class choices.
assert.ok(spread<=.10,'class selection creates too much average dungeon Synchronization pressure: '+spread);
assert.ok(Object.values(summary).every(x=>
 x.minEquivalentLinkBudget>=2&&x.maxEquivalentLinkBudget<=2.6));

console.log(JSON.stringify({
 kind:'PARTY_SYNC_STRICT_DUNGEON_CLASS_FAIRNESS',
 cases,histogram,minLinks,maxLinks,
 averageEquivalentLinkBudgetSpread:Number(spread.toFixed(4)),
 byClass:summary,
 interpretation:'strict dungeon class choice must not materially change expected party-wide Synchronization budget',
}));
