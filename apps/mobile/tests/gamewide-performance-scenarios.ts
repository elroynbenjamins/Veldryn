import {performance} from 'node:perf_hooks';
import {createCharacter,newGame} from '../src/core/game';
import {unlockCombatCompanion} from '../src/core/combat-companions';
import {companionView,companionEconomy} from '../src/core/companion-runtime';
import {visibleStacks,inventoryNewItemIds} from '../src/core/inventory-view';
import {normalizeCraftedGearInstances} from '../src/core/crafted-gear-instances';
import {indexInventoryGearCopies} from '../src/core/inventory-gear-lookup';
import type {GameState} from '../src/core/types';

function ok(value:unknown,label:string):asserts value {if(!value)throw new Error(label);}
const clock=Date.UTC(2026,9,31);
const base=createCharacter(newGame(clock),'IRONWARDEN','Performance Fixture');
const owner=base.character!.id;
const rawCopies=Array.from({length:1800},(_,index)=>({
 id:'perf-gear-'+index,itemId:'T1P_001',ownerCharacterId:owner,rarity:'rare',
 quality:index%101,createdAtMs:clock,sourceReceiptKey:'fixture-'+index,
 enhancement:{rank:0,failures:0,gemIds:[]},
}));
const storage=Array.from({length:1600},(_,index)=>({
 itemId:['COPPER_ORE','EMBER_SHARD','TRAVEL_RATION','T1P_001'][index%4],
 quantity:index%20+1,...(index%4===3?{instanceId:'perf-gear-'+Math.floor(index/4)}:{}),
}));
const state:GameState={...base,
 inventory:{...base.inventory,stacks:storage},
 account:{...base.account,craftedGearInstances:rawCopies as unknown as NonNullable<GameState['account']['craftedGearInstances']>},
};
const fixtureJson=JSON.stringify({inventory:state.inventory.stacks,gear:state.account.craftedGearInstances});
const measure=(label:string,action:()=>unknown,iterations=4)=>{
 const results:number[]=[];let value:unknown;
 for(let i=0;i<iterations;i++){
  const started=performance.now();value=action();results.push(performance.now()-started);
 }
 results.sort((a,b)=>a-b);
 console.log('PROFILE synthetic mobile-core '+label+': '+JSON.stringify({
  runs:iterations,p50Ms:Math.round((results[Math.floor(iterations/2)]??0)*100)/100,
  maxMs:Math.round((results[iterations-1]??0)*100)/100,
 }));
 return value;
};
const filtered=measure('inventory 1600 visible stacks/filter/sort',()=>visibleStacks(state.inventory.stacks,'','all','new',[],[])) as typeof storage;
ok(filtered.length>=1200,'large Inventory should project its released stacks');
ok(filtered.every(row=>row.quantity>0),'visible projection never invents negative item amounts');
const unique=measure('Inventory new-item discovery',()=>inventoryNewItemIds(state)) as string[];
ok(unique.length>=2,'all newly collected item types are discoverable');
const records=measure('normalize 1800 legacy-safe Forge records',()=>normalizeCraftedGearInstances(state.account.craftedGearInstances)) as ReturnType<typeof normalizeCraftedGearInstances>;
ok(records.length===1800,'normalization must retain every supported crafted instance');
const lookup=measure('index 1800 Forge copies',()=>indexInventoryGearCopies(records)) as ReadonlyMap<string,(typeof records)[number]>;
const hits=measure('1200 mixed instance lookups',()=>Array.from({length:1200},(_,i)=>lookup.get('perf-gear-'+(i*7%1800))?.quality)) as Array<number|undefined>;
ok(hits.length===1200&&hits.every((quality,i)=>quality===(i*7%1800)%101),'indexed Forge projection preserves quality of each exact copy');
ok(JSON.stringify({inventory:state.inventory.stacks,gear:state.account.craftedGearInstances})===fixtureJson,'profiling is read-only and does not modify an existing inventory');
let companions=base;
for(const id of ['UNIT_001','UNIT_002','UNIT_003'])companions=unlockCombatCompanion(companions,id,clock);
const companionBaseline=JSON.stringify(companions);
const companionSummary=measure('Companion codex + trials projection',()=>companionView(companions,clock),3);
ok(!!companionSummary,'large collection projection must remain available');
measure('Companion account economy',()=>companionEconomy(companions),4);
ok(JSON.stringify(companions)===companionBaseline,'Companion profiling cannot mutate player progress');
console.log('PASS synthetic mobile projections: oversized Inventory, protected Forge records, companion views and read-only state invariants. NOT Android FPS/memory.');
