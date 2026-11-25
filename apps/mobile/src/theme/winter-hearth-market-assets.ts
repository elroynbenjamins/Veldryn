import {Asset} from 'expo-asset';
import {WINTER_HEARTH_GUILD_RELEASED} from '../core/release-flags';
import type {WinterHearthStage} from '../core/winter-hearth-2026';
const sources:Record<WinterHearthStage,number>={
 0:require('../../assets/events/frostfall/winter-hearth/market_0.webp'),
 25:require('../../assets/events/frostfall/winter-hearth/market_25.webp'),
 50:require('../../assets/events/frostfall/winter-hearth/market_50.webp'),
 75:require('../../assets/events/frostfall/winter-hearth/market_75.webp'),
 100:require('../../assets/events/frostfall/winter-hearth/market_100.webp'),
};
export function winterHearthMarketSource(stage:WinterHearthStage){return sources[stage];}
const warmed=new Set<number>(),loading=new Set<number>();
/** Local assets only. Warm the next stage after the current image is shown;
 * no network request or startup-wide preload, no need to decode all five at once. */
export function warmNextWinterHearthMarket(stage:WinterHearthStage){
 if(!WINTER_HEARTH_GUILD_RELEASED)return;
 const next=([0,25,50,75,100] as const).find(p=>p>stage);if(next===undefined)return;
 const source=sources[next];if(warmed.has(source)||loading.has(source))return;
 loading.add(source);
 void Asset.loadAsync(source).then(()=>{warmed.add(source);},()=>{}).finally(()=>loading.delete(source));
}
