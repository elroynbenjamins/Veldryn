export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const quests=read('src/screens/QuestScreen.tsx');
const run=read('src/components/coop/CoopRunOverview.tsx');
const coop=read('src/screens/CoopExpeditionScreen.tsx');

ok(quests.includes('CHAPTER COMPLETE'),'claimed story chapters need a clear completion moment');
ok(quests.includes("rarity.label.toUpperCase()+' CACHE CLAIMED'"),'personal contracts must identify the rarity of the claimed cache');
ok(quests.includes('label="Rewards secured"'),'quest completion feedback must repeat the exact secured reward bundle');
ok(quests.includes("detail:'Rewards secured · the next available story beat is now ready.'"),'chapter claim must explain the next-step handoff');
ok(quests.includes('newlyConfirmedIds'),'claim celebration must derive from committed claim state rather than the button press');
ok(quests.includes('Animated.sequence')&&quests.includes('reduceMotion'),'quest completion motion must be brief and respect Reduce Motion');

ok(run.includes('✦ EXPEDITION CLEARED'),'completed dungeons need an explicit victory moment');
ok(run.includes("rewardsSecured?'REWARDS SECURED':'VICTORY'"),'dungeon completion must distinguish victory from fully secured rewards');
ok(run.includes('Collect the expedition reward below.'),'victory screen must point directly at the next primary action');
ok(run.includes("rewardSurfaceReady=rewards.length>0||Boolean(terminalAction)"),'dungeon completion must wait for a real reward surface before declaring rewards secured');
ok(run.includes("title={rewardsSecured?'Return to dungeon list':'Leave expedition'}"),'terminal runs need an explicit return action after reward handling');
ok(run.includes('Animated.sequence')&&run.includes('reduceMotion'),'dungeon victory motion must respect Reduce Motion');
ok(coop.includes('reduceMotion={state.settings.reduceMotion}'),'co-op screen must pass the player motion preference into terminal feedback');

console.log('PASS quest, contract and dungeon completion feedback provides clear completion-to-reward handoff');
