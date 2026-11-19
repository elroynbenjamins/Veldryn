"""Tests for Style 4 slot camera/pose contract drift."""
from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent
ART = ROOT.parent / "docs" / "art"
spec = importlib.util.spec_from_file_location("pose_validator", ROOT / "validate-equipment-v2-pose-lock.py")
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def data():
    return (
        json.loads((ART / "equipment-2-0-pose-lock.json").read_text()),
        json.loads((ART / "equipment-2-0-generation-queue.json").read_text()),
    )


class Style4PoseLockTests(unittest.TestCase):
    def test_style4_selected_empty_queue_is_valid(self):
        pose, queue = data()
        self.assertEqual(module.inspect(pose, queue), [])

    def test_sword_direction_cannot_reverse(self):
        pose, queue = data()
        sword = next(x for x in pose["weaponFamilies"] if x["family"] == "sword")
        sword["poseId"] = "sword-hilt-ll-tip-ur"
        self.assertIn("sword_direction_contract_changed", module.inspect(pose, queue))

    def test_boot_pair_cannot_be_one_or_mirrored(self):
        pose, queue = data()
        boots = next(x for x in pose["slots"] if x["slot"] == "boots")
        boots["pairCount"] = 1
        self.assertTrue(any("wrong_pair_count" in e for e in module.inspect(pose, queue)))

    def test_approved_reference_requires_archived_visual(self):
        pose, queue = data()
        queue["referenceKit"]["status"] = "approved"
        self.assertIn("production_refkit_approved_without_archived_style4_visual", module.inspect(pose, queue))

    def test_in_progress_weapon_requires_matching_family_pose(self):
        pose, queue = data()
        item = copy.deepcopy(queue["itemRecordTemplate"])
        item.update({
            "itemId": "example-only",
            "slot": "weapon",
            "weaponFamily": "sword",
            "poseId": "axe-head-ul-handle-lr",
            "artStatus": "brief_ready",
        })
        queue["items"].append(item)
        self.assertIn("items[0]:wrong_or_missing_resolved_pose", module.inspect(pose, queue))

    def test_no_rough_pixel_style_reversion(self):
        pose, queue = data()
        queue["styleLock"] = "veldryn-eq2-icon-v1"
        self.assertIn("style_lock_mismatch", module.inspect(pose, queue))


if __name__ == "__main__":
    unittest.main()
