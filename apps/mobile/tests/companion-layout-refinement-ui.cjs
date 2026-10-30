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

// The everyday roster starts with owned companions; discovery remains available.
assert(panel.includes("useState<CollectionFilter>('Owned')"),'Roster must default to owned companions');
assert(panel.includes("title={t(\"Companion Codex\")}"),'Companion discovery remains available');
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
for(const title of ['Choose Mission','Prepare Team','Expedition Supplies'])assert(expedition.includes(title),'Missing expedition step '+title);
assert(expedition.includes('validateCompanionMissionTeam('),'Mission team rules must remain authoritative');
assert(expedition.includes('companionStaminaSelectionTotal(foodSelection)'),'Stamina must use real food selection');
assert(expedition.includes("type:'companion_assignment_start'"),'Starting expeditions must still send the real command');
assert(expedition.includes('CompanionDisclosure title={t("Mission Details")}'),'Detailed requirements must stay accessible');
console.log('PASS Companion layout refinement and resource icon UX');
