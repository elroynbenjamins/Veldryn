export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const editor=fs.readFileSync('src/components/ProfileEditor.tsx','utf8');
const identity=fs.readFileSync('src/components/profile/ProfileIdentityPanel.tsx','utf8');
const showcase=fs.readFileSync('src/components/profile/ProfileShowcasePanel.tsx','utf8');
const look=fs.readFileSync('src/components/profile/ProfileLookPanel.tsx','utf8');
const stage=fs.readFileSync('src/components/profile/ProfileStage.tsx','utf8');
const modalShell=fs.readFileSync('src/components/GameModalSurface.tsx','utf8');
const publicScene=fs.readFileSync('src/components/PublicProfileScene.tsx','utf8');
const preview=fs.readFileSync('src/components/ProfileScenePreview.tsx','utf8');
const profile=fs.readFileSync('src/screens/ProfileScreen.tsx','utf8');

for(const [componentName,source] of [['ProfileEditor',editor],['ProfileIdentityPanel',identity],['ProfileShowcasePanel',showcase],['ProfileLookPanel',look],['ProfileStage',stage],['PublicProfileScene',publicScene],['ProfileScenePreview',preview]] as const){
 ok(source.includes('useGameTheme'),componentName+' must read the active UI theme');
 ok(source.includes('makeStyles(C:ThemeColors)'),componentName+' must build styles from the active theme');
}

for(const forbidden of ['#172c3c','#20384A','#101B27','#132737','#332515','#101b29']){
 ok(![editor,identity,showcase,look,stage,profile,preview].some(source=>source.includes(forbidden)),'Profile UI must not regress to dark-only hardcoded surface '+forbidden);
}
ok(editor.includes('C.infoSurface')&&editor.includes('C.selection'),'Appearance editor must use semantic info/selection surfaces');
ok(look.includes('C.selection')&&stage.includes('C.infoSurface'),'Look tab and stage must use semantic selection/info surfaces');
ok(identity.includes('C.warningSurface')&&showcase.includes('C.warningSurface')&&showcase.includes('GameModalSurface')&&look.includes('C.warningSurface')&&modalShell.includes('C.overlay'),'Social profile settings must keep semantic warning surfaces and delegate overlay rendering to the shared modal shell');
ok(profile.includes('C.goodSurface')&&profile.includes('C.warningSurface'),'Profile status badges must use semantic success/warning surfaces');
ok(publicScene.includes("C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'"),"Public showcase identity plate must remain legible in dark and light themes");
ok(preview.includes('profileT(language,"Pet preview")')&&!preview.includes("'Companion preview'"),'Cosmetic profile preview must call the cosmetic a Pet');

console.log('PASS: profile customization is theme-aware across Obsidian and Ivory Steel');
