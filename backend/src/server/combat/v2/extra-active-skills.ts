/** Server-authored Skills 2.0 additional active skill definitions.
 * All 36 skills have three distinct variants. Static data only; the guarded
 * v2 compiler is the sole integration point into the canonical combat engine.
 * Some advanced proc semantics remain scheduled for the later polish pass.
 */
import type {AbilityDefinition,AbilityEffect} from '../types';

export interface AdditionalVariantV2 {
 damage?:number;heal?:number;shield?:number;dot?:number;hot?:number;
 cooldownDelta?:number;cooldownMult?:number;target?:AbilityDefinition['target'];
 adds?:readonly AbilityEffect[];replaces?:readonly AbilityEffect[];
 priorityDelta?:number;
}
export interface AdditionalSkillV2 {
 classId:string;name:string;cooldownMs:number;target:AbilityDefinition['target'];
 effects:AbilityEffect[];variants:readonly [AdditionalVariantV2,AdditionalVariantV2,AdditionalVariantV2];
 priority:number;aiCondition?:AbilityDefinition['aiCondition'];
}
export const ADDITIONAL_SKILLS_V2:readonly AdditionalSkillV2[]=[
  {
    "classId": "IRONWARDEN",
    "name": "Rune Bash",
    "cooldownMs": 7000,
    "target": "interruptible_casting_enemy",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.05,
        "damageType": "physical"
      },
      {
        "kind": "interrupt"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.04,
            "durationMs": 5000
          }
        ]
      },
      {
        "damage": 1.25
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 78,
    "aiCondition": "target_casting"
  },
  {
    "classId": "IRONWARDEN",
    "name": "Iron Riposte",
    "cooldownMs": 8000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.12,
        "damageType": "physical"
      },
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.04,
        "durationMs": 3000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 3500,
            "target": "self"
          }
        ]
      },
      {
        "damage": 1.4,
        "replaces": [
          {
            "kind": "damage",
            "coeff": 1.5,
            "damageType": "physical"
          }
        ]
      },
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.03,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 67
  },
  {
    "classId": "IRONWARDEN",
    "name": "Shieldline",
    "cooldownMs": 14000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.1,
        "durationMs": 5000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 4000,
            "target": "self"
          }
        ],
        "target": "all_allies"
      },
      {
        "adds": [
          {
            "kind": "shield",
            "coeff": 0.45,
            "target": "lowest_hp_ally"
          }
        ]
      }
    ],
    "priority": 85
  },
  {
    "classId": "IRONWARDEN",
    "name": "Runic Judgment",
    "cooldownMs": 11000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.65,
        "damageType": "physical"
      },
      {
        "kind": "debuff",
        "tag": "damage_done",
        "value": -0.04,
        "durationMs": 4500
      }
    ],
    "variants": [
      {
        "damage": 1.25,
        "cooldownDelta": 1000
      },
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.4,
            "target": "self"
          }
        ]
      },
      {
        "damage": 0.92,
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.06,
            "durationMs": 5000
          }
        ]
      }
    ],
    "priority": 72
  },
  {
    "classId": "BASTION",
    "name": "Fortress Rebuff",
    "cooldownMs": 8000,
    "target": "interruptible_casting_enemy",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.8,
        "damageType": "physical"
      },
      {
        "kind": "interrupt"
      }
    ],
    "variants": [
      {
        "damage": 1.3
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.06,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.05,
            "durationMs": 5000
          }
        ]
      }
    ],
    "priority": 83,
    "aiCondition": "target_casting"
  },
  {
    "classId": "BASTION",
    "name": "Stone Brace",
    "cooldownMs": 10000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.12,
        "durationMs": 4000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.06,
            "durationMs": 3000,
            "target": "self"
          }
        ]
      },
      {
        "target": "threatened_ally",
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.1,
            "durationMs": 4500,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.04,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 87
  },
  {
    "classId": "BASTION",
    "name": "Bulwark Pulse",
    "cooldownMs": 15000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "shield",
        "coeff": 0.8
      }
    ],
    "variants": [
      {
        "target": "self",
        "shield": 1.5
      },
      {
        "shield": 1.1
      },
      {
        "shield": 0.92,
        "adds": [
          {
            "kind": "hot",
            "coeff": 0.07,
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 88
  },
  {
    "classId": "BASTION",
    "name": "Citadel Slam",
    "cooldownMs": 11000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.4,
        "damageType": "physical"
      },
      {
        "kind": "debuff",
        "tag": "damage_done",
        "value": -0.04,
        "durationMs": 5000
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.06,
            "durationMs": 5000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.45,
            "target": "self"
          }
        ]
      },
      {
        "damage": 1.35,
        "cooldownDelta": 1200
      }
    ],
    "priority": 73
  },
  {
    "classId": "DREADGUARD",
    "name": "Binding Chain",
    "cooldownMs": 7000,
    "target": "interruptible_casting_enemy",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.95,
        "damageType": "physical"
      },
      {
        "kind": "interrupt"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.05,
            "durationMs": 5000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "dot",
            "coeff": 0.12,
            "damageType": "physical",
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 81,
    "aiCondition": "target_casting"
  },
  {
    "classId": "DREADGUARD",
    "name": "Soul Rend",
    "cooldownMs": 9000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.25,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.45,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.06,
            "durationMs": 5000
          }
        ]
      },
      {
        "damage": 1.3
      }
    ],
    "priority": 69
  },
  {
    "classId": "DREADGUARD",
    "name": "Dark Mantle",
    "cooldownMs": 14000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.08,
        "durationMs": 6000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ],
        "cooldownDelta": 2000
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.05,
            "durationMs": 5000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "hot",
            "coeff": 0.05,
            "durationMs": 6000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 83
  },
  {
    "classId": "DREADGUARD",
    "name": "Harbinger Strike",
    "cooldownMs": 12000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.65,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "damage": 1.25
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "crit_taken",
            "value": -0.04,
            "durationMs": 6000
          }
        ]
      },
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.08,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 74
  },
  {
    "classId": "WAYFINDER",
    "name": "Hunter Mark",
    "cooldownMs": 10000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.35,
        "damageType": "physical"
      },
      {
        "kind": "debuff",
        "tag": "damage_taken",
        "value": 0.04,
        "durationMs": 6000
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "crit_taken",
            "value": 0.03,
            "durationMs": 6000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.05,
            "durationMs": 6000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_taken",
            "value": 0.02,
            "durationMs": 6000
          }
        ]
      }
    ],
    "priority": 89
  },
  {
    "classId": "WAYFINDER",
    "name": "Twin Arrows",
    "cooldownMs": 8000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.68,
        "damageType": "physical"
      },
      {
        "kind": "damage",
        "coeff": 0.68,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.45,
            "damageType": "physical"
          },
          {
            "kind": "damage",
            "coeff": 0.45,
            "damageType": "physical"
          },
          {
            "kind": "damage",
            "coeff": 0.45,
            "damageType": "physical"
          }
        ]
      },
      {
        "damage": 1.22
      },
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "buff",
            "tag": "evasion",
            "value": 84,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 77
  },
  {
    "classId": "WAYFINDER",
    "name": "Snare Shot",
    "cooldownMs": 11000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.95,
        "damageType": "physical"
      },
      {
        "kind": "debuff",
        "tag": "damage_done",
        "value": -0.04,
        "durationMs": 4000
      }
    ],
    "variants": [
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.04,
            "durationMs": 7000
          }
        ]
      },
      {
        "damage": 1.3
      },
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "buff",
            "tag": "evasion",
            "value": 112,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 73
  },
  {
    "classId": "WAYFINDER",
    "name": "Heartseeker",
    "cooldownMs": 14000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.95,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 1.95,
            "damageType": "physical",
            "executeBelowHpPct": 0.35,
            "executeBonus": 0.3
          }
        ]
      },
      {
        "damage": 1.14
      },
      {
        "damage": 0.88,
        "adds": [
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.03,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 76
  },
  {
    "classId": "RAVAGER",
    "name": "Bloodrush",
    "cooldownMs": 10000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "haste",
        "value": 0.06,
        "durationMs": 6000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.04,
            "durationMs": 5500,
            "target": "self"
          },
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": 0.03,
            "durationMs": 5500,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.03,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "hot",
            "coeff": 0.05,
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 82
  },
  {
    "classId": "RAVAGER",
    "name": "Sunder Blow",
    "cooldownMs": 8000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.12,
        "damageType": "physical"
      },
      {
        "kind": "debuff",
        "tag": "damage_taken",
        "value": 0.05,
        "durationMs": 5500
      }
    ],
    "variants": [
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_taken",
            "value": 0.03,
            "durationMs": 5000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.05,
            "durationMs": 5000
          }
        ]
      },
      {
        "damage": 1.25
      }
    ],
    "priority": 75
  },
  {
    "classId": "RAVAGER",
    "name": "Overpower",
    "cooldownMs": 12000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.8,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 1.8,
            "damageType": "physical",
            "executeBelowHpPct": 0.35,
            "executeBonus": 0.3
          }
        ]
      },
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.03,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      },
      {
        "damage": 0.8,
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.07,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 75
  },
  {
    "classId": "RAVAGER",
    "name": "War Cry",
    "cooldownMs": 16000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_done",
        "value": 0.045,
        "durationMs": 6000,
        "target": "all_allies"
      }
    ],
    "variants": [
      {
        "target": "self",
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.03,
            "durationMs": 6000,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.03,
            "durationMs": 6000,
            "target": "all_allies"
          }
        ]
      }
    ],
    "priority": 85
  },
  {
    "classId": "HEXWEAVER",
    "name": "Curse of Frailty",
    "cooldownMs": 12000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.4,
        "damageType": "shadow"
      },
      {
        "kind": "debuff",
        "tag": "damage_done",
        "value": -0.055,
        "durationMs": 7000
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "haste",
            "value": -0.03,
            "durationMs": 6000
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.55,
            "damageType": "shadow"
          },
          {
            "kind": "debuff",
            "tag": "damage_taken",
            "value": 0.05,
            "durationMs": 6000
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 86
  },
  {
    "classId": "HEXWEAVER",
    "name": "Arcane Needle",
    "cooldownMs": 5000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.92,
        "damageType": "arcane"
      }
    ],
    "variants": [
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.55,
            "damageType": "arcane"
          },
          {
            "kind": "damage",
            "coeff": 0.55,
            "damageType": "arcane"
          }
        ]
      },
      {
        "damage": 1.25
      },
      {
        "damage": 0.75,
        "adds": [
          {
            "kind": "dot",
            "coeff": 0.14,
            "damageType": "arcane",
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 76
  },
  {
    "classId": "HEXWEAVER",
    "name": "Hex Detonation",
    "cooldownMs": 11000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.68,
        "damageType": "shadow"
      }
    ],
    "variants": [
      {
        "damage": 1.3,
        "cooldownDelta": 1500
      },
      {
        "damage": 0.82,
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.35,
            "target": "self"
          }
        ]
      },
      {
        "damage": 0.8,
        "adds": [
          {
            "kind": "dot",
            "coeff": 0.18,
            "damageType": "shadow",
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 76
  },
  {
    "classId": "HEXWEAVER",
    "name": "Veil of Ash",
    "cooldownMs": 15000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.08,
        "durationMs": 6000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 5500,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "dot",
            "coeff": 0.12,
            "damageType": "shadow",
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.15,
            "durationMs": 5000,
            "target": "self"
          },
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": 0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 84
  },
  {
    "classId": "KNIFE_DANCER",
    "name": "Blade Flurry",
    "cooldownMs": 8000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.55,
        "damageType": "physical"
      },
      {
        "kind": "damage",
        "coeff": 0.55,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "cooldownDelta": -1100
      },
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.8,
            "damageType": "physical"
          },
          {
            "kind": "damage",
            "coeff": 0.8,
            "damageType": "physical"
          }
        ],
        "cooldownDelta": 1500
      },
      {
        "damage": 0.78,
        "adds": [
          {
            "kind": "buff",
            "tag": "evasion",
            "value": 84,
            "durationMs": 4500,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 74
  },
  {
    "classId": "KNIFE_DANCER",
    "name": "Twin Fang",
    "cooldownMs": 7000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.75,
        "damageType": "physical"
      },
      {
        "kind": "damage",
        "coeff": 0.75,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "dot",
            "coeff": 0.12,
            "damageType": "physical",
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      },
      {
        "damage": 1.25
      },
      {
        "damage": 0.9,
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.28,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 74
  },
  {
    "classId": "KNIFE_DANCER",
    "name": "Shadow Veil",
    "cooldownMs": 14000,
    "target": "self",
    "effects": [
      {
        "kind": "buff",
        "tag": "evasion",
        "value": 84,
        "durationMs": 6000,
        "target": "self"
      },
      {
        "kind": "buff",
        "tag": "crit",
        "value": 0.03,
        "durationMs": 6000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "evasion",
            "value": 56,
            "durationMs": 6000,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "crit",
            "value": 0.08,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "target": "all_allies",
        "replaces": [
          {
            "kind": "buff",
            "tag": "evasion",
            "value": 42,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 85
  },
  {
    "classId": "KNIFE_DANCER",
    "name": "Final Dance",
    "cooldownMs": 12000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 1.9,
        "damageType": "physical"
      }
    ],
    "variants": [
      {
        "damage": 0.88,
        "adds": [
          {
            "kind": "heal",
            "coeff": 0.28,
            "target": "self"
          }
        ]
      },
      {
        "damage": 1.2
      },
      {
        "damage": 0.88,
        "adds": [
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 75
  },
  {
    "classId": "DAWNKEEPER",
    "name": "Sun Smite",
    "cooldownMs": 6000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.75,
        "damageType": "fire"
      }
    ],
    "variants": [
      {
        "damage": 1.3
      },
      {
        "damage": 0.85,
        "adds": [
          {
            "kind": "buff",
            "tag": "healing_received",
            "value": 0.06,
            "durationMs": 4500,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.04,
            "durationMs": 4500
          }
        ]
      }
    ],
    "priority": 68
  },
  {
    "classId": "DAWNKEEPER",
    "name": "Beacon of Hope",
    "cooldownMs": 13000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "buff",
        "tag": "damage_taken",
        "value": -0.05,
        "durationMs": 5000,
        "target": "self"
      }
    ],
    "variants": [
      {
        "target": "self",
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.09,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "hot",
            "coeff": 0.1,
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 89
  },
  {
    "classId": "DAWNKEEPER",
    "name": "Purifying Light",
    "cooldownMs": 14000,
    "target": "lowest_hp_ally_with_dot",
    "effects": [
      {
        "kind": "cleanse"
      },
      {
        "kind": "heal",
        "coeff": 0.55
      }
    ],
    "variants": [
      {
        "cooldownDelta": -500
      },
      {
        "heal": 1.35,
        "cooldownDelta": 1800
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.05,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 91,
    "aiCondition": "ally_below_50_or_dot"
  },
  {
    "classId": "DAWNKEEPER",
    "name": "Solar Hymn",
    "cooldownMs": 17000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "heal",
        "coeff": 0.65
      },
      {
        "kind": "buff",
        "tag": "damage_done",
        "value": 0.035,
        "durationMs": 6000,
        "target": "all_allies"
      }
    ],
    "variants": [
      {
        "heal": 1.35,
        "replaces": [
          {
            "kind": "heal",
            "coeff": 0.88
          }
        ]
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.03,
            "durationMs": 5500,
            "target": "all_allies"
          }
        ]
      },
      {
        "heal": 0.8,
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_done",
            "value": 0.035,
            "durationMs": 8500,
            "target": "all_allies"
          }
        ]
      }
    ],
    "priority": 89
  },
  {
    "classId": "STONECALLER",
    "name": "Thunder Totem",
    "cooldownMs": 7000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.95,
        "damageType": "nature"
      },
      {
        "kind": "debuff",
        "tag": "damage_taken",
        "value": 0.05,
        "durationMs": 4000
      }
    ],
    "variants": [
      {
        "damage": 1.25
      },
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.65,
            "damageType": "nature"
          },
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.03,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "damage",
            "coeff": 0.65,
            "damageType": "nature"
          },
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 5000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 73
  },
  {
    "classId": "STONECALLER",
    "name": "Earthen Grasp",
    "cooldownMs": 10000,
    "target": "current_target",
    "effects": [
      {
        "kind": "damage",
        "coeff": 0.9,
        "damageType": "nature"
      },
      {
        "kind": "debuff",
        "tag": "damage_done",
        "value": -0.04,
        "durationMs": 4500
      }
    ],
    "variants": [
      {
        "adds": [
          {
            "kind": "debuff",
            "tag": "damage_done",
            "value": -0.04,
            "durationMs": 5000
          }
        ]
      },
      {
        "damage": 1.3
      },
      {
        "adds": [
          {
            "kind": "buff",
            "tag": "damage_taken",
            "value": -0.04,
            "durationMs": 4000,
            "target": "self"
          }
        ]
      }
    ],
    "priority": 75
  },
  {
    "classId": "STONECALLER",
    "name": "Seismic Shelter",
    "cooldownMs": 14000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "shield",
        "coeff": 0.75
      }
    ],
    "variants": [
      {
        "target": "threatened_ally",
        "shield": 1.35
      },
      {
        "shield": 1.1
      },
      {
        "shield": 0.9,
        "adds": [
          {
            "kind": "hot",
            "coeff": 0.08,
            "durationMs": 4000,
            "tickMs": 2000
          }
        ]
      }
    ],
    "priority": 86
  },
  {
    "classId": "STONECALLER",
    "name": "Resonance Burst",
    "cooldownMs": 16000,
    "target": "all_allies",
    "effects": [
      {
        "kind": "heal",
        "coeff": 0.65
      },
      {
        "kind": "buff",
        "tag": "defense_pct",
        "value": 0.05,
        "durationMs": 6000,
        "target": "all_allies"
      }
    ],
    "variants": [
      {
        "heal": 0.85,
        "adds": [
          {
            "kind": "buff",
            "tag": "defense_pct",
            "value": 0.04,
            "durationMs": 5000,
            "target": "all_allies"
          }
        ]
      },
      {
        "replaces": [
          {
            "kind": "heal",
            "coeff": 0.45
          },
          {
            "kind": "buff",
            "tag": "haste",
            "value": 0.04,
            "durationMs": 6000,
            "target": "self"
          }
        ]
      },
      {
        "heal": 1.3,
        "cooldownDelta": 1500
      }
    ],
    "priority": 88
  }
];
export function extraAbilityDefinitionV2(name:string,classId:string):AbilityDefinition|undefined {
 const row=ADDITIONAL_SKILLS_V2.find(x=>x.classId===classId&&x.name===name);
 if(!row)return;
 const suffix=name.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
 return {id:'SK2_'+suffix,name:row.name,cooldownMs:row.cooldownMs,castTimeMs:0,
   target:row.target,priority:row.priority,aiCondition:row.aiCondition,effects:row.effects.map(e=>({...e}))};
}
export function extraVariantRecipesV2(name:string,classId:string):AdditionalSkillV2['variants']|undefined{
 return ADDITIONAL_SKILLS_V2.find(x=>x.classId===classId&&x.name===name)?.variants;
}
