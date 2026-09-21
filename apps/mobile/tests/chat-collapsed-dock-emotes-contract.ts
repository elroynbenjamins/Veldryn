export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
function ok(value:boolean,message:string){if(!value)throw new Error(message)}

import {CHAT_EMOTE_TRAY_SIZE,CHAT_MAX_EMOTES_PER_MESSAGE,chatEmoteCount,defaultChatEmoteTray,normalizeChatEmoteTrayIds} from '../src/core/chat-emotes';
import {TRAY_SIZE as PILOT_TRAY_SIZE,MAX_EMOTES as PILOT_MAX_EMOTES} from '../src/features/chat-pilot/src/core/chat';

ok(CHAT_EMOTE_TRAY_SIZE===8,'Production chat tray must have exactly eight quick slots');
ok(CHAT_MAX_EMOTES_PER_MESSAGE===2,'Production chat must allow at most two emotes per message');
ok(PILOT_TRAY_SIZE===8,'Chat Pilot tray size must match production at eight');
ok(PILOT_MAX_EMOTES===2,'Chat Pilot message emote cap must match production at two');
ok(defaultChatEmoteTray('male').length===8&&defaultChatEmoteTray('female').length===8,'Both body presentations must resolve an eight-emote default tray');
ok(normalizeChatEmoteTrayIds([...defaultChatEmoteTray('male'),'male_01']).length===8,'Tray normalization must de-duplicate and cap at eight');
ok(chatEmoteCount(':male_01: hello :female_01:')===2,'Emote counting must recognize two valid shortcodes');

const types=read('src/core/types.ts');
ok(types.includes('chatDockLines?:1|2|3'),'Game settings must persist a 1/2/3-line collapsed chat preference');
ok(types.includes('chatEmoteTrayIds?:string[]'),'Game settings must persist the selected eight-slot emote tray');
const game=read('src/core/game.ts');
ok(game.includes('chatDockLines:1'),'New saves must default to the thin one-line chat dock');
ok(game.includes('chatEmoteTrayIds:[]'),'New saves must allow the body-specific default tray until the player saves custom slots');
const normalization=read('src/core/save-normalization.ts');
ok(normalization.includes('normalizeChatEmoteTrayIds(input.settings?.chatEmoteTrayIds)'),'Legacy saves must normalize the emote tray preference');
const commands=read('src/core/game-commands.ts');
ok(commands.includes('CHAT_EMOTE_TRAY_SIZE'),'Server-owned settings validation must know the canonical tray size');
ok(commands.includes("chatEmoteTrayIds.length!==0&&chatEmoteTrayIds.length!==CHAT_EMOTE_TRAY_SIZE"),'Saved trays must be either legacy-empty or exactly eight slots');

const settings=read('src/screens/SettingsScreen.tsx');
ok(settings.includes('Collapsed chat preview'),'Settings must expose collapsed chat preview size');
ok(settings.includes("([1,2,3] as const).map(lines=>"),'Settings must offer one, two and three collapsed lines');
ok(settings.includes('Emote Tray · 8 slots'),'Development Chat Pilot entry must match the production eight-slot rule');

const dock=read('src/components/ChatDock.tsx');
ok(dock.includes('lines?:1|2|3'),'Chat dock must support the persisted 1/2/3-line preference');
ok(dock.includes("width:'100%'"),'Collapsed chat must be a full-width strip above navigation');
ok(!dock.includes("position:'absolute'"),'Collapsed chat must participate in layout instead of floating over game controls');
ok(!dock.includes('PanResponder'),'Collapsed chat must not drift away from navigation via drag positioning');
ok(dock.includes('rows.slice(-lines)'),'Collapsed chat must show the selected number of most recent World messages');
ok(dock.includes('onPress={onOpen}'),'Tapping the collapsed strip must open full chat');

const overlay=read('src/components/ChatOverlay.tsx');
ok(overlay.includes('lines={state.settings.chatDockLines??1}'),'Chat overlay must pass the saved dock height preference');
ok(overlay.includes('trayIds={state.settings.chatEmoteTrayIds}'),'All overlay chat channels must receive the saved quick tray');
ok(overlay.includes('onTrayChange={onEmoteTrayChange}'),'All overlay chat channels must be able to persist edited tray choices');

const app=read('App.tsx');
ok(app.includes('onEmoteTrayChange={ids=>commit('),'Global chat tray edits must persist through normal settings save flow');
ok(app.includes('onTrayChange={ids=>commit('),'Direct Guild Chat tray edits must persist through normal settings save flow');

const emoteAssets=read('src/theme/chat-emote-assets.ts');
ok(emoteAssets.includes("art['emotes/'+id]"),'Live chat must resolve prepared custom emote artwork');
const picker=read('src/components/ChatEmotePicker.tsx');
ok(picker.includes('Choose your 8 emotes'),'Production picker must expose eight-slot editing');
ok(picker.includes('Save 8'),'Production tray editor must save exactly eight slots');
ok(picker.includes('CHAT_EMOTE_TRAY_SIZE'),'Production picker must use the canonical tray size');
ok(picker.includes('usedCount>=CHAT_MAX_EMOTES_PER_MESSAGE'),'Quick emote insertion must disable after two emotes are already in the draft');
ok(picker.includes('availableChatEmotes(unlockedIds)'),'Tray editing must include default plus account-unlocked emotes');
ok(picker.includes('chatEmoteArtwork'),'Tray slots must show the actual emote PNGs');

const message=read('src/components/ChatMessageText.tsx');
ok(message.includes('chatEmoteArtwork')&&message.includes('<Image key={index}'),'Chat messages must render custom emote artwork inline');

for(const path of ['src/components/OnlineWorldChat.tsx','src/components/GuildChat.tsx','src/components/OnlinePartyChat.tsx']){
 const source=read(path);
 ok(source.includes('CHAT_MAX_EMOTES_PER_MESSAGE'),'Live channel must use the canonical two-emote limit: '+path);
 ok(source.includes('Use at most 2 emotes in one message.'),'Live channel must explain the two-emote cap: '+path);
 ok(source.includes('usedCount={chatEmoteCount('),'Live picker must know how many emotes are already in the draft: '+path);
 ok(source.includes('trayIds={trayIds}')&&source.includes('onTrayChange={onTrayChange}'),'Live channel must use the persisted editable tray: '+path);
}
const offline=read('src/components/WorldChat.tsx');
ok(offline.includes('CHAT_MAX_EMOTES_PER_MESSAGE')&&offline.includes('Use at most 2 emotes in one message.'),'Offline/local chat must mirror the two-emote production rule');
ok(offline.includes('trayIds={trayIds}')&&offline.includes('usedCount={chatEmoteCount(text)}'),'Offline/local picker must mirror the eight-slot production tray');

const pilot=read('src/features/chat-pilot/src/native/ChatScreen.tsx');
ok(!pilot.includes('20 emotes')&&!pilot.includes('Save 20'),'Chat Pilot UI must not retain obsolete 20-slot copy');
ok(pilot.includes('Your 8 emotes')&&pilot.includes('Save 8'),'Chat Pilot UI must present the same eight-slot tray');

const migration=read('../../backend/supabase/migrations/20261018000180_chat_emote_limit_v1.sql');
ok(migration.includes('before insert or update of body on public.chat_messages'),'Server emote policy must guard every chat_messages write path');
ok(migration.includes("regexp_matches(coalesce(new.body,''), ':[a-z0-9_]+:', 'g')"),'Server must count shortcode-shaped emotes in the message body');
ok(migration.includes('if v_emote_count>2 then'),'Server must reject messages containing a third emote');
ok(migration.includes("raise exception 'CHAT_EMOTE_LIMIT'"),'Server must expose a stable emote-limit rejection');

console.log('PASS: collapsed chat, eight-slot trays and the two-emote policy are aligned client/server');
