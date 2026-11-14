import {assert} from './test-assert';
import {storyBossPlaybackEvents} from '../src/core/story-boss-playback';
import {simulateFallenKnightStoryBattle} from '../src/core/story-boss';
import {HUNT_CLASS_TECHNIQUES} from '../src/core/hunt-active-abilities';
import type {ClassId} from '../src/core/types';

const snapshot={
 bossMaxHp:100,playerMaxHp:100,
 events:[
  {atMs:0,type:'battle_start' as const,label:'start',playerHp:80,bossHp:100,phase:1 as const},
  // A phase telegraph is intentionally backdated AFTER the landed hit is
  // calculated; the original stored snapshot already knows the later HP.
  {atMs:3000,type:'player_hit' as const,label:'hit',amount:30,playerHp:80,bossHp:70,phase:1 as const},
  {atMs:2800,type:'telegraph' as const,label:'ward',playerHp:80,bossHp:70,phase:2 as const},
  {atMs:3030,type:'phase' as const,label:'Phase II',playerHp:80,bossHp:70,phase:2 as const},
  {atMs:4000,type:'boss_hit' as const,label:'hit',amount:20,playerHp:60,bossHp:70,phase:2 as const},
  {atMs:4001,type:'class_skill' as const,label:'guard',skillKind:'shield' as const,amount:2,playerHp:65,bossHp:70,phase:2 as const},
  {atMs:4002,type:'class_skill' as const,label:'heal',skillKind:'heal' as const,amount:5,playerHp:65,bossHp:70,phase:2 as const},
  {atMs:4040,type:'heal' as const,label:'potion',amount:10,playerHp:75,bossHp:70,phase:2 as const},
 ],
};
const before=JSON.stringify(snapshot.events);
const playback=storyBossPlaybackEvents(snapshot);
const telegraph=playback.find(e=>e.type==='telegraph')!;
assert.equal(telegraph.bossHp,100,'Backdated telegraph must not reveal future strike damage');
assert.equal(telegraph.phase,1,'Backdated telegraph must not advance phase before the phase event');
assert.equal(playback.find(e=>e.type==='player_hit')?.bossHp,70,'Player hit applies boss HP only at its own tick');
assert.equal(playback.find(e=>e.type==='class_skill'&&e.skillKind==='shield')?.playerHp,60,'Shield cue cannot replay HP restoration');
assert.equal(playback.find(e=>e.type==='class_skill'&&e.skillKind==='heal')?.playerHp,65,'Class healing updates HP on the heal cue');
assert.equal(playback[playback.length-1].playerHp,75,'Potion healing updates HP on its own cue');
assert.equal(JSON.stringify(snapshot.events),before,'Projection must not mutate authoritative replay events');

const snapshotBase={
 name:'Replay fighter',classId:'WAYFINDER',classSkillLevel:25,maxHp:10_000,currentHp:10_000,
 attack:100,defense:120,power:100,accuracy:.95,evasion:.1,critChance:.1,critMultiplier:1.5,haste:.1,
 damageMultiplier:1,actionSpeedMultiplier:1,incomingDamageMultiplier:1,
 potionHeal:150,potionQuantity:2,autoEatThresholdPct:60,
};
for(const id of Object.keys(HUNT_CLASS_TECHNIQUES) as ClassId[]){
 const settled=simulateFallenKnightStoryBattle({...snapshotBase,classId:id},'boss-replay-'+id,'rematch');
 const original=JSON.stringify(settled.events);
 const cues=storyBossPlaybackEvents(settled);
 const last=cues[cues.length-1];
 assert.equal(last.playerHp,settled.finalPlayerHp,'Playback player HP must match actual settlement: '+id);
 assert.equal(last.bossHp,settled.finalBossHp,'Playback enemy HP must match actual settlement: '+id);
 assert.ok(cues.every(e=>e.playerHp>=0&&e.playerHp<=settled.playerMaxHp&&e.bossHp>=0&&e.bossHp<=settled.bossMaxHp),'No HP over/underflow: '+id);
 assert.ok(cues.every((e,i)=>i===0||e.atMs>=cues[i-1].atMs),'Combat cues remain chronological: '+id);
 assert.equal(JSON.stringify(settled.events),original,'Presentation must not alter settlement for '+id);
}
console.log('PASS story boss retroactive telegraphs, HP replay, real class heals, potions and nine-class outcome parity');
