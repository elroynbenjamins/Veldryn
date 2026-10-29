const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const panel=fs.readFileSync(path.join(root,'src/components/CombatCompanionPanel.tsx'),'utf8');
const translations=fs.readFileSync(path.join(root,'src/i18n/companions.ts'),'utf8');
const guide=fs.readFileSync(path.join(root,'src/core/companion-tutorial.ts'),'utf8');
const guideTranslations=fs.readFileSync(path.join(root,'src/i18n/companion-tutorial.ts'),'utf8');
const section=panel.slice(panel.indexOf("{section==='Codex'&&"),panel.indexOf("\n  </View>;",panel.indexOf("{section==='Codex'&&")));
const detail=panel.slice(panel.indexOf("{section==='Collection'&&<>"),panel.indexOf("    {!starterTeam.ready",panel.indexOf("{section==='Collection'&&<>")));

// Preserve the prior five Companion sections and contextual help; avoid a second redesign.
assert(panel.includes("const sections=['Collection','Training','Sanctuary','Trials','Expeditions'] as const"),'Existing Companion navigation remains intact');
assert(panel.includes('<SectionGuide scope={guideScope} area="companions" section={section}'),'Per-section Companion guidance stays visible on first entry');
assert(guide.includes('Progress shows recruits and mastery targets.')&&guide.includes('Showcase manages your favorites; Rewards holds collection milestones.'),'Codex guidance matches the new focused views');
for(const hint of ['Fortschritt zeigt','Progreso muestra','Voortgang toont','Progressi mostra','Progression présente'])assert(guideTranslations.includes(hint),'Missing localized Codex tutorial '+hint);

// Collection details: focused hero, primary actions, accessible deep dives.
assert(detail.includes("<GameModalHeader title={t(\"Companions\")}"),'Companion detail sheet and close control stay available');
assert(detail.includes("title={t(\"Open Training & Bond\")}"),'Training route is a first-class action');
assert(detail.includes("title={t(\"Unequip\")} disabled={busy}"),'Unequip must not be hidden inside the roadmap');
assert(detail.includes("onPress={()=>act('companion_unequip')}"),'Unequip returns its action promise so loading and duplicate-tap safety work');
assert(detail.includes("title={t('Abilities & Traits')}"),'Abilities have their own collapsed disclosure');
assert(detail.includes("key={'abilities:'+selection}"),'Switching companions must reset the abilities disclosure');
assert(detail.includes("model.def.activeAbility.name")&&detail.includes("model.def.passiveAbility.description")&&detail.includes("model.def.bondTrait.description"),'Active, passive, and Bond trait details are preserved');
assert(detail.includes("defaultOpen={!model?.owned}"),'Locked companion unlock requirements stay easy to discover');
assert(detail.includes('roadmapView')&&detail.includes('ascensionSources.slice(0,3)'),'Progression and material source navigation are preserved');
assert(detail.includes("title={t('Open Sanctuary')}")&&panel.includes("title={t(\"Upgrade Quarters\")}"),'Quarters remain available in Sanctuary without being duplicated inside Collection details');
assert(!detail.includes("model.equipped?btn(t(\"Unequip\")"),'Unequip is not hidden behind an extra disclosure');
assert(!detail.includes(":model&&<View style={s.group}><View style={s.detailHero}>"),'Existing portraits are not repeated inside the roadmap');

// Codex: smaller purposeful views without removing progression, profile or rewards.
assert(panel.includes("setTimeout(()=>setMessage(''),4500)")&&panel.includes("if(!message||messageError)return"),'Routine Companion success notices should expire, while failures remain visible');
assert(panel.includes("setMessageError(true)")&&panel.includes("messageError?'assertive':'polite'"),'Failures must remain highlighted and announced accessibly');
assert(panel.includes("useState<'progress'|'showcase'|'rewards'>('progress')"),'Codex defaults to Progress');
for(const name of ['progress','showcase','rewards'])assert(section.includes("codexView==='"+name+"'"),'Missing '+name+' view');
assert(section.includes('accessibilityRole="tablist"')&&section.includes('accessibilityRole="tab"'),'Codex segmented navigation is accessible');
assert(section.includes("title={t('Back to Roster')}")&&panel.includes("section==='Codex'&&tab==='Collection'"),'Codex has clear Roster navigation and visible parent state');
assert(section.includes('view.codex.milestones.filter(m=>m.complete&&!m.claimed).length'),'Ready rewards have a visible count');
assert(section.includes("unlockTargets.map(")&&section.includes("masteryTargets.map("),'Progress view still lists unlocks and mastery');
assert(section.includes("ownedIds.map(")&&section.includes("companion_showcase"),'Showcase management is retained');
assert(section.includes('codexRewards.slice(-6)')&&section.includes('view.codex.milestones.map'),'Collection reward and milestone claims are retained');
assert(section.includes("setSection('Collection');setDetailOpen(true)"),'Progression targets open the companion details directly');
for(const key of ['Progress','Showcase','Rewards','Abilities & Traits','Passive ability','Bond trait','Open Sanctuary','Action failed','Back to Roster']){
 assert(translations.includes(JSON.stringify(key)+':'),'Missing localized Companion label '+key);
}
console.log('PASS Companion Collection and Codex progressive disclosure UX');
