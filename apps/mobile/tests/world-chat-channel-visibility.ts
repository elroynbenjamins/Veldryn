/** Temporary launch visibility: English/Spanish only, without deleting world-3/4. */
import {assert} from './test-assert';
import {
 VISIBLE_WORLD_CHAT_CHANNEL_IDS,isVisibleWorldChatChannel,
 defaultVisibleWorldChatIndex,visibleWorldChatIndex,
} from '../src/core/world-chat-visibility';
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');

assert.deepEqual([...VISIBLE_WORLD_CHAT_CHANNEL_IDS],['world-1','world-2']);
assert.equal(isVisibleWorldChatChannel('world-1'),true);
assert.equal(isVisibleWorldChatChannel('world-2'),true);
assert.equal(isVisibleWorldChatChannel('world-3'),false);
assert.equal(isVisibleWorldChatChannel('world-4'),false);
assert.equal(isVisibleWorldChatChannel('anything-else'),false);
for(const [preference,expected] of [[undefined,0],[0,0],[1,0],[2,1],[3,0],[4,0],[-1,0],[999,0],[NaN,0]] as const){
 assert.equal(defaultVisibleWorldChatIndex(preference),expected,'legacy chat preference must never open a hidden channel: '+preference);
}
for(const [index,expected] of [[undefined,0],[-1,0],[0,0],[1,1],[2,0],[3,0],[999,0],[NaN,0]] as const){
 assert.equal(visibleWorldChatIndex(index),expected,'invalid picker index must never open hidden channels: '+index);
}

const social=read('src/online/social.ts');
assert.ok(social.includes("id:'world-1',name:'English'"),'English retains its existing database ID');
assert.ok(social.includes("id:'world-2',name:'Spanish'"),'Spanish retains its existing database ID');
assert.ok(social.includes("id:'world-3',name:'Global 1'"),'Global 1 data and server ID preserved');
assert.ok(social.includes("id:'world-4',name:'Global 2'"),'Global 2 data and server ID preserved');
assert.ok(social.includes('VISIBLE_WORLD_CHANNELS=WORLD_CHANNELS.filter(channel=>isVisibleWorldChatChannel(channel.id))'),
 'visible UI channels must derive from a single allowlist rather than deleting chat data');

const overlay=read('src/components/ChatOverlay.tsx');
const online=read('src/components/OnlineWorldChat.tsx');
const dock=read('src/components/ChatDock.tsx');
const demo=read('src/components/WorldChat.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(overlay.includes('VISIBLE_WORLD_CHANNELS.map((item,index)'),
 'expanded World selector must expose only visible channels');
assert.ok(online.includes('VISIBLE_WORLD_CHANNELS.map((item,index)'),
 'standalone live World Chat must expose only visible channels');
assert.ok(overlay.includes('defaultVisibleWorldChatIndex(state.settings.defaultWorldChat)'),
 'saved default 3/4 must be normalized when opening expanded chat');
assert.ok(dock.includes('visibleWorldChatIndex(selectedChannel-1)')&&dock.includes('VISIBLE_WORLD_CHANNELS[channelIndex].id'),
 'collapsed chat preview must ignore hidden saved channels');
assert.ok(online.includes('visibleWorldChatIndex(selectedChannel??localChannel)'),
 'standalone chat must ignore hidden selected channel indices');
assert.ok(demo.includes("const channels=[['English','English'],['Spanish','Spanish']];"),
 'local demo must have only two selectable channels');
assert.ok(demo.includes('visibleWorldChatIndex(selectedChannel??localChannel)'),
 'local demo should not display old Global channels via saved defaults');
assert.ok(settings.includes("([{id:1,label:'English'},{id:2,label:'Spanish'}] as const)"),
 'Settings offers exactly English and Spanish');
assert.ok(!settings.includes("label:'Global 1'")&&!settings.includes("label:'Global 2'"),
 'Settings must not re-enable hidden World Chat choices');
assert.ok(settings.includes('defaultVisibleWorldChatIndex(state.settings.defaultWorldChat)+1===channel.id'),
 'old preferences 3/4 show English as the default selected setting');
console.log('PASS: English and Spanish World Chat visible; Global 1/2 hidden without deleting their channel IDs or messages');
