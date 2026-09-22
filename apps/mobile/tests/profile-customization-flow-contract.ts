export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const app=fs.readFileSync('App.tsx','utf8');
const screen=fs.readFileSync('src/screens/ProfileCustomizeScreen.tsx','utf8');
const appearance=fs.readFileSync('src/components/ProfileEditor.tsx','utf8');
const identity=fs.readFileSync('src/components/OnlineProfileExtensionPanel.tsx','utf8');
const preview=fs.readFileSync('src/components/ProfileAudiencePreviewModal.tsx','utf8');

ok(app.includes('profileCustomizeDirty'),'App must track profile customization dirty state');
ok(app.includes('Discard profile changes?')&&app.includes('Keep editing')&&app.includes('Discard changes'),'Leaving customization must require an explicit discard choice');
ok(app.includes("tab!=='ProfileCustomize'||!profileCustomizeDirty"),'Navigation guard must only intercept dirty Customize Profile exits');
ok(app.includes('onDirtyChange={setProfileCustomizeDirty}'),'Customize Profile must report dirty state to app navigation');

ok(screen.includes('appearanceDirty||identityDirty'),'Appearance and identity drafts must both participate in dirty state');
ok(screen.includes("sectionHidden:{display:'none'}"),'Customization tabs must stay mounted instead of being destroyed on tab switches');
ok(screen.includes('onPreviewStateChange={setAppearancePreview}'),'Appearance draft must feed the audience preview');
ok(screen.includes('onDraftChange={setIdentityDraft}'),'Identity draft must feed the audience preview');
ok(screen.includes('Preview as others see me')&&screen.includes('ProfileAudiencePreviewModal'),'Customize Profile must expose the audience preview');

ok(appearance.includes('onDirtyChange?:(dirty:boolean)=>void')&&appearance.includes('onPreviewStateChange?:(preview:GameState)=>void'),'Appearance editor must expose draft/dirty callbacks');
ok(appearance.includes('JOURNAL_TITLES_V42')&&appearance.includes("journalTitles.map"),'Earned Adventurer\'s Journal titles must be selectable from Profile customization');
ok(identity.includes('onDirtyChange?:(dirty:boolean)=>void')&&identity.includes('onDraftChange?:(draft:ProfileExtensionSelfV43|null)=>void'),'Social profile editor must expose draft/dirty callbacks');
ok(identity.includes("picker==='mastery'")&&identity.includes("title={'Mastery '+value.masteryShowcaseActionIds.length+'/3 ▾'}"),'Social profile editor must expose a three-slot R50 mastery showcase picker');
ok(identity.includes('professionMasteryMasteredRecords(state)'),'Mastery showcase choices must be derived only from R50-owned profession records');
ok(identity.includes('masteryShowcaseActionIds:value.masteryShowcaseActionIds'),'Mastery showcase selections must participate in dirty/save state');

ok(preview.includes("id:'public'")&&preview.includes("id:'guild'")&&preview.includes("id:'self'"),'Audience preview must simulate public, guild and self viewers');
ok(preview.includes('profileAudienceCanView'),'Audience preview must use the shared privacy visibility rule');
ok(preview.includes('This preview never publishes or saves changes.'),'Audience preview must explain that it is non-destructive');
ok(preview.includes('WORLD MILESTONES HIDDEN'),'Audience preview must surface World Milestones opt-out state');
ok(preview.includes('masteryShowcaseActionIds')&&preview.includes('No featured R50 masteries'),'Audience preview must include the selected R50 mastery showcase row');

console.log('PASS: profile drafts persist across tabs, unsafe exits are guarded, and audience preview is available');
