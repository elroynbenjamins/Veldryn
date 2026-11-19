#!/usr/bin/env python3
"""Synthetic tests for EQ2 visual-safe compression and bundle hygiene."""
from __future__ import annotations

import importlib.util
from io import BytesIO
from pathlib import Path
import sys
import tempfile
import unittest

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from equipment_v2_image_optimization import encode_best, fidelity, normalized_rgba


def load_file(filename: str):
    spec = importlib.util.spec_from_file_location(filename.replace("-", "_"), ROOT / filename)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


bundle = load_file("audit-equipment-v2-bundle.py")


def fixture() -> Image.Image:
    image = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    painter = ImageDraw.Draw(image)
    painter.polygon(((50, 44), (129, 43), (139, 118), (105, 145), (59, 123)), fill=(96, 63, 43, 255))
    for index in range(11):
        x = 59 + index * 6
        painter.line((x, 54, x, 110), fill=(154 + index * 2, 112, 78, 255), width=2)
    painter.rectangle((80, 70, 109, 86), fill=(215, 164, 66, 255))
    painter.ellipse((87, 74, 101, 86), fill=(249, 217, 141, 255))
    return image


class CompressionTests(unittest.TestCase):
    def test_adaptive_webp_alpha_and_view_quality_preserved(self):
        art = fixture()
        blob, report = encode_best(art, kind="icon")
        self.assertLessEqual(len(blob), 70 * 1024)
        self.assertIn(report["codec"], ("lossless", "lossy"))
        self.assertTrue(report["fidelity"]["passed"])
        self.assertTrue(report["fidelity"]["alpha_exact"])
        self.assertEqual(report["output_bytes"], len(blob))
        self.assertTrue(fidelity(normalized_rgba(art), blob)["passed"])

    def test_lossless_version_remains_valid_fallback(self):
        art = fixture()
        blob, report = encode_best(art, kind="icon", min_quality=100)
        self.assertEqual(report["codec"], "lossless")
        with Image.open(BytesIO(blob)) as reread:
            self.assertEqual(reread.convert("RGBA").tobytes(), normalized_rgba(art).tobytes())

    def test_atlas_small_screen_parity_checks_each_slot(self):
        individual = fixture()
        atlas = Image.new("RGBA", (960, 384), (0, 0, 0, 0))
        for index in range(10):
            atlas.alpha_composite(individual, (index % 5 * 192, index // 5 * 192))
        blob, report = encode_best(atlas, kind="atlas")
        self.assertTrue(report["fidelity"]["passed"])
        self.assertLessEqual(report["output_bytes"], 500 * 1024)

    def test_transparent_matting_does_not_bloat_asset(self):
        art = fixture()
        art.putpixel((0, 0), (255, 0, 255, 0))
        normalized = normalized_rgba(art)
        self.assertEqual(normalized.getpixel((0, 0)), (0, 0, 0, 0))

    def test_bundle_blocks_png_masters_and_identical_webp_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "master.png").write_bytes(b"not-shipping-art")
            blob, _ = encode_best(fixture(), kind="icon")
            (root / "a.webp").write_bytes(blob)
            (root / "b.webp").write_bytes(blob)
            result = bundle.audit(root)
            self.assertFalse(result["passed"])
            self.assertTrue(any("non_webp_runtime_file" in e for e in result["errors"]))
            self.assertTrue(any("identical_assets_must_share_single_path" in e for e in result["errors"]))

    def test_approved_future_folder_not_created_yet_is_ok(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "future-hidden-assets"
            result = bundle.audit(missing)
            self.assertTrue(result["passed"])
            self.assertEqual(result["asset_count"], 0)

    def test_bundle_reports_size_without_fake_release_savings(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = bundle.audit(root)
            self.assertTrue(result["passed"])
            self.assertEqual(result["asset_count"], 0)
            self.assertEqual(result["checked_in_bytes"], 0)


if __name__ == "__main__":
    unittest.main()
