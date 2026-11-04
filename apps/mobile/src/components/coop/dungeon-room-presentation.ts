import type {CoopUiAssetId} from '../../core/coop-ui-contract';
import type {SocialMessageKey} from '../../i18n/social';

/**
 * Room copy describes what the server can resolve, never an assumed reward.
 * Shared by route previews and the non-combat resolving surface.
 */
export type DungeonRoomPresentation={name:SocialMessageKey;description:SocialMessageKey;art:CoopUiAssetId};
export const DUNGEON_ROOM_PRESENTATION:Record<string,DungeonRoomPresentation>={
 battle:{name:'Battle room',description:'Fight the enemies ahead.',art:'node_battle'},
 elite:{name:'Elite room',description:'Expect a tougher fight.',art:'node_elite'},
 boss:{name:'Boss room',description:'Face the final encounter.',art:'node_boss'},
 camp:{name:'Camp room',description:"Restore your party's health.",art:'node_camp'},
 shrine:{name:'Shrine room',description:'Receive a dungeon boon.',art:'node_shrine'},
 forge:{name:'Forge room',description:'Receive a dungeon boon.',art:'node_event'},
 treasure:{name:'Treasure room',description:'Discover a dungeon artifact.',art:'node_treasure'},
 secret:{name:'Secret room',description:'Discover a dungeon artifact.',art:'node_treasure'},
 merchant:{name:'Merchant room',description:'Visit a dungeon merchant.',art:'node_merchant'},
 echo:{name:'Echo room',description:'Receive a dungeon boon.',art:'node_echo'},
 risk:{name:'Risk room',description:'Gain resources, but take a curse.',art:'node_risk'},
 event:{name:'Event room',description:'Earn resources for your run.',art:'node_event'},
};
export function dungeonRoomPresentation(kind:string|undefined):DungeonRoomPresentation|undefined{
 return kind&&Object.prototype.hasOwnProperty.call(DUNGEON_ROOM_PRESENTATION,kind)?DUNGEON_ROOM_PRESENTATION[kind]:undefined;
}
