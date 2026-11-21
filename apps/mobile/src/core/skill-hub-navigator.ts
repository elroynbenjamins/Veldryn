/**
 * Presentation-only registry for trainable Skills and related progression.
 * Skills/Abilities 2.0 uses distinct selectable abilities, talent nodes and loadouts:
 * this registry intentionally never treats those as XP-driven profession skills.
 * Additional trainable professions can appear under 'other' without a hub redesign.
 */
export type SkillNavigatorCategory='combat'|'gathering'|'crafting'|'other'|'companions';
export type SkillNavigatorRoute='combat'|'discipline'|'skill'|'overview'|'companion-mastery'|'sanctuary';

export interface SkillNavigatorEntry{
 id:string;
 name:string;
 subtitle:string;
 category:SkillNavigatorCategory;
 route:SkillNavigatorRoute;
 level?:number;
 xp?:number;
}

export const SKILL_NAVIGATOR_CATEGORIES:readonly SkillNavigatorCategory[]=['combat','gathering','crafting','other','companions'];

const GATHERING_SKILLS=new Set(['mining','woodcutting','fishing','herbalism','exploration']);
const CRAFTING_SKILLS=new Set(['smithing','cooking','alchemy','tailoring','enchanting','faith','forge']);

export function skillNavigatorCategoryFor(id:string):SkillNavigatorCategory{
 if(GATHERING_SKILLS.has(id))return 'gathering';
 if(CRAFTING_SKILLS.has(id))return 'crafting';
 return 'other';
}

/** A skill without a supported detail route still exposes its real XP in an overview, never a blank recipe screen. */
export function skillNavigatorRouteFor(id:string):'skill'|'overview'{
 return GATHERING_SKILLS.has(id)||CRAFTING_SKILLS.has(id)?'skill':'overview';
}

export function filterSkillNavigatorEntries(
 entries:readonly SkillNavigatorEntry[],
 category:'all'|SkillNavigatorCategory,
 query:string,
 language:string='en'
):SkillNavigatorEntry[]{
 const needle=query.trim().toLocaleLowerCase(language);
 return entries.filter(row=>
  (category==='all'||row.category===category)&&
  (!needle||[row.name,row.subtitle,row.id].some(text=>text.toLocaleLowerCase(language).includes(needle)))
 );
}
