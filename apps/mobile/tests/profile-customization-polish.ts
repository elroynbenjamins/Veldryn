import {createCharacter,newGame} from '../src/core/game';
import {newlyUnlockedProfileRewards,profileAudienceCanView,profileRewardSource} from '../src/core/profile-customization';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

let state=createCharacter(newGame(0),'IRONWARDEN','Profile Source Test');

const eventBackground=profileRewardSource(state,'background','bg_harvestwake');
equal(eventBackground.destination,'Events','event background routes to Events');
ok(eventBackground.label.includes('Harvestwake'),'event background names its event');
ok(eventBackground.label.includes('Event Shop'),'event shop background names Event Shop');
ok(eventBackground.detail.includes('Harvest Marks'),'event shop background shows exact currency');

const milestoneBorder=profileRewardSource(state,'border','frame_amber_vine');
equal(milestoneBorder.destination,'Events','event milestone border routes to Events');
ok(milestoneBorder.detail.includes('6,500'),'event milestone border shows exact reputation threshold');

const guildTitle=profileRewardSource(state,'title','bloomwarden');
equal(guildTitle.destination,'Guild','guild title routes to Guild');
ok(guildTitle.detail.includes('Join a guild'),'guild title explains requirement');

const levelTitle=profileRewardSource(state,'title','pathfinder');
equal(levelTitle.destination,'Character','level title routes to Character');
ok(levelTitle.detail.includes('level 10'),'level title explains exact level');

const eventTitle=profileRewardSource(state,'title','title_feast_friend');
equal(eventTitle.destination,'Events','event title routes to Events');
ok(eventTitle.detail.includes('1,000'),'event title shows milestone requirement');

const eventUnlockState={...state,account:{...state.account,
 unlockedProfileBackgroundIds:['bg_harvestwake'],
 unlockedProfileBorderIds:['frame_amber_vine'],
 unlockedTitleIds:['title_feast_friend'],
}};
const eventUnlocks=newlyUnlockedProfileRewards(state,eventUnlockState);
equal(eventUnlocks.length,3,'new event profile rewards are detected');
ok(eventUnlocks.some(row=>row.kind==='background'&&row.name==='Golden Fields'),'background unlock keeps canonical reward name');
ok(eventUnlocks.some(row=>row.kind==='border'&&row.name==='Amber Vine'),'border unlock keeps canonical reward name');
ok(eventUnlocks.some(row=>row.kind==='title'&&row.name==='Friend of the Feast'),'title unlock keeps canonical reward name');

state={...state,character:{...state.character!,level:9}};
const levelUp={...state,character:{...state.character!,level:10}};
const levelUnlocks=newlyUnlockedProfileRewards(state,levelUp);
equal(levelUnlocks.length,1,'crossing a profile-title level threshold creates one notice');
equal(levelUnlocks[0].name,'Pathfinder','level 10 unlock identifies Pathfinder');

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
