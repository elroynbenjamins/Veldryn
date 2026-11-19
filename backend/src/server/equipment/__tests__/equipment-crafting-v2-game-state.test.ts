import assert from 'node:assert/strict';
import {newGame,createCharacter} from '../../../../../apps/mobile/src/core/game';
import {switchAccountCharacter} from '../../../../../apps/mobile/src/core/account-actions';
import {ITEMS} from '../../../../../apps/mobile/src/content/items';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {runEquipmentV2InGameState,simulateEquipmentV2InGameState,
 type V2HiddenGameMetadata,type V2HiddenGameInput} from '../equipment-crafting-v2-game-state';

const recipe=V2_SERVER_RECIPES.find(r=>r.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
const now=2_000_000_000_000;
const accountId='account-hidden-2';
function stateFixture(){
 const s=createCharacter(newGame(now),'IRONWARDEN');
 assert.ok(s.character);
 s.character.level=20;
 s.character.gold=15_000;
 s.inventory.stacks=recipe.inputs.map(row=>({
  itemId:row.itemId,quantity:Math.max(1,Math.ceil(row.quantity/2)),
 }));
 s.bank.stacks=recipe.inputs.map(row=>({
  itemId:row.itemId,quantity:Math.floor(row.quantity/2),
 })).filter(row=>row.quantity>0);
 s.account.equipmentCraftingQueue=[];
 s.account.craftedGearInstances=[];
 return s;
}
const base=stateFixture(),active=base.character!.id;
const snapshot=JSON.stringify(base);
let randomIndex=0;
const randomIds=['new-forge-job-1','new-exact-copy-1'];
const makeInput=(state:typeof base,command:V2HiddenGameInput['command'],onlineVersion=19,at=now):V2HiddenGameInput=>({
 state,accountId,onlineVersion,onlineCharacterId:state.character?.id??null,
 authoritativeWalletGold:state.character?.gold??null,command,nowMs:at,
 randomId:()=>randomIds[randomIndex++]??'fallback-'+randomIndex,
 randomInt:()=>0,
});
const start={kind:'start' as const,requestId:'start-hidden-0001',expectedVersion:19,recipeId:recipe.id};
const begun=simulateEquipmentV2InGameState(makeInput(base,start));
assert.equal(begun.replayed,false);
assert.equal(JSON.stringify(base),snapshot,'One-commit rehearsal cannot mutate loaded authoritative state');
assert.equal(begun.state.version,base.version,'Do not conflate GameState schema and online CAS version');
assert.equal(begun.state.character!.gold,15_000-recipe.gold,'Gold is charged in the EXISTING owner wallet');
assert.equal(begun.state.bank.gold,base.bank.gold,'Shared Bank Gold remains untouched');
assert.equal(begun.response.kind,'started');
assert.ok(begun.plan.createdJob);
const ledger=begun.state.account.equipmentV2Hidden as V2HiddenGameMetadata;
assert.equal(ledger.jobs.length,1);
assert.equal(ledger.items.length,0,'Start must not mint or deliver an item');
assert.equal(ledger.receipts.length,1);
assert.equal(ledger.skillAwards.length,0);
assert.equal(begun.state.account.equipmentCraftingQueue?.length,0,
 'The original Forge queue and all V33 jobs stay untouched');
assert.deepEqual(begun.state.account.craftedGearInstances,[],
 'Legacy crafted-gear records stay untouched');
const getAmount=(stacks:typeof base.inventory.stacks,id:string)=>stacks.filter(s=>s.itemId===id).reduce((n,s)=>n+s.quantity,0);
for(const ingredient of recipe.inputs){
 assert.equal(
  getAmount(base.inventory.stacks,ingredient.itemId)-getAmount(begun.state.inventory.stacks,ingredient.itemId)
   +getAmount(base.bank.stacks,ingredient.itemId)-getAmount(begun.state.bank.stacks,ingredient.itemId),
  ingredient.quantity,'Actual inventory and shared Bank debits must equal the pinned recipe');
}
const replay=simulateEquipmentV2InGameState(makeInput(begun.state,start,20));
assert.equal(replay.replayed,true,'Same key can replay after the original game version advanced');
assert.equal(replay.state,begun.state,'Replay is read-only and does not insert another receipt');
assert.equal(replay.response.kind,'started');
assert.throws(()=>simulateEquipmentV2InGameState(makeInput(begun.state,{
 ...start,requestId:'start-hidden-0002',expectedVersion:19,
},20)),/stale_game_version/);

const jobId=ledger.jobs[0].id,finishes=ledger.jobs[0].finishesAtMs;
const claim={kind:'claim' as const,requestId:'claim-hidden-0001',expectedVersion:20,jobId};
assert.throws(()=>simulateEquipmentV2InGameState(makeInput(begun.state,claim,20,finishes-1)),
 /job_not_finished/,'Craft cannot claim before its authoritative completed time');

// Character switching retains account-wide Forge jobs and receipts; rewards
// belong to the original crafter, not the currently active character.
const alt=createCharacter(newGame(now),'WAYFINDER');
assert.ok(alt.character);
alt.character.id='other-hero-2';
alt.character.level=20;
alt.character.gold=8_000;
const withAlt=structuredClone(begun.state);
withAlt.otherCharacters=[{
 character:alt.character,inventory:alt.inventory,overflow:alt.overflow,
 activity:alt.activity,skills:alt.skills,quests:alt.quests,
 currentRegionId:alt.currentRegionId,
 unlockedMonsterIds:alt.unlockedMonsterIds,
 exploredRouteIds:alt.exploredRouteIds,
 defeatedBossIds:alt.defeatedBossIds,
}];
const switched=switchAccountCharacter(withAlt,'other-hero-2',finishes);
assert.equal(switched.character!.id,'other-hero-2');
const oldOwner=switched.otherCharacters!.find(row=>row.character.id===active)!;
const oldSkillXp=oldOwner.skills.find(s=>s.skillId===recipe.profession)!.xp;
const claimed=simulateEquipmentV2InGameState(makeInput(switched,claim,20,finishes));
const claimedLedger=claimed.state.account.equipmentV2Hidden as V2HiddenGameMetadata;
assert.equal(claimed.state.character?.gold,8000,'Claim has no new Gold cost');
assert.equal(claimedLedger.items.length,1,'Exactly one exact-copy item is recorded');
assert.equal(claimedLedger.skillAwards.length,1,'Exactly one owner profession award is recorded');
assert.equal(claimedLedger.jobs[0].status,'claimed');
assert.equal(claimedLedger.items[0].ownerCharacterId,active);
assert.equal(claimedLedger.items[0].exactItem.pieceId,recipe.pieceId);
assert.equal(claimedLedger.items[0].exactItem.quality,0);
assert.equal(claimedLedger.items[0].exactItem.rarity,'mythic');
assert.equal(claimed.state.otherCharacters!.find(row=>row.character.id===active)!
 .skills.find(s=>s.skillId===recipe.profession)!.xp,oldSkillXp+recipe.xp);
assert.equal(claimedLedger.items[0].jobId,jobId);
assert.equal(claimed.delivery?.instanceId,claimedLedger.items[0].id);
assert.equal(claimed.delivery?.ownerCharacterId,active,
 'The delivery preflight must target the original crafter, not the currently selected hero');
assert.equal(claimed.delivery?.requiresV2CatalogCompatibility,true);
assert.equal(claimed.delivery?.physicallyDelivered,false,
 'The public gear catalogue must never receive unreleased EQ2 item IDs');
assert.ok(['inventory','equipment_pouch','deferred'].includes(claimed.delivery?.suggestedLocation??''));
const storageFull=structuredClone(switched);
const originalOwner=storageFull.otherCharacters!.find(row=>row.character.id===active)!;
originalOwner.inventory.capacity=originalOwner.inventory.stacks.length;
originalOwner.character.equipmentPouch={stacks:Array.from({length:30},()=>({itemId:'basic_sword',quantity:1})),capacity:30};
const fullClaim=simulateEquipmentV2InGameState(makeInput(storageFull,{
 ...claim,requestId:'claim-full-0001',
},20,finishes));
assert.equal(fullClaim.delivery?.suggestedLocation,'deferred');
assert.equal(fullClaim.delivery?.reason,'storage_full');
assert.equal(fullClaim.delivery?.physicallyDelivered,false);
assert.equal((fullClaim.state.account.equipmentV2Hidden as V2HiddenGameMetadata).items.length,1,
 'A full pouch/Inventory cannot destroy an immutable finished Forge copy');

assert.ok(!claimed.state.inventory.stacks.some(x=>x.itemId.startsWith('EQ2_')),
 'New items remain quarantined in hidden metadata until real gear custody is ready');
const repeatedClaim=simulateEquipmentV2InGameState(makeInput(claimed.state,claim,21,finishes+200));
assert.equal(repeatedClaim.replayed,true);
assert.equal(repeatedClaim.state,claimed.state);
assert.equal((repeatedClaim.state.account.equipmentV2Hidden as V2HiddenGameMetadata).items.length,1);
assert.throws(()=>runEquipmentV2InGameState(makeInput(base,start)),
 /equipment_crafting_v2_not_released/,'A normal runtime may not bypass the disabled server gate');

const legacySafe=stateFixture();
const oldGear=ITEMS.find(item=>item.type==='gear'&&!item.id.startsWith('EQ2_'));
assert.ok(oldGear);
legacySafe.account.craftedGearInstances=[{
 id:'legacy-gemmed-copy',itemId:oldGear.id,ownerCharacterId:legacySafe.character!.id,
 rarity:'rare',quality:91,locked:true,acquireSource:'craft',
 sourceReceiptKey:'pre-v2-forge-claim',createdAtMs:now-10000,
 enhancement:{rank:3,failures:0,statGemId:'old-stat-gem',gemIds:['old-stat-gem']},
} as never];
legacySafe.inventory.stacks.push({itemId:oldGear.id,instanceId:'legacy-gemmed-copy',quantity:1});
const preserved=JSON.stringify(legacySafe.account.craftedGearInstances);
const stagedWithOldGear=simulateEquipmentV2InGameState(makeInput(legacySafe,{
 ...start,requestId:'legacy-safe-0001',
}));
assert.equal(JSON.stringify(stagedWithOldGear.state.account.craftedGearInstances),preserved,
 'Verified legacy rarities, quality, locks, permanent gems, upgrades and receipts must remain untouched');
assert.ok(stagedWithOldGear.state.inventory.stacks.some(row=>row.instanceId==='legacy-gemmed-copy'),
 'A validated old physical item must remain in its original location');
assert.equal((stagedWithOldGear.state.account.equipmentV2Hidden as V2HiddenGameMetadata).jobs.length,1,
 'Legacy gear alone does not block a hidden new Forge rehearsal once custody is verified');

const blockedLegacy=stateFixture();
blockedLegacy.account.equipmentCraftingQueue=[{id:'old-forge',recipeId:'legacy',ownerCharacterId:active} as never];
assert.throws(()=>simulateEquipmentV2InGameState(makeInput(blockedLegacy,{
 ...start,requestId:'legacy-block-1',
})),/v2_gameplay_not_ready:.*legacy_forge_jobs_present/,
 'No parallel Forge lanes may be created while old jobs remain in queue');
console.log('PASS: hidden V2 GameState one-commit rehearsal, original wallets/Bank, cross-character claim, no public item mint and fail-closed gate');
