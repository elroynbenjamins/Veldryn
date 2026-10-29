const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/screens/SettingsScreen.tsx'),'utf8');
const dictionary=fs.readFileSync(path.join(root,'src/i18n/account.ts'),'utf8');
const gameplay=src.slice(src.indexOf("{section==='gameplay'&&"),src.indexOf("{section==='chat'&&"));
const chat=src.slice(src.indexOf("{section==='chat'&&"),src.indexOf("{section==='accessibility'&&"));
const appearance=src.slice(src.indexOf("{section==='appearance'&&"),src.indexOf("{section==='guide'&&"));
const accessibility=src.slice(src.indexOf("{section==='accessibility'&&"),src.indexOf("{section==='data'&&"));
const data=src.slice(src.indexOf("{section==='data'&&"),src.indexOf("{section==='developer'&&"));
assert(src.includes("type SettingsSection='gameplay'|'chat'|"),'Chat has its own typed Settings section');
assert(src.includes("'gameplay','chat','appearance','accessibility'"),'Chat follows Gameplay in Settings navigation');
assert(!gameplay.includes('chatDockLines')&&!gameplay.includes('ChatEmotePicker'),'Chat options no longer clutter Gameplay');
assert(gameplay.includes("accessibilityState={{expanded:showAfkDetails}}")&&gameplay.includes('showAfkDetails?<View'),'AFK explanation is progressively disclosed');
assert(chat.includes('autoJoinWorldChat!==false?<View'),'Advanced chat visibility options are hidden when chat is off');
assert(chat.includes('accessibilityState={{expanded:showEmotes}}')&&chat.includes('showEmotes?<View'),'Emote picker remains available behind an accessible disclosure');
assert(chat.includes('onTrayChange={chatEmoteTrayIds=>update({chatEmoteTrayIds})}'),'Existing emote persistence callback remains intact');
assert(!appearance.includes('Color roles'),'Redundant Appearance explanation is removed');
assert(!accessibility.includes('Notification preferences (coming soon)'),'Disabled notification placeholder removed');
assert(src.includes("(!section||section==='account')?"),'Utility links are kept on relevant Settings pages only');
assert(data.includes("online?<Panel>")&&data.includes("<SaveTransferPanel"),'Online export and offline import/export remain available');
assert(data.includes('accessibilityState={{expanded:showDeleteControls}}')&&data.includes('showDeleteControls?<View'),'Local-save deletion requires expanding a danger disclosure');
assert(data.includes('<GameButton title={a("Delete local save")} tone="danger" onPress={onReset}/>'),'Existing protected delete callback is preserved');
assert(!data.includes('Stop current activity'),'Stop activity is not mixed into save management');
assert(gameplay.includes('accessibilityState={{expanded:showActivityControls}}')&&gameplay.includes('showActivityControls?<View'),'Activity controls are available behind disclosure within Gameplay');
assert(gameplay.includes('onPress={()=>{setStopError(\'\');setConfirmStop(true)}}'),'Stopping an activity opens confirmation instead of discarding progress');
assert(src.includes('onStopActivity:()=>Promise<void>')&&src.includes('<ConfirmModal visible={confirmStop} busy={stopping}'),'Activity stop settles progress through the command handler');
assert(!src.includes('onPress={()=>onChange({...state,activity:null})}'),'Unsafe direct activity deletion has been removed');
assert(data.includes('onPress={()=>openExternal(PRIVACY_POLICY_URL)}'),'Privacy policy remains reachable');
for(const key of ['Data & Privacy','Current activity','Deleting your local save removes progress stored on this device.']){
 assert(dictionary.includes(JSON.stringify(key)+':'),'Localized data and safety label '+key+' is present');
}
const restore=src.match(/const restoreDefaults=\(\)=>update\(([^;]+);/);
assert(restore&&!restore[1].includes('autoJoinWorldChat')&&!restore[1].includes('chatDockLines'),'Restoring Gameplay defaults must not reset Chat choices');
for(const key of ['Chat','AFK details','Gameplay','Appearance','Accessibility','Data']){
 assert(dictionary.includes(JSON.stringify(key)+':'),'Localized setting key '+key+' is present');
}
console.log('PASS Settings tab separation, safe Data & Privacy actions and progressive disclosure');
