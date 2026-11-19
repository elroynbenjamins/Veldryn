#!/usr/bin/env python3
"""Regression tests for Equipment 2.0 icon packing and strict acceptance gate."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent


def load_tool(filename: str):
    spec = importlib.util.spec_from_file_location(filename.replace("-", "_"), HERE / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


packer = load_tool("pack-equipment-v2-atlas.py")
gate = load_tool("validate-equipment-v2-art.py")


def source(path: Path, *, touch_edge: bool = False, width: int = 320):
    image = Image.new("RGBA", (width, width), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0 if touch_edge else 70, 50, width - 80, width - 50), fill=(113, 97, 73, 255))
    image.save(path)


class EquipmentArtRules(unittest.TestCase):
    def test_single_icon_normalizes_to_safe_alpha(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            source(p / "weapon.png")
            result = packer.normalize(p / "weapon.png", "weapon")
            self.assertEqual(result.size, (192, 192))
            out = p / "weapon.webp"
            packer.export(result, out, 78)
            self.assertTrue(gate.validate(out, "icon")["passed"])

    def test_source_touching_edge_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "ring.png"
            source(src, touch_edge=True)
            with self.assertRaisesRegex(ValueError, "source_touches_canvas_edge"):
                packer.normalize(src, "ring")

    def test_atlas_compiles_ten_exact_slots(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            atlas = Image.new("RGBA", (960, 384), (0, 0, 0, 0))
            for index, slot in enumerate(packer.SLOTS):
                src = p / f"{slot}.png"
                source(src)
                art = packer.normalize(src, slot)
                atlas.alpha_composite(art, ((index % 5) * 192, (index // 5) * 192))
            out = p / "atlas.webp"
            packer.export(atlas, out, 78)
            result = gate.validate(out, "atlas")
            self.assertTrue(result["passed"], result["errors"])
            self.assertEqual(len(result["cells"]), 10)

    def test_one_pixel_outside_strict_inset_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "bad.png"
            art = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
            art.putpixel((25, 90), (255, 0, 0, 255))
            art.putpixel((90, 90), (255, 0, 0, 255))
            art.save(p)
            result = gate.validate(p, "icon")
            self.assertFalse(result["passed"])
            self.assertTrue(any("unsafe_alpha_bounds" in error for error in result["errors"]))

    def test_opaque_or_missing_alpha_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "opaque.png"
            Image.new("RGB", (192, 192), (100, 100, 100)).save(p)
            errors = gate.validate(p, "icon")["errors"]
            self.assertIn("missing_alpha_channel", errors)
            self.assertTrue(any("not_transparent" in error for error in errors))

    def test_reference_scale_parity_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            source(p / "ring.png")
            reference = p / "ref.webp"
            current = p / "current.webp"
            packer.export(packer.normalize(p / "ring.png", "ring"), reference, 78)
            art = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
            ImageDraw.Draw(art).rectangle((36, 36, 155, 155), fill=(100, 110, 120, 255))
            packer.export(art, current, 78)
            self.assertFalse(gate.validate(current, "icon", reference=reference)["passed"])

    def test_wrong_dimensions_and_empty_slot_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "short.png"
            Image.new("RGBA", (200, 200), (0, 0, 0, 0)).save(p)
            errors = gate.validate(p, "atlas")["errors"]
            self.assertTrue(any("dimensions" in error for error in errors))
            self.assertTrue(any("empty_cell" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
