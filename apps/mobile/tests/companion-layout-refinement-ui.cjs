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

// Companion Index starts on available-to-earn, showing owned and locked progression.
assert(read('CompanionIndex.tsx').includes("useState<Scope>('all')"),'Companion Index must show currently obtainable recruits by default');
assert(read('CompanionIndex.tsx').includes("useState<CompanionIndexGroup>('available')"),'Index defaults to obtainable companion sources');
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

// Companion Training has two equal-width, translation-friendly actions on the
// first row, with Materials & Ascension on its own full-width second row.
const growthStart=training.indexOf('<View style={s.growthGrid}>');
const growthEnd=training.indexOf('   </View>:null}',growthStart);
assert(growthStart>=0&&growthEnd>growthStart,'Companion growth actions must be visible for owned companions');
const growthActions=training.slice(growthStart,growthEnd);
assert(growthActions.includes('<View style={s.growthPair}>'),'Bond and Abilities must share a dedicated horizontal row');
assert(growthActions.includes("['Bond',t('Bond')")&&growthActions.includes("['Skills',t('Abilities & Techniques')"),'Bond and Abilities must remain equally sized actions');
assert(growthActions.includes('s.growthTile,s.growthHalfTile'),'The first-row buttons must use equal flex widths');
assert(growthActions.includes('s.growthTile,s.growthTileWide'),'Materials & Ascension needs its own full-width button');
assert(growthActions.includes("setTab('Materials')")&&growthActions.includes('setTab(key)'),'All three actions must retain working modal navigation');
assert(growthActions.includes('accessibilityRole="button"')&&growthActions.includes("accessibilityLabel={t('Materials & Ascension')"),'Growth buttons must retain accessible names and button semantics');
assert(training.includes("growthPair:{flexDirection:'row',alignItems:'stretch',gap:8}")&&training.includes('growthHalfTile:{flex:1,minWidth:0}'),'First row must be 50/50 with an 8px gap and avoid forced minimum widths');
assert(training.includes("growthTileWide:{width:'100%',minHeight:56"),'Ascension action must occupy 100% width below the pair');
assert(training.includes('growthTitle:{fontSize:12,lineHeight:17')&&training.includes('flexShrink:1'),'Long translated labels must wrap without forcing tiles to overflow');
assert(!training.includes("flexBasis:'28%'")&&!training.includes("flexBasis:'38%'"),'Legacy three-column flex basis must not compete for narrow phone width');

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
assert(skills.includes("Math.min(1,card.level/3)")&&skills.includes("'Facility Lv '+card.level+'/3'"),'Facility progress must be shown out of 3 upgrades, not a fictitious 100 skill levels');
assert(skills.includes('COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[facilityLevel]'),'Training XP/day must follow the authoritative Sanctuary values');
assert(skills.includes('trainingDaysReady*facilityXpPerDay')&&skills.includes('idleCompanions.length'),'Companion training claim must show accrued XP and eligible companions');
assert(skills.includes("type:'companion_training'")&&skills.includes('disabled={!trainingClaimReady}'),'Skills hub uses an existing authenticated companion training claim with readiness gating');
assert(skills.includes("companionSanctuaryUpgradeCost(state,'trainingGround')"),'Training Ground upgrade costs must use live game rules');
assert(skills.includes("type:'companion_upgrade',args:{id:'trainingGround'}")&&skills.includes('disabled={!trainingUpgradeReady}'),'Facility upgrade must call existing validated server command and respect resources');
assert(skills.includes('not a separate XP-based skill'),'Players must be told that the Training Ground is not an independently levelable character skill');
console.log('PASS Companion layout refinement and resource icon UX');
