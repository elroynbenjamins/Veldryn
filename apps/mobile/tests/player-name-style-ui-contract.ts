export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const editor=read('src/components/PlayerNameStyleEditor.tsx');
ok(editor.includes('VIP+ · SOLID RGB')&&editor.includes('SUPPORTER · ADVANCED STYLES'),'Profile editor must distinguish permanent VIP+ RGB from active Supporter styles');
ok(editor.includes('SUPPORTER_NAME_PRESETS')&&editor.includes('CUSTOM 3-COLOR GRADIENT'),'Supporter editor must expose presets and custom gradients');
ok(editor.includes('Slow flowing gradient')&&editor.includes('Reduced Motion'),'Advanced name motion must explicitly respect Reduced Motion');

const renderer=read('src/components/PlayerNameText.tsx');
ok(renderer.includes('sharedListeners')&&renderer.includes('Math.sin(phase*Math.PI*2)*.16'),'Animated names must use one shared slow-flow clock instead of one timer per name');
ok(renderer.includes("normalized.mode==='solid'")&&renderer.includes("normalized.mode==='gradient'"),'Name renderer must support solid and gradient modes');

const tagged=read('src/components/GuildTaggedPlayerName.tsx');
ok(tagged.includes('PlayerNameText')&&tagged.includes('nameStyle')&&tagged.includes('reduceMotion'),'Shared guild-tagged identity must render the player name style');

for(const path of ['src/components/OnlineWorldChat.tsx','src/components/OnlinePartyChat.tsx','src/components/GuildChat.tsx']){
 const source=read(path);
 ok(source.includes('nameStyle=')&&source.includes('reduceMotion={reduceMotion}'),path+' must pass remote name styles through the shared renderer');
}

const overlay=read('src/components/ChatOverlay.tsx');
ok((overlay.match(/reduceMotion=\{state\.settings\.reduceMotion\}/g)??[]).length>=3,'Chat overlay must pass Reduced Motion to world, party and guild name rendering');

const customize=read('src/screens/ProfileCustomizeScreen.tsx');
ok(customize.includes('PlayerNameStyleEditor'),'Profile Customization must surface the name-style editor');

console.log('PASS: player name style editor and chat rendering share one reduced-motion-safe presentation path');
