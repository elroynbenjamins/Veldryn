import {createCharacter,newGame} from '../src/core/game';
import {socketGem,unsocketGem} from '../src/core/equipment-enhancement';
import {claimAllReadyEquipmentCrafts,claimForgeJob,startGemRefinement} from '../src/core/equipment-crafting-queue';
import {gemPouch,gemPouchUpgradePreview,gemStorageQuantity,migrateGemPouch,sellPouchGem,storePouchGem,upgradeGemPouch} from '../src/core/gem-pouch';
import {gemRefineRecipeIdV1} from '../src/core/gem-progression-v1';
import {MOBILE_GEM_FAMILIES_V1} from '../src/content/gems-v1';
import {normalizeSave} from '../src/core/save-normalization';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const rawId='raw_gem:stat_vitality:g1',gemId='gem:stat_vitality:g1';
const start=createCharacter(newGame(0),'IRONWARDEN','Pouch Tester');
const base={...start,character:{...start.character!,level:70,gold:100000},inventory:{capacity:3,stacks:[{itemId:rawId,quantity:1},{itemId:'WISP_DUST',quantity:2}]},bank:{...start.bank,capacity:0,stacks:[]}};
const recipe=gemRefineRecipeIdV1('stat_vitality',1);
const reserved=startGemRefinement(base,recipe,1000);
const migratedInputs=migrateGemPouch(base);
ok(gemPouch(migratedInputs).stacks.some(row=>row.itemId===rawId),'Raw gems migrated into the pouch must be usable by Enchanting');
const pouchStarted=startGemRefinement(migratedInputs,recipe,1000);
const pouchClaimed=claimForgeJob(pouchStarted.state,pouchStarted.job.id,pouchStarted.job.completesAtMs);
ok(gemStorageQuantity(pouchClaimed.state,rawId)===0&&gemPouch(pouchClaimed.state).stacks.some(row=>row.itemId===gemId),'A gem crafted from pouch-owned inputs must return to the pouch');
const equipped={...pouchClaimed.state,character:{...pouchClaimed.state.character!,equipment:{...pouchClaimed.state.character!.equipment,weapon:'basic_sword'}}};
const socketed=socketGem(equipped,'basic_sword',gemId);
ok(gemStorageQuantity(socketed,gemId)===0,'Socketing must consume gems directly from the pouch');
const unsocketed=unsocketGem(socketed,'basic_sword',0);
ok(gemStorageQuantity(unsocketed,gemId)===1,'Extraction must return the gem directly to the pouch');
const filler=MOBILE_GEM_FAMILIES_V1.slice(0,30).map(family=>({itemId:'raw_gem:'+family.familyId+':g1',quantity:2}));
ok(filler.length===30,'The regression must fill all 30 pouch slots');
const fullPouch={...reserved.state,account:{...reserved.state.account,gemPouch:{capacity:30,stacks:filler}}};

const existingStack={...fullPouch,inventory:{capacity:1,stacks:[{itemId:gemId,quantity:8}]}};
const stacked=claimForgeJob(existingStack,reserved.job.id,reserved.job.completesAtMs);
ok(stacked.state.inventory.stacks[0].quantity===9,'Full pouch must still allow stacking a claim into legacy Inventory');
ok(stacked.state.account.equipmentCraftingQueue?.length===0,'Successful gem claim removes the job exactly once');

const fullStorage={...fullPouch,inventory:{capacity:1,stacks:[{itemId:'WISP_DUST',quantity:1}]}};
let errorMessage='';
try{claimForgeJob(fullStorage,reserved.job.id,reserved.job.completesAtMs)}catch(error){errorMessage=error instanceof Error?error.message:''}
ok(errorMessage.includes('Gem Pouch, Inventory and Bank are full'),'A genuinely full account must show the complete storage failure reason');
const blocked=claimAllReadyEquipmentCrafts(fullStorage,reserved.job.completesAtMs,.5);
ok(blocked.claimed.length===0&&blocked.blocked.length===1,'Bulk claim must keep the unclaimable gem job pending');
ok(blocked.state.account.equipmentCraftingQueue?.some(row=>row.id===reserved.job.id),'Blocked claims must never delete crafted gems');

ok(gemPouchUpgradePreview(fullStorage)?.capacity===40,'First upgrade increases pouch from 30 to 40');
ok(validateGameCommand({type:'gem_pouch_upgrade'}).type==='gem_pouch_upgrade','Authoritative command accepts Gem Pouch upgrades');
const upgraded=executeGameCommand(fullStorage,{type:'gem_pouch_upgrade'},reserved.job.completesAtMs,{});
ok(gemPouch(upgraded.state).capacity===40,'Upgrades must be applied by the authoritative command path');
ok(upgraded.state.character!.gold===fullStorage.character!.gold-5000,'Upgrades charge Gold exactly once');
const recovered=claimForgeJob(upgraded.state,reserved.job.id,reserved.job.completesAtMs+1);
ok(gemPouch(recovered.state).stacks.some(stack=>stack.itemId===gemId&&stack.quantity===1),'Upgrading must unblock pending gem claims');
ok(!recovered.state.account.equipmentCraftingQueue?.length,'Recovered claim must settle once');

const stackedPouch=storePouchGem(storePouchGem(start,gemId,3),gemId,2);
const saleBase={...stackedPouch,character:{...stackedPouch.character!,gold:100}};
const sold=executeGameCommand(saleBase,{type:'gem_pouch_sell',args:{itemId:gemId,quantity:2}},1000);
ok(gemStorageQuantity(sold.state,gemId)===3,'Selling gems must remove only the requested pouch units');
ok(sold.state.character!.gold===100+2*120,'Selling Cut gems credits the canonical per-gem Gold value');
let favoriteBlocked=false;try{sellPouchGem({...saleBase,settings:{...saleBase.settings,favoriteItemIds:[gemId]}},gemId,1)}catch{favoriteBlocked=true}
ok(favoriteBlocked,'Favorite gems must remain protected from pouch selling');
let lockedBlocked=false;try{sellPouchGem({...saleBase,settings:{...saleBase.settings,lockedItemIds:[gemId]}},gemId,1)}catch{lockedBlocked=true}
ok(lockedBlocked,'Locked gems must remain protected from pouch selling');
let oversellBlocked=false;try{sellPouchGem(saleBase,gemId,6)}catch{oversellBlocked=true}
ok(oversellBlocked,'Pouch selling cannot mint Gold from nonexistent gems');
ok(gemPouch(stackedPouch).stacks.length===1&&gemStorageQuantity(stackedPouch,gemId)===5,'Matching gems must occupy a single pouch slot');

const oldSave={...start,account:{...start.account,gemPouch:undefined},inventory:{...start.inventory,stacks:[{itemId:gemId,quantity:3},{itemId:'WISP_DUST',quantity:1}]},bank:{...start.bank,stacks:[{itemId:gemId,quantity:2},{itemId:rawId,quantity:1}]}};
const migrated=normalizeSave(oldSave);
ok(gemStorageQuantity(migrated,gemId)===5&&gemPouch(migrated).stacks.find(row=>row.itemId===gemId)?.quantity===5,'Existing Inventory and Bank gems must migrate without loss');
ok(migrated.inventory.stacks.every(row=>row.itemId!=='gem:stat_vitality:g1')&&migrated.bank.stacks.every(row=>row.itemId!=='gem:stat_vitality:g1'),'Migrated gem stacks must not also remain in legacy storage');
const twice=normalizeSave(migrated);
ok(gemStorageQuantity(twice,gemId)===5,'Loading an already migrated save must not duplicate gems');

const excessId='gem:stat_might:g5';
const crowded={...start,account:{...start.account,gemPouch:{capacity:30,stacks:filler}},inventory:{...start.inventory,stacks:[{itemId:excessId,quantity:2}]}};
const preserved=migrateGemPouch(crowded);
ok(gemPouch(preserved).stacks.length===30&&gemStorageQuantity(preserved,excessId)===2,'Migration cannot discard gems when every pouch slot is taken');
let noGold=false;try{upgradeGemPouch({...start,character:{...start.character!,level:10,gold:0}})}catch{noGold=true}
ok(noGold,'Pouch upgrades must require the authored Gold price');

console.log('PASS: Gem Pouch migration, stacking, blocked claims, recovery and authoritative upgrades');
