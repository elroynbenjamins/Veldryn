#!/usr/bin/env python3
"""Validate Style 4 pose registry and item generation queues.

This protects consistency of written facing/pose contracts and item production
metadata. It CANNOT infer actual image orientation or artist correctness.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

STYLE = "veldryn-eq2-storybook-v1"
RENDERER = "storybook-hand-painted-dark-fantasy"
CAMERA = "slot-specific-product-three-quarter"
SLOTS = ("helmet", "chest", "gloves", "legs", "boots", "weapon", "offhand", "cape", "amulet", "ring")
ALLOWED_STATUS = ("identified", "brief_ready", "generating", "candidate", "visual_approved", "normalized", "tech_verified", "mapped", "device_verified")


def inspect(pose: dict, queue: dict) -> list[str]:
    errors = []
    if pose.get("styleLock") != STYLE or queue.get("styleLock") != STYLE:
        errors.append("style_lock_mismatch")
    if pose.get("status") != "direction_approved" or (queue.get("visualDirection") or {}).get("status") != "approved":
        errors.append("selected_direction_not_approved")
    shared = pose.get("shared") or {}
    technical = queue.get("technical") or {}
    for prop, val in (
        ("renderer", RENDERER), ("camera", CAMERA), ("light", "upper-left-10oclock")
    ):
        pose_value = shared.get(prop)
        if pose_value != val or technical.get(prop) != val:
            errors.append(f"shared_visual_lock_mismatch:{prop}")
    geometry = pose.get("coordinateSystem") or {}
    for a, b, value in (
        (geometry.get("cellPx"), technical.get("cellPx"), [192,192]),
        (geometry.get("safeInsetPx"), technical.get("alphaInsetPx"), 26),
    ):
        if a != value or b != value:
            errors.append("geometry_lock_mismatch")
    slots = pose.get("slots") or []
    if [slot.get("slot") for slot in slots] != list(SLOTS):
        errors.append("pose_slots_must_be_exact_order_of_10")
    if technical.get("slotOrder") != list(SLOTS):
        errors.append("queue_slots_must_match_pose_order")

    for index, entry in enumerate(slots):
        if not isinstance(entry.get("poseId"), str) or not entry["poseId"]:
            errors.append(f"pose_slot_missing_id:{index}")
        if not isinstance(entry.get("signature"), str) or not entry["signature"].strip():
            errors.append(f"pose_slot_missing_signature:{index}")
        expected_pairs = 2 if entry.get("slot") in ("gloves", "boots") else 1
        if entry.get("pairCount") != expected_pairs:
            errors.append(f"pose_slot_wrong_pair_count:{index}")
    families = {}
    for key in ("weaponFamilies","offhandFamilies"):
        family_map = {}
        for item in pose.get(key) or []:
            family = item.get("family")
            if not family or family in family_map or not item.get("poseId") or not item.get("signature"):
                errors.append(f"{key}:bad_or_duplicate_family:{family}")
            else:
                family_map[family] = item["poseId"]
        if not family_map or "other" not in family_map:
            errors.append(f"{key}:missing_families")
        families[key] = family_map
    if families["weaponFamilies"].get("sword") != "sword-hilt-ur-tip-ll":
        errors.append("sword_direction_contract_changed")
    if families["weaponFamilies"].get("bow") != "bow-arc-left-string-right":
        errors.append("bow_direction_contract_changed")
    if (pose.get("constraints") or {}).get("referenceKitId") != (queue.get("referenceKit") or {}).get("id"):
        errors.append("reference_kit_mismatch")
    if (queue.get("itemRecordTemplate") or {}).get("styleLock") != STYLE:
        errors.append("item_template_style_lock_mismatch")
    if (queue.get("itemRecordTemplate") or {}).get("camera") != CAMERA:
        errors.append("item_template_camera_mismatch")
    if (queue.get("promptLock") or {}).get("poseManifest") != "docs/art/equipment-2-0-pose-lock.json":
        errors.append("pose_manifest_not_bound_to_prompt")
    if (queue.get("referenceKit") or {}).get("status") == "approved" and not pose.get("visualAnchorRecorded"):
        errors.append("production_refkit_approved_without_archived_style4_visual")

    valid_slots = {slot["slot"]: slot["poseId"] for slot in slots if "slot" in slot}
    for index, item in enumerate(queue.get("items") or []):
        prefix = f"items[{index}]"
        status = item.get("artStatus")
        if status not in ALLOWED_STATUS:
            errors.append(f"{prefix}:bad_status")
            continue
        if status == "identified":
            continue
        slot = item.get("slot")
        expected_pose = valid_slots.get(slot)
        if slot == "weapon":
            expected_pose = families["weaponFamilies"].get(item.get("weaponFamily"))
        elif slot == "offhand":
            expected_pose = families["offhandFamilies"].get(item.get("offhandFamily"))
        if expected_pose is None or item.get("poseId") != expected_pose:
            errors.append(f"{prefix}:wrong_or_missing_resolved_pose")
        if item.get("styleLock") != STYLE or item.get("camera") != CAMERA or item.get("renderer") != RENDERER:
            errors.append(f"{prefix}:individual_style_camera_drift")
        if item.get("referenceKitId") != (queue.get("referenceKit") or {}).get("id"):
            errors.append(f"{prefix}:wrong_reference_kit")
        if (queue.get("referenceKit") or {}).get("status") != "approved" or (queue.get("promptLock") or {}).get("status") != "approved":
            errors.append(f"{prefix}:unapproved_production_references")
        if status in ALLOWED_STATUS[4:] and not item.get("poseVisualCheck"):
            errors.append(f"{prefix}:visual_pose_not_reviewed")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pose", type=Path, default=Path("docs/art/equipment-2-0-pose-lock.json"))
    parser.add_argument("--queue", type=Path, default=Path("docs/art/equipment-2-0-generation-queue.json"))
    args = parser.parse_args()
    pose = json.loads(args.pose.read_text(encoding="utf-8"))
    queue = json.loads(args.queue.read_text(encoding="utf-8"))
    errors = inspect(pose, queue)
    if errors:
        for error in errors:
            print("FAIL: " + error)
        return 1
    print("PASS: Style 4 direction, 10 poses, weapon families, queue and reference status consistent")
    print("NOTE: rendered image orientation still requires human review")
    return 0


if __name__ == "__main__":
    sys.exit(main())
