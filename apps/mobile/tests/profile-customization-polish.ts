import {createCharacter,newGame} from '../src/core/game';
import {newlyUnlockedProfileRewards,profileAudienceCanView,profileRewardSource} from '../src/core/profile-customization';

import {profileBackdropTopInset,profileSceneContentAnchors,profileSceneBorderZones,profileSceneFrameSegments,profileFrameSegments,PROFILE_SCENE_SAFE_LAYOUT} from '../src/core/profile-frame-layout';

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

const effectSource=profileRewardSource(state,'effect','effect_gloamward_wisps');
equal(effectSource.destination,'Store','profile effects route to the future Cosmetics surface');
equal(effectSource.name,'Arcane Wisps','effect source keeps its approved player-facing name');
ok(effectSource.detail.includes('Account-wide'),'effect source explains account-wide ownership');

const guildBorder=profileRewardSource(state,'border','guild-border-silver');
equal(guildBorder.destination,'Guild','guild border routes to Guild');
equal(guildBorder.label,'Guild Token Shop','guild border identifies its shop source');
equal(guildBorder.name,'Fellowship Silver','guild border keeps its player-facing display name');

const effectUnlockState={...state,account:{...state.account,unlockedProfileEffectIds:['effect_gloamward_wisps']}};
const effectUnlocks=newlyUnlockedProfileRewards(state,effectUnlockState);
equal(effectUnlocks.length,0,'unreleased animated effects do not generate player-facing unlock notices');

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


const safe=PROFILE_SCENE_SAFE_LAYOUT;
for(const inset of [0,8]){
 const a=profileSceneContentAnchors(inset);
 equal(a.side+inset,46,'fixed horizontal anchor regardless of border');
 equal(a.bottom+inset,28,'fixed bottom anchor regardless of border');
 equal(a.guildRightWithPet+inset,112,'guild reserves pet width and gap');
}
equal(profileSceneContentAnchors(8,true).bottom+8,31,'compact stage maintains existing vertical anchor');
for(const [w,h] of [[260,190],[340,205],[480,286],[320,168],[320,58]]){
 const zones=profileSceneBorderZones(w,h),raw=profileFrameSegments(w,h),clipped=profileSceneFrameSegments(w,h);
 ok(zones.length>0&&clipped.length>0,'safe ornament stencil remains usable');
 for(const z of zones){
  const overlaps=(x:number,y:number,width:number,height:number)=>z.x<x+width&&z.x+z.width>x&&z.y<y+height&&z.y+z.height>y;
  ok(!overlaps(w-safe.sideAnchor-safe.petSize,h-safe.bottomAnchor-safe.petSize,safe.petSize,safe.petSize)||h<168,'border never crosses fixed pet zone on full scenes');
  ok(!overlaps(safe.sideAnchor,h-safe.bottomAnchor-28,w-2*safe.sideAnchor-safe.petSize-safe.contentGap,28)||h<168,'border never crosses fixed guild zone on full scenes');
 }
 for(const p of clipped){
  const original=raw.find(r=>p.key.startsWith(r.key+':'))!;
  ok(!!original,'clipped segment retains original artwork');
  ok(Math.abs(p.x+p.imageLeft-original.x-original.imageLeft)<1e-7&&Math.abs(p.y+p.imageTop-original.y-original.imageTop)<1e-7,'clipping does not stretch or shift artwork');
  ok(zones.some(z=>p.x>=z.x-1e-7&&p.y>=z.y-1e-7&&p.x+p.width<=z.x+z.width+1e-7&&p.y+p.height<=z.y+z.height+1e-7),'every segment stays inside permitted stencil');
 }
}
