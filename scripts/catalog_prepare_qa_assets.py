#!/usr/bin/env python3
"""Prepare and validate deterministic QA catalog presentation assets."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from catalog_photo_intake import fit_transparent_webp, remove_flat_background


LOCAL_IMAGE_PATTERN = re.compile(r"localImage: '(/catalog-qa/[^']+)'")


def transparent_ratio(image: Image.Image) -> float:
    rgba = image.convert("RGBA")
    histogram = rgba.getchannel("A").histogram()
    return sum(histogram[:16]) / (rgba.width * rgba.height)


def prepare(source_dir: Path) -> list[dict]:
    results = []
    for source in sorted(source_dir.glob("*.jpg")):
        cleaned, metadata = remove_flat_background(Image.open(source))
        output = source.with_name(f"{source.stem}-transparent.webp")
        if metadata["applied"]:
            fit_transparent_webp(cleaned, (640, 640), output)
        results.append({
            "source": source.as_posix(),
            "output": output.as_posix() if metadata["applied"] else None,
            "background_removal": metadata,
        })
    return results


def validate(repo_root: Path) -> list[dict]:
    preview_path = repo_root / "src/lib/catalogPreview.ts"
    references = LOCAL_IMAGE_PATTERN.findall(preview_path.read_text(encoding="utf-8"))
    if len(references) != 17:
        raise ValueError(f"QA catalog must reference exactly 17 presentation assets; found {len(references)}")

    results = []
    failures = []
    for reference in references:
        path = repo_root / "public" / reference.removeprefix("/")
        if not path.is_file():
            failures.append(f"missing: {reference}")
            continue
        with Image.open(path) as image:
            if image.width != image.height:
                failures.append(f"not square: {reference} ({image.width}x{image.height})")
                continue
            ratio = transparent_ratio(image)
            if ratio < 0.05:
                _, matte = remove_flat_background(image)
                if matte["applied"]:
                    failures.append(f"opaque removable flat matte: {reference}")
                    continue
            results.append({
                "reference": reference,
                "size": [image.width, image.height],
                "transparent_ratio": round(ratio, 4),
            })
    if failures:
        raise ValueError("QA catalog presentation validation failed:\n- " + "\n- ".join(failures))
    return results


def contact_sheet(repo_root: Path, validation: list[dict], output: Path) -> None:
    tile_size = 220
    label_height = 48
    columns = 5
    rows = (len(validation) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_size, rows * (tile_size + label_height)), "#0d1726")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 13)
    except OSError:
        font = ImageFont.load_default()

    for index, item in enumerate(validation):
        x = (index % columns) * tile_size
        y = (index // columns) * (tile_size + label_height)
        checker = Image.new("RGB", (tile_size, tile_size), "#d8dee8")
        checker_draw = ImageDraw.Draw(checker)
        block = 22
        for row in range(0, tile_size, block):
            for column in range(0, tile_size, block):
                if (row // block + column // block) % 2:
                    checker_draw.rectangle((column, row, column + block - 1, row + block - 1), fill="#9ca8b8")
        image_path = repo_root / "public" / item["reference"].removeprefix("/")
        product = Image.open(image_path).convert("RGBA")
        product.thumbnail((tile_size, tile_size), Image.Resampling.LANCZOS)
        checker.paste(product, ((tile_size - product.width) // 2, (tile_size - product.height) // 2), product)
        sheet.paste(checker, (x, y))
        label = Path(item["reference"]).stem
        draw.text((x + 6, y + tile_size + 5), label[:31], fill="#f3f6fb", font=font)
        draw.text((x + 6, y + tile_size + 24), f"alpha {item['transparent_ratio']:.1%}", fill="#9cc7ff", font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "WEBP", quality=92, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--report", type=Path)
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    if not args.prepare and not args.validate:
        parser.error("Choose --prepare, --validate, or both")

    repo_root = args.repo_root.resolve()
    report: dict[str, object] = {"schema_version": 1}
    if args.prepare:
        report["preparation"] = prepare(repo_root / "public/catalog-qa")
    validation = validate(repo_root) if args.validate else []
    if args.validate:
        report["validation"] = validation
    if args.contact_sheet and validation:
        contact_sheet(repo_root, validation, args.contact_sheet)
        report["contact_sheet"] = args.contact_sheet.as_posix()
    payload = json.dumps(report, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(payload, encoding="utf-8")
    print(payload, end="")


if __name__ == "__main__":
    main()
