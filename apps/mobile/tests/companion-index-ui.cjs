const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'../src',relative),'utf8');
const screen=read('screens/CompanionsScreen.tsx');
const panel=read('components/CombatCompanionPanel.tsx');
const index=read('components/CompanionIndex.tsx');
assert(screen.includes('<CombatCompanionPanel'),'Companion screen must still use the owning panel');
assert(panel.includes('<CompanionIndex'),'Collection must use the new index');
assert(panel.includes('onOpen={id=>{setSelection(id);setDetailOpen(true)}}'),'Index must retain the detail sheet');
assert(panel.includes('onTrain={id=>{setSelection(id);setSection(\'Training\')}}'),'Index must retain the training route');
assert(panel.includes("onCodex={()=>setSection('Codex')}"),'Index must keep Codex navigation');
for(const needle of ['<SearchField','setScope','setRole','Companion Index','NEXT TO UNLOCK','hiddenIds.has(def.id)','companionUnlockCompletion','companionUnlockGuidance','companionRarityBorder','useWindowDimensions','accessibilityRole="button"']){
 assert(index.includes(needle),'Index missing '+needle);
}
assert(index.includes("const label=hidden?t('Unknown Prestige Companion'):def.name"),'Prestige names must remain hidden before discovery');
assert(index.includes("const q=query.trim()"),'Search must run against the displayed identity');
assert(index.includes("def.origin.type==='event'"),'Event acquisition must be shown distinctly');
assert(index.includes("def.origin.id==='GUILD_TOKEN_SHOP'"),'Guild Shop acquisition must be shown distinctly');
assert(index.includes('unavailableOriginIds.has(def.origin.id)'),'Unavailable regional companions must be marked coming soon');
for(const needle of [
 "companionIndexGroup(def)!==group",
 "COMPANION_INDEX_COUNTS[id]",
 "UNRELEASED_SEASONAL_COMPANION_COUNT",
 "def.unlockRequirements.map((req,index)",
 "achievement?.requirements[index]",
 "companionUnlockRequirement(language,req.description)",
 "UiIcon name={sourceIcon[req.type]}",
 "GUILD_SHOP_CATALOGUE",
 "guildShopEntry.guildLevel",
 "guildShopEntry.tokenCost",
 "companionArtSource(def.id)",
])assert(index.includes(needle),'Companion category/requirement UI missing '+needle);
assert(index.includes("setGroup(id);setScope('all');setRole('all');setQuery('');"),'Switching group clears stale filters to prevent empty results');
assert(index.includes("group==='available'&&candidate"),'Next unlock panel must not crowd event or future tabs');
assert(index.includes("formatLocalizedNumber(language,guildShopEntry.tokenCost)"),'Guild tokens must use the chosen language number format');
assert(index.includes("complete?'✓':formatLocalizedNumber"),'Completed conditions show a check instead of misleading numeric status');
assert(index.includes("accessibilityHint={requirementHint}"),'Unlock descriptions must remain available to screen readers');
assert(index.includes("companionContent(language,status)"),'Owned companion status must be localized');
assert(index.includes("sourceIcon:Record<CompanionUnlockRequirementType,UiIconName>"),'Requirement source icons must reuse existing pixel art assets');
assert(index.includes("t('Planned unlocks')"),'Unreleased content must be labeled as planned');
assert(index.includes("requirement?<Text"),'Unreleased content must not display fabricated 0/1 counters');
assert(index.includes("hidden?'Unknown Prestige Companion':def.name"),'Unreleased Prestige identities stay hidden in searches');
console.log('PASS: searchable Companion Index preserves spoiler privacy, portraits, group tabs and unlock progress');
