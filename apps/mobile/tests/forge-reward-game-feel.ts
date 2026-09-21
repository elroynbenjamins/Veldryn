export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const commands=read('src/core/game-commands.ts');
const online=read('src/core/online-game-repository.ts');
const backend=read('../../backend/online/gameplay.ts');
const app=read('App.tsx');
const feedback=read('src/components/ForgeResultFeedback.tsx');
const queue=read('src/components/EquipmentCraftQueuePanel.tsx');
const skills=read('src/screens/SkillsScreen.tsx');

ok(commands.includes("export type ForgeCraftResult=ReturnType<typeof claimEquipmentCraft>['result']"),'Forge UI must use the authoritative crafted-instance result shape');
ok(commands.includes('forgeResults=[result.result]'),'single Forge claim must expose its structured result');
ok(commands.includes('forgeResults=result.results'),'claim-all must expose every structured Forge result');
ok(commands.includes('forgeResults,contributions'),'structured Forge results must leave the command layer');
ok(backend.includes('forgeResults:result.forgeResults'),'online gameplay response must return authoritative Forge results');
ok(online.includes("forgeResults?:GameCommandResult['forgeResults']"),'online snapshots must preserve Forge results');

ok(app.includes('ForgeRarityRevealModal'),'App must present exceptional Forge outcomes with the rarity reveal');
ok(app.includes('setForgeResults(result.forgeResults)'),'online Forge claims must use structured server results');
ok(app.includes('setForgeResults([claimed.result])'),'offline single claims must use the same result presentation');
ok(!app.includes("Alert.alert('Equipment forged'"),'successful Forge claims must not regress to generic alert dialogs');

ok(feedback.includes('EXCEPTIONAL FORGE RESULT'),'quality procs need a dedicated reward moment');
ok(feedback.includes("results.filter(row=>row.qualityProc)"),'large reveal must be reserved for true quality procs');
ok(feedback.includes('equipment stats vs this item'),'quality reveal must explain the actual stat benefit');
ok(feedback.includes('Animated.sequence'),'exceptional Forge results need a brief celebration motion');
ok(feedback.includes('reduceMotion'),'Forge celebration must respect reduced motion');
ok(feedback.includes('4500'),'ordinary Forge feedback should dismiss automatically instead of blocking play');
ok(feedback.includes('forgeClaimBannerMessage'),'ordinary Forge claims need compact local feedback');

ok(queue.includes('ForgeClaimBanner'),'normal Forge claims must surface inside the Forge queue');
ok(skills.includes('forgeResults={forgeResults}'),'Smithing must pass Forge results to its queue feedback');

console.log('PASS Forge claims use lightweight normal feedback and rarity-aware exceptional reveals');
