export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const rarity=read('src/core/crafted-gear-rarity.ts');
const instances=read('src/core/crafted-gear-instances.ts');
const queue=read('src/core/equipment-crafting-queue.ts');
const enhancement=read('src/core/equipment-enhancement.ts');
const decisions=read('src/core/equipment-decision.ts');
const inspect=read('src/core/item-inspect.ts');
const inventory=read('src/screens/InventoryScreen.tsx');
const card=read('src/components/ItemCard.tsx');
const commands=read('src/core/game-commands.ts');
const app=read('App.tsx');
const forgeFeedback=read('src/components/ForgeResultFeedback.tsx');
const save=read('src/core/save-normalization.ts');

ok(rarity.includes('CRAFTED_MYTHIC_CHANCE=.001')&&rarity.includes('CRAFTED_EPIC_CHANCE=.006'),'Forge quality odds must remain exactly 0.10% Mythic / 0.60% Epic');
ok(rarity.includes('forgeRarityRolls')&&rarity.includes("return 'common'"),'Forge rarity rolls must use the same explicit outcomes and Common fallback for every equipment tier');
ok(instances.includes("acquireSource:'craft'"),'Crafted equipment must persist acquisition provenance');
ok(instances.includes('sourceReceiptKey:args.jobId'),'Forge job receipt must make settlement idempotent');
ok(instances.includes('bestCraftedInstanceForItem'),'Duplicate copies need a deterministic best-copy compatibility bridge');
ok(queue.includes('createCraftedGearInstance'),'Forge claim must create the owned equipment instance');
ok(queue.includes('craftClaimSubRoll'),'Claim All must derive per-job rolls from trusted randomness');

ok(enhancement.includes('effectiveOwnedGearRarity(state,itemId)'),'Upgrade pricing/stats must use forged quality');
ok(enhancement.includes('craftedRarityStatMultiplier'),'Forged rarity must affect live equipment stats');
ok(decisions.includes('effectiveOwnedGearRarity(state,itemId)'),'Character equipment decisions must show forged rarity');
ok(inspect.includes('craftedCopies')&&inspect.includes('craftedRarities'),'Quick Inspect must expose duplicate crafted-copy context');
ok(inventory.includes('exactRecord?.rarity??itemRarity(item)')&&inventory.includes('craftedGearDisplayQuality(exactRecord)'),'Inventory cards must display each exact crafted copy rarity and quality, not an unrelated best owned copy');
ok(card.includes('rarityOverride'),'ItemCard must support instance-derived rarity styling');

ok(commands.includes("if(options.randomRoll===undefined)throw new Error('trusted_random_required')"),'Online Forge settlement must require trusted randomness');
ok(commands.includes("result.result.qualityProc?' · rarity upgrade'")&&commands.includes('result.results.filter(row=>row.qualityProc)'),'Authoritative claim messages must surface rarity upgrades and count quality procs');
ok(app.includes('setForgeResults(result.forgeResults)')&&app.includes('ForgeRarityRevealModal'),'Mobile online claims must present authoritative structured Forge rarity results');
ok(app.includes('setForgeResults([claimed.result])'),'Mobile offline claims must use the same structured Forge rarity result path');
ok(forgeFeedback.includes('EXCEPTIONAL FORGE RESULT')&&forgeFeedback.includes("result.rarity==='legendary'||result.rarity==='mythic'")&&forgeFeedback.includes('qualityProc'),
 'Legendary/Mythic Forge rewards must use a rarity-aware reveal, with upgrade context when relevant');
const forgeQueueUi=read('src/components/EquipmentCraftQueuePanel.tsx');
const feedback=read('src/components/ActionFeedback.tsx');
ok(forgeQueueUi.includes('Rarity revealed on claim')&&!forgeQueueUi.includes('effectiveOwnedGearRarity(state,job.outputItemId)'),'Unclaimed Forge results must not borrow rarity from previously owned gear');
ok(forgeFeedback.includes('rarityMeta(result.rarity)')&&forgeFeedback.includes('borderColor:meta.color')&&forgeFeedback.includes('rarityNameColor(result.rarity'),'Claimed Forge results must use their actual rolled rarity colors and matching item names');
ok(feedback.includes('accentColor?:string')&&feedback.includes('accentSurface?:string'),'Compact Forge feedback must support rarity accents while preserving other feedback tones');
ok(save.includes('normalizeCraftedGearInstances'),'Crafted instances must persist through save normalization');

const collection=read('src/components/SmithingCollection.tsx');
const oddsGuide=read('src/components/ForgeOddsGuide.tsx');
const oddsBeforeCraft=collection.indexOf('<ForgeOddsGuide key={recipe.output.itemId} itemId={recipe.output.itemId}/>');
const craftButton=collection.indexOf('accessibilityState={{disabled:!ready}}');
ok(craftButton>collection.indexOf('style={s.itemHero}')&&craftButton<collection.indexOf('status.inputs.map(input=>')&&oddsBeforeCraft>craftButton,
 'Selected gear must offer a craft action before long material/rarity details while retaining the accessible odds guide below');
ok(collection.indexOf('<ForgeOddsGuide',oddsBeforeCraft+1)===-1,'Odds guide must not be repeated under the queue');
ok(collection.includes("type EquipmentCraftingSkill='smithing'|'tailoring'")&&read('src/screens/SkillsScreen.tsx').includes("initialSkill==='smithing'||initialSkill==='tailoring'"),
 'Smithing and Tailoring must use the same odds-bearing equipment crafting collection');
ok(oddsGuide.includes('craftedGearRarityOutcomes(item.id)')&&oddsGuide.includes('outcomes.filter('),
 'Recipe-specific rarity odds must be used for both collapsed summary and expanded rarity choices');
ok(oddsGuide.includes('accessibilityState={{selected}}')&&oddsGuide.includes('setSelectedRarity(row.rarity)'),
 'Each colored rarity outcome must be interactive');
ok(oddsGuide.includes('craftedGearQualityMultiplier(quality)')&&oddsGuide.includes('chosen.statMultiplier*craftedGearQualityMultiplier(quality)'),
 'Preview must multiply actual rarity and quality effects, never add them');
ok(oddsGuide.includes('craftedGearQualityChanceAtLeast(quality)')&&oddsGuide.includes('onAccessibilityAction'),
 'Quality control must expose real weighted chances and accessible adjustments');
ok(oddsGuide.includes("gt('Rarity and quality roll on claim.')")&&oddsGuide.includes("gt('Rarity and quality both affect stats.')"),
 'Rarity/quality preview must explain claim-time randomness and real stat effects without misleading tier-based rarity odds');

ok(oddsGuide.includes('style={s.chanceGrid}')&&oddsGuide.includes('s.chanceTile')&&oddsGuide.includes("const stacked=width<320||fontScale>=1.45"),
 'Forge odds must use space-efficient two-column tiles that expand for accessibility or narrow screens');
ok(oddsGuide.includes('const usableWidth=trackWidth-2*SLIDER_INSET')&&oddsGuide.includes('position-SLIDER_INSET'),
 'Quality slider taps must account for its inset so Q0 and Q100 can be reached accurately');
ok(oddsGuide.includes("gt('Decrease quality')")&&oddsGuide.includes("gt('Increase quality')")&&oddsGuide.includes('accessibilityState={{disabled:quality===CRAFTED_GEAR_QUALITY_MAX}}'),
 'Quality preview must have touch-friendly step controls with bounded disabled states');
ok(collection.includes('tileColumns=width<295||fontScale>=1.6?3:width<345||fontScale>=1.3?4:5')&&collection.includes("gt('Previous set')")&&collection.includes("gt('Next set')"),
 'Crafting set tiles must support narrow phones / font scaling and accessible set navigation');
const forgeLocalizations=read('src/i18n/gameplay.ts');
ok(['Decrease quality','Increase quality','Previous set','Next set'].every(key=>forgeLocalizations.includes('"'+key+'":')),
 'New Forge controls must be translated for each supported gameplay language');

console.log('PASS: crafted-instance result/economy UI and authority wiring are protected');
