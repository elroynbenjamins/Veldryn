/** Draconic Dominion: private grant-only Ultra Luxe II. */
export const DRACONIC_IDS={
 background:'ascendant-draconic-dominion-of-ash',
 border:'ascendant-draconic-throne-of-embers',
 pet:'ascendant-draconic-vharaxis',
 showcase:'ascendant-draconic-awakening-of-the-dragon',
 badge:'ascendant_dragon_sovereign',
} as const;
export const DRACONIC_COLLECTION={
 id:'ascendant-draconic-dominion',
 name:'Draconic Dominion',
 backgroundName:'Dominion of Ash',
 borderName:'Throne of Embers',
 petName:'Vharaxis, the Eternal Flame',
 showcaseName:'Awakening of the Dragon',
 badgeName:'Dragon Sovereign',
} as const;
export const DRACONIC_STAGE={width:340,height:205,minWidth:320,maxWidth:480,maxFontScale:1.05} as const;
const identityPlate={x:35,y:69,w:183,h:72} as const;
export const DRACONIC_BOXES={
 dragon:{x:229,y:75,w:74,h:76},
 ring:{x:229,y:143,w:74,h:12},
 alternate:{x:243,y:87,w:46,h:46},
 glow:{x:246,y:130,w:40,h:9},
 flames:{x:229,y:75,w:74,h:76},
 portrait:{x:40,y:76,w:54,h:54},
 badges:{x:100,y:119,w:110,h:21},
 identity:{x:100,y:74,w:112,h:45},
 plate:identityPlate,
 guild:{x:identityPlate.x,y:143,w:identityPlate.w,h:16},
} as const;
export function draconicPair(background:string|null|undefined,border:string|null|undefined){
 return background===DRACONIC_IDS.background&&border===DRACONIC_IDS.border;
}
export function draconicPetMode(pet:string|null|undefined,alternateArt:boolean){
 return pet===DRACONIC_IDS.pet?'matching':pet&&alternateArt?'alternate':'none';
}
export function draconicStageSupported(width:number,fontScale:number){
 return Number.isFinite(width)&&width>=DRACONIC_STAGE.minWidth&&width<=DRACONIC_STAGE.maxWidth&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=DRACONIC_STAGE.maxFontScale;
}
