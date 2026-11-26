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
assert(read('CompanionIndex.tsx').includes("useState<IndexTab>(()=>(state.account.unlockedCombatCompanionIds?.length??0)>0?'owned':'unlock')"),'Companion Index defaults to owned recruits where available');
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

// Sanctuary cards explain their actual rewards, with timers instead of disabled buttons.
assert(panel.includes("t('Daily Companion XP')")&&panel.includes("t('Weekly Companion Essence')"),'Sanctuary rewards have explicit daily XP and weekly Essence labels');
assert(panel.includes('COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[trainingLevel]')&&panel.includes('COMPANION_SANCTUARY_WEEKLY_ESSENCE[essenceLevel]'),'Sanctuary reward labels must read the same tier configuration used for grants');
assert(panel.includes("trainingLast===undefined?t('Start timer'):t('Claim XP')")&&panel.includes("essenceLast===undefined?t('Start timer'):t('Claim Essence')"),'First activation is not described as a reward claim');
assert(!panel.includes("t('Not ready')"),'Unavailable Sanctuary rewards use compact countdowns, not disabled Not ready buttons');
// Claims should not appear claimable before the underlying reward timer is due.
assert(panel.includes('now-trainingLast>=86400000'),'Daily rewards must respect the daily timer');
assert(panel.includes('now-essenceLast>=604800000'),'Weekly rewards must respect the weekly timer');
// Non-due rewards are a countdown, not a disabled button. The actionable
// button is mounted only while the authoritative ready flag is true.
assert(panel.includes('!trainingBuilt?<Text')&&panel.includes('trainingDue\n         ?<GameButton compact')&&panel.includes('claimWait(trainingLast,86400000)'),
 'Daily rewards must show a countdown instead of a premature claim action');
assert(panel.includes('!essenceBuilt?<Text')&&panel.includes('essenceDue\n         ?<GameButton compact')&&panel.includes('claimWait(essenceLast,604800000)'),
 'Weekly rewards must show a countdown instead of a premature claim action');
assert(panel.includes('disabled={busy} onPress={()=>act(\'companion_training\')}')&&panel.includes('disabled={busy} onPress={()=>act(\'companion_essence\')}'),
 'Only eligible claims should offer a real action and busy state must block duplicates');

// Existing progression and mission validation must survive layout simplification.
assert(training.includes('costBreakdown(model.nextLevelCost)'),'Training must show resource cost before upgrading');
assert(training.includes('resourceId:"bondstones"'),'Training must display a Bondstone icon when required');

// Companion Training now has a direct Bond summary before secondary growth actions.
const bond=read('CompanionBondProgressPanel.tsx');
assert(training.includes('<CompanionBondProgressPanel')&&training.includes('onOpen={()=>{setMessage(\'\');setTab(\'Bond\')}'),'Bond is directly visible on Training and opens its reward sheet');
assert(training.includes("setTab('Skills')")&&training.includes("setTab('Materials')"),'Abilities and Ascension remain equally reachable');
assert(training.includes('s.growthTile,s.growthHalfTile'),'The remaining growth actions fit a two-column row');
assert(bond.includes("accessibilityRole=\"progressbar\"")&&bond.includes("bond.remaining"),'Bond uses a proper progress bar and remaining XP');
assert(bond.includes("claimable.length")&&bond.includes('onClaim(level as RewardLevel)'),'Bond rewards retain per-milestone claim actions');
assert(bond.includes('COMPANION_BOND_CONFIG.sourceXp')&&bond.includes('traitName'),'Bond XP sources and the companion-specific trait are explicit');
assert(panel.includes('s.quartersChoices')&&panel.includes('housingView'),'Quarters are directly visible and the companion can be changed without a hidden disclosure');

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
// Companion Training is a Sanctuary facility, deliberately hidden from the skill navigator.
// Keep a real 0–3 facility level and upgrade/claim functionality in its details modal.
assert(!skills.includes("id:'companion-training',name"),'Do not re-add Companion Training as a levelable skill tile');
assert(skills.includes("const facilityLevel=Math.max(0,Math.min(3,state.account.companionSanctuary?.trainingGroundLevel??0))"),'Facility must preserve the real persisted level, including zero');
assert(skills.includes('{facilityLevel}/3'),'Facility detail must show the actual upgrade level out of 3');
assert(skills.includes('COMPANION_SANCTUARY_TRAINING_XP_PER_DAY[facilityLevel]'),'Training XP/day must follow the authoritative Sanctuary values');
assert(skills.includes('trainingDaysReady*facilityXpPerDay')&&skills.includes('idleCompanions.length'),'Companion training claim must show accrued XP and eligible companions');
assert(skills.includes("type:'companion_training'")&&skills.includes('disabled={!trainingClaimReady}'),'Skills hub uses an existing authenticated companion training claim with readiness gating');
assert(skills.includes("companionSanctuaryUpgradeCost(state,'trainingGround')"),'Training Ground upgrade costs must use live game rules');
assert(skills.includes("type:'companion_upgrade',args:{id:'trainingGround'}")&&skills.includes('disabled={!trainingUpgradeReady}'),'Facility upgrade must call existing validated server command and respect resources');
assert(skills.includes('not a separate XP-based skill'),'Players must be told that the Training Ground is not an independently levelable character skill');
console.log('PASS Companion layout refinement and resource icon UX');
