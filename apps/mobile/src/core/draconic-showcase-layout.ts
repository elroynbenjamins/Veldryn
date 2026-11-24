/** Draconic Dominion: private grant-only Ultra Luxe II. */
export const DRACONIC_IDS={
 background:'ascendant-draconic-dominion-of-ash',
 border:'ascendant-draconic-throne-of-embers',
 pet:'ascendant-draconic-vharaxis',
 showcase:'ascendant-draconic-awakening-of-the-dragon',
 badge:'ascendant_draconic_sovereign',
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
export const DRACONIC_STAGE={width:340,height:205,minWidth:300,maxWidth:480,maxFontScale:1.2} as const;
export const DRACONIC_BOXES={
 dragon:{x:21,y:47,w:129,h:114},
 altar:{x:23,y:140,w:128,h:43},
 alternate:{x:63,y:79,w:46,h:46},
 glow:{x:65,y:122,w:42,h:10},
 flames:{x:18,y:45,w:130,h:125},
 portrait:{x:219,y:60,w:43,h:43},
 identity:{x:166,y:105,w:140,h:51},
 plate:{x:159,y:77,w:151,h:84},
 guild:{x:166,y:161,w:137,h:15},
} as const;
export function draconicPair(background:string|null|undefined,border:string|null|undefined){
 return background===DRACONIC_IDS.background&&border===DRACONIC_IDS.border;
}
export function draconicPetMode(pet:string|null|undefined,alternateArt:boolean){
 return pet===DRACONIC_IDS.pet?'matching':pet&&alternateArt?'alternate':'none';
}
export function draconicStageSupported(width:number,fontScale:number){
 return Number.isFinite(width)&&width>=300&&width<=480&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=1.2;
}
