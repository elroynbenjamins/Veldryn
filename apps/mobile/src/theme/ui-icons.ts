import type {ImageSourcePropType} from 'react-native';
import type {QuickNavDestination} from '../core/quick-navigation';

/** Shared, literal Metro imports. Each destination keeps the same symbol across menus. */
export const uiIcons={
  character:require('../../assets/ui-icons-v2/character.png'),
  skills:require('../../assets/ui-icons-v2/skills.png'),
  world:require('../../assets/ui-icons-v2/world.png'),
  inventory:require('../../assets/ui-icons-v2/inventory.png'),
  account:require('../../assets/ui-icons-v2/account.png'),
  settings:require('../../assets/ui-icons-v2/settings.png'),
  search:require('../../assets/ui-icons-v2/search.png'),
  filter:require('../../assets/ui-icons-v2/filter.png'),
  back:require('../../assets/ui-icons-v2/back.png'),
  next:require('../../assets/ui-icons-v2/next.png'),
  events:require('../../assets/ui-icons-v2/events.png'),
  home:require('../../assets/ui-icons-v2/home.png'),
  quests:require('../../assets/ui-icons-v2/quests.png'),
  friends:require('../../assets/ui-icons-v2/friends.png'),
  guild:require('../../assets/ui-icons-v2/guild.png'),
  party:require('../../assets/ui-icons-v2/party.png'),
  chat:require('../../assets/ui-icons-v2/chat.png'),
  close:require('../../assets/ui-icons-v2/close.png'),
} satisfies Record<string,ImageSourcePropType>;
export const uiSmallIcons={
  character:require('../../assets/ui-icons-v2/small/character.png'),
  skills:require('../../assets/ui-icons-v2/small/skills.png'),
  world:require('../../assets/ui-icons-v2/small/world.png'),
  inventory:require('../../assets/ui-icons-v2/small/inventory.png'),
  account:require('../../assets/ui-icons-v2/small/account.png'),
  settings:require('../../assets/ui-icons-v2/small/settings.png'),
  search:require('../../assets/ui-icons-v2/small/search.png'),
  filter:require('../../assets/ui-icons-v2/small/filter.png'),
  back:require('../../assets/ui-icons-v2/small/back.png'),
  next:require('../../assets/ui-icons-v2/small/next.png'),
  events:require('../../assets/ui-icons-v2/small/events.png'),
  home:require('../../assets/ui-icons-v2/small/home.png'),
  quests:require('../../assets/ui-icons-v2/small/quests.png'),
  friends:require('../../assets/ui-icons-v2/small/friends.png'),
  guild:require('../../assets/ui-icons-v2/small/guild.png'),
  party:require('../../assets/ui-icons-v2/small/party.png'),
  chat:require('../../assets/ui-icons-v2/small/chat.png'),
  close:require('../../assets/ui-icons-v2/small/close.png'),
} satisfies Record<keyof typeof uiIcons,ImageSourcePropType>;
export type UiIconName=keyof typeof uiIcons;
export const navigationIcons:Record<QuickNavDestination,ImageSourcePropType>={
  Home:uiIcons.home,Skills:uiIcons.skills,Character:uiIcons.character,World:uiIcons.world,
  Inventory:uiIcons.inventory,Account:uiIcons.account,More:uiIcons.account,Quests:uiIcons.quests,Events:uiIcons.events,
  Friends:uiIcons.friends,Guild:uiIcons.guild,Settings:uiIcons.settings,Social:uiIcons.chat,Party:uiIcons.party,Dungeon:uiIcons.world,Companions:uiIcons.party,Empty:uiIcons.home,
};
