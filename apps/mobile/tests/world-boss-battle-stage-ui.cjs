const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const root=path.join(__dirname,'..');
// Manual timers: the stage must only advance when we say so (no hidden duration UI).
let timers=[],nextId=1;
const fakeSetTimeout=(fn,ms)=>{const id=nextId++;timers.push({id,fn,ms});return id;};
const fakeClearTimeout=id=>{timers=timers.filter(t=>t.id!==id);};
const cache=new Map();
function load(file,deps){
 const full=path.join(root,file);
 if(cache.has(full))return cache.get(full);
 const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const sandbox={exports:{},module:{},Error,Promise,Math,JSON,Number,Object,Array,Map,Set,String,Intl,console:{warn(){},error(){}},setTimeout:fakeSetTimeout,clearTimeout:fakeClearTimeout,
  require:name=>{
   if(name in deps)return deps[name];
   if(name==='react')return React;if(name==='react/jsx-runtime')return require(name);
   const rel=name.startsWith('.')?path.relative(root,path.join(path.dirname(full),name)):null;
   for(const ext of ['.ts','.tsx'])if(rel&&fs.existsSync(path.join(root,rel+ext)))return load(rel+ext,deps);
   throw new Error('Unexpected import '+name+' from '+file);
  }};
 sandbox.module.exports=sandbox.exports;
 vm.runInNewContext(code,sandbox,{filename:file});
 cache.set(full,sandbox.module.exports);return sandbox.module.exports;
}
class Value{constructor(v){this.v=v;}setValue(v){this.v=v;}interpolate(){return this;}stopAnimation(){}}
const anim={start(){},stop(){}};
let appStateListener;
const native={Platform:{OS:'android',select:o=>o.android??o.default},View:'View',Text:'Text',Image:'Image',Modal:'Modal',Pressable:'Pressable',ActivityIndicator:'ActivityIndicator',
 StyleSheet:{create:x=>x,absoluteFill:{}},Easing:{out:()=>0,cubic:0,inOut:()=>0,sin:0,back:()=>0},
 Animated:{View:'AnimatedView',Value,timing:()=>anim,sequence:()=>anim,loop:()=>anim},
 AppState:{currentState:'active',addEventListener:(_e,fn)=>{appStateListener=fn;return {remove(){appStateListener=undefined;}};}}};
const haptics=[],sounds=[],musicOverrides=[];
const deps={
 'react-native':native,
 '../storage/haptics':{playHaptic:m=>haptics.push(m)},
 '../storage/audio':{playSound:id=>sounds.push(id),useMusicOverride:track=>{musicOverrides.push(track);}},
 '../theme/ThemeContext':{useGameTheme:()=>({text:'#fff',muted:'#aaa',accent:'#fc0',panelRaised:'#111',lineStrong:'#333',primaryButtonText:'#fff',bg:'#000',good:'#0f0'})},
 '../theme/pixel-scene-assets':{SCENE_BACKGROUNDS:{forest:{asterfall:1,sunscar:2,frostmarch:3}}},
 '../theme/class-emblem-assets':{classEmblemIconArtwork:new Proxy({},{get:()=>4})},
 './CombatImpactBurst':{CombatImpactBurst:()=>null},
 './GameButton':{GameButton:({title,onPress})=>React.createElement('Pressable',{onPress,accessibilityRole:'button'},React.createElement('Text',null,title))},
};
const {WorldBossBattleStage}=load('src/components/WorldBossBattleStage.tsx',deps);
const {WORLD_BOSS_REPLAY_FIXTURE}=load('src/dev/world-boss-replay-fixture.ts',deps);
const texts=r=>r.root.findAll(n=>n.type==='Text').map(n=>[].concat(n.props.children).filter(c=>typeof c==='string'||typeof c==='number').join('')).filter(Boolean);
async function main(){
 let closed=0,renderer;
 await act(async()=>{renderer=create(React.createElement(WorldBossBattleStage,{input:WORLD_BOSS_REPLAY_FIXTURE,language:'en',reduceMotion:false,onClose:()=>closed++}));});
 const modal=()=>renderer.root.findByType('Modal');
 assert.ok(texts(renderer).includes('Hollowroot'),'Entrance names the boss');
 assert.equal(timers.length,1,'Exactly one beat timer runs');
 // Back gesture mid-fight does nothing: there is no skip.
 await act(async()=>{modal().props.onRequestClose();});assert.equal(closed,0);
 // Backgrounding pauses: the pending beat timer is cleared and nothing advances.
 await act(async()=>{appStateListener('background');});
 assert.equal(timers.length,0,'Backgrounded fight holds its beat');
 await act(async()=>{appStateListener('active');});
 assert.equal(timers.length,1,'Fight resumes in the foreground');
 const seen=new Set();let steps=0;
 while(timers.length&&steps<1000){
  const t=timers.shift();await act(async()=>{t.fn();});steps++;
  for(const line of texts(renderer))seen.add(line);
  assert.equal(renderer.root.findAll(n=>n.props&&n.props.accessibilityRole==='button').length===0||texts(renderer).includes('Continue'),true,'No buttons appear before the results');
 }
 assert.ok(steps>20,'The whole recorded fight plays beat by beat ('+steps+')');
 const all=[...seen].join(' | ');
 for(const forbidden of [/skip/i,/\b2x\b|2×/i,/speed/i,/round\s*\d/i,/\d+\s*s\b/,/\d:\d\d/])
  assert.ok(!forbidden.test(all),'Fight screen must not show '+forbidden+': '+all.slice(0,400));
 for(const expected of ['Tonic active','Guarded!','Guard broken!','BATTLE RESULTS','PARTY HONORS','Vanguard','Continue'])
  assert.ok(seen.has(expected)||all.includes(expected),'Missing beat text: '+expected);
 assert.ok(all.includes('Incoming: '),'Telegraphs are announced');
 assert.ok(haptics.includes('heavy'),'Big moments use haptics');
 assert.equal(musicOverrides[0],'world_boss','The fight plays the World Boss theme');
 for(const id of ['boss_entrance','tonic','boss_telegraph','guard_break','role_moment','world_hp_drop','honor'])
  assert.ok(sounds.includes(id),'Missing fight sound: '+id+' in '+[...new Set(sounds)].join(','));
 await act(async()=>{modal().props.onRequestClose();});assert.equal(closed,1,'Back closes only the results');
 const cont=renderer.root.findAll(n=>n.props&&n.props.accessibilityRole==='button')[0];
 await act(async()=>{cont.props.onPress();});assert.equal(closed,2);
 // German renders the same fight in German.
 timers=[];let de;
 await act(async()=>{de=create(React.createElement(WorldBossBattleStage,{input:WORLD_BOSS_REPLAY_FIXTURE,language:'de',reduceMotion:true,onClose(){}}));});
 assert.ok(texts(de).includes('WELT-LP'),'Localized world HP label');
 console.log('PASS: World Boss fight stage plays the real recorded fight unskippably, untimed, paused in background, with role moments, haptics and Party Honors ('+steps+' beats)');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
