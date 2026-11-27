/** Shared first-pass surface treatment. Keep protected identity geometry and
 * motion gates intact; the background remains visible beneath a readable scrim.
 * Physical frame thinning belongs to the source art, not image stretching. */
const surface=(rgb:string)=>({
 identity:{backgroundColor:`rgba(${rgb},0.82)`,borderWidth:0,borderRadius:8},
 portrait:{backgroundColor:'transparent',borderWidth:0,borderRadius:5},
 guild:{backgroundColor:`rgba(${rgb},0.82)`,borderWidth:0,borderRadius:5},
});
export const ASCENDANT_SURFACES={
 celestial:surface('8,16,34'),
 draconic:surface('28,12,19'),
 abyssal:surface('5,23,32'),
 paradox:surface('17,13,35'),
} as const;
