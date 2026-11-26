const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
function load(file,dependencies,globals={}){
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const sandbox={exports:{},Error,Promise,setTimeout,clearTimeout,console:{warn:()=>{}},...globals,require:name=>dependencies[name]??(name==='react'?React:name==='react/jsx-runtime'?require(name):{})};
 vm.runInNewContext(code,sandbox);return sandbox.exports;
}
const native={Pressable:'Pressable',Text:'Text',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:styles=>styles},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}};
const theme={'../storage/audio':{playSound(){}},'react-native':native,'../theme/ThemeContext':{useGameTheme:()=>({text:'#fff',bg:'#000',good:'#0f0',primaryButtonText:'#fff'})},'../theme/theme':{radii:{},spacing:{},typography:{}}};
async function buttons(){
 for(const [name,label,busy] of [['GameButton','title','loading'],['SocialActionButton','label','busy']]){
  const Button=load(`src/components/${name}.tsx`,theme)[name];let renderer,pending=deferred(),calls=0;
  const props={[label]:'Save',onPress:()=>{calls++;return pending.promise}};
  await act(async()=>{renderer=create(React.createElement(Button,props))});
  const press=()=>renderer.root.findByType('Pressable').props;
  await act(async()=>{const handler=press().onPress;handler();handler()});
  assert.equal(calls,1,`${name} rejects same-tick duplicate presses`);
  assert.equal(press().accessibilityState.busy,true);assert.equal(press().disabled,true);
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length,1);
  await act(async()=>{pending.resolve();await pending.promise});
  assert.equal(press().accessibilityState.busy,false);assert.equal(press().disabled,false);
  pending=deferred();await act(async()=>press().onPress());
  await act(async()=>{pending.reject(Error('offline'));await pending.promise.catch(()=>{})});
  assert.equal(press().disabled,false,`${name} recovers after rejection`);
  await act(async()=>renderer.update(React.createElement(Button,{...props,[busy]:true})));
  assert.equal(renderer.root.findAllByType('ActivityIndicator').length,1);
  await act(async()=>press().onPress());assert.equal(calls,2,'Explicit busy cannot submit again');
  await act(async()=>renderer.unmount());
 }
}
async function commandBusy(){
 let latest,request=deferred(),calls=0;
 const snapshot={accountId:'a',version:1,state:null};
 const repo={accountId:'a',snapshot,refresh:async()=>snapshot,hasPending:async()=>false,execute:()=>{calls++;return request.promise}};
 const {useOnlineGame}=load('src/online/useOnlineGame.ts',{
  'react-native':native,'./AuthSessionProvider':{useAuthSession:()=>({session:{user:{id:'a'}}})},
  './gameplay':{serverGameplayEnabled:true,createOnlineGameRepository:()=>repo},'./supabase':{supabase:null},
  '../core/online-snapshot-cache':{rememberOnlineSnapshot:()=>{}},
 });
 function Harness(){latest=useOnlineGame();return null;}
 let renderer;await act(async()=>{renderer=create(React.createElement(Harness))});
 let saving;await act(async()=>{saving=latest.execute({type:'claim'});await assert.rejects(latest.execute({type:'claim'}),/already being saved/)});
 assert.equal(calls,1);assert.equal(latest.busy,true,'Rejected overlap cannot clear the first request spinner');
 await act(async()=>{request.resolve(snapshot);await saving});assert.equal(latest.busy,false);
 request=deferred();let failure;await act(async()=>{failure=latest.execute({type:'claim'}).catch(error=>error)});
 await act(async()=>{request.reject(Error('offline'));await failure});assert.equal(latest.busy,false);assert.equal(latest.error,'offline');
 repo.hasPending=async()=>true;
 repo.execute=async()=>{calls++;return {...snapshot,executedCommand:{type:'claim'}}};
 await act(async()=>{await latest.execute({type:'claim'})});
 assert.equal(calls,3,'The hook delegates pending recovery to the idempotent repository rather than rejecting a new tap');
 assert.equal(latest.pending,false,'Successful recovery clears the player-facing pending state');
 assert.equal(latest.error,'','Successful recovery clears the previous network error');
 await act(async()=>renderer.unmount());
}
async function combatSwapOptimism(){
 let latest,pending=deferred();
 const authoritative={accountId:'a',version:1,state:{weapon:'OLD_WEAPON'}};
 const repo={accountId:'a',snapshot:authoritative,refresh:async()=>repo.snapshot,hasPending:async()=>false,execute:()=>pending.promise};
 const {useOnlineGame}=load('src/online/useOnlineGame.ts',{
  'react-native':native,
  './AuthSessionProvider':{useAuthSession:()=>({session:{user:{id:'a'}}})},
  './gameplay':{serverGameplayEnabled:true,createOnlineGameRepository:()=>repo},
  './supabase':{supabase:null},
  '../core/online-snapshot-cache':{rememberOnlineSnapshot:()=>{}},
  '../core/combat-equipment-optimistic':{previewCombatEquipmentCommand:(state,command)=>
   command.type==='gear_equip'?{...state,weapon:command.args.instanceId}:null},
 });
 function Harness(){latest=useOnlineGame();return null;}
 let renderer;
 await act(async()=>{renderer=create(React.createElement(Harness))});
 let waiting;
 await act(async()=>{waiting=latest.execute({type:'gear_equip',args:{instanceId:'NEW_WEAPON'}});await Promise.resolve()});
 assert.equal(latest.snapshot.state.weapon,'NEW_WEAPON','Weapon should visibly change before server acknowledgement');
 assert.equal(repo.snapshot.state.weapon,'OLD_WEAPON','Optimistic equipment must never mutate authoritative state');
 await act(async()=>{pending.reject(Error('connection_lost'));await waiting.catch(()=>{})});
 assert.equal(latest.snapshot.state.weapon,'OLD_WEAPON','Server failure must restore the original equipped weapon');
 assert.equal(latest.busy,false,'Failed swap must release the command lock');

 pending=deferred();
 await act(async()=>{waiting=latest.execute({type:'gear_equip',args:{instanceId:'NEW_WEAPON'}});await Promise.resolve()});
 const confirmed={...authoritative,version:2,state:{weapon:'NEW_WEAPON',hp:77}};
 await act(async()=>{pending.resolve(confirmed);await waiting});
 assert.equal(latest.snapshot.state.hp,77,'Server-confirmed state must replace the temporary preview');
 assert.equal(latest.busy,false,'Confirmed swap must release the command lock');
 await act(async()=>renderer.unmount());
}

async function socialBadgeParallelAndRecovery(){
 let latest,account='a',mode='first',reward=deferred(),applications=deferred(),friend=deferred(),started=[];
 let membership={account_id:'a',guild_id:'g',role:'leader'};
 const {useSocialNotificationCounts}=load('src/online/useSocialNotificationCounts.ts',{
  'react-native':native,
  './AuthSessionProvider':{useAuthSession:()=>({session:account?{user:{id:account}}:null})},
  './social':{
   incomingFriendRequestCount:async()=>{if(mode==='failure')throw Error('offline');return mode==='first'?friend.promise:2;},
   socialInvitations:async()=>{if(mode==='failure')throw Error('offline');return {guild:[1],party:[1,2]};},
   socialChatAttention:async()=>({guild:{unread:3,mentions:1},party:{unread:0,mentions:0}}),
   myGuild:async()=>{if(mode==='failure')throw Error('offline');return mode==='left'?null:membership;},
   guildApplications:()=>{started.push('applications');return mode==='newGuildFailure'?Promise.reject(Error('offline')):applications.promise;},
  },
  './guild-projects-v18':{claimableOnlineGuildProjectRewardCount:()=>{started.push('rewards');return mode==='newGuildFailure'?Promise.reject(Error('offline')):reward.promise;}},
 });
 function Harness(){latest=useSocialNotificationCounts();return null;}
 let renderer;
 await act(async()=>{renderer=create(React.createElement(Harness));});
 assert.deepEqual(started,['rewards','applications'],'Guild badge reads must start before either guild read or the independent friend request resolves');
 await act(async()=>{friend.resolve(2);reward.resolve(4);applications.resolve([1,2,3]);});
 assert.equal(latest.counts.guildProjectRewards,4);
 assert.equal(latest.counts.guildApplications,3);
 assert.equal(latest.counts.guild,4);
 assert.equal(latest.counts.friendRequests,2);
 assert.equal(latest.counts.partyInvites,2);
 mode='failure';
 await act(async()=>{await latest.refresh();});
 assert.equal(latest.counts.guildProjectRewards,4,'An unknown membership must not erase a confirmed reward count');
 assert.equal(latest.counts.guildApplications,3);
 assert.equal(latest.counts.friendRequests,2);
 assert.equal(latest.counts.partyInvites,2);
 membership={...membership,guild_id:'g2'};mode='newGuildFailure';
 await act(async()=>{await latest.refresh();});
 assert.equal(latest.counts.guildProjectRewards,0,'A new guild cannot inherit the former guild reward count');
 assert.equal(latest.counts.guildApplications,0);
 mode='left';
 await act(async()=>{await latest.refresh();});
 assert.equal(latest.counts.guildProjectRewards,0,'Confirmed non-membership clears guild-specific badges');
 assert.equal(latest.counts.guildApplications,0);
 mode='first';reward=deferred();applications=deferred();
 let old;
 await act(async()=>{old=latest.refresh();});
 account=undefined;
 await act(async()=>{renderer.update(React.createElement(Harness));});
 await act(async()=>{reward.resolve(99);applications.resolve([1,2,3]);await old;});
 assert.equal(latest.counts.guildProjectRewards,0,'A prior account response cannot populate signed-out badges');
 assert.equal(latest.counts.friendRequests,0);
 await act(async()=>renderer.unmount());
}

async function socialStartupPriority(){
 let latest,enabled=false,account='a',calls=0,subscriptions=0,unsubscribed=0;
 const timers=new Map();let sequence=0;
 const {useSocialNotificationCounts}=load('src/online/useSocialNotificationCounts.ts',{
  'react-native':{AppState:{currentState:'active',addEventListener:()=>{subscriptions++;return {remove:()=>{unsubscribed++}}}}},
  './AuthSessionProvider':{useAuthSession:()=>({session:{user:{id:account}}})},
  './social':{
   incomingFriendRequestCount:async()=>{calls++;return 3;},
   socialInvitations:async()=>({guild:[],party:[]}),
   socialChatAttention:async()=>({}),
   myGuild:async()=>null,
  },
  './guild-projects-v18':{},
 },{setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
 function Harness(){latest=useSocialNotificationCounts(enabled);return null;}
 let renderer;
 await act(async()=>{renderer=create(React.createElement(Harness));});
 assert.equal(calls,0,'Startup must not request optional badges before gameplay is usable');
 assert.equal(subscriptions,0);assert.equal(timers.size,0);
 enabled=true;await act(async()=>renderer.update(React.createElement(Harness)));
 assert.equal(calls,1);assert.equal(latest.counts.friendRequests,3);
 assert.equal(subscriptions,1);assert.equal(timers.size,1);
 enabled=false;await act(async()=>renderer.update(React.createElement(Harness)));
 assert.equal(timers.size,0);assert.equal(unsubscribed,1);
 assert.equal(latest.counts.friendRequests,3,'Pausing polling preserves confirmed badges');
 await act(async()=>latest.refresh());assert.equal(calls,2,'Explicit refresh remains available');
 account='b';await act(async()=>renderer.update(React.createElement(Harness)));
 assert.equal(latest.counts.friendRequests,0,'A new account cannot inherit paused badges');
 assert.equal(calls,2,'New account startup remains deferred');
 await act(async()=>renderer.unmount());
}
function rewardPreviewClock(){
 const {activityRewardPreviewClock:clock}=load('src/components/activity-preview-clock.ts',{});
 const combat={kind:'combat',lastClaimAtMs:1000};
 assert.deepEqual([6000,8000,10000,12000,14000,16000].map(now=>clock(now,combat)),[5000,5000,10000,10000,10000,15000]);
 assert.equal(clock(12000,{kind:'mining',lastClaimAtMs:11900}),11900,'New claims must not sample before their checkpoint');
 assert.equal(clock(12000,{kind:'combat',lastClaimAtMs:13000}),12000,'Never sample in the future if server time leads the display clock');
 for(const kind of ['woodcutting','fishing','herbalism','exploration'])assert.equal(clock(12000,{kind,lastClaimAtMs:0}),10000);
 for(const kind of ['faith','alchemy','processing'])assert.equal(clock(12000,{kind,lastClaimAtMs:0}),12000,'Timed special activities retain their exact clock');
 assert.equal(clock(12000,combat,true),12000,'Class training retains its original clock');
 assert.equal(clock(12000),12000);
 const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
 assert.ok(app.includes('previewActivityReward(state,activityPreviewMs):undefined,[state,activityPreviewMs]'),'The expensive root replay uses the sampled clock and invalidates on a new state');
 assert.ok(app.includes('nowMs={now} reward={preview}'),'The top bar still receives the original live clock');
}
function foregroundTaskLifecycle(){
 let onStatus,removed=0,ticks=0,currentTick,sequence=0;
 const timers=new Map();
 const appState={currentState:'background',addEventListener:(event,listener)=>{
  assert.equal(event,'change');onStatus=listener;return {remove:()=>{removed++}};
 }};
 const {runWhileForeground}=load('src/online/foreground-tasks.ts',{'react-native':{AppState:appState}},{
  setInterval:(fn,ms)=>{assert.equal(ms,750);const id=++sequence;timers.set(id,fn);return id;},
  clearInterval:id=>timers.delete(id),
 });
 const stop=runWhileForeground(isCurrent=>{assert.ok(isCurrent());currentTick=isCurrent;ticks++},750);
 assert.equal(ticks,0,'Background mounting must not start a replay timer');
 assert.equal(timers.size,0);
 onStatus('active');assert.equal(ticks,1);assert.equal(timers.size,1);
 onStatus('active');assert.equal(ticks,1,'Duplicate active events must not start another timer');
 [...timers.values()][0]();assert.equal(ticks,2);
 const previousVisit=currentTick;
 onStatus('background');assert.equal(timers.size,0);assert.equal(previousVisit(),false);
 onStatus('active');assert.equal(ticks,3);assert.equal(timers.size,1);assert.equal(previousVisit(),false);
 stop();assert.equal(timers.size,0);assert.equal(removed,1);assert.equal(currentTick(),false);
}
async function foregroundHuntReplay(){
 let starts=0,stops=0,projections=0,latestA,latestB;
 const {useLiveHuntProjection}=load('src/components/useLiveHuntProjection.ts',{
  '../core/game':{activeCombatHitProjection:(_state,clock)=>{projections++;return {cursor:{atMs:clock}}}},
  '../online/foreground-tasks':{runWhileForeground:(_task,interval)=>{assert.equal(interval,750);starts++;return ()=>{stops++}}},
 });
 const state={character:{id:'a'},activity:{kind:'combat'}};
 function A(){latestA=useLiveHuntProjection(state,true);return null;}
 function B(){latestB=useLiveHuntProjection(state,true);return null;}
 let one,two;
 await act(async()=>{one=create(React.createElement(A));two=create(React.createElement(B))});
 assert.equal(starts,1,'One shared foreground clock serves both hunt surfaces');
 assert.equal(projections,1,'Both surfaces share one initial projection');
 assert.equal(latestA,latestB);
 await act(async()=>one.unmount());assert.equal(stops,0);
 await act(async()=>two.unmount());assert.equal(stops,1,'Last subscriber disposes the foreground clock');
}
function wiring(){
 const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.tsx'))files.push(file);}}
 walk(path.join(__dirname,'../src'));files.push(path.join(__dirname,'../App.tsx'));
 for(const file of files){const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(ast),attrs=node.attributes.properties;
   if(['GameButton','SocialActionButton'].includes(tag)){
    const press=attrs.find(prop=>prop.name?.getText(ast)==='onPress')?.initializer?.expression;
    if(press&&ts.isArrowFunction(press)&&ts.isVoidExpression(press.body))assert.ok(attrs.some(prop=>prop.name?.getText(ast)===(tag==='GameButton'?'loading':'busy')),`${file} discards its action promise without loading feedback`);
   }
  }ts.forEachChild(node,visit);
 }visit(ast);}
 const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
 assert.ok(!app.includes("pointerEvents={serverGameplayEnabled&&online.busy?'none':'auto'}"),'Network saves must not freeze scrolling and navigation');
 assert.ok(!app.includes("showAlert('Online action'"),'Routine command failures use inline feedback');
 assert.ok(app.includes('message={onlineActionError}'),'Online failures remain visible inline');
 assert.ok(app.includes('useSocialNotificationCounts(socialPollingReady)')&&app.includes('const socialPollingReady=loadOptionalContent&&ready&&!auth.recovering&&!!state?.character'),'Automatic social reads wait for a playable character shell');
 // Foreground refresh can finish with a durable pending command. That must
 // never leave a full-screen touch shield waiting for a claim that cannot run.
 assert.ok(!app.includes('onlineForegroundSettlementRef'),'Online foreground refresh cannot latch offline settlement UI');
 assert.ok(/useEffect\(\(\)=>\{if\(serverGameplayEnabled\)return;\s*const subscription=AppState\.addEventListener\('change',nextStatus=>\{[^\n]*settlingRef\.current=true;setOfflineSettling\(true\)/.test(app),'Only local mode registers the foreground settlement listener');
 assert.ok(app.includes('{!serverGameplayEnabled&&offlineSettling&&<View style={s.offlineLoadingOverlay}>'),'Full-screen settlement is local-only');
 assert.ok(app.includes('{serverGameplayEnabled&&(offlineSettling||(online.busy&&!quietCraftSaving))?<View pointerEvents="none"'),'Online settlement status never intercepts touches');
 assert.ok(app.includes('online.loading||online.busy||online.pending||onlineStartupSettlementAccountRef.current===arrivalKey'),'Automatic settlement still waits for existing commands');
 assert.ok(app.includes('disabled={online.busy} onPress={()=>perform()}'),'Pending command stays explicitly retryable');
 assert.ok(app.includes('finally{if(welcomeBack)setOfflineSettling(false);}'),'Actual claim status clears on success or failure');

}
(async()=>{await buttons();await commandBusy();await combatSwapOptimism();await socialBadgeParallelAndRecovery();await socialStartupPriority();rewardPreviewClock();foregroundTaskLifecycle();await foregroundHuntReplay();wiring();console.log('PASS: online loading indicators, duplicate suppression, rejection recovery, overlapping-command busy state and non-blocking app feedback');})().catch(error=>{console.error(error);process.exitCode=1});
