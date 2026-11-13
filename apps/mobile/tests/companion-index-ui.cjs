const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'../src',relative),'utf8');
const screen=read('screens/CompanionsScreen.tsx');
const panel=read('components/CombatCompanionPanel.tsx');
const index=read('components/CompanionIndex.tsx');
const i18n=read('i18n/companions.ts');

assert(screen.includes('<CombatCompanionPanel'),'Companion screen must still use the owning panel');
assert(panel.includes('<CompanionIndex'),'Collection must use the index');
assert(panel.includes('onOpen={id=>{setSelection(id);setDetailOpen(true)}}'),'Companion detail sheet must stay wired');
assert(panel.includes("onTrain={id=>{setSelection(id);setSection('Training')}}"),'Training route must stay wired');
assert(panel.includes("onCodex={()=>setSection('Codex')}"),'Codex navigation must remain available');

for(const key of ['My companions','Unlock','Past events','Your companions','Companions to unlock','Previously released companions','Manage','Details','Filter roles']){
 assert(i18n.includes('"'+key+'":'),'Index localization missing '+key);
}
for(const needle of [
 '<SearchField',
 "type IndexTab='owned'|'unlock'|'event'",
 "useState<IndexTab>('unlock')",
 "tab==='owned'&&!owned",
 "tab==='unlock'&&(owned||group!=='available')",
 "tab==='event'&&group!=='event'",
 "group==='comingSoon'",
 "companionIndexGroup(def)!=='comingSoon'",
 "const publicTotal=COMPANION_INDEX_COUNTS.available+COMPANION_INDEX_COUNTS.event",
 "accessibilityRole=\"tab\"",
 "accessibilityState={{selected:tab===item.id}}",
 "setRoleMenuOpen(open=>!open)",
 "setRole(id);setRoleMenuOpen(false)",
 "roleOrder.map",
 "accessibilityLabel={t('Filter roles')}",
 "tab==='unlock'&&candidate",
 "NEXT TO UNLOCK",
 "companionNextUnlockTargets",
 "hidden?'Unknown Prestige Companion':def.name",
 "hidden?'Unknown Prestige Companion':def.name).toLocaleLowerCase(language)",
 "companionUnlockCompletion",
 "companionRarityBorder",
 "companionArtSource(def.id)",
 "GUILD_SHOP_CATALOGUE",
 "formatLocalizedNumber(language,guildShopEntry.tokenCost)",
 "UiIcon name={sourceIcon[req.type]}",
 "companionUnlockRequirement(language,req.description)",
 "accessibilityHint={requirementHint}",
 "companionContent(language,status)",
 "onOpen(def.id)",
 "onTrain(first)",
 "onCodex",
 "useWindowDimensions"
])assert(index.includes(needle),'Index missing '+needle);

// The entire set of requirements must remain visible: no first-unfinished-only summary,
// no truncation, no "show steps" toggle. This includes two-step unlocks.
assert(index.includes('def.unlockRequirements.map((req,index)=>{'),'Every authored unlock requirement must render');
assert(index.includes('const requirement=achievement?.requirements[index]'),'Progress must map to its own requirement index');
assert(index.includes('<Text style={[s.requirementLabel,complete&&s.requirementLabelDone]}>'),'Requirement descriptions may wrap naturally; never truncate or hide a second goal');
assert(!index.includes('numberOfLines={2} style={[s.requirementLabel'),'Requirement text must not be clipped');
assert(!index.includes('setExpanded')&&!index.includes('Next step'),'Requirements must not be replaced by next-step accordion');
assert(index.includes('complete?\'✓\':formatLocalizedNumber'),'Full requirements must show real progress and checkmarks');
assert(index.includes('requirement?<Text'),'Only tracked requirements may show numeric counters');

// Released event companions remain viewable; Ashlands and unreleased events stay private.
assert(index.includes("group==='comingSoon')return false"),'Future companions must never render in any index tab');
assert(!index.includes("t('Coming soon')")&&!index.includes('UNRELEASED_SEASONAL_COMPANION_COUNT'),'No future tab or teaser');
assert(index.includes("tab==='event'&&group!=='event'"),'Past-event tab is limited to released event companions');
assert(index.includes("tab==='owned'&&!owned"),'Owned tab must include acquired past-event companions');
assert(index.includes('setRole(\'all\');setQuery(\'\');setRoleMenuOpen(false);'),'Switching tabs must clear stale filters');
console.log('PASS: Companion Index intent tabs, full unlock requirements, spoiler privacy and detail/training paths');
