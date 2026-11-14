// Keep actual hunt skill feedback aligned with the approved class icon palette.
// This deliberately checks both live combat surfaces and the shared renderer.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
const palette=source('content/class-icon-colors.ts');
const cues=source('components/HuntAbilityCues.tsx');
const classes=['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'];
const colors=classes.map(id=>{
 const match=palette.match(new RegExp('\\b'+id+':\\s*[\\\x27\\\x22](#[0-9A-Fa-f]{6})'));
 assert.ok(match,'Class icon must have an authored accent: '+id);
 return match[1].toUpperCase();
});
assert.equal(new Set(colors).size,classes.length,'Every class must keep its unique emblem accent');
assert.ok(cues.includes("CLASS_ICON_ACCENT[classId]"),'Class cues must use the canonical icon palette, not a generic theme accent');
assert.ok(cues.includes("effect.source==='class'?CLASS_ICON_ACCENT[classId]"),'Defensive/healing class effects must share the same class icon tint');
assert.ok(cues.includes("effect.source==='class'&&C.dark?color:C.text"),'Class name color must remain readable in the light theme');
for(const file of ['components/BattleStage.tsx','components/HuntingPreview.tsx']){
 const screen=source(file);
 assert.ok(screen.includes('classId={state.character!.classId}'),file+' must pass the selected class to the shared skill renderer');
 assert.ok(screen.includes('<HuntAbilityCues'),file+' must render authoritative skill feedback');
}
console.log('PASS: all nine class icon accents drive real hunt skill labels in both combat views');
