export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const quests=read('src/screens/QuestScreen.tsx');
const run=read('src/components/coop/CoopRunOverview.tsx');
const coop=read('src/screens/CoopExpeditionScreen.tsx');

ok(quests.includes('CHAPTER COMPLETE'),'claimed story chapters need a clear completion moment');
ok(quests.includes("seasonalChallengeText(language,rarity.label).toLocaleUpperCase(language)+' '+seasonalChallengeText(language,'CACHE CLAIMED')"),'personal contracts must identify the rarity of the claimed cache');
ok(quests.includes('label={t("Rewards secured")}')&&quests.includes('gold={moment.gold} xp={moment.xp} itemId={moment.itemId} quantity={moment.quantity??1}'),'quest completion feedback must localize the label and repeat the exact secured reward bundle');
ok(quests.includes('detail:t("Rewards secured · the next available story beat is now ready.")'),'chapter claim must localize the next-step handoff');
ok(quests.includes('newlyConfirmedIds'),'claim celebration must derive from committed claim state rather than the button press');
ok(quests.includes('Animated.sequence')&&quests.includes('reduceMotion'),'quest completion motion must be brief and respect Reduce Motion');

ok(run.includes('s.rewardCrest')&&run.includes('st("EXPEDITION CLEARED")'),'Completed dungeons need an illustrated, localized victory moment');
ok(run.includes('reward.claimed_at?st("CLAIMED"):st("READY")'),'Dungeon rewards distinguish secured claims from claimable entitlements');
ok(run.includes('Collect the expedition reward below.'),'victory screen must point directly at the next primary action');
ok(run.includes("rewardSurfaceReady=rewards.length>0||Boolean(terminalAction)"),'dungeon completion must wait for a real reward surface before declaring rewards secured');
ok(run.includes("title={st('View rewards')}")&&run.includes('title={st("Return to dungeon list")}'),'Terminal runs must offer reopening rewards and explicit return from the popup');
ok(run.includes('visible={rewardOpen&&!theaterOpen}')&&run.includes('onClaim?.(reward.id)'),'Reward claim must only display after combat and use server-confirmed entitlements');
ok(run.includes('Animated.sequence')&&run.includes('reduceMotion'),'dungeon victory motion must respect Reduce Motion');
ok(coop.includes('reduceMotion={state.settings.reduceMotion}'),'co-op screen must pass the player motion preference into terminal feedback');

console.log('PASS quest, contract and dungeon completion feedback provides clear completion-to-reward handoff');
