/** Isolated art/layout contract; not a live registry or ownership authority.
 * Do not import into production until finished assets and server grant review.
 */
export const NEXT_PREMIUM_SETS = [
  {
    id:'ascendant-sakura-enchantment', name:'Sakura Enchantment', short:'Sakura',
    background:'ascendant-sakura-petal-sanctuary', backgroundName:'Sakura Petal Sanctuary',
    border:'ascendant-sakura-blossom-crown', borderName:'Sakura Blossom Crown',
    pet:'ascendant-sakura-spirit-fox', petName:'Sakura Spirit Fox',
    showcase:'ascendant-sakura-petal-waltz', showcaseName:'Sakura Petal Waltz',
    badge:'ascendant_sakura_blossom_crest', badgeName:'Sakura Blossom Crest',
    icon:'ascendant-sakura-flower-icon', title:'ascendant-sakura-title', titleName:'Sakura Dreamkeeper',
    nameStyle:'ascendant-sakura-name', colors:['#F5A6C8','#FFF5FA','#C95C91'],
    petSide:'left', motion:'petal-waltz',
  },
  {
    id:'ascendant-stormforged-sovereign', name:'Stormforged Sovereign', short:'Stormforged',
    background:'ascendant-stormforged-thunderkeep', backgroundName:'Stormforged Thunderkeep',
    border:'ascendant-stormforged-steel-crown', borderName:'Stormforged Steel Crown',
    pet:'ascendant-stormforged-direwolf', petName:'Stormforged Direwolf',
    showcase:'ascendant-stormforged-thunder-pulse', showcaseName:'Stormforged Thunder Pulse',
    badge:'ascendant_stormforged_wolf_crest', badgeName:'Stormforged Wolf Crest',
    icon:'ascendant-stormforged-wolf-icon', title:'ascendant-stormforged-title', titleName:'Stormforged Warden',
    nameStyle:'ascendant-stormforged-name', colors:['#63CFFF','#CBD5E1','#2479DB'],
    petSide:'right', motion:'thunder-pulse',
  },
] as const;
export type NextPremiumSet = typeof NEXT_PREMIUM_SETS[number];

export const NEXT_PREMIUM_STAGE = {width:340,height:205,minWidth:320,maxWidth:480,maxFontScale:1.05,loopMs:24000,standardBorderNodes:6,showcaseBorderNodes:8} as const;
type Box = Readonly<{x:number;y:number;w:number;h:number}>;
export function nextPremiumBoxes(set:NextPremiumSet) {
  const mirror=(b:Box):Box=>({...b,x:NEXT_PREMIUM_STAGE.width-b.x-b.w});
  const left=set.petSide==='left';
  const pet=(b:Box)=>left?mirror(b):b;
  const identity=(b:Box)=>left?mirror(b):b;
  return {
    pet:pet({x:229,y:75,w:74,h:76}),
    alternatePet:pet({x:243,y:87,w:46,h:46}),
    platform:pet({x:229,y:143,w:74,h:12}),
    identity:identity({x:35,y:69,w:183,h:72}),
    guild:identity({x:35,y:143,w:183,h:16}),
  };
}
export function nextPremiumStageSupported(width:number,fontScale:number) {
  return Number.isFinite(width)&&width>=320&&width<=480&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=1.05;
}
export function nextPremiumPair(set:NextPremiumSet,background:unknown,border:unknown) {
  return background===set.background&&border===set.border;
}
export function nextPremiumPetMode(set:NextPremiumSet,pet:unknown,alternateArt:boolean) {
  return pet===set.pet?'matching':typeof pet==='string'&&pet.length>0&&alternateArt?'alternate':'none';
}
/** Periodic and bounded; renderer must supply its existing native clock, not a timer. */
export function nextPremiumEnvelope(elapsedMs:number) {
  const t=Number.isFinite(elapsedMs)?((elapsedMs%24000)+24000)%24000/24000:0;
  return {phase:t,ambient:.5-.5*Math.cos(2*Math.PI*t),accent:Math.pow(.5-.5*Math.cos(2*Math.PI*t),4)};
}
