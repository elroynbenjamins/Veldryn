import {GATHERING,GATHERING_CONTENT_TIME_SCALE,GATHERING_HIGH_XP_SCALE,GATHERING_MID_XP_SCALE} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {GATHER_TIME_SCALE} from '../src/core/game';
import {skillXpForNextLevel} from '../src/core/progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function pace(action:(typeof GATHERING)[number]){
 const tool=GATHERING_TOOLS.find(row=>row.skillId===action.skillId&&row.tier===action.recommendedToolTier);
 const toolMultiplier=tool?.actionTimeMultiplier??1;
 const seconds=action.seconds*GATHER_TIME_SCALE*action.difficultyMultiplier*toolMultiplier;
 const xpPerHour=action.xp*3600/seconds;
 return {seconds,xpPerHour,hoursPerLevel:skillXpForNextLevel(action.unlockLevel)/xpPerHour};
}
function herbPace(id:string){
 const action=HERB_NODES.find(row=>row.id===id)!;
 const seconds=action.seconds*GATHER_TIME_SCALE;
 const xpPerHour=action.xp*3600/seconds;
 return {seconds,xpPerHour,hoursPerLevel:skillXpForNextLevel(action.unlockLevel)/xpPerHour};
}

ok(GATHERING_CONTENT_TIME_SCALE===1.6,'Gathering authored-time stretch must remain the reviewed 1.6x balance value');
ok(GATHERING_MID_XP_SCALE===1.25&&GATHERING_HIGH_XP_SCALE===1.35,'Gathering mid/high XP scales must remain explicit');

const greenwood=pace(GATHERING.find(row=>row.id==='GREENWOOD_TREE')!);
const ironwood=pace(GATHERING.find(row=>row.id==='IRONWOOD_TREE')!);
const riverEel=pace(GATHERING.find(row=>row.id==='RIVER_EEL_POOL')!);
const crownwood=pace(GATHERING.find(row=>row.id==='CROWNWOOD_TREE')!);
const oathscale=pace(GATHERING.find(row=>row.id==='OATHSCALE_POOL')!);
const echo=pace(GATHERING.find(row=>row.id==='ECHO_QUARTZ_GEODE')!);

ok(greenwood.hoursPerLevel>=.4&&greenwood.hoursPerLevel<=1,'Starter gathering should take roughly 25–60 minutes per level at the recommended tool');
for(const [name,row] of [['Ironwood',ironwood],['River Eel',riverEel]] as const)ok(row.hoursPerLevel>=4&&row.hoursPerLevel<=8,name+' should land in the reviewed mid-tier 4–8h/level band');
for(const [name,row] of [['Crownwood',crownwood],['Oathscale',oathscale],['Echo Quartz',echo]] as const)ok(row.hoursPerLevel>=10&&row.hoursPerLevel<=17,name+' should land in the reviewed high-tier 10–17h/level band');

const riverMint=herbPace('RIVER_MINT_BED'),ironbloom=herbPace('IRONBLOOM_THICKET');
ok(ironwood.hoursPerLevel/riverMint.hoursPerLevel>=.65&&ironwood.hoursPerLevel/riverMint.hoursPerLevel<=1.25,'Mid-tier tool gathering should stay in the same pacing family as Herbalism');
ok(crownwood.hoursPerLevel/ironbloom.hoursPerLevel>=.7&&crownwood.hoursPerLevel/ironbloom.hoursPerLevel<=1.3,'High-tier tool gathering should stay in the same pacing family as Herbalism');

console.log('PASS: gathering time/XP bands are smooth and aligned with Herbalism reference pacing');
