export interface Ingredient{itemId:string;quantity:number} export interface Recipe{id:string;levelReq:number;skillId:string;xp:number;ingredients:Ingredient[];outputs:Ingredient[];durationSec:number}
export function validateCraft(recipe:Recipe,skillLevel:number,qty:number){
  if(!Number.isSafeInteger(qty)||qty<1||qty>999)throw new Error('invalid_quantity');
  if(!Number.isSafeInteger(skillLevel)||skillLevel<0)throw new Error('invalid_skill_level');
  if(!Number.isSafeInteger(recipe.levelReq)||recipe.levelReq<0
    ||!Number.isSafeInteger(recipe.xp)||recipe.xp<0
    ||!Number.isFinite(recipe.durationSec)||recipe.durationSec<=0
    ||!recipe.outputs.length
    ||[...recipe.ingredients,...recipe.outputs].some(x=>!x.itemId||!Number.isSafeInteger(x.quantity)||x.quantity<=0))throw new Error('invalid_recipe');
  if(skillLevel<recipe.levelReq)throw new Error('skill_level_too_low');
  const ingredients=recipe.ingredients.map(x=>({...x,quantity:x.quantity*qty}));
  const outputs=recipe.outputs.map(x=>({...x,quantity:x.quantity*qty}));
  const xp=recipe.xp*qty,durationSec=recipe.durationSec*qty;
  if(![xp,...ingredients.map(x=>x.quantity),...outputs.map(x=>x.quantity)].every(Number.isSafeInteger)
    ||!Number.isFinite(durationSec)||durationSec>Number.MAX_SAFE_INTEGER)throw new Error('invalid_recipe');
  return{ingredients,outputs,xp,durationSec};
}
