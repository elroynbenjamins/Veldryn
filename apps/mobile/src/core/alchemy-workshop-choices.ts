import type {Recipe} from '../content/skills';

export interface AlchemyPotionRow {
 outputId:string;
 recipe:Recipe;
 options:readonly Recipe[];
}

/** One stable card per resulting potion. Source selection never changes the
 * actual recipe ID sent to the authoritative brewing command. */
export function alchemyPotionRows(
 recipes:readonly Recipe[],
 capacity:(recipe:Recipe)=>number,
 skillLevel:number,
 {activeId,preferredId,manualByOutput={},readyOnly=false}:{
  activeId?:string;preferredId?:string;manualByOutput?:Readonly<Record<string,string>>;readyOnly?:boolean;
 }={},
):AlchemyPotionRow[]{
 const grouped=new Map<string,Recipe[]>();
 for(const recipe of recipes){
  const id=recipe.output.itemId,options=grouped.get(id)??[];
  options.push(recipe);grouped.set(id,options);
 }
 const rows:AlchemyPotionRow[]=[];
 for(const [outputId,options] of grouped){
  const craftable=(recipe:Recipe)=>recipe.level<=skillLevel&&capacity(recipe)>0;
  const firstCraftable=options.find(craftable);
  if(readyOnly&&!firstCraftable)continue;
  const selected=options.find(recipe=>recipe.id===activeId)
   ??options.find(recipe=>recipe.id===manualByOutput[outputId]&&(!readyOnly||craftable(recipe)))
   ??firstCraftable
   ??options.find(recipe=>recipe.id===preferredId)
   ??options[0];
  rows.push({outputId,recipe:selected,options});
 }
 return rows;
}
