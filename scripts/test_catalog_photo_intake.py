#!/usr/bin/env python3
"""Small deterministic contract test for catalog_photo_intake.py."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from catalog_photo_intake import remove_flat_background


def run() -> None:
    alpha_source = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
    alpha_draw = ImageDraw.Draw(alpha_source)
    alpha_draw.rectangle((25, 10, 55, 70), fill="#51a7d8ff")
    alpha_preserved, alpha_metadata = remove_flat_background(alpha_source)
    assert alpha_metadata["method"] == "preserve_source_alpha"
    assert alpha_preserved.getpixel((0, 0))[3] == 0, "source transparency must not become a black matte"

    repo = Path(__file__).resolve().parent.parent
    with tempfile.TemporaryDirectory(prefix="catalog-photo-test-") as temporary:
        root = Path(temporary)
        source = root / "source.png"
        image = Image.new("RGB", (400, 300), "#151515")
        draw = ImageDraw.Draw(image)
        draw.rectangle((90, 65, 310, 235), fill="#f4f2ea")
        draw.ellipse((155, 85, 245, 175), fill="#51a7d8")
        image.save(source)
        presentation_dir = root / "presentation"
        presentation_dir.mkdir()
        presentation = Image.new("RGB", (300, 300), "white")
        presentation_draw = ImageDraw.Draw(presentation)
        presentation_draw.ellipse((55, 35, 245, 265), fill="#51a7d8")
        presentation.save(presentation_dir / "test-item.png")
        manifest = root / "manifest.json"
        manifest.write_text(json.dumps({
            "schema_version": 1,
            "catalog": {"catalog_key": "test", "fixture_only": True},
            "source": {"source_kind": "test"},
            "board_polygon": [[0, 0], [1, 0], [1, 1], [0, 1]],
            "rectified_size": [400, 300],
            "items": [{
                "source_item_key": "item-one",
                "name": "Test item",
                "display_price": "$1.00",
                "presentation": {
                    "filename": "test-item.png",
                    "source_provider": "Test fixture",
                    "source_url": "https://example.com/test-item"
                },
                "evidence_crop": [0.2, 0.15, 0.8, 0.85],
                "product_crop": [0.25, 0.2, 0.75, 0.65]
            }]
        }), encoding="utf-8")

        hashes = []
        for iteration in ("first", "second"):
            output = root / iteration
            subprocess.run([
                sys.executable,
                str(repo / "scripts" / "catalog_photo_intake.py"),
                "--manifest", str(manifest),
                "--source", str(source),
                "--presentation-dir", str(presentation_dir),
                "--output", str(output),
            ], cwd=repo, check=True, capture_output=True, text=True)
            review = json.loads((output / "review-manifest.json").read_text(encoding="utf-8"))
            assert review["review_gate"]["status"] == "needs_review"
            assert review["items"][0]["review_status"] == "needs_review"
            assert (output / review["items"][0]["media"]["evidence"]).is_file()
            assert (output / review["items"][0]["media"]["card"]).stat().st_size > 0
            assert (output / review["items"][0]["media"]["thumb"]).stat().st_size > 0
            with Image.open(output / review["items"][0]["media"]["card"]) as card, Image.open(output / review["items"][0]["media"]["thumb"]) as thumb:
                assert card.size == (640, 640)
                assert thumb.size == (240, 240)
                assert "A" in card.getbands(), "flat-background presentation output must retain alpha"
                assert card.getpixel((0, 0))[3] == 0, "flat background must become transparent"
            assert review["items"][0]["presentation"]["background_removal"]["applied"] is True
            hashes.append(review["items"][0]["hashes"])
        assert hashes[0] == hashes[1], "identical inputs must produce identical derivatives"
    print("Catalog photo intake contract: PASS")


if __name__ == "__main__":
    run()
