export interface QuestDef{id:string;name:string;description:string;kind:'kills'|'item'|'equip'|'level';targetId?:string;required:number;rewardGold:number;rewardItemId?:string;rewardItemQty?:number;}
export const QUESTS:QuestDef[]=[
{id:'QST_001',name:'A Name in the Ledger',description:'Defeat 5 Moss Rats.',kind:'kills',targetId:'MOSS_RAT',required:5,rewardGold:50,rewardItemId:'MOSS_FIBER',rewardItemQty:5},
{id:'QST_002',name:'First Blood, First Skill',description:'Collect 8 Moss Fiber.',kind:'item',targetId:'MOSS_FIBER',required:8,rewardGold:75},
{id:'QST_003',name:'Tools of the Trade',description:'Equip at least 2 pieces of gear.',kind:'equip',required:2,rewardGold:100,rewardItemId:'COPPER_ORE',rewardItemQty:6},
{id:'QST_004',name:'The Road Opens',description:'Reach character level 5.',kind:'level',required:5,rewardGold:150,rewardItemId:'GREENWOOD_LOG',rewardItemQty:6},
{id:'QST_005',name:'First Real Hunt',description:'Defeat 10 Roadside Boars.',kind:'kills',targetId:'ROADSIDE_BOAR',required:10,rewardGold:250,rewardItemId:'BOAR_HIDE',rewardItemQty:6},];
