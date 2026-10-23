import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {claimAllReadyEquipmentCrafts,claimEquipmentCraft,equipmentCraftingQueue,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {CRAFTED_EPIC_CHANCE,CRAFTED_MYTHIC_CHANCE,craftedGearRarity,craftedRarityStatMultiplier} from '../src/core/crafted-gear-rarity';
import {MAX_CRAFTED_GEAR_INSTANCES,TARGET_CRAFTED_GEAR_COPIES_PER_ITEM,bestCraftedInstanceForItem,craftedGearCopyCapacity,craftedGearInstances,craftedGearQualityRoll,craftClaimSubRoll,effectiveOwnedGearRarity,normalizeCraftedGearInstances,createCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {enhancedGearStats,upgradeQuote} from '../src/core/equipment-enhancement';
import {itemDef} from '../src/content/items';
import {itemRarity} from '../src/core/item-rarity';
import {executeGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {craftedGearCanAutoSell,planCraftedGearRetention,compareCraftedGearRetentionPower} from '../src/core/crafted-gear-retention';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(CRAFTED_EPIC_CHANCE===.006,'Forge Epic quality proc must be exactly 0.60%');
ok(CRAFTED_MYTHIC_CHANCE===.001,'Forge Mythic quality proc must be exactly 0.10%');

const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T1P_001')!;
const base=itemRarity(itemDef(recipe.output.itemId));
ok(base==='common','T1P_001 must remain a useful Common baseline fixture');
ok(craftedGearRarity(recipe.output.itemId,0)==='mythic','Roll 0 should proc Mythic');
ok(craftedGearRarity(recipe.output.itemId,.000999)==='mythic','Mythic range should cover [0,0.001)');
ok(craftedGearRarity(recipe.output.itemId,.001)==='epic','Epic range must begin at 0.001');
ok(craftedGearRarity(recipe.output.itemId,.006999)==='epic','Epic range should extend through the combined 0.70% quality-proc window');
ok(craftedGearRarity(recipe.output.itemId,.007)==='common','Non-proc T1 craft should preserve authored Common rarity');

const t9=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T9')!;
ok(itemRarity(itemDef(t9.output.itemId))==='mythic','T9 authored rarity should be Mythic');
ok(craftedGearRarity(t9.output.itemId,.5)==='mythic','Missed quality roll must never downgrade an authored Mythic item');
ok(craftedGearRarity(t9.output.itemId,.002)==='mythic','Epic proc must not downgrade authored Mythic');

let state=createCharacter(newGame(0),recipe.classId,'Instance Crafter','male');
state={...state,character:{...state.character!,level:recipe.characterLevel,gold:500000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:Math.max(10,recipe.level),xp:50000}:row),inventory:{...state.inventory,capacity:80,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*4}))},bank:{...state.bank,capacity:200,stacks:[]}};
const beforeStats=enhancedGearStats(state,recipe.output.itemId),beforeQuote=upgradeQuote(state,recipe.output.itemId);

let started=startEquipmentCraft(state,recipe.id,1000);state=started.state;
let job=equipmentCraftingQueue(state)[0];
const epicClaim=claimEquipmentCraft(state,job.id,job.completesAtMs,.002);
state=epicClaim.state;
ok(epicClaim.result.rarity==='epic'&&epicClaim.result.qualityProc,'Trusted .002 claim roll should produce an Epic quality proc');
ok(craftedGearInstances(state).length===1,'Claimed Forge gear must create a persisted instance');
ok(craftedGearInstances(state)[0].id.includes(job.id),'Crafted instance identity must derive from its authoritative Forge receipt');
ok(epicClaim.result.quality!==undefined&&epicClaim.result.quality>=1&&epicClaim.result.quality<=100,'Crafted equipment must persist a bounded 1–100 quality roll');
ok(epicClaim.result.quality===craftedGearQualityRoll(.002,job.id),'Quality must be deterministic from the trusted roll and job ID');
ok(craftedGearQualityRoll(.123456,'job-a')===craftedGearQualityRoll(.123456,'job-a'),'Retry must retain the same quality');
ok(craftedGearInstances(state)[0].enhancement.rank===0&&craftedGearInstances(state)[0].enhancement.gemIds.length===0,'Fresh crafted instance must start unenhanced and unsocketed');
ok(effectiveOwnedGearRarity(state,recipe.output.itemId)==='epic','Best owned crafted copy should become effective rarity');
ok(craftedRarityStatMultiplier(recipe.output.itemId,'epic')>1,'Epic T1 proc must provide a real stat multiplier');
const epicStats=enhancedGearStats(state,recipe.output.itemId),epicQuote=upgradeQuote(state,recipe.output.itemId);
ok(epicStats.attack>beforeStats.attack||epicStats.defense>beforeStats.defense||epicStats.hp>beforeStats.hp,'Epic crafted copy must improve effective gear stats');
ok(epicQuote.gold>beforeQuote.gold,'Higher forged rarity must increase upgrade Gold cost');

started=startEquipmentCraft(state,recipe.id,job.completesAtMs+1);state=started.state;
job=equipmentCraftingQueue(state).find(row=>row.recipeId===recipe.id)!;
const commonClaim=claimEquipmentCraft(state,job.id,job.completesAtMs,.5);
state=commonClaim.state;
ok(commonClaim.result.rarity==='common','Second non-proc craft should preserve Common rarity');
ok(commonClaim.result.duplicateCount===1,'Second crafted copy should report one duplicate copy');
ok(craftedGearInstances(state).length===2,'Duplicate gear crafts must remain distinct owned instances');
ok(craftedGearCopyCapacity(state,recipe.output.itemId).count===2&&craftedGearCopyCapacity(state,recipe.output.itemId).remaining===TARGET_CRAFTED_GEAR_COPIES_PER_ITEM-2,'Per-item copy capacity must count account owned copies');
ok(new Set(craftedGearInstances(state).map(row=>row.id)).size===2,'Duplicate crafted copies need distinct instance IDs');
ok(bestCraftedInstanceForItem(state,recipe.output.itemId)?.rarity==='epic','Lower-rarity duplicate must not displace the better owned copy');
ok(effectiveOwnedGearRarity(state,recipe.output.itemId)==='epic','Best-copy compatibility layer must retain Epic effective rarity');

const subA=craftClaimSubRoll(.123456,'job-a'),subB=craftClaimSubRoll(.123456,'job-b');
ok(subA>=0&&subA<1&&subB>=0&&subB<1&&subA!==subB,'Claim All must derive stable independent per-job sub-rolls');

let online=createCharacter(newGame(0),recipe.classId,'Online Crafter','male');
online={...online,character:{...online.character!,level:recipe.characterLevel,gold:500000},skills:online.skills.map(row=>row.skillId==='smithing'?{...row,level:10,xp:50000}:row),inventory:{...online.inventory,stacks:recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity}))}};
const commandStart=executeGameCommand(online,{type:'craft',args:{id:recipe.id}},2000,{randomRoll:.5});
const onlineJob=equipmentCraftingQueue(commandStart.state)[0];
let trustedRequired=false;try{executeGameCommand(commandStart.state,{type:'craft_claim',args:{id:onlineJob.id}},onlineJob.completesAtMs)}catch(error){trustedRequired=error instanceof Error&&error.message==='trusted_random_required'}
ok(trustedRequired,'Authoritative Forge claim must reject settlement without trusted randomness');
const commandClaim=executeGameCommand(commandStart.state,{type:'craft_claim',args:{id:onlineJob.id}},onlineJob.completesAtMs,{randomRoll:.0005});
ok(commandClaim.message?.startsWith('MYTHIC '),'Authoritative claim should expose Mythic result in player-facing message');
ok(craftedGearInstances(commandClaim.state)[0]?.rarity==='mythic','Authoritative trusted roll must persist Mythic instance rarity');

const normalized=normalizeSave({...state,version:6} as any);
ok(normalized.account.craftedGearInstances?.length===2,'Save normalization must preserve crafted gear instances');
ok(normalized.account.craftedGearInstances?.some(row=>row.rarity==='epic'),'Save normalization must preserve crafted instance rarity');
ok(normalized.account.craftedGearInstances?.every(row=>row.quality!==undefined),'Save normalization must preserve deterministic crafted quality');
const oversized=Array.from({length:MAX_CRAFTED_GEAR_INSTANCES+1},(_,i)=>({...craftedGearInstances(state)[0],id:`oversized:${i}`,sourceReceiptKey:`oversized:${i}`}));
ok(normalizeCraftedGearInstances(oversized).length===oversized.length,'Legacy over-cap saves must never silently lose crafted instances during normalization');
let capacityError=false;
try{createCraftedGearInstance({...state,account:{...state.account,craftedGearInstances:oversized}},{itemId:recipe.output.itemId,ownerCharacterId:state.character!.id,jobId:'overflow',createdAtMs:99999,roll:.9})}
catch(error){capacityError=error instanceof Error&&error.message.includes('storage is full')}
ok(capacityError,'New crafting must fail rather than evicting an existing copy at the global safety boundary');
const fullQueueState={...commandStart.state,account:{...commandStart.state.account,craftedGearInstances:oversized}};
const beforeQueueIds=equipmentCraftingQueue(fullQueueState).map(row=>row.id);
const safelyBlocked=claimAllReadyEquipmentCrafts(fullQueueState,onlineJob.completesAtMs,.41);
ok(safelyBlocked.claimed.length===0&&safelyBlocked.blocked.length===1,'Mass claim must leave the full-cap equipment result blocked, not crash or auto-delete');
ok(equipmentCraftingQueue(safelyBlocked.state).map(row=>row.id).join(',')===beforeQueueIds.join(','),'A blocked Forge receipt must remain ready to claim after freeing space');
ok(craftedGearInstances(safelyBlocked.state).length===oversized.length,'Mass-claim storage failure must never evict equipment');

ok(TARGET_CRAFTED_GEAR_COPIES_PER_ITEM===7,'Players must be able to keep seven copies of each base equipment item');
const copyTemplate=craftedGearInstances(state)[0];
const sevenCopies=Array.from({length:7},(_,i)=>({
  instance:{...copyTemplate,id:`quality-${i}`,sourceReceiptKey:`quality-${i}`,rarity:'common' as const,quality:10+i*10},
  location:'inventory' as const,ownershipVerified:true,protectionsVerified:true,locked:false,favorite:false,savedLoadout:false,
}));
const incomingLow={...copyTemplate,id:'new-low',quality:1,rarity:'common' as const};
const incomingHigh={...copyTemplate,id:'new-high',quality:90,rarity:'epic' as const};
ok(planCraftedGearRetention(sevenCopies.slice(0,6),incomingHigh,'off').action==='keep','Copy limit should not affect crafts below seven, even when auto-sell is disabled');
ok(planCraftedGearRetention(sevenCopies.slice(0,6).map((entry,i)=>i===0?{...entry,instance:{...entry.instance,quality:undefined}}:entry),incomingHigh,'keep_best_seven').action==='keep','Legacy unrolled equipment must remain claimable while still below the copy limit');
ok(planCraftedGearRetention(sevenCopies,incomingHigh,'off').action==='manual_review','Mass craft auto-sell must be opt-in, never default');
const lowDecision=planCraftedGearRetention(sevenCopies,incomingLow,'keep_best_seven');
ok(lowDecision.action==='sell_incoming'&&lowDecision.instanceId==='new-low','A weaker new roll should sell itself and preserve all seven originals');
const highDecision=planCraftedGearRetention(sevenCopies,incomingHigh,'keep_best_seven');
ok(highDecision.action==='sell_existing'&&highDecision.instanceId==='quality-0','A better new roll should replace the weakest unprotected copy');
ok(compareCraftedGearRetentionPower(incomingHigh,sevenCopies[6].instance)>0,'Tier and quality comparator must prefer Epic over Common even when Common has higher quality');
const tieDecision=planCraftedGearRetention(sevenCopies,{...sevenCopies[0].instance,id:'equal-new'},'keep_best_seven');
ok(tieDecision.action==='sell_incoming','Equal-strength rolls must keep the older existing equipment');
const partlyProtected=sevenCopies.map((entry,i)=>({...entry,locked:i===0}));
const protectedDecision=planCraftedGearRetention(partlyProtected,incomingHigh,'keep_best_seven');
ok(protectedDecision.action==='sell_existing'&&protectedDecision.instanceId==='quality-1','Auto-sell must skip locked copies and target the next-lowest eligible item');
const allProtected=sevenCopies.map(entry=>({...entry,locked:true}));
const blockedDecision=planCraftedGearRetention(allProtected,incomingHigh,'keep_best_seven');
ok(blockedDecision.action==='manual_review'&&blockedDecision.reason==='no_eligible_copy','Do not sell valuable new results if all existing copies are protected');
ok(!craftedGearCanAutoSell({...sevenCopies[0],ownershipVerified:undefined}),'Ownership must be independently verified before auto-sale');
ok(!craftedGearCanAutoSell({...sevenCopies[0],protectionsVerified:undefined}),'Missing protection verification must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],locked:undefined}),'Missing lock state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],favorite:undefined}),'Missing favorite state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],savedLoadout:undefined}),'Missing loadout state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],location:'equipped'}),'Equipped copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],location:'unknown'}),'Legacy ambiguous storage must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],savedLoadout:true}),'Saved loadout copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],favorite:true}),'Favorite copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],instance:{...sevenCopies[0].instance,enhancement:{...sevenCopies[0].instance.enhancement,rank:1}}}),'Enhanced equipment must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],instance:{...sevenCopies[0].instance,enhancement:{...sevenCopies[0].instance.enhancement,effectGemId:'SWIFT_SIGIL'}}}),'Socketed equipment must never be auto-sold');
ok(planCraftedGearRetention([...sevenCopies,sevenCopies[0]],incomingHigh,'keep_best_seven').action==='manual_review','Pre-existing over-limit records must require manual review instead of eviction');
ok(planCraftedGearRetention(sevenCopies.map((entry,i)=>i===0?{...entry,instance:{...entry.instance,quality:undefined}}:entry),incomingHigh,'keep_best_seven').action==='manual_review','Legacy unrolled quality must not be silently ranked or deleted');
ok(normalizeSave({...state,account:{...state.account,craftedGearAutoSellMode:'keep_best_seven'}} as any).account.craftedGearAutoSellMode==='keep_best_seven','Explicit Keep Best Seven preference must survive save normalization');
ok(normalizeSave({...state,account:{...state.account,craftedGearAutoSellMode:undefined}} as any).account.craftedGearAutoSellMode==='off','Older saves must default to auto-sell off');

console.log('PASS: Forge rarity, unique quality, seven-copy policy, opt-in retention plan and no-loss bounds are covered');
