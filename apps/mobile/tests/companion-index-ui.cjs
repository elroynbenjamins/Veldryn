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
assert(!index.includes('Unknown Prestige Companion\':def.name'), 'Undiscovered Prestige identities must not leak');
assert(index.includes("hidden?'Unknown Prestige Companion':def.name"),'Prestige names must remain hidden before discovery');
assert(index.includes("def.origin.type==='event'"),'Event acquisition must be shown distinctly');
assert(index.includes("def.origin.id==='GUILD_TOKEN_SHOP'"),'Guild Shop acquisition must be shown distinctly');
console.log('PASS: concise searchable Companion Index preserves detail, training, Codex, and discovery privacy');
