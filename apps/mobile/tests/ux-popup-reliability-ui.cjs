const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const trials=read('src/components/CombatCompanionPanel.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const app=read('App.tsx');
const confirm=read('src/components/ConfirmModal.tsx');
const priority=read('src/core/global-popup-priority.ts');
assert(trials.includes("visible={trialSheet!==null&&trialSheet!=='battle'}"),
  'The Trial bottom sheet must never remain open behind the fullscreen Theater');
assert(trials.includes("trialSheet==='battle'?<CombatTheaterModal"),
  'The Theater remains available when selecting a Trial encounter');
assert(!trials.includes("{trialSheet==='battle'&&<CompanionTrialStage"),
  'The Trial stage must not also mount inside an invisible sheet');
assert(settings.includes("onStopActivity:()=>Promise<void>"),
  'Settings requires a settled activity-stop handler');
assert(settings.includes("<ConfirmModal visible={confirmStop} busy={stopping}"),
  'Stopping an activity requires a busy-safe confirmation');
assert(!settings.includes("onPress={()=>onChange({...state,activity:null})}"),
  'The old unsafe direct activity nulling must never return');
assert(app.includes("onStopActivity={()=>runCompanionCommand({type:'stop'})}"),
  'Settings must use the online/offline gameplay command for cancellation');
assert(confirm.includes("dismissOnBackdrop={!busy}")&&confirm.includes("closeDisabled={busy}"),
  'Busy confirmation dialogs must not permit duplicate submissions or dismissal');
assert(app.includes('selectGlobalPopup({...popupCandidates,blocked:popupBlocked})'),
  'A shared popup coordinator must drive global modal visibility');
assert(app.includes('hasBlockingAlert=useSyncExternalStore(gameAlerts.subscribe,gameAlerts.getSnapshot,gameAlerts.getSnapshot)'),
  'Open alert dialogs must defer automatic global popups');
for(const marker of ["activeGlobalPopup==='activity-reward'","activeGlobalPopup==='first-session'","activeGlobalPopup==='feature-unlock'","activeGlobalPopup==='customization-unlock'","activeGlobalPopup==='exceptional-forge'","activeGlobalPopup==='story-boss'","activeGlobalPopup==='event-start'","activeGlobalPopup==='whats-new'"]){
 assert(app.includes(marker),'Global modal visibility must respect the selected presentation: '+marker);
}
assert(!app.includes("showAlert('Forge complete'"),'Routine Forge success must not open a blocking alert');
assert(app.includes('setForgeClaimFeedback(count+'),'The Forge fallback must use nonblocking success feedback');
assert(priority.includes("if(value.whatsNew)return 'whats-new'"),
  'Release notes remain lowest-priority announcements');
console.log('PASS: Trial Theater exclusivity, safe Settings Stop, and shared popup visibility');
