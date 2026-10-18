export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const attention=read('src/core/navigation-notifications.ts');
const account=read('src/screens/MoreScreen.tsx');
const inspector=read('src/components/ItemQuickInspect.tsx');
const confirmation=read('src/components/ConfirmModal.tsx');

ok(app.includes('...actionableClaimNotifications({storyRewards:storyClaimCount,eventClaims:eventClaimCount,overflowStacks:overflowStackCount})'),
 'Only earned, unclaimed quest/event rewards and real overflow contribute to navigation dots');
ok(app.includes("earlyFeatureUnlocked(state,'events')?eventReadyClaimCount(state,now):0"),
 'Event attention honors event unlocks and exact claim-grace eligibility');
ok(app.includes('storyRewardCount={storyClaimCount} eventRewardCount={eventClaimCount}'),
 'Account hub receives the same earned claim counts as top-bar navigation');
ok(attention.includes("story_reward_ready:'Quests'")&&attention.includes("inventory_overflow:'Inventory'"),
 'Actionable claims lead to existing destinations instead of adding tabs');
ok(account.includes("if(id==='Quests'&&storyRewardCount>0)")&&account.includes("if(id==='Events'&&eventRewardCount>0)"),
 'Account hub only highlights quests and events with outstanding claims');
ok(account.includes("const attentionPriority:MoreDestination[]=['Quests','Events'"),
 'Account hub prioritizes genuinely claimable rewards');

ok(inspector.includes('<GameModalSurface visible={true}')&&inspector.includes('reduceMotion={state.settings.reduceMotion}'),
 'Item Quick Inspect uses shared accessibility, safe area, keyboard and reduce-motion modal shell');
ok(!inspector.includes('<Modal visible transparent'),
 'Do not reintroduce standalone modal that bypasses the shared sheet layout');
ok(inspector.includes('const model=useMemo(()=>itemId?itemInspectModel(state,itemId):undefined,[state,itemId])'),
 'Opening expandable item sections does not recompute item inspection');
ok(inspector.includes('prioritizeItemSources(model.sources)'),
 'Item sources stay sorted by actionable navigation readiness');

ok(confirmation.includes('<GameModalSurface visible={visible} presentation="dialog"')&&confirmation.includes('stackActions=width<360||fontScale>=1.25'),
 'All confirmation modals retain the shared responsive layout and safe area behavior');
ok(confirmation.includes('surface:{maxWidth:460,padding:spacing.md')&&confirmation.includes('actions:{flexDirection:\'row\',gap:spacing.sm'),
 'Confirmation sheets keep a compact maximum width and button spacing');
console.log('PASS: actionable claim indicators and common compact item modal integration');
