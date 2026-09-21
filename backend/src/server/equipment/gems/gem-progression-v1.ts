import type {GemGrade} from './gem-catalog-v1';

export interface GemCombineCost{from:GemGrade;to:GemGrade;copies:3;dust:number;gold:number;durationSeconds:number;catalyst?:'regional'|'radiant';}
export const GEM_COMBINE_COSTS_V1:readonly GemCombineCost[]=[
 {from:1,to:2,copies:3,dust:0,gold:1500,durationSeconds:300},
 {from:2,to:3,copies:3,dust:5,gold:5000,durationSeconds:900},
 {from:3,to:4,copies:3,dust:15,gold:18000,durationSeconds:2700,catalyst:'regional'},
 {from:4,to:5,copies:3,dust:40,gold:60000,durationSeconds:7200,catalyst:'radiant'},
] as const;
export const GEM_DISMANTLE_DUST_V1:Readonly<Record<GemGrade,number>>={1:1,2:3,3:8,4:22,5:60};
export const GEM_UNSOCKET_COST_V1:Readonly<Record<GemGrade,{gold:number;dust:number}>>={
 1:{gold:0,dust:0},2:{gold:0,dust:0},3:{gold:500,dust:0},4:{gold:1500,dust:1},5:{gold:5000,dust:3},
};
export interface GemStack{familyId:string;grade:GemGrade;quantity:number;}
export interface GemWallet{gold:number;dust:number;regionalCatalysts:number;radiantCatalysts:number;gems:readonly GemStack[];}

function replaceStack(stacks:readonly GemStack[],familyId:string,grade:GemGrade,delta:number):GemStack[]{
 const next=stacks.map(v=>({...v}));const i=next.findIndex(v=>v.familyId===familyId&&v.grade===grade);const q=(i>=0?next[i].quantity:0)+delta;
 if(q<0)throw new Error('insufficient_gems');if(i>=0){if(q===0)next.splice(i,1);else next[i]={...next[i],quantity:q};}else if(q>0)next.push({familyId,grade,quantity:q});return next;
}
export function combineGemV1(wallet:GemWallet,familyId:string,from:1|2|3|4):GemWallet{
 const cost=GEM_COMBINE_COSTS_V1.find(v=>v.from===from);if(!cost)throw new Error('invalid_combine_grade');
 if(wallet.gold<cost.gold)throw new Error('insufficient_gold');if(wallet.dust<cost.dust)throw new Error('insufficient_gem_dust');
 if(cost.catalyst==='regional'&&wallet.regionalCatalysts<1)throw new Error('missing_regional_catalyst');
 if(cost.catalyst==='radiant'&&wallet.radiantCatalysts<1)throw new Error('missing_radiant_catalyst');
 let gems=replaceStack(wallet.gems,familyId,from,-3);gems=replaceStack(gems,familyId,cost.to,1);
 return {...wallet,gold:wallet.gold-cost.gold,dust:wallet.dust-cost.dust,regionalCatalysts:wallet.regionalCatalysts-(cost.catalyst==='regional'?1:0),radiantCatalysts:wallet.radiantCatalysts-(cost.catalyst==='radiant'?1:0),gems};
}
export function dismantleGemV1(wallet:GemWallet,familyId:string,grade:GemGrade,quantity=1):GemWallet{
 if(!Number.isInteger(quantity)||quantity<1)throw new Error('invalid_quantity');const gems=replaceStack(wallet.gems,familyId,grade,-quantity);
 return {...wallet,dust:wallet.dust+GEM_DISMANTLE_DUST_V1[grade]*quantity,gems};
}
