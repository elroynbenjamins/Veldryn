'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../',p),'utf8');
const recipe=read('src/components/RecipeCard.tsx');
const tool=read('src/components/ToolCraftStatsPanel.tsx');
const roll=read('src/core/gathering-tool-rolls.ts');
const rarity=read('src/core/crafted-gear-rarity.ts');
const localization=read('src/i18n/gameplay.ts');

// Every action and quantity control belongs to Requirements only.
assert.match(recipe,/detailTab==='materials'&&!detailsOnly&&quantityMax>1\?<CraftQuantitySelector/);
assert.match(recipe,/detailTab==='materials'&&!detailsOnly&&quantityMax===1\?<View style=\{s\.singleQuantity\}/);
assert.match(recipe,/detailTab==='materials'&&!detailsOnly\?<View style=\{s\.craftSummary\}/);
assert.match(recipe,/detailTab==='materials'&&!detailsOnly\?<View style=\{\[s\.statusCallout/);
assert.match(recipe,/detailTab==='materials'&&\(!detailsOnly\?<GameButton/);
assert.match(recipe,/detailTab==='progress'\?<>{pace\?/);
assert.match(recipe,/detailTab==='stats'\?<>{recipe\.v33EquipmentTier/);
assert.match(recipe,/output\.type==='tool'\?<>{tool\?<ToolCraftStatsPanel/);
assert.match(recipe,/output\.type==='gear'\?<><Text/);
assert.match(recipe,/<ForgeOddsGuide itemId=\{output\.id\}/);

// Stats are truthful to the 2.0 mint source, not hard-coded hypothetical rolls.
assert.match(tool,/gatheringToolBonusRange\(tool\.id,'xp'\)/);
assert.match(tool,/GATHERING_TOOL_SPEED_RANGE_BPS/);
assert.match(tool,/GATHERING_TOOL_RARITY_RANGE_BPS/);
assert.match(tool,/CRAFTED_COMMON_CHANCE/);
assert.match(tool,/CRAFTED_MYTHIC_CHANCE/);
assert.match(tool,/gatheringToolQualityMultiplier\(q\)/);
assert.match(tool,/accessibilityState=\{\{expanded:showOdds\}\}/);
assert.match(tool,/accessibilityState=\{\{expanded:showRules\}\}/);
assert.match(roll,/export type GatheringToolBonusStat='speed'\|'rarity'\|'xp'/);
assert.match(roll,/GATHERING_TOOL_XP_RANGE_BPS_BY_TIER/);
assert.match(roll,/GATHERING_TOOL_MAX_XP_BONUS_BPS=6000/);
assert.match(rarity,/CRAFTED_MYTHIC_CHANCE=\.001/);

// New copy has shared localized keys, including Russian/Turkish follow-through.
for(const key of [
 'BASE TOOL EFFECT','Shorter action time','Possible bonus roll','Gathering speed',
 'Rare finds','Skill XP gain','One random bonus per crafted tool.',
 'Skill XP applies only to this tool’s skill.','Crafting rarity chances',
 'View all rarity chances','Hide rarity chances','Quality effect on base bonus',
 'Rarity and quality adjust the base effect, not the bonus roll.','Output',
]){
 const marker=JSON.stringify(key)+':';
 assert.ok(localization.includes(marker),'Missing translation for '+key);
}
console.log('PASS: 2.0 recipe tabs isolate actions and show real skill XP/rarity/quality stats');
