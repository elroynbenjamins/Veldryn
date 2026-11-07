import {WORLD_ZONES} from '../src/content/world-map';
import {WORLD_CHAPTER_GROUPS,worldChapterForRegionId} from '../src/content/world-chapters';
import {regionAreas} from '../src/content/regional-areas';

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const ids=WORLD_CHAPTER_GROUPS.flatMap(chapter=>chapter.regionIds);
check(WORLD_CHAPTER_GROUPS.length===5,'Expected five visually grouped world chapters');
check(ids.length===WORLD_ZONES.length,'Every original travel region must appear once');
check(new Set(ids).size===ids.length,'No region ID may appear in multiple chapters');
check(WORLD_ZONES.every(zone=>ids.includes(zone.id)),'Existing travel IDs must remain unchanged');
const [heartlands,sunscar,frostmarch,ashlands,veillands]=WORLD_CHAPTER_GROUPS;
check(heartlands.name==='Asterfall Heartlands','The opening chapter must be named');
check(heartlands.regionIds.join(',')==='GREENFIELDS,SILVERBROOK,IRONWOOD,OLD_MINES,KINGS_ROAD','Opening zones must keep their existing IDs and order');
check(sunscar.regionIds.join(',')==='SUNSCAR'&&regionAreas('SUNSCAR').length===4,'Sunscar must expose four existing playable areas');
check(frostmarch.regionIds.join(',')==='FROSTMARCH'&&regionAreas('FROSTMARCH').length===4,'Frostmarch must expose four existing playable areas');
check(ashlands.regionIds.join(',')==='ASHLANDS','Ashlands must remain an existing travel region without fabricated zones');
check(veillands.regionIds.join(',')==='VEILLANDS'&&WORLD_ZONES.find(z=>z.id==='VEILLANDS')?.availability==='inDevelopment','Veillands must stay preview-only');
for(const chapter of WORLD_CHAPTER_GROUPS){
  check(!!WORLD_ZONES.find(zone=>zone.id===chapter.artRegionId),'Chapter art must resolve to an existing region panorama');
  for(const id of chapter.regionIds)check(worldChapterForRegionId(id)?.id===chapter.id,'Chapter lookup failed for '+id);
}
console.log('PASS: world chapters retain every original travel ID and four real areas per later region');
