"""Offline tests: no real Supabase CLI or credentials are used."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("capture", Path(__file__).with_name("capture-production-edge-rollback.py"))
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)

class CaptureTests(unittest.TestCase):
    def run_capture(self, drift=False, missing=False):
        with tempfile.TemporaryDirectory() as home:
            calls = []
            def fake_cli(cwd, *args):
                calls.append(args)
                if args == ("--version",):
                    return "3.3.0"
                if args == ("init",):
                    return ""
                if args[-1] == "--help":
                    return "--remote --use-api"
                if args[:2] == ("functions", "list"):
                    self.assertIn("--remote=" + capture.PROJECT, args)
                    n = sum(a[:2] == ("functions", "list") and a[-1] != "--help" for a in calls)
                    return json.dumps({"functions": [
                        {"slug": "gameplay", "version": 76 if drift and n > 1 else 75,
                         "status": "ACTIVE", "verify_jwt": False},
                        {"slug": "coop", "version": 43, "status": "ACTIVE", "verify_jwt": False},
                    ]})
                self.assertEqual(args[:2], ("functions", "download"))
                self.assertIn("--remote=" + capture.PROJECT, args)
                self.assertIn("--use-api", args)
                if not (missing and args[2] == "coop"):
                    path = cwd / "supabase" / "functions" / args[2] / "index.ts"
                    path.parent.mkdir(parents=True)
                    path.write_text("// mock source")
                return ""
            with patch.object(capture.Path, "home", return_value=Path(home)), patch.object(capture, "cli", side_effect=fake_cli), patch.dict(capture.os.environ, {"CI": ""}):
                if drift or missing:
                    with self.assertRaises(RuntimeError):
                        capture.capture({"gameplay": "75", "coop": "43"})
                    self.assertEqual(list(Path(home).iterdir()), [])
                else:
                    out = capture.capture({"gameplay": "75", "coop": "43"})
                    self.assertEqual(len((out / "SHA256SUMS").read_text().splitlines()), 3)
                    self.assertEqual((out / "functions/coop/index.ts").read_text(), "// mock source")

    def test_success(self):
        self.run_capture()

    def test_drift_fails_closed(self):
        self.run_capture(drift=True)

    def test_missing_source_fails_closed(self):
        self.run_capture(missing=True)

    def test_explicit_target_required(self):
        self.assertEqual(capture.target("--project-ref"), ["--project-ref", capture.PROJECT])
        with self.assertRaises(RuntimeError):
            capture.target("no supported selector")

if __name__ == "__main__":
    unittest.main()
