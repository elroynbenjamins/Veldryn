export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const commands=read('src/core/game-commands.ts');
const online=read('src/core/online-game-repository.ts');
const backend=read('../../backend/online/gameplay.ts');
const app=read('App.tsx');
const feedback=read('src/components/ForgeResultFeedback.tsx');
const odds=read('src/components/ForgeOddsGuide.tsx');
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
ok(feedback.includes("result.autoSold!=='incoming'&&(result.rarity==='legendary'||result.rarity==='mythic')")&&feedback.includes('results.filter(isExceptionalForgeResult)'),'large reveal must be reserved for retained Legendary or Mythic gear');
ok(feedback.includes('equipment stats vs base gear')&&feedback.includes('result.statMultiplier-1'),'rarity reveal must explain the actual crafted stat multiplier against base gear');
ok(feedback.includes('Animated.sequence'),'exceptional Forge results need a brief celebration motion');
ok(feedback.includes('reduceMotion'),'Forge celebration must respect reduced motion');
ok(feedback.includes('4500'),'ordinary Forge feedback should dismiss automatically instead of blocking play');
ok(feedback.includes('forgeClaimBannerMessage'),'ordinary Forge claims need compact local feedback');
ok(feedback.includes('accentColor={meta?.color}')&&feedback.includes('accentSurface={meta?.surface}')&&feedback.includes('highlightText={meta?.label}')&&feedback.includes('meta.lightTextColor'),
  'Compact Forge feedback must highlight only the true rarity label with light-theme contrast');
ok(read('src/components/ActionFeedback.tsx').includes('message.lastIndexOf(highlightText)')&&read('src/components/ActionFeedback.tsx').includes('highlightTextColor'),
  'Shared feedback must highlight the exact rarity text, while the rest of the message remains readable');
ok(feedback.includes("best?.rarity==='mythic'?1.085:1.045")&&feedback.includes('borderWidth:best?.rarity===\'mythic\'?3:2'),
  'Mythic results must receive a stronger, reduced-motion-aware reveal treatment than Legendary');
ok(!feedback.includes('result.duplicateCount')&&!feedback.includes('Crafted copy #')&&!feedback.includes(' · copy ${result.duplicateCount+1}')&&feedback.includes('Equipment Pouch first')&&!feedback.includes('Added to inventory'),
  'Forge claim feedback must show pouch-first storage and avoid numbered equipment copy labels');
ok(feedback.includes('useWindowDimensions')&&feedback.includes("stackActions=width<360||fontScale>=1.25"),'Exceptional Forge result actions must adapt to narrow phones and large text');
ok(feedback.includes('actionsStack')&&feedback.includes("actionStack:{flex:0,width:'100%'}"),'Exceptional Forge result actions must stack full-width instead of squeezing');

ok(queue.includes('ForgeClaimBanner'),'normal Forge claims must surface inside the Forge queue');
ok(skills.includes('forgeResults={forgeResults}'),'Smithing must pass Forge results to its queue feedback');

ok(odds.includes('<View accessible accessibilityRole="adjustable"'),'Forge quality slider must own a dedicated adjustable touch surface');
ok(odds.includes('onStartShouldSetResponder={()=>true}')&&odds.includes('onMoveShouldSetResponder={()=>true}'),'slider must capture gesture from touch down, before screen navigation can claim it');
ok(odds.includes('onResponderTerminationRequest={()=>false}'),'screen swipe navigation must not steal active slider drags');
ok(odds.includes('onResponderGrant={event=>updateQuality(event.nativeEvent.locationX)}')&&odds.includes('onResponderMove={event=>updateQuality(event.nativeEvent.locationX)}'),'slider taps and drags must both update the preview');
ok(odds.includes("accessibilityActions={[{name:'increment'},{name:'decrement'}]}"),'slider must retain accessible increment/decrement controls');

console.log('PASS Forge claims use lightweight normal feedback and rarity-aware exceptional reveals');
