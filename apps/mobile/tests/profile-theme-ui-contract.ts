const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const editor=fs.readFileSync('src/components/ProfileEditor.tsx','utf8');
const online=fs.readFileSync('src/components/OnlineProfileExtensionPanel.tsx','utf8');
const publicScene=fs.readFileSync('src/components/PublicProfileScene.tsx','utf8');
const preview=fs.readFileSync('src/components/ProfileScenePreview.tsx','utf8');
const profile=fs.readFileSync('src/screens/ProfileScreen.tsx','utf8');

for(const [componentName,source] of [['ProfileEditor',editor],['OnlineProfileExtensionPanel',online],['PublicProfileScene',publicScene],['ProfileScenePreview',preview]] as const){
 ok(source.includes('useGameTheme'),componentName+' must read the active UI theme');
 ok(source.includes('makeStyles(C:ThemeColors)'),componentName+' must build styles from the active theme');
}

for(const forbidden of ['#172c3c','#20384A','#101B27','#132737','#332515','#101b29']){
 ok(!editor.includes(forbidden)&&!online.includes(forbidden)&&!profile.includes(forbidden)&&!preview.includes(forbidden),'Profile UI must not regress to dark-only hardcoded surface '+forbidden);
}
ok(editor.includes('C.infoSurface')&&editor.includes('C.selection'),'Appearance editor must use semantic info/selection surfaces');
ok(online.includes('C.warningSurface')&&online.includes('C.overlay'),'Social profile settings must use semantic warning/overlay surfaces');
ok(profile.includes('C.goodSurface')&&profile.includes('C.warningSurface'),'Profile status badges must use semantic success/warning surfaces');
ok(publicScene.includes("C.dark?'rgba(8,15,24,.82)':'rgba(255,255,255,.88)'"),'Public showcase identity plate must remain legible in dark and light themes');
ok(preview.includes("'Pet preview'")&&!preview.includes("'Companion preview'"),'Cosmetic profile preview must call the cosmetic a Pet');

console.log('PASS: profile customization is theme-aware across Veldryn, Obsidian and Ivory Steel');
