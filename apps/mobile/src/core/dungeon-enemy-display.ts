/**
 * Dungeon combat names only. Do not rewrite server-authored names or IDs:
 * saved Q-Mode/Live combat replay references and backend mechanics depend on
 * stable identities. The UI shares the existing Dune Oracle atlas sprite.
 */
const DUNGEON_ENEMY_DISPLAY_NAMES:Readonly<Record<string,string>>=Object.freeze({
 'dune sphinx':'Dune Oracle',
 'the veiled sphinx':'The Veiled Oracle',
});

export function dungeonEnemyDisplayName(name:string):string{
 return DUNGEON_ENEMY_DISPLAY_NAMES[name.trim().toLowerCase().replace(/\s+/g,' ')]??name;
}

/** Existing server ability names are translated for display, not rebalanced. */
export function dungeonEnemyAbilityDisplayName(name:string):string{
 if(name==='Sphinx Riddleburst')return 'Oracle Riddleburst';
 if(name==='Sphinx Pursuit')return 'Oracle Pursuit';
 return name;
}
