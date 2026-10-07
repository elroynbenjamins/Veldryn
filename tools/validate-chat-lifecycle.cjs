// Focused offline React lifecycle regressions. Native views and service calls are
// mocked; the actual chat hooks, cache, overlay, composer/picker, log and party provider run on
// React 19. No user accounts, network access or timers beyond the fake clock.
// Run after npm ci in apps/mobile: node tools/validate-chat-lifecycle.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const app = path.resolve(__dirname, '../apps/mobile');
const requireApp = Module.createRequire(path.join(app, 'package.json'));
const React = requireApp('react');
const {act, create} = requireApp('react-test-renderer');
const ts = requireApp('typescript');
global.IS_REACT_ACT_ENVIRONMENT = true;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

function makeHarness(initialState = 'active') {
  let clock = 1000, nextTimer = 0;
  const timers = new Map(), appListeners = new Set(), channels = [], removed = [], loaded = new Map();
  const auth = {session: {user: {id: 'alpha'}}};
  const original = {setTimeout, clearTimeout, setInterval, clearInterval, dateNow: Date.now};
  global.setTimeout = (fn, delay = 0) => {const id = ++nextTimer; timers.set(id, {fn, due: clock + delay, delay, interval: false}); return id;};
  global.clearTimeout = id => timers.delete(id);
  global.setInterval = (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, due: clock + delay, delay, interval: true}); return id;};
  global.clearInterval = id => timers.delete(id);
  Date.now = () => clock;
  const AppState = {currentState: initialState, addEventListener(type, fn) {assert.equal(type, 'change'); appListeners.add(fn); return {remove: () => appListeners.delete(fn)};}};
  const supabase = {
    channel(name) {
      const ch = {name, on(type, filter, callback) {assert.equal(type, 'postgres_changes'); this.filter = filter; this.insert = callback; return this;}, subscribe(callback) {this.status = callback; return this;}};
      channels.push(ch); return ch;
    },
    removeChannel(channel) {removed.push(channel); return Promise.resolve('ok');}
  };
  const mocks = new Map([
    ['react', React],
    ['react-native', {AppState}],
    [path.join(app, 'src/online/AuthSessionProvider'), {useAuthSession: () => auth}],
    [path.join(app, 'src/online/supabase'), {supabase, onlineConfigured: true}]
  ]);
  function load(file) {
    file = path.resolve(file);
    if (mocks.has(file)) return mocks.get(file);
    if (/\.(?:png|jpe?g|webp)$/.test(file)) return {uri: file};
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!path.extname(file)) file += fs.existsSync(file + '.tsx') ? '.tsx' : '.ts';
    if (loaded.has(file)) return loaded.get(file).exports;
    const mod = {exports: {}}; loaded.set(file, mod);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
    const localRequire = name => {
      if (mocks.has(name)) return mocks.get(name);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return requireApp(name);
    };
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(localRequire, mod, mod.exports, file, path.dirname(file));
    return mod.exports;
  }
  async function tick(ms) {
    const end = clock + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, t]) => t.due <= end).sort((a,b) => a[1].due-b[1].due)[0];
      if (!next) break;
      const [id, timer] = next; clock = timer.due;
      if (timer.interval) timer.due += timer.delay; else timers.delete(id);
      await act(async () => {timer.fn();});
    }
    clock = end;
  }
  async function state(next) {await act(async () => {AppState.currentState = next; for (const fn of [...appListeners]) fn(next);});}
  function restore() {global.setTimeout = original.setTimeout; global.clearTimeout = original.clearTimeout; global.setInterval = original.setInterval; global.clearInterval = original.clearInterval; Date.now = original.dateNow;}
  return {auth, AppState, channels, removed, timers, appListeners, mocks, load, tick, state, restore};
}

async function feedLifecycle() {
  const h = makeHarness();
  let tree;
  try {
    const {useChatFeed} = h.load(path.join(app, 'src/online/useChatFeed'));
    let reads = 0, concurrent = 0, maxConcurrent = 0;
    const pending = [], snapshots = {};
    const read = () => {reads++; concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent); const d = deferred(); pending.push(d); return d.promise.finally(() => concurrent--);};
    function Probe({id, active}) {const feed = useChatFeed({key: 'world:en', read, initial: [], active, channelType: 'world', channelId: 'en'}); snapshots[id] = feed; return React.createElement('feed', {id, rows: feed.value, error: feed.error});}
    const render = (a,b) => React.createElement(React.Fragment, null, React.createElement(Probe, {key: 'a', id: 'a', active: a}), React.createElement(Probe, {key: 'b', id: 'b', active: b}));
    await act(async () => {tree = create(render(true,true));});
    assert.equal(reads, 1, 'dock and world log share a single initial history request');
    assert.equal(h.channels.length, 1, 'two consumers share one socket');
    await act(async () => {h.channels[0].status('SUBSCRIBED'); h.channels[0].status('SUBSCRIBED');});
    assert.equal(reads, 1, 'subscription during fetch must not cause a parallel request');
    await act(async () => {pending.shift().resolve(['first']);});
    assert.equal(reads, 2, 'subscription during initial fetch queues one catch-up read');
    await act(async () => {pending.shift().resolve(['first', 'second']);});
    assert.deepEqual(snapshots.a.value, ['first', 'second']);
    assert.strictEqual(snapshots.a.value, snapshots.b.value, 'consumers see the same cached history');
    assert.equal(maxConcurrent, 1);
    await act(async () => {tree.update(render(false,true));});
    assert.equal(h.removed.length, 0, 'remaining visible consumer keeps shared socket');
    await act(async () => {tree.update(render(false,false));});
    assert.equal(h.removed.length, 1, 'last visible consumer unsubscribes socket');
    assert.equal(h.timers.size, 0, 'inactive conversations have no network timer');
    assert.equal(h.appListeners.size, 0, 'inactive conversation has no AppState observer');
    await h.tick(120000);
    assert.equal(reads, 2, 'inactive conversations never poll');
    await act(async () => {tree.update(render(true,false));});
    assert.deepEqual(snapshots.a.value, ['first', 'second'], 'cached history stays visible while reactivation refresh is unresolved');
    assert.equal(reads, 3);
    await act(async () => {pending.shift().reject(new Error('temporary offline'));});
    assert.deepEqual(snapshots.a.value, ['first', 'second'], 'failed revalidation preserves loaded history');
    assert.equal(snapshots.a.error, 'temporary offline');
    await act(async () => {h.channels.at(-1).status('SUBSCRIBED');});
    await act(async () => {pending.shift().resolve(['reconnected']);});
    assert.equal(snapshots.a.error, '');
    assert.deepEqual(snapshots.a.value, ['reconnected']);
    const readCountBeforeInserts = reads;
    await act(async () => {for(let i=0;i<6;i++) h.channels.at(-1).insert({new:{channel_type:'world'}});});
    await h.tick(349);
    assert.equal(reads, readCountBeforeInserts, 'insert refreshes are batched');
    await h.tick(1);
    assert.equal(reads, readCountBeforeInserts + 1, 'insert burst causes one HTTP refresh');
    await act(async () => {pending.shift().resolve(['reconnected', 'new message']);});
    await h.state('background');
    assert.equal(h.timers.size, 0, 'background app stops poll and batching timers');
    await h.tick(120000);
    assert.equal(reads, readCountBeforeInserts + 1, 'background app never polls');
    await h.state('active');
    assert.equal(reads, readCountBeforeInserts + 2, 'foreground catches up missed history');
    const oldRead = pending.shift();
    await act(async () => {h.auth.session = {user:{id:'bravo'}}; tree.update(render(true,false));});
    assert.deepEqual(snapshots.a.value, [], 'account switch clears history immediately');
    assert.equal(snapshots.a.accountId, 'bravo');
    await act(async () => {oldRead.resolve(['PRIVATE ALPHA']);});
    assert.deepEqual(snapshots.a.value, [], 'old account in-flight completion cannot populate new account');
    await act(async () => {pending.shift().resolve(['PRIVATE BRAVO']);});
    assert.deepEqual(snapshots.a.value, ['PRIVATE BRAVO']);
    await act(async () => {h.auth.session = null; tree.update(render(true,false));});
    assert.deepEqual(snapshots.a.value, [], 'logout immediately clears private histories');
    assert.equal(h.timers.size, 0);
    await act(async () => {h.auth.session = {user:{id:'alpha'}}; tree.update(render(true,false));});
    assert.deepEqual(snapshots.a.value, [], 're-login cannot restore disposed account history');
    await act(async () => {pending.shift().resolve(['fresh login']);});
    assert.deepEqual(snapshots.a.value, ['fresh login']);
    await act(async () => {tree.unmount();}); tree = null;
    assert.equal(h.channels.length, h.removed.length, 'every socket has one matching unsubscribe');
    assert.equal(h.timers.size, 0);
    assert.equal(h.appListeners.size, 0);
    console.log('PASS feed lifecycle: shared requests/sockets, singleflight subscription catch-up, inactive/background timer suspension, cached revalidation, batched inserts, owner/logout disposal');
  } finally {if (tree) await act(async () => tree.unmount()); h.restore();}
}

async function initialNullState() {
  const h = makeHarness(null); let tree;
  try {
    const {useChatFeed} = h.load(path.join(app, 'src/online/useChatFeed'));
    let reads = 0;
    function Probe(){useChatFeed({key:'party:p1', read:async()=>{reads++; return [];}, initial:[], channelType:'party', channelId:'p1'}); return null;}
    await act(async () => {tree=create(React.createElement(Probe));});
    assert.equal(reads, 1, 'null initial native AppState permits first history load');
    assert.equal(h.channels.length,1);
    await act(async () => {tree.unmount();}); tree=null;
    console.log('PASS initial null AppState connects once and cleans up');
  }finally{if(tree)await act(async()=>tree.unmount());h.restore();}
}

async function plainVisiblePolling() {
  const h=makeHarness();let tree;
  try{
    const {useChatFeed}=h.load(path.join(app,'src/online/useChatFeed'));
    let reads=0;
    function Probe({active}){useChatFeed({key:'guild',read:async()=>{reads++;return{messages:[]};},initial:null,active});return null;}
    await act(async()=>{tree=create(React.createElement(Probe,{active:true}));});
    assert.equal(reads,1);assert.equal(h.channels.length,0);
    await h.tick(14999);assert.equal(reads,1);
    await h.tick(1);assert.equal(reads,2,'RPC-only channel polls at 15s while visible');
    await act(async()=>{tree.update(React.createElement(Probe,{active:false}));});
    await h.tick(60000);assert.equal(reads,2,'inactive RPC-only channel stops polling');
    await act(async()=>{tree.unmount();});tree=null;
    console.log('PASS RPC-only visible polling cadence and inactive suspension');
  }finally{if(tree)await act(async()=>tree.unmount());h.restore();}
}

async function delayedPollingCadence() {
  for(const mode of [
    {name:'Guild RPC-only',key:'guild',interval:15000},
    {name:'World fallback',key:'world:en',interval:15000,channelType:'world',channelId:'en'},
    {name:'Party subscribed watchdog',key:'party:p1',interval:60000,channelType:'party',channelId:'p1',subscribed:true},
  ]) {
    const h=makeHarness();let tree;
    try {
      const {useChatFeed}=h.load(path.join(app,'src/online/useChatFeed'));
      const starts=[];let concurrent=0,maxConcurrent=0,fail=false,view;
      const read=()=>{starts.push(Date.now());concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);return new Promise((resolve,reject)=>setTimeout(()=>{concurrent--;if(fail)reject(new Error('Temporary read failure'));else resolve(['accepted']);},100));};
      function Probe(){view=useChatFeed({...mode,read,initial:[]});return null;}
      await act(async()=>{tree=create(React.createElement(Probe));});
      assert.equal(starts.length,1,`${mode.name}: initial history starts once`);
      await h.tick(100);
      if(mode.subscribed){await act(async()=>{h.channels[0].status('SUBSCRIBED');});await h.tick(100);}
      for(let cycle=0;cycle<4;cycle++) {
        const settledAt=Date.now(),before=starts.length;
        await h.tick(mode.interval-1);
        assert.equal(starts.length,before,`${mode.name}: fresh history waits until its due time`);
        await h.tick(1);
        assert.equal(starts.length,before+1,`${mode.name}: 100 ms response latency must not skip every other scheduled history read`);
        assert.equal(starts.at(-1),settledAt+mode.interval,`${mode.name}: polling is timed from the last settled request`);
        await h.tick(100);
      }
      fail=true;await h.tick(mode.interval);await h.tick(100);
      assert.equal(view.error,'Temporary read failure');
      assert.deepEqual(view.value,['accepted'],'a failed scheduled request retains accepted history');
      const afterFailure=starts.length;
      await h.tick(mode.interval-1);
      assert.equal(starts.length,afterFailure,`${mode.name}: failures cannot create a zero-delay retry loop`);
      fail=false;await h.tick(1);await h.tick(100);
      assert.equal(starts.length,afterFailure+1,`${mode.name}: the next due request recovers after a failure`);
      assert.equal(view.error,'');
      if(mode.subscribed) {
        await act(async()=>{h.channels[0].status('TIMED_OUT');});
        const disconnectedReads=starts.length;
        await h.tick(14999);assert.equal(starts.length,disconnectedReads);
        await h.tick(1);assert.equal(starts.length,disconnectedReads+1,'a dropped live subscription returns to the 15 s fallback');
        await h.tick(100);
        await act(async()=>{h.channels[0].status('SUBSCRIBED');});
        assert.equal(starts.length,disconnectedReads+2,'reconnection catches up history immediately');
        await h.tick(100);
        await h.tick(59999);assert.equal(starts.length,disconnectedReads+2,'reconnected history waits for its 60 s watchdog');
        await h.tick(1);assert.equal(starts.length,disconnectedReads+3);
        await h.tick(100);
      }
      assert.equal(maxConcurrent,1,'latency, fallback and subscription changes never overlap history requests');
      await act(async()=>{tree.unmount();});tree=null;
      assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    } finally {if(tree)await act(async()=>tree.unmount());h.restore();}
  }
  console.log('PASS delayed polling: real 100 ms reads retain 15 s fallback/60 s watchdog cadence, back off failures, recover subscriptions and remain singleflight');
}

async function pendingPollingLifecycle() {
  const h=makeHarness();let tree;
  try {
    const {useChatFeed}=h.load(path.join(app,'src/online/useChatFeed'));
    const requests=[];let reads=0,concurrent=0,maxConcurrent=0;
    const read=()=>{reads++;concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);const request=deferred();requests.push(request);return request.promise.finally(()=>concurrent--);};
    function Probe({active}){useChatFeed({key:'guild',read,initial:[],active});return null;}
    const render=active=>React.createElement(Probe,{active});
    await act(async()=>{tree=create(render(true));});
    await h.tick(100);await act(async()=>{requests.shift().resolve(['first']);});
    await h.tick(15000);assert.equal(reads,2);
    await h.tick(45000);
    assert.equal(reads,2,'scheduled deadlines join one slow request rather than start parallel reads');
    await act(async()=>{requests.shift().resolve(['second']);});
    assert.equal(reads,2,'elapsed scheduled deadlines do not queue a redundant immediate follow-up');
    await h.tick(14999);assert.equal(reads,2);
    await h.tick(1);assert.equal(reads,3,'slow request settlement starts one new polling period');
    await h.state('background');
    await act(async()=>{requests.shift().resolve(['background completion']);});
    assert.equal(h.timers.size,0,'a request that finishes in the background cannot resurrect its polling timer');
    await h.tick(60000);assert.equal(reads,3);
    await h.state('active');assert.equal(reads,4,'foreground loads history missed while suspended');
    await act(async()=>{tree.update(render(false));});
    await act(async()=>{requests.shift().resolve(['hidden completion']);});
    assert.equal(h.timers.size,0,'a request that finishes after the last panel closes cannot restart polling');
    assert.equal(h.appListeners.size,0);
    await h.tick(60000);assert.equal(reads,4);
    await act(async()=>{tree.update(render(true));});assert.equal(reads,5);
    await act(async()=>{tree.unmount();});tree=null;
    await act(async()=>{requests.shift().resolve(['unmounted completion']);});
    assert.equal(h.timers.size,0,'a request that finishes after unmount cannot restart polling');
    assert.equal(maxConcurrent,1);
    console.log('PASS slow polling: joined in-flight reads, one period after settlement, background/hidden/unmount completion cancellation and foreground catch-up');
  } finally {if(tree)await act(async()=>tree.unmount());h.restore();}
}

async function mountedCacheEviction() {
  const h=makeHarness();let tree;
  try {
    const {ChatFeedCache}=h.load(path.join(app,'src/core/chat-feed-cache'));
    let evicted=0,worldReads=0,worldView;
    const dispose=ChatFeedCache.prototype.dispose;
    ChatFeedCache.prototype.dispose=function(){evicted++;return dispose.call(this);};
    const {useChatFeed}=h.load(path.join(app,'src/online/useChatFeed'));
    function Probe({kind,active,keyId}) {
      const feed=useChatFeed({key:keyId,initial:[],active,read:async()=>{if(kind==='world')worldReads++;return[kind+':'+worldReads];}});
      if(kind==='world')worldView=feed;
      return null;
    }
    const render=(worldActive,index)=>React.createElement(React.Fragment,null,
      React.createElement(Probe,{key:'world',kind:'world',active:worldActive,keyId:'world:en'}),
      React.createElement(Probe,{key:'party',kind:'party',active:!worldActive,keyId:'party:'+index}));
    await act(async()=>{tree=create(render(true,0));});
    assert.equal(worldReads,1);
    for(let index=1;index<=18;index++)await act(async()=>{tree.update(render(false,index));});
    assert.ok(evicted>0,'unmounted old party histories must still be evicted to bound the cache');
    await h.tick(16000);
    await act(async()=>{tree.update(render(true,18));});
    assert.equal(worldReads,2,'mounted inactive World history must remain live after old party histories are evicted');
    assert.deepEqual(worldView.value,['world:2']);
    await act(async()=>{void worldView.refresh();});
    assert.equal(worldReads,3,'manual refresh cannot be trapped against a disposed mounted cache');
    await act(async()=>{tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS bounded chat cache: dormant mounted panels survive eviction while unmounted old histories are removed');
  } finally {if(tree)await act(async()=>tree.unmount());h.restore();}
}


function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style;
}

function renderedStyle(node) {
  return flattenStyle(typeof node.props.style==='function'?node.props.style({pressed:false}):node.props.style);
}

function chatButton(tree,label='Send message') {
  const buttons=tree.root.findAllByType('Pressable').filter(node=>node.props.accessibilityLabel===label);
  assert.equal(buttons.length,1,`expected one rendered chat control: ${label}`);
  return buttons[0];
}

async function pressChatButton(tree,label) {
  const button=chatButton(tree,label);
  assert.ok(!button.props.disabled,`${label??'Send message'} must be enabled`);
  await act(async()=>{button.props.onPress();});
}

function containsNode(parent,node) {
  for(let current=node;current;current=current.parent)if(current===parent)return true;
  return false;
}

function inlineComposerRow(tree) {
  const input=tree.root.findByType('TextInput'),emote=chatButton(tree,'Open emote tray'),send=chatButton(tree);
  let row=input.parent;
  while(row&&(row.type!=='View'||!containsNode(row,emote)||!containsNode(row,send)))row=row.parent;
  assert.ok(row,'input, emote trigger and Send share a native row');
  assert.equal(renderedStyle(row).flexDirection,'row','composer stays horizontal at narrow widths and enlarged text');
  assert.equal(renderedStyle(row).flexWrap??'nowrap','nowrap','Send cannot wrap onto a separate input row');
  const controls=row.findAll(node=>node.type==='TextInput'||node.type==='Pressable'&&['Open emote tray','Send message'].includes(node.props.accessibilityLabel));
  assert.deepEqual(controls,[input,emote,send],'input → emote → Send order is preserved in the rendered row');
  assert.equal(renderedStyle(input).minWidth,0,'input can shrink to leave room for its actions');
  for(const [name,action] of [['emote',emote],['Send',send]]) {
    const style=renderedStyle(action);
    assert.ok((style.minWidth??style.width??0)>=44,`${name} has a full-width touch target`);
    assert.ok((style.minHeight??style.height??0)>=44,`${name} has a full-height touch target`);
    assert.equal(style.flexShrink??0,0,`${name} cannot shrink below its touch target`);
  }
  return row;
}

async function sharedComposerLifecycle() {
  const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
  try {
    const sends=[];
    h.mocks.set(path.join(app,'src/online/social'),{
      WORLD_CHANNELS:[{id:'en',name:'English'}],worldMessages:async()=>[],
      worldChatCommandKey:()=> 'world-composer-command',
      postWorldMessage:async(_channel,value)=>{sends.push(value);}
    });
    const {OnlineWorldChat}=h.load(path.join(app,'src/components/OnlineWorldChat'));
    const {ChatComposer}=h.load(path.join(app,'src/components/ChatComposer'));
    const emote=h.load(path.join(app,'src/core/chat-emotes')).availableChatEmotes([],'male')[0];
    function Probe({busy=false,disabled=false,editable=true}) {
      const [value,onChangeText]=React.useState('');
      return React.createElement(ChatComposer,{value,onChangeText,onSend:()=>sends.push(value),busy,disabled,editable,accessibilityLabel:'Test chat message',placeholder:'Message',maxLength:300});
    }
    const render=props=>React.createElement(Probe,props),renderWorld=()=>React.createElement(OnlineWorldChat,{playerName:'Player',language:'en',embedded:true,selectedChannel:0}),input=()=>tree.root.findByType('TextInput');
    await act(async()=>{tree=create(renderWorld());});
    for(const width of [320,360,390])for(const fontScale of [1,1.5]) {
      Object.assign(h.dimensions,{width,fontScale});
      await act(async()=>{tree.update(renderWorld());input().props.onChangeText(`Draft ${width}/${fontScale} `);});
      await act(async()=>{tree.root.findAllByType('View')[0].props.onLayout?.({nativeEvent:{layout:{width,height:300}}});});
      const draft=input().props.value,retainedInput=input(),row=inlineComposerRow(tree),rowStyle=renderedStyle(row);
      await pressChatButton(tree,'Open emote tray');
      assert.equal(chatButton(tree,'Open emote tray').props.accessibilityState.expanded,true);
      assert.strictEqual(input(),retainedInput,'opening the emote tray retains the native input instance');
      assert.strictEqual(inlineComposerRow(tree),row,'opening the emote tray retains the same input/action row');
      assert.deepEqual(renderedStyle(row),rowStyle,'tray expansion does not change the input row sizing');
      const trayHeading=tree.root.findAllByType('Text').find(node=>node.children.includes('Quick emotes'));
      assert.ok(trayHeading,'real picker renders its emote tray');
      assert.equal(containsNode(row,trayHeading),false,'expanded tray lives outside the input/action row');
      assert.equal(input().props.value,draft,'opening the picker does not erase the draft');
      await pressChatButton(tree,emote.label);
      assert.equal(input().props.value,`${draft}:${emote.id}:`,'picking a real emote appends its token without replacing existing text');
      assert.equal(chatButton(tree,'Open emote tray').props.accessibilityState.expanded,false,'picking closes the tray');
      assert.equal(sends.length,0,'opening and picking emotes cannot submit a message');
    }
    await act(async()=>{tree.unmount();});tree=null;
    await act(async()=>{tree=create(render({}));});
    for(const blocked of [{value:'   '},{value:'Busy draft',busy:true},{value:'Unavailable channel draft',disabled:true},{value:'Read-only draft',editable:false}]) {
      await act(async()=>{tree.update(render(blocked));});
      await act(async()=>{input().props.onChangeText(blocked.value);});
      assert.equal(chatButton(tree).props.disabled,true,'blank, busy and unavailable/read-only composers disable Send');
      assert.equal(chatButton(tree).props.accessibilityState.disabled,true);
      await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
      assert.equal(sends.length,0,'the same send guard applies to button handlers and keyboard return');
      assert.equal(input().props.value,blocked.value,'blocked submit preserves the draft');
    }
    await act(async()=>{tree.update(render({}));});
    await act(async()=>{input().props.onChangeText('Ready to send');});
    assert.equal(chatButton(tree).props.disabled,false);
    await pressChatButton(tree);
    await act(async()=>{input().props.onSubmitEditing();});
    assert.deepEqual(sends,['Ready to send','Ready to send'],'enabled button and keyboard each submit through the real shared composer');
    await act(async()=>{tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);
    console.log('PASS shared composer: real picker/input, inline input-emote-Send at 320/360/390 and font 1/1.5, 44px actions, separate tray, draft/token preservation, button/keyboard guards');
  } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

function uiMocks(h) {
  const theme=new Proxy({}, {get:()=> '#4488cc'});
  const tr=(text,params)=>text.replace(/\{([^}]+)\}/g,(_,key)=>String(params?.[key]??key));
  const originalRAF=global.requestAnimationFrame;
  global.requestAnimationFrame=fn=>setTimeout(fn,0);
  h.dimensions={width:420,height:844,fontScale:1,scale:1};
  h.mocks.set('react-native',{...h.mocks.get('react-native'),Alert:{alert(){}},ActivityIndicator:'ActivityIndicator',Image:'Image',KeyboardAvoidingView:'KeyboardAvoidingView',Modal:'Modal',Platform:{OS:'android',select:options=>options.android??options.default},Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:styles=>styles,flatten:flattenStyle,hairlineWidth:1,absoluteFill:{}},Text:'Text',TextInput:'TextInput',View:'View',useWindowDimensions:()=>h.dimensions});
  h.mocks.set('react-native-safe-area-context',{useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})});
  h.mocks.set(path.join(app,'src/i18n/social'),{useSocialText:()=>tr});
  h.mocks.set(path.join(app,'src/i18n'),{ot:(_language,text)=>text});
  h.mocks.set(path.join(app,'src/theme/ThemeContext'),{useGameTheme:()=>theme});
  return()=>{global.requestAnimationFrame=originalRAF;};
}

function chatViewMocks(h) {
  for (const name of ['Panel','ChatPlayerSheet','UiIcon','ChatMessageRow','ChatLog','ChatMentionSuggestions','GuildTaggedPlayerName']) {
    h.mocks.set(path.join(app,'src/components',name),{[name]:name});
  }
}

async function worldDraftLifecycle() {
  const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
  try {
    let reads=0,failRead=false;
    const alerts=[],sends=[],pending=[];
    h.mocks.get('react-native').Alert.alert=(...message)=>alerts.push(message);
    const rows=id=>[{id:id+':1',account_id:'other',sender_name:'Other player',body:'Existing history',created_at:'2026-10-04T22:00:00Z'}];
    h.mocks.set(path.join(app,'src/online/social'),{
      WORLD_CHANNELS:[{id:'en',name:'English'},{id:'nl',name:'Nederlands'}],
      worldChatCommandKey:()=> 'world-draft-command',
      worldMessages:async id=>{reads++;if(failRead)throw new Error('History temporarily unavailable');return rows(id);},
      postWorldMessage:(id,body)=>{sends.push({id,body});const request=deferred();pending.push(request);return request.promise;}
    });
    const {OnlineWorldChat}=h.load(path.join(app,'src/components/OnlineWorldChat'));
    const render=(selectedChannel,active=true)=>React.createElement(OnlineWorldChat,{selectedChannel,active,embedded:true,playerName:'Player',language:'en'});
    const input=()=>tree.root.findByType('TextInput');
    await act(async()=>{tree=create(render(0));});
    assert.equal(tree.root.findByType('ChatLog').props.active,true,'visible World wrapper activates its log');
    assert.equal(chatButton(tree).props.disabled,true,'blank World draft disables Send');
    await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
    assert.equal(sends.length,0,'blank button/keyboard submission does not post a message');
    await act(async()=>{input().props.onChangeText('English draft');});
    await act(async()=>{tree.update(render(1));});
    assert.equal(input().props.value,'','another language starts with its own draft');
    await act(async()=>{input().props.onChangeText('Dutch draft');});
    await act(async()=>{tree.update(render(0));});
    assert.equal(input().props.value,'English draft','switching back retains the previous language draft');
    await pressChatButton(tree);
    assert.deepEqual(sends,[{id:'en',body:'English draft'}]);
    assert.equal(chatButton(tree).props.disabled,true,'pending World send disables its button');
    await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
    assert.equal(sends.length,1,'busy button/keyboard submission cannot duplicate an in-flight message');
    await act(async()=>{tree.update(render(1));});
    await act(async()=>{input().props.onChangeText('Dutch draft edited while sending');});
    failRead=true;
    await act(async()=>{pending.shift().resolve();});
    assert.equal(input().props.value,'Dutch draft edited while sending','acknowledged send cannot erase another channel draft');
    assert.equal(alerts.length,0,'history fetch failure after server acknowledgement is not a send failure');
    await act(async()=>{tree.update(render(0));});
    assert.equal(input().props.value,'','only the acknowledged channel draft is cleared');
    assert.deepEqual(tree.root.findByType('ChatLog').props.items,rows('en'),'failed post-send refresh retains visible history');
    await act(async()=>{input().props.onChangeText('Private alpha draft');});
    const retainedInput=input(),retainedRows=tree.root.findByType('ChatLog').props.items,readsBeforeHide=reads;
    await act(async()=>{tree.update(render(0,false));});
    await act(async()=>{tree.update(render(0,true));});
    assert.strictEqual(input(),retainedInput,'hiding and showing World keeps the actual composer input mounted');
    assert.equal(input().props.value,'Private alpha draft','hiding and showing World preserves the draft');
    assert.strictEqual(tree.root.findByType('ChatLog').props.items,retainedRows,'hiding and showing World preserves cached history');
    assert.equal(reads,readsBeforeHide,'rapid visibility changes do not reinitialize loaded history');
    await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(render(0));});
    assert.equal(input().props.value,'','account change clears previous composer draft');
    assert.deepEqual(tree.root.findByType('ChatLog').props.items,[],'account change cannot display previous cached messages');
    await act(async()=>{tree.update(render(0,false));});
    assert.equal(tree.root.findByType('ChatLog').props.active,false,'hidden World wrapper deactivates its log');
    const pausedReads=reads;await h.tick(60000);
    assert.equal(reads,pausedReads,'inactive world component stops history polling');
    await act(async()=>{h.auth.session=null;tree.update(render(0));});
    await act(async()=>{input().props.onChangeText('Signed-out draft');});
    assert.equal(chatButton(tree).props.disabled,true,'missing account disables the World composer');
    await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
    assert.equal(sends.length,1,'signed-out keyboard/button submission cannot post a message');
    await act(async()=>{tree.unmount();});tree=null;
    console.log('PASS World composer: per-language drafts, blank/busy/account send guards, pending-send isolation, cached hide/show, acknowledged-send/history-error distinction, account reset, inactive polling');
  } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

async function worldRetryLifecycle() {
  const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
  try {
    const sends=[],pending=[];let nextKey=0;
    h.mocks.set(path.join(app,'src/online/social'),{
      WORLD_CHANNELS:[{id:'en',name:'English'},{id:'nl',name:'Nederlands'}],worldMessages:async()=>[],
      worldChatCommandKey:()=>`world-command-${++nextKey}`,
      postWorldMessage:(id,body,sender,key)=>{const request=deferred();sends.push({account:h.auth.session.user.id,id,body,sender,key});pending.push(request);return request.promise;}
    });
    const {OnlineWorldChat}=h.load(path.join(app,'src/components/OnlineWorldChat'));
    const render=selectedChannel=>React.createElement(OnlineWorldChat,{selectedChannel,active:true,embedded:true,playerName:'Player',language:'en'});
    const input=()=>tree.root.findByType('TextInput');
    const enter=async value=>{await act(async()=>{input().props.onChangeText(value);});};
    const fail=async()=>{await act(async()=>{pending.shift().reject(new Error('Server response lost'));});};
    const accept=async()=>{await act(async()=>{pending.shift().resolve('accepted-message');});};
    await act(async()=>{tree=create(render(0));});
    await enter('  Hello from this channel  ');await pressChatButton(tree);
    assert.ok(sends[0].key,'World sends carry a retry identity');
    assert.equal(sends[0].body,'Hello from this channel');
    await fail();
    assert.equal(input().props.value,'  Hello from this channel  ','a lost acknowledgement keeps the draft available for retry');

    await act(async()=>{tree.update(render(1));});
    await enter('Hello from this channel');await pressChatButton(tree);await fail();
    assert.notEqual(sends[1].key,sends[0].key,'the same words in another channel are a distinct send');
    await act(async()=>{tree.update(render(0));});
    await pressChatButton(tree);
    assert.equal(sends[2].key,sends[0].key,'returning to an unconfirmed draft reuses its original request ID even after sending in another channel');
    assert.equal(sends[2].id,'en');assert.equal(sends[2].body,sends[0].body);
    await accept();assert.equal(input().props.value,'','a confirmed retry clears only its submitted draft');

    await enter('Hello from this channel');await pressChatButton(tree);
    assert.notEqual(sends[3].key,sends[0].key,'sending identical words after confirmation creates a new message identity');
    await enter('New wording typed during the request');await accept();
    assert.equal(input().props.value,'New wording typed during the request','the acknowledged older send cannot erase text edited while it was pending');
    await pressChatButton(tree);await fail();
    const failedEditedKey=sends.at(-1).key;
    await enter('Revised wording after the failure');await pressChatButton(tree);
    assert.notEqual(sends.at(-1).key,failedEditedKey,'editing an unconfirmed body creates a new identity instead of a server replay conflict');
    await accept();

    await act(async()=>{tree.update(render(1));});await pressChatButton(tree);
    assert.equal(sends.at(-1).key,sends[1].key,'another channel still retains its own failed-send identity');
    await accept();
    await act(async()=>{tree.update(render(0));});await enter('Alpha pending message');await pressChatButton(tree);
    const alphaKey=sends.at(-1).key;
    await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(render(0));});
    assert.equal(input().props.value,'','another account cannot inherit the previous account draft');
    await enter('Bravo draft while alpha finishes');await accept();
    assert.equal(input().props.value,'Bravo draft while alpha finishes','old account acknowledgement cannot clear a new account draft');
    await pressChatButton(tree);
    assert.notEqual(sends.at(-1).key,alphaKey,'another account uses a fresh send identity');
    assert.equal(sends.at(-1).account,'bravo');
    await accept();
    await act(async()=>{tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS World retry lifecycle: retained per-account/channel IDs after lost ACK, new IDs for edited or confirmed drafts, independent channel retries and stale-send draft isolation');
  } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

async function staleSendScopeLifecycle() {
  for(const kind of ['world','guild','party']) {
    const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
    try {
      const requests=[],pending=[],alerts=[];let nextKey=0;
      const account=()=>h.auth.session.user.id,commandKey=()=>`${kind}-command-${++nextKey}`;
      const send=(...args)=>{const request=deferred();requests.push({account:account(),args});pending.push(request);return request.promise;};
      const messages=[{id:'message-1',account_id:'other',sender_name:'Other player',body:'Existing history',created_at:'2026-10-05T06:00:00Z'}];
      h.mocks.get('react-native').Alert.alert=(...args)=>alerts.push(args);
      h.mocks.set(path.join(app,'src/online/PartySocialProvider'),{usePartySocial:()=>({party:{id:'party-a',members:[{accountId:account(),characterName:'Player'}]},accountId:account(),refresh:async()=>{}})});
      h.mocks.set(path.join(app,'src/online/social'),{
        WORLD_CHANNELS:[{id:'en',name:'English'}],worldMessages:async()=>messages,worldChatCommandKey:commandKey,postWorldMessage:send,
        guildChatState:async()=>({guild:{id:'guild-a',name:'Guild'},messages}),guildRoster:async()=>[],guildChatCommandKey:commandKey,sendGuildChat:send,
      });
      h.mocks.set(path.join(app,'src/online/party-social'),{partyChatMessages:async()=>messages,partyCommandKey:commandKey,sendPartyChat:send});
      const name={world:'OnlineWorldChat',guild:'GuildChat',party:'OnlinePartyChat'}[kind],Component=h.load(path.join(app,'src/components',name))[name];
      const render=()=>React.createElement(Component,{active:true,embedded:true,selectedChannel:0,playerName:'Player',currentPlayerName:'Player',language:'en'});
      const input=()=>tree.root.findByType('TextInput');
      const enter=async value=>{await act(async()=>{input().props.onChangeText(value);});};
      const switchAwayAndBack=async()=>{for(const id of ['bravo','alpha'])await act(async()=>{h.auth.session={user:{id}};tree.update(render());});};
      await act(async()=>{tree=create(render());});
      await enter('Same words');await pressChatButton(tree);
      await switchAwayAndBack();await enter('Same words');
      assert.equal(chatButton(tree).props.disabled,true,`${kind}: scope changes do not allow a parallel send before the old operation finishes`);
      await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
      assert.equal(requests.length,1);
      await act(async()=>{pending.shift().resolve('accepted-original');});
      assert.equal(input().props.value,'Same words',`${kind}: an old A → B → A completion cannot erase newly entered identical words`);
      assert.equal(chatButton(tree).props.disabled,false);
      await pressChatButton(tree);
      assert.notEqual(requests[1].args.at(-1),requests[0].args.at(-1),`${kind}: returning to the account starts a fresh request identity`);
      await switchAwayAndBack();await enter('Current draft after returning');
      await act(async()=>{pending.shift().reject(new Error('OLD_SEND_FAILURE'));});
      assert.equal(input().props.value,'Current draft after returning',`${kind}: an invalidated older failure preserves the current draft`);
      assert.deepEqual(alerts,[],`${kind}: an invalidated older request cannot show an alert on the returned scope`);
      assert.ok(!tree.root.findAllByType('Text').some(node=>node.children.some(child=>typeof child==='string'&&child.includes('OLD_SEND_FAILURE'))),`${kind}: an invalidated older request cannot populate the returned scope's inline error`);
      await pressChatButton(tree);await act(async()=>{pending.shift().resolve('accepted-current');});
      assert.equal(input().props.value,'',`${kind}: a current request still acknowledges and clears normally`);
      await act(async()=>{tree.unmount();});tree=null;
      assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
  }
  console.log('PASS stale send ownership: actual World/Guild/Party A → B → A transitions preserve fresh drafts, suppress stale failures, retain singleflight guards and accept current sends');
}

async function privateChannelVisibility() {
  for(const kind of ['guild','party']) {
    const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
    try {
      let reads=0,rosterReads=0,marks=0,onRead=0;
      const sends=[],pendingSend=deferred(),send=(...args)=>{sends.push(args);return pendingSend.promise;};
      const messages=[{id:'m1',account_id:'other',sender_name:'Other player',body:'Private message',created_at:'2026-10-04T22:00:00Z'}];
      const party={id:'party1',members:[{accountId:'alpha',characterName:'Player'}]};
      h.mocks.set(path.join(app,'src/online/PartySocialProvider'),{usePartySocial:()=>({party,accountId:'alpha',refresh:async()=>{}})});
      h.mocks.set(path.join(app,'src/online/social'),{
        guildChatState:async()=>{reads++;return{guild:{id:'guild1',name:'Guild'},messages};},
        guildRoster:async()=>{rosterReads++;return[];},
        guildChatCommandKey:()=> 'command',sendGuildChat:send,
        markSocialChatRead:async(channel,channelId,messageId)=>{assert.equal(channel,kind);assert.equal(channelId,`${kind}1`);assert.equal(messageId,'m1');marks++;}
      });
      h.mocks.set(path.join(app,'src/online/party-social'),{partyChatMessages:async()=>{reads++;return messages;},sendPartyChat:send,partyCommandKey:()=> 'command'});
      const name=kind==='guild'?'GuildChat':'OnlinePartyChat';
      const Component=h.load(path.join(app,'src/components',name))[name];
      const render=active=>React.createElement(Component,{active,language:'en',currentPlayerName:'Player',onRead:()=>{onRead++;}});
      await act(async()=>{tree=create(render(true));});
      assert.equal(reads,1);
      assert.equal(tree.root.findByType('ChatLog').props.active,true,'live wrapper passes active to actual log');
      const input=()=>tree.root.findByType('TextInput');
      assert.equal(chatButton(tree).props.disabled,true,`${kind} blank draft disables Send`);
      await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
      assert.equal(sends.length,0,`${kind} blank button and keyboard cannot send`);
      await act(async()=>{input().props.onChangeText('Private draft');});
      await pressChatButton(tree);
      assert.equal(sends.length,1);
      assert.equal(chatButton(tree).props.disabled,true,`${kind} pending send disables its composer`);
      await act(async()=>{chatButton(tree).props.onPress();input().props.onSubmitEditing();});
      assert.equal(sends.length,1,`${kind} keyboard/button cannot duplicate a pending send`);
      await act(async()=>{pendingSend.resolve();});
      assert.equal(input().props.value,'',`${kind} acknowledgement clears the submitted draft`);
      const loadedReads=reads;
      await act(async()=>{await tree.root.findByType('ChatLog').props.onCaughtUp('m1');});
      assert.equal(marks,1);assert.equal(onRead,1);
      await act(async()=>{tree.update(render(false));});
      assert.equal(tree.root.findByType('ChatLog').props.active,false,'hidden wrapper passes inactive to actual log');
      await act(async()=>{await assert.rejects(()=>tree.root.findByType('ChatLog').props.onCaughtUp('m1'),/Chat scope changed/);});
      assert.equal(marks,1,'stale hidden callbacks do not mark private messages read');
      const pausedRosterReads=rosterReads;await h.tick(60000);
      assert.equal(reads,loadedReads,'hidden private conversation does not poll history');
      assert.equal(rosterReads,pausedRosterReads,'hidden guild conversation does not poll mention roster');
      assert.equal(onRead,1,'hidden callbacks do not trigger app notification refresh');
      await act(async()=>{tree.unmount();});tree=null;
      assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
  }
  console.log('PASS Guild/Party actual wrappers: shared composer blank/busy guards, acknowledged drafts, log visibility wiring, hidden read suppression, paused histories/roster, no hidden app refresh');
}

async function overlayLifecycle() {
  const h=makeHarness();const cleanUi=uiMocks(h);let tree;
  try {
    let sequence=0,partyRefresh=0,notices=0,guildReads=0;
    const mounts={},unmounts={},latest={};
    function panel(name) {return function Panel(props){const [instance]=React.useState(()=>++sequence);React.useEffect(()=>{mounts[name]=(mounts[name]??0)+1;return()=>{unmounts[name]=(unmounts[name]??0)+1;};},[]);latest[name]={...props,instance};return React.createElement('panel',{name,instance,...props});};}
    for(const [module,name] of [['OnlineWorldChat','world'],['WorldChat','offline'],['GuildChat','guild'],['OnlinePartyChat','party'],['SystemNoticeLog','system'],['ChatDock','dock']])h.mocks.set(path.join(app,'src/components',module),{[module]:panel(name)});
    h.mocks.set(path.join(app,'src/components/ChatChannelIcon'),{ChatChannelIcon:()=>null});
    h.mocks.set(path.join(app,'src/components/PartyChatGate'),{PartyChatGate:({children})=>children});
    const party={party:{id:'p1',members:[]},accountId:'alpha',refresh:async()=>{partyRefresh++;}};
    h.mocks.set(path.join(app,'src/online/PartySocialProvider'),{usePartySocial:()=>party});
    h.mocks.set(path.join(app,'src/online/social'),{myGuild:async()=>{guildReads++;return{id:'g1'};},WORLD_CHANNELS:[{id:'en',name:'English'},{id:'nl',name:'Nederlands'},{id:'de',name:'Deutsch'},{id:'es',name:'Español'}]});
    const {ChatOverlay}=h.load(path.join(app,'src/components/ChatOverlay'));
    const state={createdAtMs:1,settings:{defaultWorldChat:1,language:'en'},account:{guildMember:true},character:{name:'Player'}};
    const props={state,visible:true,onOpen(){},onClose(){},onChatRead(){notices++;}};
    await h.tick(30000);
    await act(async()=>{tree=create(React.createElement(ChatOverlay,props));});
    assert.equal(mounts.world,1);assert.equal(mounts.guild??0,0);assert.equal(mounts.party??0,0);assert.equal(mounts.system??0,0);
    const worldInstance=latest.world.instance;
    async function tab(name){await act(async()=>{tree.root.findAllByType('Pressable').find(x=>x.props.accessibilityRole==='tab'&&x.props.accessibilityLabel===name).props.onPress();});}
    for(const name of ['Guild','Party','System','World','Party','Guild','System','World'])await tab(name);
    assert.equal(mounts.world,1);assert.equal(mounts.guild,1);assert.equal(mounts.party,1);assert.equal(mounts.system,1);
    assert.deepEqual(unmounts,{},'channel switches preserve all visited component instances');
    assert.equal(latest.world.instance,worldInstance);
    assert.equal(latest.world.active,true);assert.equal(latest.guild.active,false);assert.equal(latest.party.active,false);assert.equal(latest.system.active,false);
    assert.equal(partyRefresh,1,'changing channels does not refresh party/game state');
    assert.equal(notices,0,'changing channels alone does not call app refresh callback');
    assert.equal(guildReads,1,'rapid channel switches do not repeat membership lookup');
    await act(async()=>{tree.root.findAllByType('Pressable').find(x=>String(x.props.accessibilityLabel).startsWith('World language:')).props.onPress();});
    await act(async()=>{tree.root.findAllByType('Pressable').filter(x=>x.props.accessibilityRole==='button'&&x.props.accessibilityState&&'selected'in x.props.accessibilityState)[1].props.onPress();});
    assert.equal(latest.world.selectedChannel,1);assert.equal(latest.world.instance,worldInstance,'language switch preserves world composer instance');
    await act(async()=>{h.auth.session={user:{id:'alpha'},access_token:'refreshed'};tree.update(React.createElement(ChatOverlay,props));});
    assert.equal(latest.world.instance,worldInstance,'same-account token refresh preserves chat instances');
    await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(React.createElement(ChatOverlay,props));});
    assert.notEqual(latest.world.instance,worldInstance,'account change creates fresh private composer/log instances');
    assert.equal(latest.world.selectedChannel,0,'account change resets selected world channel');
    assert.equal(unmounts.guild,1);assert.equal(unmounts.party,1);assert.equal(unmounts.system,1);
    await act(async()=>{tree.unmount();});tree=null;
    console.log('PASS overlay lifecycle: lazy channel mounting, preserved visited instances, only selected panel active, no switch-time app/party/member reload, language instance preservation, token refresh preservation, account reset');
  }finally{if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

async function realChatLogVisibility() {
  const h=makeHarness();const cleanUi=uiMocks(h);let tree;
  try {
    const {ChatLog}=h.load(path.join(app,'src/components/ChatLog'));
    const first=[{id:'1'}],updated=[{id:'1'},{id:'2'}];
    let marked=0;
    function Wrapper({active,items}) {const ref=React.useRef(active);ref.current=active;return React.createElement(ChatLog,{active,channelKey:'guild1',items,emptyText:'empty',renderItem:item=>React.createElement('row',{id:item.id}),onCaughtUp:()=>{if(ref.current)marked++;}});}
    await act(async()=>{tree=create(React.createElement(Wrapper,{active:true,items:first}));});
    await act(async()=>{tree.root.findByType('ScrollView').props.onContentSizeChange(300,100);});await h.tick(0);
    assert.equal(marked,1);
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:false,items:first}));});
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:false,items:updated}));});await h.tick(0);
    assert.equal(marked,1,'hidden message updates must not mark read');
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:true,items:updated}));});await h.tick(0);
    await act(async()=>{tree.root.findByType('ScrollView').props.onContentSizeChange(300,200);tree.root.findByType('ScrollView').props.onScroll({nativeEvent:{contentOffset:{y:0},contentSize:{height:200},layoutMeasurement:{height:260}}});});await h.tick(0);
    assert.equal(marked,2,'returning to a near-bottom panel must mark cached messages that arrived while hidden');
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:false,items:updated}));});
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:true,items:updated}));});await h.tick(0);
    assert.equal(marked,2,'unchanged cached history is not marked read twice on toggles');
    await h.state('background');
    const backgroundRows=[...updated,{id:'3'}];
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:true,items:backgroundRows}));});await h.tick(0);
    assert.equal(marked,2,'history arriving in background must not consume read marker');
    await h.state('active');await h.tick(0);
    assert.equal(marked,3,'foreground catches up the cached background message');
    await act(async()=>{tree.root.findByType('ScrollView').props.onScroll({nativeEvent:{contentOffset:{y:0},contentSize:{height:1000},layoutMeasurement:{height:260}}});});
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:false,items:backgroundRows}));});
    const scrolledRows=[...backgroundRows,{id:'4'}];
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:false,items:scrolledRows}));});await h.tick(0);
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:true,items:scrolledRows}));});await h.tick(0);
    assert.equal(marked,3,'returning to a manually scrolled history must not mark unread new rows');
    await act(async()=>{tree.root.findByType('ScrollView').props.onScroll({nativeEvent:{contentOffset:{y:800},contentSize:{height:1000},layoutMeasurement:{height:260}}});});
    assert.equal(marked,4,'reaching the bottom marks new rows normally');
    await act(async()=>{tree.update(React.createElement(Wrapper,{active:true,items:[...scrolledRows,{id:'5'}]}));});
    await act(async()=>{tree.unmount();});tree=null;await h.tick(0);
    assert.equal(marked,4,'queued animation frame after unmount cannot mark another owner read');
    assert.equal(h.appListeners.size,0,'unmount removes visibility observer');
    console.log('PASS ChatLog: hidden/background late-result catch-up, read deduplication, preserved manual scroll, unmount frame cancellation');
  }finally{if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

async function realReadAcknowledgementLifecycle() {
  const h=makeHarness(),cleanUi=uiMocks(h);let tree;
  try {
    const {ChatLog}=h.load(path.join(app,'src/components/ChatLog'));
    const requests=[],pending=[];
    const rows=(...ids)=>ids.map(id=>({id,created_at:'2026-10-05T06:00:00Z'}));
    const render=(scope,active,items)=>React.createElement(ChatLog,{channelKey:scope,active,items,emptyText:'empty',renderItem:item=>React.createElement('row',{id:item.id}),onCaughtUp:messageId=>{const request=deferred();requests.push({scope,messageId});pending.push(request);return request.promise;}});
    const initialize=async()=>{await act(async()=>{tree.root.findByType('ScrollView').props.onContentSizeChange(300,100);});await h.tick(0);};
    await act(async()=>{tree=create(render('alpha:guild-a',true,rows('1')));});await initialize();
    assert.deepEqual(requests,[{scope:'alpha:guild-a',messageId:'1'}],'the read callback receives the latest actually displayed ID');
    for(let i=0;i<3;i++){await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1')));});await h.tick(0);}
    assert.equal(requests.length,1,'rerendering the same visible cursor cannot duplicate a pending acknowledgement');
    await act(async()=>{pending.shift().reject(new Error('Lost read acknowledgement'));});
    assert.equal(requests.length,1,'a failed acknowledgement is not retried in a tight loop');
    await act(async()=>{tree.update(render('alpha:guild-a',false,rows('1')));});await h.tick(0);
    assert.equal(h.timers.size,0,'hidden read-acknowledgement retries are suspended');
    await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1')));});await h.tick(0);
    assert.deepEqual(requests.at(-1),{scope:'alpha:guild-a',messageId:'1'});
    assert.equal(requests.length,2,'reopening the retained same-message history retries an unconfirmed read');
    await act(async()=>{pending.shift().resolve();});
    for(let i=0;i<3;i++){await act(async()=>{tree.update(render('alpha:guild-a',false,rows('1')));});await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1')));});await h.tick(0);}
    assert.equal(requests.length,2,'a server-confirmed cursor is not rewritten on visibility toggles or new array instances');

    await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1','2')));});await h.tick(0);
    assert.deepEqual(requests.at(-1),{scope:'alpha:guild-a',messageId:'2'},'equal message timestamps still advance the displayed ID cursor');
    await act(async()=>{pending.shift().reject(new Error('Still offline'));});
    await h.tick(14999);assert.equal(requests.length,3,'visible failed acknowledgements use a bounded retry delay');
    await h.tick(1);assert.equal(requests.length,4,'a visible failed cursor is retried without requiring another message');
    await act(async()=>{pending.shift().resolve();});

    await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1','2','3')));});await h.tick(0);
    await act(async()=>{pending.shift().reject(new Error('Disconnected'));});
    await h.state('background');await h.tick(60000);
    assert.equal(requests.length,5,'backgrounding cancels the read acknowledgement retry timer');
    await h.state('active');await h.tick(0);
    assert.equal(requests.length,6,'foreground resumes a failed cursor even when no newer history arrived');
    await act(async()=>{pending.shift().resolve();});

    await act(async()=>{tree.update(render('alpha:guild-a',true,rows('1','2','3','4')));});await h.tick(0);
    const oldOwnerRequest=pending.shift();
    await act(async()=>{tree.update(render('bravo:guild-a',true,rows('1','2','3','4')));});await h.tick(0);
    assert.deepEqual(requests.at(-1),{scope:'bravo:guild-a',messageId:'4'},'another account independently acknowledges same-height visible history without waiting for a new native content-size event');
    await act(async()=>{pending.shift().reject(new Error('New owner temporarily offline'));oldOwnerRequest.resolve();});
    await act(async()=>{tree.update(render('bravo:guild-a',false,rows('4')));});
    await act(async()=>{tree.update(render('bravo:guild-a',true,rows('4')));});await h.tick(0);
    assert.equal(requests.length,9,'an old account success cannot confirm the new account cursor or cancel its retry');
    assert.deepEqual(requests.at(-1),{scope:'bravo:guild-a',messageId:'4'});
    await act(async()=>{pending.shift().resolve();});

    const beforeFrameSwitch=requests.length;
    await act(async()=>{tree.update(render('bravo:guild-a',true,rows('4','5')));});
    await act(async()=>{tree.update(render('bravo:party-b',true,rows('5')));});
    await act(async()=>{tree.update(render('bravo:guild-a',true,rows('4')));});await initialize();
    assert.deepEqual(requests.slice(beforeFrameSwitch),[{scope:'bravo:guild-a',messageId:'4'}],'an old queued scroll frame cannot acknowledge after switching A → B → A, even when the channel key matches again');
    const lastRequest=pending.shift();
    await act(async()=>{tree.unmount();});tree=null;
    await act(async()=>{lastRequest.reject(new Error('Late failure after unmount'));});
    await h.tick(60000);
    assert.equal(requests.length,beforeFrameSwitch+1,'an unmounted read failure cannot schedule another write');
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS real read acknowledgements: explicit displayed cursor, confirmed-only deduplication, same-ID reopen/timed/foreground retries, owner/channel isolation and stale-frame/unmount cancellation');
  } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}

async function privateReadAcknowledgementLifecycle() {
  for(const kind of ['guild','party']) {
    const h=makeHarness(),cleanUi=uiMocks(h);chatViewMocks(h);let tree;
    try {
      h.mocks.delete(path.join(app,'src/components/ChatLog'));
      const requests=[],pending=[],notices=[];
      const channelId=`${kind}-a`;
      let messages=[{id:'cursor-1',account_id:'other',sender_name:'Other player',body:'First message',created_at:'2026-10-05T06:00:00Z'}];
      const account=()=>h.auth.session?.user.id;
      h.mocks.set(path.join(app,'src/online/PartySocialProvider'),{usePartySocial:()=>({party:{id:channelId,members:[{accountId:account(),characterName:'Player'}]},accountId:account(),refresh:async()=>{}})});
      h.mocks.set(path.join(app,'src/online/social'),{
        guildChatState:async()=>({guild:{id:channelId,name:'Guild'},messages}),guildRoster:async()=>[],
        markSocialChatRead:(channel,id,messageId)=>{const request=deferred();requests.push({account:account(),channel,id,messageId});pending.push(request);return request.promise;}
      });
      h.mocks.set(path.join(app,'src/online/party-social'),{partyChatMessages:async()=>messages});
      const {ChatLog}=h.load(path.join(app,'src/components/ChatLog'));
      const name=kind==='guild'?'GuildChat':'OnlinePartyChat',Component=h.load(path.join(app,'src/components',name))[name];
      const render=active=>React.createElement(Component,{active,language:'en',currentPlayerName:'Player',onRead:()=>notices.push(account())});
      const initialize=async()=>{await act(async()=>{tree.root.findByType('ScrollView').props.onContentSizeChange(300,100);});await h.tick(0);};
      await act(async()=>{tree=create(render(true));});await initialize();
      assert.deepEqual(requests,[{account:'alpha',channel:kind,id:channelId,messageId:'cursor-1'}],`${kind}: actual wrapper sends the displayed cursor and exact conversation`);
      await act(async()=>{pending.shift().reject(new Error('Offline'));});
      assert.deepEqual(notices,[],`${kind}: a failed read cannot clear app notification badges`);
      await act(async()=>{tree.update(render(false));});
      await act(async()=>{tree.update(render(true));});await h.tick(0);
      assert.equal(requests.length,2,`${kind}: wrapper propagates rejection so the actual log retries the same cursor on reopen`);
      assert.deepEqual(requests[1],requests[0]);
      await act(async()=>{pending.shift().resolve();});
      assert.deepEqual(notices,['alpha'],`${kind}: badge refresh occurs only after confirmed read`);
      await act(async()=>{tree.update(render(true));});await h.tick(0);
      assert.equal(requests.length,2,`${kind}: unchanged renders do not write duplicate receipts`);

      messages=[...messages,{...messages[0],id:'cursor-2',body:'Another message with the same timestamp'}];
      await h.tick(15000);await h.tick(0);
      assert.equal(requests.length,3,`${kind}: new displayed cursor triggers one receipt even with a tied timestamp`);
      assert.equal(requests.at(-1).messageId,'cursor-2');
      const oldRequest=pending.shift(),oldCallback=tree.root.findByType(ChatLog).props.onCaughtUp;
      await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(render(true));});await initialize();
      assert.equal(requests.length,4,`${kind}: another account independently marks the same visible history`);
      const newRequest=pending.shift();
      await act(async()=>{await assert.rejects(()=>oldCallback('cursor-2'),/Chat scope changed/);oldRequest.resolve();});
      assert.equal(requests.length,4,`${kind}: retained old-account callbacks cannot start a new read write`);
      assert.deepEqual(notices,['alpha'],`${kind}: a stale old-account completion cannot refresh the new account's badges`);
      await act(async()=>{newRequest.resolve();});
      assert.deepEqual(notices,['alpha','bravo']);
      await act(async()=>{tree.unmount();});tree=null;
      assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
  }
  console.log('PASS Guild/Party read integration: actual wrappers + log, scoped displayed cursors, failed ACK propagation/retry, confirmed notifications and old-account callback/completion isolation');
}

async function pendingReadAcknowledgements() {
  const h=makeHarness(),cleanUi=uiMocks(h);let tree;
  try {
    const {ChatLog}=h.load(path.join(app,'src/components/ChatLog'));
    const requests=[],pending=[];
    const render=(ids,active=true)=>React.createElement(ChatLog,{channelKey:'alpha:party-a',active,items:ids.map(id=>({id})),emptyText:'empty',renderItem:item=>React.createElement('row',{id:item.id}),onCaughtUp:messageId=>{const request=deferred();requests.push(messageId);pending.push(request);return request.promise;}});
    const scroll=y=>tree.root.findByType('ScrollView').props.onScroll({nativeEvent:{contentOffset:{y},contentSize:{height:1000},layoutMeasurement:{height:100}}});
    await act(async()=>{tree=create(render(['1']));});
    await act(async()=>{tree.root.findByType('ScrollView').props.onContentSizeChange(300,100);});await h.tick(0);
    await act(async()=>{tree.update(render(['1','2']));});await h.tick(0);
    await act(async()=>{tree.update(render(['1','2','3']));});await h.tick(0);
    assert.deepEqual(requests,['1'],'newly displayed messages join a pending acknowledgement without parallel writes');
    await act(async()=>{pending.shift().resolve();});
    assert.deepEqual(requests,['1','3'],'the confirmed older cursor is followed by one acknowledgement of the newest displayed cursor');
    await act(async()=>{tree.update(render(['1','2','3']));scroll(0);});
    await act(async()=>{tree.update(render(['1','2','3','4']));});await h.tick(0);
    await act(async()=>{pending.shift().resolve();});
    assert.deepEqual(requests,['1','3'],'a pending success cannot acknowledge a newer message that arrived while scrolled up');
    await act(async()=>{tree.update(render(['1','2','3','4'],false));});
    await act(async()=>{tree.update(render(['1','2','3','4'],true));});await h.tick(0);
    assert.deepEqual(requests,['1','3'],'hiding and showing a manually scrolled log preserves its unread cursor');
    await act(async()=>{scroll(900);});
    assert.deepEqual(requests,['1','3','4'],'reaching the actual bottom acknowledges the remaining displayed message');
    await act(async()=>{pending.shift().resolve();tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS pending read acknowledgements: serial latest-cursor coalescing, confirmed older results, and manually scrolled new-message protection');
  } finally {if(tree)await act(async()=>tree.unmount());cleanUi();h.restore();}
}


async function partyLifecycle(){
  const h=makeHarness();let tree;
  try{
    let identityReads=0,snapshotReads=0,concurrent=0,maxConcurrent=0,view;
    const pending=[];
    h.mocks.set(path.join(app,'src/online/party-social'),{
      partySocialIdentity:async()=>{identityReads++;return h.auth.session?{accountId:h.auth.session.user.id,characterId:'character:'+h.auth.session.user.id}:null;},
      partySocialSnapshot:()=>{snapshotReads++;concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);const d=deferred();pending.push(d);return d.promise.finally(()=>{concurrent--;});}
    });
    const {PartySocialProvider,usePartySocial}=h.load(path.join(app,'src/online/PartySocialProvider'));
    function Probe(){view=usePartySocial();return null;}
    const render=()=>React.createElement(PartySocialProvider,null,React.createElement(Probe));
    const alphaParty={id:'alpha-party',members:[]},updatedAlphaParty={id:'alpha-party',members:[{accountId:'new-member'}]},bravoParty={id:'bravo-party',members:[]};
    const snapshot=party=>({party,contracts:[{id:'contract'}],serverTime:'2026-10-04T22:00:00Z'});
    await act(async()=>{tree=create(render());});
    assert.equal(identityReads,1);assert.equal(snapshotReads,1);
    await act(async()=>{pending.shift().resolve(snapshot(alphaParty));});
    assert.strictEqual(view.party,alphaParty);
    const refreshAlpha=view.refresh;
    await act(async()=>{h.auth.session={user:{id:'alpha'},access_token:'renewed-token'};tree.update(render());});
    assert.strictEqual(view.party,alphaParty,'token renewal must preserve party object and membership');
    assert.strictEqual(view.refresh,refreshAlpha,'token renewal keeps refresh identity stable');
    assert.equal(snapshotReads,1,'token renewal must not restart party polling or re-fetch');
    let first,second;
    await act(async()=>{first=view.refresh();second=view.refresh();});
    assert.strictEqual(first,second,'simultaneous refresh callers share one request');
    assert.equal(snapshotReads,2,'concurrent manual refreshes do not overlap history requests');
    await act(async()=>{pending.shift().resolve(snapshot(alphaParty));});
    assert.equal(snapshotReads,3,'refresh after a mutation queues one serial authoritative reread');
    await act(async()=>{pending.shift().resolve(snapshot(updatedAlphaParty));});
    assert.strictEqual(view.party,updatedAlphaParty,'queued refresh publishes the latest party membership');
    assert.equal(maxConcurrent,1,'queued refreshes never overlap');
    await act(async()=>{void view.refresh();});
    assert.equal(snapshotReads,4);
    await act(async()=>{pending.shift().reject(new Error('temporary network failure'));});
    assert.strictEqual(view.party,updatedAlphaParty,'transient refresh failure preserves confirmed party');
    assert.equal(view.error,'temporary network failure');
    await h.state('background');
    assert.strictEqual(view.party,updatedAlphaParty,'background does not erase joined party');
    await h.tick(120000);
    assert.equal(snapshotReads,4,'background interval performs no party requests');
    await h.state('active');assert.equal(snapshotReads,5);
    const oldRequest=pending.shift();
    await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(render());});
    assert.equal(view.accountId,'bravo');assert.equal(view.party,null,'new account immediately hides previous private party state');
    assert.equal(snapshotReads,6);
    const newIdentityReads=identityReads;
    await act(async()=>{void refreshAlpha();});
    assert.equal(identityReads,newIdentityReads,'old account refresh callback must not invalidate the new account request');
    await act(async()=>{oldRequest.resolve(snapshot(alphaParty));});
    assert.equal(view.party,null,'old account result cannot restore private party state');
    await act(async()=>{pending.shift().resolve(snapshot(bravoParty));});
    assert.strictEqual(view.party,bravoParty);
    await act(async()=>{h.auth.session=null;tree.update(render());});
    assert.equal(view.party,null,'logout clears private party state');assert.equal(view.accountId,'');
    await h.tick(60000);assert.equal(snapshotReads,6,'signed out timer performs no social requests');
    await act(async()=>{tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS PartySocialProvider: stable token/refresh identity, serial post-mutation reread, transient/background preservation, stale callback/response and owner/logout isolation');
  }finally{if(tree)await act(async()=>tree.unmount());h.restore();}
}

async function notificationLifecycle() {
  const h=makeHarness();let tree;
  try {
    let view,friendReads=0,attentionReads=0,holdGuild=false,failFriends=false;
    const unread={alpha:3,bravo:9},pending=[];
    h.mocks.set(path.join(app,'src/online/social'),{
      friendRequests:async()=>{friendReads++;if(failFriends)throw new Error('Temporary connection failure');return[{direction:'incoming'}];},
      socialInvitations:async()=>({guild:[],party:[]}),
      socialChatAttention:async()=>{attentionReads++;return{guild:{unread:unread[h.auth.session.user.id],mentions:0},party:{unread:0,mentions:0}};},
      myGuild:()=>{if(!holdGuild)return Promise.resolve(null);const request=deferred();pending.push(request);return request.promise;},
      guildApplications:async()=>[]
    });
    const {useSocialNotificationCounts}=h.load(path.join(app,'src/online/useSocialNotificationCounts'));
    function Probe(){view=useSocialNotificationCounts();return null;}
    const render=()=>React.createElement(Probe);
    await act(async()=>{tree=create(render());});
    assert.equal(view.counts.guildChatUnread,3);assert.equal(friendReads,1);
    const originalCounts=view.counts,refreshAlpha=view.refresh;
    await act(async()=>{h.auth.session={user:{id:'alpha'},access_token:'renewed-token'};tree.update(render());});
    assert.strictEqual(view.counts,originalCounts,'same-account token renewal preserves notification counts');
    assert.strictEqual(view.refresh,refreshAlpha,'same-account token renewal preserves notification refresh identity');
    assert.equal(friendReads,1,'same-account token renewal does not re-fetch notifications');

    holdGuild=true;await h.tick(60000);
    assert.equal(friendReads,2);assert.equal(pending.length,1);
    await h.tick(60000);
    assert.equal(friendReads,2,'scheduled poll cannot overlap an existing notification request');
    holdGuild=false;await act(async()=>{pending.shift().resolve(null);});
    assert.equal(friendReads,2,'scheduled polls do not queue redundant forced rereads');

    holdGuild=true;let first,second,third;
    await act(async()=>{first=view.refresh();});
    assert.equal(friendReads,3);assert.equal(attentionReads,3);
    unread.alpha=0;
    await act(async()=>{second=view.refresh();third=view.refresh();});
    assert.strictEqual(first,second);assert.strictEqual(first,third);
    assert.equal(friendReads,3,'post-read acknowledgements queue without starting parallel notification requests');
    holdGuild=false;await act(async()=>{pending.shift().resolve(null);});
    assert.equal(friendReads,4,'multiple post-read invalidations coalesce into one authoritative reread');
    assert.equal(attentionReads,4);
    assert.equal(view.counts.guildChatUnread,0,'a post-read refresh during an old request clears the badge without waiting for the next poll');
    assert.equal(view.counts.chatUnread,0);

    const knownCounts=view.counts;
    failFriends=true;await act(async()=>{void view.refresh();});failFriends=false;
    assert.strictEqual(view.counts,knownCounts,'transient notification failures preserve confirmed counts');
    const beforeBackground=friendReads;
    await h.state('background');await h.tick(90000);
    assert.equal(friendReads,beforeBackground,'background notification intervals perform no requests');
    await h.state('active');
    assert.equal(friendReads,beforeBackground+1,'foreground performs one notification catch-up');

    unread.alpha=7;holdGuild=true;
    await act(async()=>{void view.refresh();void view.refresh();});
    const oldRequest=pending.shift();
    await act(async()=>{h.auth.session={user:{id:'bravo'}};tree.update(render());});
    assert.equal(view.counts.account,0,'account switch immediately hides old private notification counts');
    const newRequest=pending.shift(),afterSwitchReads=friendReads;
    await act(async()=>{void refreshAlpha();});
    assert.equal(friendReads,afterSwitchReads,'old-account callback cannot start or invalidate current-account requests');
    await act(async()=>{oldRequest.resolve(null);});
    assert.equal(view.counts.account,0,'old-account result cannot restore private notification counts');
    assert.equal(friendReads,afterSwitchReads,'queued old-account invalidation is discarded on account change');
    await act(async()=>{newRequest.resolve(null);});
    assert.equal(view.counts.guildChatUnread,9,'current-account results still publish normally');
    const refreshBravo=view.refresh;
    await act(async()=>{void view.refresh();});
    const logoutRequest=pending.shift();
    await act(async()=>{h.auth.session=null;tree.update(render());});
    assert.equal(view.counts.account,0,'logout immediately clears private notification counts');
    await act(async()=>{logoutRequest.resolve(null);void refreshBravo();});
    assert.equal(view.counts.account,0,'late results and callbacks cannot restore signed-out notification counts');
    const signedOutReads=friendReads;await h.tick(90000);
    assert.equal(friendReads,signedOutReads,'signed-out notification timers perform no service requests');
    await act(async()=>{tree.unmount();});tree=null;
    assert.equal(h.timers.size,0);assert.equal(h.appListeners.size,0);
    console.log('PASS notification lifecycle: serial post-read badge refresh, poll coalescing, token stability, background pause, stale callback/result and owner/logout isolation');
  } finally {if(tree)await act(async()=>tree.unmount());h.restore();}
}


async function main() {
  await feedLifecycle();
  await initialNullState();
  await plainVisiblePolling();
  await delayedPollingCadence();
  await pendingPollingLifecycle();
  await mountedCacheEviction();
  await overlayLifecycle();
  await realChatLogVisibility();
  await realReadAcknowledgementLifecycle();
  await pendingReadAcknowledgements();
  await privateReadAcknowledgementLifecycle();
  await worldDraftLifecycle();
  await worldRetryLifecycle();
  await staleSendScopeLifecycle();
  await sharedComposerLifecycle();
  await privateChannelVisibility();
  await partyLifecycle();
  await notificationLifecycle();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
