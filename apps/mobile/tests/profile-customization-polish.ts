import {createCharacter,newGame} from '../src/core/game';
import {newlyUnlockedProfileRewards,profileAudienceCanView,profileRewardSource} from '../src/core/profile-customization';

import {profileBackdropTopInset,profileBorderContentOffsets} from '../src/core/profile-frame-layout';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

let state=createCharacter(newGame(0),'IRONWARDEN','Profile Source Test');

const guildTitle=profileRewardSource(state,'title','bloomwarden');
equal(guildTitle.destination,'Guild','guild title routes to Guild');
ok(guildTitle.detail.includes('Join a guild'),'guild title explains requirement');

const levelTitle=profileRewardSource(state,'title','pathfinder');
equal(levelTitle.destination,'Character','level title routes to Character');
ok(levelTitle.detail.includes('level 8'),'level title explains exact level');

const eventTitle=profileRewardSource(state,'title','title_veil_watcher');
equal(eventTitle.destination,'Events','event title routes to Events');
ok(eventTitle.label.includes('Veilbreak'),'event title identifies its release event');
ok(eventTitle.detail.includes('800'),'event title shows the exact Veil Reputation threshold');

const guildBorder=profileRewardSource(state,'border','guild-border-silver');
equal(guildBorder.destination,'Guild','guild border routes to Guild');
equal(guildBorder.label,'Guild Token Shop','guild border identifies its shop source');
equal(guildBorder.name,'Fellowship Silver','guild border keeps its player-facing display name');

const eventUnlockState={...state,account:{...state.account,
 unlockedTitleIds:['title_veil_watcher'],
}};
const eventUnlocks=newlyUnlockedProfileRewards(state,eventUnlockState);
equal(eventUnlocks.length,1,'new released event profile rewards are detected');
ok(eventUnlocks.some(row=>row.kind==='title'&&row.name==='Veil Watcher'),'Veilbreak title unlock keeps its canonical reward name');

state={...state,character:{...state.character!,level:7}};
const levelUp={...state,character:{...state.character!,level:8}};
const levelUnlocks=newlyUnlockedProfileRewards(state,levelUp);
equal(levelUnlocks.length,1,'crossing a profile-title level threshold creates one notice');
equal(levelUnlocks[0].name,'Pathfinder','rebased level 8 unlock identifies Pathfinder');

const sameLevel={...levelUp};
equal(newlyUnlockedProfileRewards(levelUp,sameLevel).length,0,'unchanged state does not repeat profile unlock notices');

const guildBefore={...levelUp,account:{...levelUp.account,guildMember:false}};
const guildAfter={...guildBefore,account:{...guildBefore.account,guildMember:true}};
const guildUnlocks=newlyUnlockedProfileRewards(guildBefore,guildAfter);
ok(guildUnlocks.some(row=>row.id==='bloomwarden'),'joining a guild surfaces the guild profile title');

const journalTitleBefore={...levelUp,account:{...levelUp.account,journalState:{schemaVersion:42 as const,accountId:'acct',revision:0,unlockedAchievements:{},unlockedTitles:{},selectedTitleByCharacter:{},records:{}}}};
const journalTitleAfter={...journalTitleBefore,account:{...journalTitleBefore.account,journalState:{...journalTitleBefore.account.journalState!,unlockedTitles:{masterwork_savant:123}}}};
const journalTitleUnlocks=newlyUnlockedProfileRewards(journalTitleBefore,journalTitleAfter);
ok(journalTitleUnlocks.some(row=>row.kind==='title'&&row.id==='masterwork_savant'&&row.name==='Masterwork Savant'),'new Journal titles surface through the existing profile reward notice flow');

const fresh=createCharacter(newGame(0),'IRONWARDEN','Fresh Character');
equal(newlyUnlockedProfileRewards(newGame(0),fresh).length,0,'character creation does not spam baseline profile-title notices');

ok(profileAudienceCanView('public','public'),'public profiles are visible to public viewers');
ok(profileAudienceCanView('public','guild'),'public profiles are visible to guild viewers');
ok(profileAudienceCanView('guild','guild'),'guild-only profiles are visible to guild viewers');
equal(profileAudienceCanView('guild','public'),false,'guild-only profiles stay hidden from public viewers');
equal(profileAudienceCanView('private','public'),false,'private profiles stay hidden from public viewers');
equal(profileAudienceCanView('private','guild'),false,'private profiles stay hidden from guild viewers');
ok(profileAudienceCanView('private','self'),'self preview always remains visible');

console.log('PASS: profile customization sources and unlock moments');

for(const [width,height] of [[320,168],[350,221],[480,270],[350,58]]){
 const inset=height===58?5:8;
 const extra=profileBackdropTopInset('frame_gloamward',width,height,16/9,inset);
 ok(Number.isFinite(extra)&&extra>=0&&extra<=height/4,'calibrated background crop remains bounded');
 equal(profileBackdropTopInset('frame_wheat_crown',width,height,16/9,inset),0,'unreviewed border stays unchanged');
}
ok(profileBackdropTopInset('frame_gloamward',350,221)>0,'reported public profile size needs additional top clipping');
ok(profileBackdropTopInset('frame_gloamward',480,270)>=profileBackdropTopInset('frame_gloamward',350,221),'large scene scales the calibrated aperture');
equal(profileBackdropTopInset('frame_gloamward',0,0),0,'unmeasured scene has no calculated crop');

const gloamwardOffsets=profileBorderContentOffsets('frame_gloamward');
equal(gloamwardOffsets.petRightOffset,16,'Gloamward pet moves left by 16dp');
equal(gloamwardOffsets.guildLeftOffset,8,'Gloamward guild tag moves right by 8dp');
for(const id of [undefined,null,'','frame_wheat_crown','guild-border-royal']){
 const offsets=profileBorderContentOffsets(id);
 equal(offsets.petRightOffset,0,'other borders preserve pet horizontal position');
 equal(offsets.guildLeftOffset,0,'other borders preserve guild horizontal position');
}
