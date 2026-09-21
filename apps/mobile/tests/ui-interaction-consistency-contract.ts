export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const shell=read('src/components/GameModalSurface.tsx');
ok(shell.includes('useSafeAreaInsets'),'Shared modal shell must honor native safe-area insets');
ok(shell.includes('backgroundColor:C.overlay'),'Shared modal shell must use the active theme overlay');
ok(shell.includes("width:44,height:44"),'Shared modal close target must remain at least 44px');
ok(shell.includes("presentation='sheet'")&&shell.includes("presentation?:Presentation"),'Shared modal shell must support sheet and dialog presentations');

for(const path of [
 'src/components/ConfirmModal.tsx',
 'src/components/GuideTopicModal.tsx',
 'src/components/SaveTransferPanel.tsx',
 'src/components/EnvironmentDetailsModal.tsx',
 'src/components/EquipmentEnhancementModal.tsx',
 'src/components/ProfileAudiencePreviewModal.tsx',
 'src/screens/DailySuppliesScreen.tsx',
 'src/screens/ProgressionPlannerScreen.tsx',
]){
 const source=read(path);
 ok(source.includes('GameModalSurface'),path+' must use the shared modal shell');
 ok(!source.includes('<Modal'),path+' must not reintroduce a bespoke React Native Modal');
}

const enhancement=read('src/components/EquipmentEnhancementModal.tsx');
ok(enhancement.includes('useGameTheme')&&enhancement.includes('makeStyles(C:ThemeColors)'),'Equipment enhancement must use the active UI theme');
for(const forbidden of ["rgba(0,0,0,.78)","rgba(67,189,242,.07)","rgba(4,10,17,.35)","rgba(230,189,114,.08)"]){
 ok(!enhancement.includes(forbidden),'Equipment enhancement must not regress to dark-only surface '+forbidden);
}
ok(enhancement.includes('loading={busy}'),'Upgrade action must expose a real loading state');

const guide=read('src/components/GuideTopicModal.tsx');
ok(guide.includes('GameModalHeader')&&guide.includes('compact title="Close"'),'Help modal must use shared header and compact close action');

const save=read('src/components/SaveTransferPanel.tsx');
ok(save.includes('loading={exportBusy}')&&save.includes('loading={busy}'),'Save transfer must expose loading state for export and import');
ok(save.includes('accessibilityLiveRegion="polite"'),'Save import errors must remain announced');

const confirm=read('src/components/ConfirmModal.tsx');
ok(confirm.includes("actions:{flexDirection:'row'"),'Confirm dialog actions must stay in one consistent action row');
ok(confirm.includes('presentation="dialog"'),'Confirmations must use centered dialog presentation');

const top=read('src/components/GameTopBar.tsx');
ok(top.includes('GameModalSurface')&&!top.includes('<Modal'),'Quick navigation must use the shared modal shell');
ok(top.includes('loading={saving}')&&top.includes('GameButton title="Save five"'),'Quick navigation save must use shared loading/button behavior');

const inventory=read('src/screens/InventoryScreen.tsx');
ok(inventory.includes('GameModalSurface')&&!inventory.includes('<Modal'),'Inventory filter must use the shared modal shell');
ok(inventory.includes('reduceMotion={state.settings.reduceMotion}'),'Inventory modal interactions must respect reduced motion');

const daily=read('src/screens/DailySuppliesScreen.tsx');
ok(daily.includes('GameModalHeader')&&daily.includes('accessibilityRole="radio"'),'Daily Supplies picker must use shared header and radio semantics');

const planner=read('src/screens/ProgressionPlannerScreen.tsx');
ok(planner.includes('GameModalHeader')&&planner.includes('GameModalSurface'),'Working Toward goal creation must use the shared interaction shell');
ok(planner.includes('backgroundColor:C.selection'),'Working Toward selected options must use semantic selection styling');

const profile=read('src/components/ProfileAudiencePreviewModal.tsx');
ok(profile.includes('GameModalHeader')&&profile.includes('trailing={<View'),'Profile audience preview must use shared header with visibility state');

const button=read('src/components/GameButton.tsx');
ok(button.includes('selectedStyle')&&button.includes('C.selectionLine'),'Shared buttons must render selected state, not accessibility state only');
ok(button.includes("transform:[{translateY:1}]"),'Shared buttons must keep consistent pressed feedback');

console.log('PASS: modal, loading, selected, confirmation and picker interactions use the shared VELDRYN interaction system');
