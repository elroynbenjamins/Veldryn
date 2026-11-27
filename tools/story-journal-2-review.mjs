/** Review-only Journal 2.0 content contract. Not imported by live gameplay.
 * Destinations are derived from supplied canonical content, never from narrative copy.
 * A destination is navigation guidance, not access or reward authority.
 */
export const STORY_REVIEW_RELEASED = false;
const kinds = new Set(['kill','boss','map','equipped','level']);
const id = value => typeof value === 'string' && value.trim().length > 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const regionOf = (entry, world) => entry.regionId ?? world.find(row => row.zoneId === entry.zoneId)?.regionId;
export function validateStoryBook(book) {
  if (book?.released !== false || !id(book.regionId) || !Array.isArray(book.quests) || !Array.isArray(book.zones)) throw Error('invalid_hidden_book');
  const zones = new Set(book.zones.map(z => z.zoneId));
  if (zones.size !== book.zones.length || [...zones].some(z => !id(z))) throw Error('duplicate_zone');
  const byId = new Map(), legacy = new Set();
  for (const q of book.quests) {
    if (!id(q.id) || byId.has(q.id) || (book.regionId==='ASTERFALL'&&!id(q.legacyQuestId)) || (q.legacyQuestId!==undefined&&(!id(q.legacyQuestId)||legacy.has(q.legacyQuestId)))) throw Error('duplicate_or_invalid_quest');
    if (q.regionId !== book.regionId || !zones.has(q.narrativeZoneId) || q.released !== false || q.rewardPolicy !== 'unapproved') throw Error('invalid_quest_scope');
    if (!Array.isArray(q.objectives) || !q.objectives.length || !Array.isArray(q.prerequisites)) throw Error('missing_objectives_or_prerequisites');
    const seen = new Set();
    for (const o of q.objectives) {
      if (!id(o.id) || seen.has(o.id) || !kinds.has(o.kind) || !id(o.targetId) || !positive(o.required) || o.evidence !== (o.kind === 'kill' ? 'sinceActivation' : 'verifiedFact')) throw Error('invalid_objective');
      seen.add(o.id);
    }
    byId.set(q.id,q); if(q.legacyQuestId!==undefined)legacy.add(q.legacyQuestId);
  }
  const done = new Set(), visiting = new Set();
  function visit(key) {
    if (visiting.has(key)) throw Error('quest_cycle');
    if (done.has(key)) return;
    const q = byId.get(key);
    if (!q) throw Error('unknown_prerequisite');
    visiting.add(key);
    for (const predecessor of q.prerequisites) visit(predecessor);
    visiting.delete(key); done.add(key);
  }
  for (const key of byId.keys()) visit(key);
  return true;
}
function target(rows, targetId) {
  if (!Array.isArray(rows)) return undefined;
  const found = rows.filter(row => row.id === targetId);
  return found.length === 1 && found[0].released === true ? found[0] : undefined;
}
function locate(entry, world) {
  if (!entry || !id(entry.zoneId) || !Array.isArray(world)) return undefined;
  const regionId = regionOf(entry,world);
  const matches = world.filter(w => w.zoneId === entry.zoneId && w.regionId === regionId && w.released === true && (entry.areaId ? w.areaId === entry.areaId : !w.areaId));
  return matches.length === 1 ? {regionId,zoneId:entry.zoneId,...(entry.areaId?{areaId:entry.areaId}:{})} : undefined;
}
const unavailable = reason => ({status:'unavailable',reason,authorizesAccess:false});
const ready = value => ({status:'destination',...value,authorizesAccess:false});
export function resolveStoryObjective(quest, objective, catalog) {
  if (!quest || !objective || !catalog || !kinds.has(objective.kind)) return unavailable('missing_content');
  if (objective.kind === 'equipped') return ready({screen:'Inventory'});
  if (objective.kind === 'level') return ready({screen:'World'});
  if (objective.kind === 'map') {
    const route = target(catalog.routes,objective.targetId);
    const location = locate(route,catalog.world);
    if (!location) return unavailable('route_missing_or_unreleased');
    if (location.regionId !== quest.regionId) return unavailable('regional_story_review_required');
    return ready({screen:'Skills',skillId:'exploration',section:'Routes',routeId:route.id,...location});
  }
  const enemy = target(catalog.enemies,objective.targetId);
  const location = locate(enemy,catalog.world);
  if (!location || Boolean(enemy.boss) !== (objective.kind === 'boss')) return unavailable('enemy_missing_or_wrong_kind');
  if (location.regionId !== quest.regionId) return unavailable('regional_story_review_required');
  return ready({screen:'World',monsterId:enemy.id,...location});
}
/** All eligible gathering sources, not a single baked-in location. No travel or skill grants. */
export function resolveGatheringSources(path,catalog) {
  if (!path || !catalog || !Array.isArray(catalog.gathering)) return [];
  return catalog.gathering.filter(row => row.released === true && row.itemId === path.resourceId && row.skillId === path.skillId)
    .flatMap(row => {
      const location = locate(row,catalog.world);
      return location ? [ready({screen:'Skills',skillId:row.skillId,gatheringId:row.id,...location})] : [];
    });
}
