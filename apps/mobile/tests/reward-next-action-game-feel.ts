import {rewardFollowUpCandidates,type RewardLootHighlight,type RewardProgressionMoment} from '../src/core/reward-game-feel';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const skill:RewardProgressionMoment={kind:'skill_level',id:'mining',label:'Mining',beforeLevel:7,afterLevel:8,unlocks:['Aster-Iron Vein']};
const epicGear:RewardLootHighlight={itemId:'GEAR',name:'Epic Gear',quantity:1,rarity:'epic',spotlight:true,type:'gear'};
const common:RewardLootHighlight={itemId:'ORE',name:'Ore',quantity:2,rarity:'common',spotlight:false,type:'material'};

const ordered=rewardFollowUpCandidates({progressionMoments:[skill],lootHighlights:[epicGear],companionUnlockCount:1,petDropCount:1});
equal(ordered.map(row=>row.kind).join(','),'companion,pet,inventory,skill','follow-ups must prioritize the most special/new reward before routine inspection');
equal(ordered[3].label,'View Mining unlocks','skill follow-up must name the progressed skill');
equal(ordered[3].skillId,'mining','skill follow-up must retain the destination skill');
equal(rewardFollowUpCandidates({progressionMoments:[],lootHighlights:[common],companionUnlockCount:0,petDropCount:0}).length,0,'ordinary rewards must keep the simple Continue flow');

const popup=fs.readFileSync('src/components/RewardPopup.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
ok(popup.includes('rewardFollowUpCandidates'),'reward popup must use centralized follow-up priority');
ok(popup.includes("candidate.kind==='companion'&&onCompanions"),'new companions must route to Companions when supported');
ok(popup.includes("candidate.kind==='pet'&&onCollections"),'new pets must route to Collections when supported');
ok(popup.includes("candidate.kind==='inventory'&&onInventory"),'exceptional gear/gems must route to Inventory when supported');
ok(popup.includes("candidate.kind==='skill'&&candidate.skillId&&onSkill"),'new skill unlocks must route to the exact skill when supported');
ok(popup.includes('onClose();nextAction.action();'),'reward popup must close before navigating to the follow-up surface');
ok(popup.includes("title={nextAction.label}")&&popup.includes('title="Continue" tone="secondary"'),'meaningful rewards need one obvious primary follow-up while retaining Continue');

ok(app.includes("onInventory={()=>setTab('Inventory')}"),'App must wire reward gear follow-up to Inventory');
ok(app.includes("onCollections={()=>setTab('Collections')}"),'App must wire pet follow-up to Collections');
ok(app.includes("onCompanions={()=>setTab('Companions')}"),'App must wire companion follow-up to Companions');
ok(app.includes("setSelectedSkill(skillId)")&&app.includes("setTab('Skills')"),'App must route level-up follow-up to the specific skill screen');

console.log('PASS meaningful reward moments hand off to one useful next action while routine rewards stay fast');
