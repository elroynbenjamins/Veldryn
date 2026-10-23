import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {claimOverflowToBank,createCharacter,depositToBank,equipItem,newGame,sellItem,stackItems,unequipItem} from '../src/core/game';
import {claimAllReadyEquipmentCrafts,claimEquipmentCraft,equipmentCraftingQueue,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {CRAFTED_EPIC_CHANCE,CRAFTED_MYTHIC_CHANCE,craftedGearRarity,craftedRarityStatMultiplier} from '../src/core/crafted-gear-rarity';
import {MAX_CRAFTED_GEAR_INSTANCES,TARGET_CRAFTED_GEAR_COPIES_PER_ITEM,bestCraftedInstanceForItem,craftedGearCopyCapacity,craftedGearInstances,craftedGearQualityRoll,craftClaimSubRoll,effectiveOwnedGearRarity,normalizeCraftedGearInstances,createCraftedGearInstance,craftedGearLegacyOwnershipAudit} from '../src/core/crafted-gear-instances';
import {enhancedGearStats,upgradeQuote} from '../src/core/equipment-enhancement';
import {itemDef} from '../src/content/items';
import {itemRarity} from '../src/core/item-rarity';
import {executeGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {craftedGearCanAutoSell,planCraftedGearRetention,compareCraftedGearRetentionPower} from '../src/core/crafted-gear-retention';
import {proposeCraftedGearSettlement} from '../src/core/crafted-gear-settlement';
import {auditCraftedGearOwnership,craftedGearCopiesAt,moveCraftedGearInstance,setCraftedGearInstanceLock} from '../src/core/crafted-gear-ownership';

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
const physicalAudit=craftedGearLegacyOwnershipAudit(state,recipe.output.itemId);
ok(physicalAudit.recordedCraftedCopies===2&&physicalAudit.physicalCopies===2,'Legacy ownership audit must reconcile two Forge copies with their two physical stacks');
ok(physicalAudit.verifiedForAutoSell===false,'Matching legacy stock counts must never authorize a sale by instance ID');
const orphanAudit=craftedGearLegacyOwnershipAudit({...state,inventory:{...state.inventory,stacks:state.inventory.stacks.filter(row=>row.itemId!==recipe.output.itemId)}},recipe.output.itemId);
ok(orphanAudit.minimumUnlocatedInstanceCount>=1,'Removing stack evidence must surface unlocated record risk rather than silently deleting ownership');
const otherCharacterId='account-alt',otherCharacterAudit=craftedGearLegacyOwnershipAudit({...state,otherCharacters:[{character:{...state.character!,id:otherCharacterId,equipment:{weapon:recipe.output.itemId}},inventory:{stacks:[],capacity:10},overflow:{stacks:[],expiresAtMs:null},activity:null,skills:state.skills,quests:state.quests,currentRegionId:'Greenfields'}]},recipe.output.itemId);
ok(otherCharacterAudit.equippedCopies>=1&&otherCharacterAudit.physicalCopies===physicalAudit.physicalCopies+1,'Legacy audit must count equipment worn by an alternate account character');
const accountWithExtraGear={...state,otherCharacters:[{character:{...state.character!,id:otherCharacterId,equipment:{weapon:recipe.output.itemId}},inventory:{stacks:[],capacity:10},overflow:{stacks:[],expiresAtMs:null},activity:null,skills:state.skills,quests:state.quests,currentRegionId:'Greenfields'}]};
ok(craftedGearCopyCapacity(accountWithExtraGear,recipe.output.itemId).count===3,'Seven-copy projection must count legacy physical gear not yet linked to a Forge instance');
ok(craftedGearCopyCapacity(accountWithExtraGear,recipe.output.itemId).verified===false,'Legacy stock-count agreement must not be mistaken for verified item identity');


ok(new Set(craftedGearInstances(state).map(row=>row.id)).size===2,'Duplicate crafted copies need distinct instance IDs');

const legacyLinkAudit=auditCraftedGearOwnership(state);
ok(legacyLinkAudit.unlocatedInstanceIds.length===2&&!legacyLinkAudit.consistent,'Legacy untagged Forge copies must remain unverified, never guessed');
ok(legacyLinkAudit.unmarkedPhysicalCopies===2,'Untagged physical copies of an owned crafted item must remain visible in the migration audit');
const ownedIds=craftedGearInstances(state).map(row=>row.id);
let taggedIndex=0;
const taggedState={...state,inventory:{...state.inventory,stacks:state.inventory.stacks.map(row=>
  row.itemId===recipe.output.itemId?{...row,instanceId:ownedIds[taggedIndex++]}:row)}};
const linkedAudit=auditCraftedGearOwnership(taggedState);
ok(linkedAudit.consistent&&linkedAudit.linked.length===2,'Explicit instance markers should verify exactly two physical Forge copies');
const equippedByCommand=executeGameCommand(taggedState,{type:'gear_equip',args:{instanceId:ownedIds[0]}},1200);
ok(equippedByCommand.state.character?.equipmentInstanceIds?.[itemDef(recipe.output.itemId).slot!]===ownedIds[0],'Validated game command must equip the selected exact-copy receipt');
ok(auditCraftedGearOwnership(equippedByCommand.state).consistent,'Equipped exact-copy command must preserve ownership audit consistency');
let equippedSaleDenied=false;try{executeGameCommand(equippedByCommand.state,{type:'gear_sell',args:{instanceId:ownedIds[0]}},1201)}catch(error){equippedSaleDenied=error instanceof Error&&error.message.includes('Unequip')}
ok(equippedSaleDenied,'An equipped exact gear copy must never be sold without unequipping');
const unequippedByCommand=executeGameCommand(equippedByCommand.state,{type:'gear_unequip',args:{instanceId:ownedIds[0]}},1202);
ok(auditCraftedGearOwnership(unequippedByCommand.state).consistent&&
  unequippedByCommand.state.inventory.stacks.some(row=>row.instanceId===ownedIds[0]),'Validated unequip must restore the identical instance to Inventory');
const lockedByCommand=executeGameCommand(unequippedByCommand.state,{type:'gear_lock',args:{instanceId:ownedIds[0],locked:true}},1203);
let lockedSaleDenied=false;try{executeGameCommand(lockedByCommand.state,{type:'gear_sell',args:{instanceId:ownedIds[0]}},1204)}catch(error){lockedSaleDenied=error instanceof Error&&error.message.includes('locked')}
ok(lockedSaleDenied,'Server command must refuse to sell a locked individual copy');
const movedByCommand=executeGameCommand(unequippedByCommand.state,{type:'gear_move',args:{instanceId:ownedIds[0],to:'bank'}},1205);
ok(movedByCommand.state.bank.stacks.some(row=>row.instanceId===ownedIds[0]),'Validated exact bank command should retain the original instance ID');
const beforeBankGold=movedByCommand.state.bank.gold??0;
const soldByCommand=executeGameCommand(movedByCommand.state,{type:'gear_sell',args:{instanceId:ownedIds[0]}},1206);
ok((soldByCommand.state.bank.gold??0)-beforeBankGold===itemDef(recipe.output.itemId).value,'Selling a specified Bank copy must credit exactly one vendor reward to Bank');
ok(craftedGearInstances(soldByCommand.state).every(row=>row.id!==ownedIds[0])&&auditCraftedGearOwnership(soldByCommand.state).consistent,'Exact-copy sale must remove physical and unique records together without touching other copies');
let replayedSaleDenied=false;try{executeGameCommand(soldByCommand.state,{type:'gear_sell',args:{instanceId:ownedIds[0]}},1207)}catch{replayedSaleDenied=true}
ok(replayedSaleDenied,'Repeated exact-item sale must not credit Gold again');

const extraLegacyCopy={...taggedState,bank:{...taggedState.bank,stacks:[...taggedState.bank.stacks,{itemId:recipe.output.itemId,quantity:1}]}};
ok(auditCraftedGearOwnership(extraLegacyCopy).unmarkedPhysicalCopies===1&&!auditCraftedGearOwnership(extraLegacyCopy).consistent,'An additional unmarked physical copy must prevent an exact-ownership all-clear');
ok(craftedGearCopiesAt(taggedState,recipe.output.itemId,'inventory').length===2,'Copy selection must use exact inventory instance markers');
const firstCopy=ownedIds[0],firstGold=taggedState.character!.gold;
const bankTransfer=moveCraftedGearInstance(taggedState,firstCopy,'bank');
ok(bankTransfer.bank.stacks.some(row=>row.instanceId===firstCopy)&&
  !bankTransfer.inventory.stacks.some(row=>row.instanceId===firstCopy),'Exact transfer must remove and re-add only the selected copy');
ok(auditCraftedGearOwnership(bankTransfer).consistent,'Bank transfer must not orphan or duplicate Forge identity');
ok(bankTransfer.character!.gold===firstGold,'Inventory-to-Bank equipment transfer must not create or spend Gold');
const backTransfer=moveCraftedGearInstance(bankTransfer,firstCopy,'inventory');
ok(auditCraftedGearOwnership(backTransfer).consistent&&
  backTransfer.inventory.stacks.filter(row=>row.instanceId===firstCopy).length===1,'Bank return must restore the original instance ID');
const lockedOnce=setCraftedGearInstanceLock(taggedState,firstCopy,true);
ok(craftedGearInstances(lockedOnce).find(row=>row.id===firstCopy)?.locked===true,'Lock command must protect only the selected physical copy');
ok(craftedGearInstances(lockedOnce).find(row=>row.id===ownedIds[1])?.locked!==true,'Locking a copy must not lock every item of its base type');
ok(normalizeSave(lockedOnce).account.craftedGearInstances?.find(row=>row.id===firstCopy)?.locked===true,'Save migration must preserve per-copy protection');
const unlockedOnce=setCraftedGearInstanceLock(lockedOnce,firstCopy,false);
ok(craftedGearInstances(unlockedOnce).find(row=>row.id===firstCopy)?.locked===false,'Unlock should be reversible and exact');
let legacyLockDenied=false;try{setCraftedGearInstanceLock(state,firstCopy,true)}catch(error){legacyLockDenied=error instanceof Error&&error.message.includes('not verified')}
ok(legacyLockDenied,'Never allow a per-copy lock action against an unlocated legacy receipt');

ok(backTransfer.inventory.stacks.filter(row=>row.itemId===recipe.output.itemId).length===2,'Exact transfer must preserve duplicate copies of the same item definition');

const composed=stackItems([{itemId:recipe.output.itemId,quantity:1,instanceId:firstCopy}], [{itemId:'TRAVEL_RATION',quantity:2},{itemId:'TRAVEL_RATION',quantity:3}]);
ok(composed.find(row=>row.instanceId===firstCopy)?.quantity===1&&
  composed.find(row=>row.itemId==='TRAVEL_RATION')?.quantity===5,'Stack aggregation must retain unique copy receipts while combining ordinary resources');
let duplicateMergeDenied=false;try{stackItems([{itemId:recipe.output.itemId,quantity:1,instanceId:firstCopy}],[{itemId:recipe.output.itemId,quantity:1,instanceId:firstCopy}])}catch(error){duplicateMergeDenied=error instanceof Error&&error.message.includes('Duplicate')}
ok(duplicateMergeDenied,'Stack aggregation must reject duplicated physical equipment identity');
let genericSaleDenied=false;try{sellItem(taggedState,recipe.output.itemId,1)}catch(error){genericSaleDenied=error instanceof Error&&error.message.includes('individual equipment copy')}
ok(genericSaleDenied,'Legacy item-type selling must not silently sell a uniquely identified forged copy');
let genericDepositDenied=false;try{depositToBank(taggedState,recipe.output.itemId,1)}catch(error){genericDepositDenied=error instanceof Error&&error.message.includes('individual equipment copy')}
ok(genericDepositDenied,'Legacy item-type Bank transfers must not strip the copy identity');

const craftedSlot=itemDef(recipe.output.itemId).slot!;
const equippedTagged={...taggedState,character:{...taggedState.character!,equipment:{...taggedState.character!.equipment,[craftedSlot]:recipe.output.itemId},equipmentInstanceIds:{[craftedSlot]:firstCopy}}};
let legacyUnequipDenied=false;try{unequipItem(equippedTagged,craftedSlot)}catch(error){legacyUnequipDenied=error instanceof Error&&error.message.includes('exact equipped copy')}
ok(legacyUnequipDenied,'Legacy unequip must reject an instance-bound slot until exact-copy movement is available');
let legacySwapDenied=false;try{equipItem(equippedTagged,recipe.output.itemId)}catch(error){legacySwapDenied=error instanceof Error&&error.message.includes('exact equipped copy')}
ok(legacySwapDenied,'Legacy item-type equip must never silently overwrite a bound instance ID');

const toOverflow={...bankTransfer,
  bank:{...bankTransfer.bank,stacks:bankTransfer.bank.stacks.filter(row=>row.instanceId!==firstCopy)},
  overflow:{stacks:[{itemId:recipe.output.itemId,quantity:1,instanceId:firstCopy}],expiresAtMs:123456}};
const collectedOverflow=claimOverflowToBank(toOverflow);
ok(collectedOverflow.bank.stacks.some(row=>row.instanceId===firstCopy)&&
  collectedOverflow.overflow.stacks.length===0,'Overflow-to-Bank routing must preserve an individual gear receipt');

const duplicateMarkerState={...taggedState,bank:{...taggedState.bank,stacks:[...taggedState.bank.stacks,{itemId:recipe.output.itemId,quantity:1,instanceId:firstCopy}]}};
ok(auditCraftedGearOwnership(duplicateMarkerState).problems.some(message=>message.includes('Duplicate physical copy')),'Duplicate instance markers must be rejected');
let conflictBlocked=false;try{moveCraftedGearInstance(duplicateMarkerState,firstCopy,'bank')}catch(error){conflictBlocked=error instanceof Error&&error.message.includes('identity conflict')}
ok(conflictBlocked,'Moving equipment with a duplicate physical copy marker must fail closed');
const mismatchState={...taggedState,inventory:{...taggedState.inventory,stacks:taggedState.inventory.stacks.map(row=>row.instanceId===firstCopy?{...row,itemId:'TRAVEL_RATION'}:row)}};
ok(auditCraftedGearOwnership(mismatchState).problems.some(message=>message.includes('definition mismatch')),'A forged instance must never be assigned to a different base item');

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
  location:'inventory' as const,holderCharacterId:state.character!.id,ownershipVerified:true,protectionsVerified:true,locked:false,favorite:false,savedLoadout:false,
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
const protectedUpgrade=planCraftedGearRetention(partlyProtected,{...incomingLow,quality:15},'keep_best_seven');
ok(protectedUpgrade.action==='manual_review','A new roll stronger than the weakest protected copy must not be auto-sold just because weaker eligible copies do not exist');
const allProtected=sevenCopies.map(entry=>({...entry,locked:true}));
const blockedDecision=planCraftedGearRetention(allProtected,incomingHigh,'keep_best_seven');
ok(blockedDecision.action==='manual_review'&&blockedDecision.reason==='no_eligible_copy','Do not sell valuable new results if all existing copies are protected');
ok(!craftedGearCanAutoSell({...sevenCopies[0],ownershipVerified:undefined}),'Ownership must be independently verified before auto-sale');
ok(!craftedGearCanAutoSell({...sevenCopies[0],protectionsVerified:undefined}),'Missing protection verification must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],locked:undefined}),'Missing lock state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],favorite:undefined}),'Missing favorite state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],savedLoadout:undefined}),'Missing loadout state must fail closed');
ok(!craftedGearCanAutoSell({...sevenCopies[0],holderCharacterId:undefined}),'Unknown current inventory holder must prevent sale and misrouted Gold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],location:'equipped'}),'Equipped copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],location:'unknown'}),'Legacy ambiguous storage must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],savedLoadout:true}),'Saved loadout copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],instance:{...sevenCopies[0].instance,locked:true}}),'Persisted per-instance locks must override an otherwise eligible auto-sale snapshot');
ok(!craftedGearCanAutoSell({...sevenCopies[0],favorite:true}),'Favorite copies must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],instance:{...sevenCopies[0].instance,enhancement:{...sevenCopies[0].instance.enhancement,rank:1}}}),'Enhanced equipment must never be auto-sold');
ok(!craftedGearCanAutoSell({...sevenCopies[0],instance:{...sevenCopies[0].instance,enhancement:{...sevenCopies[0].instance.enhancement,effectGemId:'SWIFT_SIGIL'}}}),'Socketed equipment must never be auto-sold');
ok(planCraftedGearRetention([...sevenCopies,sevenCopies[0]],incomingHigh,'keep_best_seven').action==='manual_review','Pre-existing over-limit records must require manual review instead of eviction');
ok(planCraftedGearRetention(sevenCopies.map((entry,i)=>i===0?{...entry,instance:{...entry.instance,quality:undefined}}:entry),incomingHigh,'keep_best_seven').action==='manual_review','Legacy unrolled quality must not be silently ranked or deleted');
ok(normalizeSave({...state,account:{...state.account,craftedGearAutoSellMode:'keep_best_seven'}} as any).account.craftedGearAutoSellMode==='keep_best_seven','Explicit Keep Best Seven preference must survive save normalization');
ok(normalizeSave({...state,account:{...state.account,craftedGearAutoSellMode:undefined}} as any).account.craftedGearAutoSellMode==='off','Older saves must default to auto-sell off');

const settlementInput={existing:sevenCopies,incoming:incomingHigh,incomingStorage:'inventory' as const,incomingHolderCharacterId:state.character!.id,mode:'keep_best_seven' as const,committedReceiptKeys:[] as string[]};
const proposedUpgrade=proposeCraftedGearSettlement(settlementInput);
ok(proposedUpgrade.status==='ready'&&proposedUpgrade.instances.length===7,'Prepared settlement must preserve seven copies without mutating state');
ok(proposedUpgrade.status==='ready'&&proposedUpgrade.receipt.soldInstanceId==='quality-0'&&proposedUpgrade.receipt.action==='sell_existing','Prepared Forge proposal must select the exact weakest instance');
ok(proposedUpgrade.status==='ready'&&proposedUpgrade.receipt.credit?.destination==='character'&&proposedUpgrade.receipt.credit?.characterId===state.character!.id,'Proposed vendor Gold must target the current verified item holder');
ok(sevenCopies[0].instance.id==='quality-0'&&sevenCopies.length===7,'Preparing settlement must not mutate originals');
const bankProposal=proposeCraftedGearSettlement({...settlementInput,existing:sevenCopies.map((entry,i)=>i===0?{...entry,location:'bank' as const,holderCharacterId:undefined}:entry)});
ok(bankProposal.status==='ready'&&bankProposal.receipt.credit?.destination==='bank','Selling a Bank-owned exact instance must credit Bank Gold');
const incomingBankProposal=proposeCraftedGearSettlement({...settlementInput,incoming:incomingLow,incomingStorage:'bank',incomingHolderCharacterId:undefined});
ok(incomingBankProposal.status==='ready'&&incomingBankProposal.receipt.action==='sell_incoming'&&incomingBankProposal.receipt.credit?.destination==='bank','A weak freshly forged Bank-bound copy should sell itself into Bank Gold');
const manualProposal=proposeCraftedGearSettlement({...settlementInput,mode:'off'});
ok(manualProposal.status==='blocked'&&manualProposal.instances.length===7,'Auto-sell off must prepare no disposal and retain original ownership');
const unverifiedProposal=proposeCraftedGearSettlement({...settlementInput,existing:sevenCopies.map(entry=>({...entry,ownershipVerified:undefined}))});
ok(unverifiedProposal.status==='blocked','Missing ownership proof must block an existing-copy replacement proposal');
let duplicateReceiptDenied=false;
try{proposeCraftedGearSettlement({...settlementInput,committedReceiptKeys:[incomingHigh.sourceReceiptKey]})}
catch(error){duplicateReceiptDenied=error instanceof Error&&error.message==='Forge receipt already settled'}
ok(duplicateReceiptDenied,'Proposed Forge replacement must reject already settled receipts to prevent double Gold');
let absentHolderDenied=false;
try{proposeCraftedGearSettlement({...settlementInput,incomingHolderCharacterId:undefined})}
catch(error){absentHolderDenied=error instanceof Error&&error.message.includes('incoming inventory owner')}
ok(absentHolderDenied,'Proposed seller must not guess the incoming inventory Gold recipient');


console.log('PASS: Forge rarity, unique quality, seven-copy policy, opt-in retention plan and no-loss bounds are covered');
