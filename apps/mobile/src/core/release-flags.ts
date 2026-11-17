/** Enable the event client; the authoritative server window controls access and rewards. */
export const EVENTS_RELEASED=true;
/** Prepared Frostfall rewards stay out of all player catalogs until the seasonal launch is explicitly approved. */
export const FROSTFALL_REWARDS_RELEASED=false;
/** Pause shared event-wide contribution goals until the active population can support them.
 * Preserve authored rewards and earned records for a future opt-in release. */
export const EVENT_COMMUNITY_ENABLED=false;
/** Arena is authored and testable, but stays out of the release build until its authenticated service ships. */
export const ARENA_RELEASED=false;

/** Prestige boards are paused while guild progression is being completed. */
export const RANKINGS_RELEASED=false;

/** Internal inventory audit only; no market UI, listings or transfers are released. */
export const PLAYER_MARKET_RELEASED=false;
/** Independent launch prerequisite: authenticated Market Edge write/read routes are not mounted. */
export const MARKET_AUTHENTICATED_SERVICE_READY=false;

/** Dungeon Marks Shop authored across three regions; keep collectible passives and shop UI hidden until server and art release. */
export const DUNGEON_MARKS_SHOP_RELEASED=false;

/** Manual translation: production function deployed; enable only after DeepL secret and E2E verification. */
export const CHAT_TRANSLATION_RELEASED=true;

/** Online player roster requires privacy-reviewed production RPC before player-visible activation. */
export const ONLINE_PLAYER_ROSTER_RELEASED=false;

/** Vendor equipment resale uplift is source-prepared only. Gameplay Edge and staging payout parity must be proved before activation. */
export const EQUIPMENT_RESALE_UPLIFT_RELEASED=false;
