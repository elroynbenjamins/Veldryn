import type {ImageSourcePropType} from 'react-native';
import type {SkillId} from '../core/types';
export type ActivityIconId=SkillId|'combat';
export const skillIcons={
 combat:require('../../assets/activity-icons-v1/combat.png'),
 mining:require('../../assets/activity-icons-v1/mining.png'),
 woodcutting:require('../../assets/activity-icons-v1/woodcutting.png'),
 fishing:require('../../assets/activity-icons-v1/fishing.png'),
 smithing:require('../../assets/activity-icons-v1/smithing.png'),
 cooking:require('../../assets/activity-icons-v1/cooking.png'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
export const smallSkillIcons={
 combat:require('../../assets/activity-icons-v1/small/combat.png'),
 mining:require('../../assets/activity-icons-v1/small/mining.png'),
 woodcutting:require('../../assets/activity-icons-v1/small/woodcutting.png'),
 fishing:require('../../assets/activity-icons-v1/small/fishing.png'),
 smithing:require('../../assets/activity-icons-v1/small/smithing.png'),
 cooking:require('../../assets/activity-icons-v1/small/cooking.png'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
