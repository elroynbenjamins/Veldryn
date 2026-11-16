const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,'src/components',file),'utf8');
const panel=read('CombatCompanionPanel.tsx');
const training=read('CompanionTrainingV50Panel.tsx');
const expedition=read('CompanionExpeditionsV50Panel.tsx');
const upgrade=read('CompanionUpgradePresentation.tsx');
const resource=read('ResourceIcon.tsx');
const skills=fs.readFileSync(path.join(root,'src/screens/SkillsScreen.tsx'),'utf8');

// Companion Index opens on unlockable recruits, with owned and past-event views one tap away.
assert(read('CompanionIndex.tsx').includes("useState<IndexTab>(()=>(state.account.unlockedCombatCompanionIds?.length??0)>0?'owned':'unlock')"),'Companion Index starts with owned roster for returning players and unlockable recruits for new players');
assert(read('CompanionIndex.tsx').includes("type IndexTab='owned'|'unlock'|'event'"),'Owned and past-event groups must remain accessible');
assert(read('CompanionIndex.tsx').includes('onCodex}'),'Companion discovery remains available through the Index header');
assert(panel.includes("Train equipped companion"),'Equipped companion should have a shortcut to Training');

// Only real server-derived costs/holdings should drive upgrade readiness.
assert(panel.includes("companionSanctuaryUpgradeCost(state,id)"),'Facility prices must come from game rules');
assert(panel.includes('compact title={facilityLabel'), 'Sanctuary facilities should be compact disclosures');
assert(panel.includes("resourceId:cost.materialId"),'Facility-specific material icons must use item IDs');
assert(panel.includes("owned:e.materials[cost.materialId]??0"),'Facility requirements must show actual owned materials');
assert(panel.includes("companionMaterialSourceTargets(cost.materialId)"),'Missing materials must link to sources');
assert(upgrade.includes('<ResourceIcon resourceId={row.resourceId'), 'Cost rows must show actual resource icons');
assert(resource.includes("resourceId==='SUPPLIES'"),'Companion Supplies must have a safe icon fallback');
assert(upgrade.includes("row.owned>=row.required"),'Enough/missing resource state must reflect balances');

// Claims should not appear claimable before the underlying reward timer is due.
assert(panel.includes('now-trainingLast>=86400000'),'Daily rewards must respect the daily timer');
assert(panel.includes('now-essenceLast>=604800000'),'Weekly rewards must respect the weekly timer');
assert(panel.includes('disabled={busy||!trainingDue}')&&panel.includes('disabled={busy||!essenceDue}'),'Unavailable rewards must be disabled');

// Existing progression and mission validation must survive layout simplification.
assert(training.includes('costBreakdown(model.nextLevelCost)'),'Training must show resource cost before upgrading');
assert(training.includes('resourceId:"bondstones"'),'Training must display a Bondstone icon when required');

// The primary Bond milestone panel is visible without hiding Bond behind a third tile.
assert(training.includes('model?.owned&&progress?<CompanionBondProgressPanel')&&training.includes("onOpen={()=>{setMessage('');setTab('Bond')}}"),'Owned companions show first-class Bond progress and a working detail action');
assert(training.includes("tab==='Bond'?<CompanionBondProgressPanel"),'Detailed Bond rewards and progress remain accessible');
// Abilities and Materials stay equally wide, accessible and translation-friendly.
const growthStart=training.indexOf('<View style={s.growthPair}>');
const growthEnd=training.indexOf('   </View>:null}',growthStart);
assert(growthStart>=0&&growthEnd>growthStart,'Owned companions retain two visible growth routes');
const growthActions=training.slice(growthStart,growthEnd);
for(const label of ['Abilities & Techniques','Materials & Ascension'])
 assert(growthActions.includes("accessibilityLabel={t('"+label+"')}"),'Accessible growth route missing '+label);
assert(growthActions.includes("setTab('Skills')")&&growthActions.includes("setTab('Materials')"),'Both visible actions must open their respective detail view');
assert((growthActions.match(/s.growthTile,s.growthHalfTile/g)||[]).length===2,'Abilities and Materials share two equal-width cards');
assert(training.includes("growthPair:{flexDirection:'row',alignItems:'stretch',gap:8}")&&training.includes('growthHalfTile:{flex:1,minWidth:0}'),'Growth actions keep 50/50 widths and avoid forced minimum sizes');
assert(training.includes('growthTitle:{fontSize:12,lineHeight:17')&&training.includes('flexShrink:1'),'Localized action labels wrap without overflow');
assert(!training.includes("flexBasis:'28%'")&&!training.includes("flexBasis:'38%'"),'Legacy three-column widths may not return');

for(const title of ['Mission Board','Prepare Expedition','Prepare Team','Expedition Supplies'])assert(expedition.includes(title),'Missing expedition section '+title);
assert(expedition.includes("activeCompanionMissions(now)"),'Mission board must use the active weekly rotation');
assert(expedition.includes('companionExpeditionPenCapacity(pens)'),'Expedition slots must reflect sanctuary upgrades');
assert(expedition.includes('recommendedCompanionMissionTeam(state,id,now)'),'Mission selection must prepare a suggested eligible team');
assert(expedition.includes('companionAutoStaminaSelection(state,'),'Mission preparation must select actual available food');
assert(expedition.includes('companionStaminaFoodOptions(state)'),'Manual food selection must use inventory and bank quantities');
assert(expedition.includes('visible={confirmOpen}')&&expedition.includes('disabled={!canSend}'),'Dispatch must require an eligible team, stamina and free pen slot');
assert(expedition.includes('pendingClaim.current=id')&&expedition.includes('rewardSnapshot'),'Claim dialog must show the claimed server reward instead of a predicted reward');
assert(expedition.includes('visible={teamPickerOpen}')&&expedition.includes('visible={foodOpen}'),'Team and supplies must have dedicated modals');
assert(expedition.includes('validateCompanionMissionTeam('),'Mission team rules must remain authoritative');
assert(expedition.includes('companionMissionRequirementSatisfied(req,ids,view.owned)'),'Individual mission requirements use the same rules as server dispatch');
assert(expedition.includes('requirementChecks(mission,safeTeam)')&&expedition.includes('t(\'Entry requirements\')'),'Mandatory roles, pen tier, level and affinity must be visible during team preparation');
assert(expedition.includes('bonusChecks.map((req,index)')&&expedition.includes('Optional bonus requirements'),'Bonus requirements must show separate progress and not block dispatch');
assert(expedition.includes('Grades C–S are rewards, not entry requirements.'),'Do not mislabel expedition performance grades as starting requirements');
assert(expedition.includes('(row.requirements??[]).slice(0,3)'),'Mission board must preview its most important actual requirements');
assert(expedition.indexOf("t('Entry requirements')")<expedition.indexOf("t('Prepare Team')"),'Mandatory requirements must appear before the team picker');
assert(expedition.includes('companionStaminaSelectionTotal(foodSelection)'),'Stamina must use real food selection');
assert(expedition.includes("type:'companion_assignment_start'"),'Starting expeditions must still send the real command');
assert(/CompanionDisclosure\s+title=\{t\(['"]Mission Details['"]\)\}/.test(expedition),'Detailed requirements must stay accessible');
// The Skills hub Companion tile is a Sanctuary facility, not a fake levelable skill.
assert(skills.includes("level:facilityLevel,kind:'Sanctuary facility'"),'Companion skill tile must describe the actual Training Ground facility level, including level zero');
assert(skills.includes("Math.min(1,card.level/3)")&&skills.includes("gt('Facility Lv {level}/3',{level:card.level})"),'Facility progress must be shown out of 3 upgrades, not a fictitious 100 skill levels');
assert(skills.includes('COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[facilityLevel]'),'Training XP/day must follow the authoritative Sanctuary values');
assert(skills.includes('trainingDaysReady*facilityXpPerDay')&&skills.includes('idleCompanions.length'),'Companion training claim must show accrued XP and eligible companions');
assert(skills.includes("type:'companion_training'")&&skills.includes('disabled={!trainingClaimReady}'),'Skills hub uses an existing authenticated companion training claim with readiness gating');
assert(skills.includes("companionSanctuaryUpgradeCost(state,'trainingGround')"),'Training Ground upgrade costs must use live game rules');
assert(skills.includes("type:'companion_upgrade',args:{id:'trainingGround'}")&&skills.includes('disabled={!trainingUpgradeReady}'),'Facility upgrade must call existing validated server command and respect resources');
assert(skills.includes('not a separate XP-based skill'),'Players must be told that the Training Ground is not an independently levelable character skill');
console.log('PASS Companion layout refinement and resource icon UX');
