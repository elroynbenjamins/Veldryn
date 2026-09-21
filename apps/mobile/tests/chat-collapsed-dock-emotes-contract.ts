export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const types=read('src/core/types.ts');
ok(types.includes('chatDockLines?:1|2|3'),'Game settings must persist a 1/2/3-line collapsed chat preference');
const game=read('src/core/game.ts');
ok(game.includes('chatDockLines:1'),'New saves must default to the thin one-line chat dock');
const normalization=read('src/core/save-normalization.ts');
ok(normalization.includes('chatDockLines:([1,2,3]'),'Legacy saves must normalize the collapsed chat preference');
const commands=read('src/core/game-commands.ts');
ok(commands.includes('![1,2,3].includes(result.chatDockLines??0)'),'Server-owned settings validation must accept only 1, 2 or 3 dock lines');

const settings=read('src/screens/SettingsScreen.tsx');
ok(settings.includes('Collapsed chat preview'),'Settings must expose collapsed chat preview size');
ok(settings.includes("([1,2,3] as const).map(lines=>"),'Settings must offer one, two and three lines');
ok(settings.includes('chatDockLines:1'),'Restore defaults must return chat preview to one line');

const dock=read('src/components/ChatDock.tsx');
ok(dock.includes('lines?:1|2|3'),'Chat dock must support the persisted 1/2/3-line preference');
ok(dock.includes("width:'100%'"),'Collapsed chat must be a full-width strip above navigation');
ok(!dock.includes("position:'absolute'"),'Collapsed chat must participate in layout instead of floating over game controls');
ok(!dock.includes('PanResponder'),'Collapsed chat must not drift away from navigation via drag positioning');
ok(dock.includes("rgba(13,30,45,.88)")&&dock.includes("rgba(255,250,240,.90)"),'Collapsed chat strip must remain translucent in dark and light themes');
ok(dock.includes('rows.slice(-lines)'),'Collapsed chat must show the selected number of most recent World messages');
ok(dock.includes('onPress={onOpen}'),'Tapping the collapsed strip must open full chat');
ok(dock.includes('ChatMessageText body={row.body} compact'),'Collapsed preview must render emotes consistently with full chat');

const overlay=read('src/components/ChatOverlay.tsx');
ok(overlay.includes('lines={state.settings.chatDockLines??1}'),'Chat overlay must pass the saved dock height preference');
ok(overlay.includes('unlockedEmoteIds={state.account.unlockedEmoteIds}'),'Live World, Guild and Party chat must receive account emote unlocks');
ok(overlay.includes('tab:{minHeight:44'),'Full-chat channel tabs must keep accessible touch height');

const emoteAssets=read('src/theme/chat-emote-assets.ts');
ok(emoteAssets.includes("art['emotes/'+id]"),'Live chat must resolve the prepared custom emote artwork');
const picker=read('src/components/ChatEmotePicker.tsx');
ok(picker.includes('chatEmoteArtwork')&&picker.includes('<Image source={art}'),'Live emote picker must display the actual custom PNGs');
ok(picker.includes('row.defaultAvailable!==false||unlocked.has(row.id)'),'Live picker must combine default emotes with account-unlocked emotes');
ok(!picker.includes('.slice(0,20)'),'Live picker must not silently restrict all players to the first male-only 20 emotes');
ok(picker.includes('toggle:{minHeight:44'),'Live emote picker control must retain a 44px touch target');

const message=read('src/components/ChatMessageText.tsx');
ok(message.includes('chatEmoteArtwork')&&message.includes('<Image key={index}'),'Chat messages must render custom emote artwork inline');
ok(message.includes('emoteImageCompact'),'Collapsed chat must have a compact emote presentation');

const emoteCore=read('src/core/chat-emotes.ts');
ok(emoteCore.includes('chatUnavailableEmoteIds'),'Chat must detect locked custom emotes typed manually');

for(const path of ['src/components/OnlineWorldChat.tsx','src/components/GuildChat.tsx','src/components/OnlinePartyChat.tsx']){
 const source=read(path);
 ok(source.includes('chatUnavailableEmoteIds'),path+' must block sending locked custom emotes');
 ok(source.includes('unlockedEmoteIds'),path+' must receive account emote unlocks');
 ok(source.includes('ChatEmotePicker unlockedIds={unlockedEmoteIds}'),path+' must expose unlocked emotes in the live picker');
}
const party=read('src/components/OnlinePartyChat.tsx');
ok(party.includes('chatEmoteCount(clean)>8'),'Party chat must enforce the same eight-emote message limit as World and Guild');

const offline=read('src/components/WorldChat.tsx');
ok(offline.includes('ChatMessageText')&&offline.includes('unlockedEmoteIds'),'Offline/local chat must preview the same custom emote behavior as live chat');

console.log('PASS: collapsed chat dock and live custom emote artwork are wired consistently');
