import {createCharacter,newGame,startCombat} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {selectGlobalPopup,type GlobalPopupCandidates} from '../src/core/global-popup-priority';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

// Higher-priority arrivals defer but do not discard lower-priority announcements.
const pending:GlobalPopupCandidates={
  characterWelcome:true,activityReward:true,storyBoss:true,exceptionalForge:true,
  mainTour:true,featureUnlock:true,customizationUnlock:true,firstSession:true,eventStart:true,whatsNew:true,
};
const order=[
  ['characterWelcome','character-welcome'],['activityReward','activity-reward'],['storyBoss','story-boss'],
  ['exceptionalForge','exceptional-forge'],['mainTour','main-tour'],['featureUnlock','feature-unlock'],
  ['customizationUnlock','customization-unlock'],['firstSession','first-session'],
  ['eventStart','event-start'],['whatsNew','whats-new'],
] as const;
for(const [property,kind] of order){
  ok(selectGlobalPopup(pending)===kind,'Global popups must respect priority: '+kind);
  pending[property]=false;
}
ok(selectGlobalPopup(pending)===null,'No notices yields no automatic popup');
ok(selectGlobalPopup({blocked:true,activityReward:true,whatsNew:true})===null,'A user alert blocks auto popups');
ok(selectGlobalPopup({blocked:false,activityReward:true,whatsNew:true})==='activity-reward','Queued reward reappears when the alert closes');
ok(selectGlobalPopup({eventStart:true,whatsNew:true})==='event-start','Release notes always follow event announcements');
ok(selectGlobalPopup({mainTour:true,firstSession:true})==='main-tour','Tours never overlap first-session guidance');

// Real gameplay command must settle earned progress before stopping any offline activity.
const t0=1_000_000;
const started=startCombat(createCharacter(newGame(t0),'WAYFINDER','Stop Tester'),'MOSS_RAT',t0);
const beforeXp=started.character!.xp,beforeGold=started.character!.gold;
const stopped=executeGameCommand(started,{type:'stop'},t0+60_000);
ok(stopped.state.activity===null,'Stopping ends the active hunt');
ok(stopped.state.character!.xp>beforeXp,'Stop must grant XP earned since the prior settlement');
ok(stopped.state.character!.gold>=beforeGold,'Stop cannot erase earned Gold');
const second=executeGameCommand(stopped.state,{type:'stop'},t0+60_001);
ok(second.state.character!.xp===stopped.state.character!.xp,'Repeating Stop cannot duplicate XP');
ok(second.state.character!.gold===stopped.state.character!.gold,'Repeating Stop cannot duplicate Gold');

console.log('PASS: Global popup priority, alert deferral and exactly-once activity stop settlement');
