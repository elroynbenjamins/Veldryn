import {assert} from './test-assert';
const {readFileSync,readdirSync}=require('node:fs') as {readFileSync:(path:string,encoding:string)=>string;readdirSync:(path:string,options:{withFileTypes:true})=>{name:string;isDirectory:()=>boolean}[]};
const {resolve,join}=require('node:path') as {resolve:(...parts:string[])=>string;join:(...parts:string[])=>string};
declare const process:{cwd:()=>string};
import {createGameAlertStore} from '../src/core/game-alerts';

const store=createGameAlertStore();
let confirmed=0,cancelled=0,dismissed=0;
store.alert('Delete?',undefined,[{text:'Cancel',style:'cancel',onPress:()=>cancelled++},{text:'Delete',style:'destructive',onPress:()=>confirmed++}],{onDismiss:()=>dismissed++});
store.dismiss(store.getSnapshot().queue[0].id);
assert.deepEqual([confirmed,cancelled,dismissed],[0,1,1],'Back/close must cancel, never confirm a destructive action');

store.alert('First',undefined,[{text:'Continue',onPress:()=>{confirmed++;store.alert('Follow-up');}}]);
store.alert('Already queued');
const first=store.getSnapshot().queue[0].id;
store.press(first,0);store.press(first,0);
assert.equal(confirmed,1,'A double tap must execute an action only once');
assert.deepEqual(store.getSnapshot().queue.map(row=>row.title),['Already queued','Follow-up']);
store.press(store.getSnapshot().queue[0].id,9);
assert.equal(store.getSnapshot().queue.length,2,'Invalid buttons must leave the dialog open');
store.dismiss(store.getSnapshot().queue[0].id);
assert.equal(store.getSnapshot().queue[0].buttons.length,1,'Informational dialogs need a default OK button');
store.press(store.getSnapshot().queue[0].id,0);
assert.equal(store.getSnapshot().queue.length,0);

let updates=0;
const unsubscribe=store.subscribe(()=>updates++);
store.configure({language:'nl',reduceMotion:true});
store.configure({language:'nl',reduceMotion:true});
assert.equal(updates,1);
assert.equal(store.getSnapshot().language,'nl');
unsubscribe();store.alert('No listener');assert.equal(updates,1);

// Prevent app-owned confirmations from silently reverting to native alerts.
const mobile=resolve(process.cwd().endsWith('mobile')?'.':'apps/mobile');
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sources(join(dir,entry.name)):/\.[jt]sx?$/.test(entry.name)?[join(dir,entry.name)]:[]);}
for(const file of [join(mobile,'App.tsx'),...sources(join(mobile,'src'))]){
 const text=readFileSync(file,'utf8');
 assert.ok(!/import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/.test(text),`${file} must use gameAlert instead of native Alert`);
}
assert.ok(/<GameAlertHost\s*\/>/.test(readFileSync(join(mobile,'App.tsx'),'utf8')),'The global alert host must remain mounted');
console.log('PASS themed alerts: cancellation, single execution, queued/nested dialogs, default OK, settings and native-alert regression guard');
