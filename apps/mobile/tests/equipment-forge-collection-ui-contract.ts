export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const panel=read('src/components/EquipmentCraftQueuePanel.tsx');
const collection=read('src/components/SmithingCollection.tsx');
const screen=read('src/screens/SkillsScreen.tsx');

const collectAt=panel.indexOf('readyJobs.length>0&&<View');
const activeAt=panel.indexOf('activeJobs.length>0&&<View');
const waitingAt=panel.indexOf('waitingJobs.length>0&&<View');
const settingsAt=panel.indexOf('accessibilityState={{expanded:showAutoSell}}');
const capacityAt=panel.indexOf('accessibilityState={{expanded:showUnlocks}}');
check(collectAt>0&&activeAt>collectAt&&waitingAt>activeAt&&settingsAt>waitingAt&&capacityAt>settingsAt,'Forge flow must prioritize collecting, then crafting, backlog, auto-sell and capacity');
check(panel.includes('readyJobs.length>1?<GameButton compact title={gt("Claim All")}'),'Bulk claim must be prominent beside ready items');
check(panel.includes('readyJobs.map(job=>')&&panel.includes('onClaim(job.id)'),'Individual claim must remain available');
check(panel.includes('showAutoSell?<View')&&panel.includes('state.account.craftedGearAutoSellMode'),'Auto-sell must be collapsed by default but retain existing protection toggle');
check(panel.includes("onMoveWaiting(job.id,'up')")&&panel.includes("onMoveWaiting(job.id,'down')"),'Existing backlog controls must remain intact');
check(collection.includes('queueOpen?<EquipmentCraftQueuePanel {...queueProps}/>:<>'),'Forge management must be separate from Smithing/Tailoring recipe selection');
check(collection.includes('equipmentCraftQueueModel(state,Date.now()).ready>0'),'Finished crafts must open directly into the collection flow');
check(collection.includes('ownedEquipmentDefinitionIds(state)'),'Ownership badges must recognize Equipment Pouch contents');
check(collection.includes('workingTowardItemSourceEntries(state,input.itemId)')&&collection.includes('props.onNavigate(source.destination)'),'Missing material tiles must route to a valid material source');
check(collection.indexOf('onCraft(recipe.id)')<collection.indexOf('status.inputs.map(input=>'),'Craft CTA must be visible before long material details');
check(screen.includes('<SmithingCollection state={state} skillId={initialSkill}'),'Smithing and Tailoring must continue sharing the same refined component');

// Nine tiers used to wrap into three rows of buttons above the set browser.
const tierMemory=read('src/core/equipment-tier-memory.ts');
check(collection.includes('<OptionPager options={tierOptions}')&&!collection.includes('s.tierOption'),'Equipment tiers must be one stepped row, not a wrapping grid of nine buttons');
check(collection.includes("meta:ids.filter(id=>owned.has(id)).length+'/'+ids.length"),'The tier step must carry how much of that tier is already owned');
check(collection.includes('rememberEquipmentTier(characterId,skillId,tier)')&&collection.includes('rememberedEquipmentTier(characterId,skillId)'),'A smith returning to the Forge must land on the tier they last browsed, not back at T1');
check(collection.includes('if(preferred||!sets.length||restoredFor.current===key)return;'),'A caller-requested recipe must win over the remembered tier');
check(collection.includes('current===undefined||current===sets[0]?.id?landing.id:current'),'A tier restored late must never overwrite a tier the player has already chosen by hand');
check(tierMemory.includes('/^T[1-9]$/')&&tierMemory.includes('catch{'),'Stored tiers must be validated on read and never throw into the Forge');
check(tierMemory.includes('Presentation only')&&tierMemory.includes('can never unlock'),'Remembering a tier must stay a browsing preference, never an entitlement');
console.log('PASS collection-first Forge, profession crafting separation, material source links and pouch ownership wiring');
