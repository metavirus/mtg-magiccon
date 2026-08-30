#!/usr/bin/env python3
"""Create deterministic, reviewable catalog crops from an onsite board photo.

The source photo and generated derivatives belong under .codex-local and are
never canonical by themselves. A reviewer promotes the resulting manifest
through the database ingestion lane after checking names, prices, and crops.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import textwrap
from pathlib import Path

import cv2
import numpy as np
import PIL
from PIL import Image, ImageDraw, ImageFont, ImageOps


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized_points(points: list[list[float]], width: int, height: int) -> np.ndarray:
    return np.float32([[x * width, y * height] for x, y in points])


def rectify(source: np.ndarray, points: list[list[float]], output_size: list[int]) -> np.ndarray:
    height, width = source.shape[:2]
    output_width, output_height = output_size
    src = normalized_points(points, width, height)
    dst = np.float32(
        [[0, 0], [output_width - 1, 0], [output_width - 1, output_height - 1], [0, output_height - 1]]
    )
    transform = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(source, transform, (output_width, output_height), flags=cv2.INTER_LANCZOS4)


def crop_normalized(image: Image.Image, region: list[float]) -> Image.Image:
    left, top, right, bottom = region
    box = (
        round(left * image.width),
        round(top * image.height),
        round(right * image.width),
        round(bottom * image.height),
    )
    if not (0 <= box[0] < box[2] <= image.width and 0 <= box[1] < box[3] <= image.height):
        raise ValueError(f"Crop is outside the rectified board: {region}")
    return image.crop(box)


def detect_product_panels(board: np.ndarray, expected_rows: list[int]) -> list[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(board, cv2.COLOR_BGR2GRAY)
    _, light = cv2.threshold(gray, 125, 255, cv2.THRESH_BINARY)
    light = cv2.morphologyEx(light, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))
    contours, _ = cv2.findContours(light, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = board.shape[:2]
    candidates = []
    for contour in contours:
        x, y, panel_width, panel_height = cv2.boundingRect(contour)
        if y < height * 0.25:
            continue
        if not (width * 0.07 <= panel_width <= width * 0.18 and height * 0.05 <= panel_height <= height * 0.14):
            continue
        candidates.append((x, y, panel_width, panel_height))

    candidates.sort(key=lambda box: (box[1], box[0]))
    rows: list[list[tuple[int, int, int, int]]] = []
    for candidate in candidates:
        if not rows or abs(candidate[1] - int(np.median([box[1] for box in rows[-1]]))) > height * 0.07:
            rows.append([candidate])
        else:
            rows[-1].append(candidate)
    rows = [sorted(row, key=lambda box: box[0]) for row in rows]
    observed_rows = [len(row) for row in rows]
    if observed_rows != expected_rows:
        raise ValueError(f"Panel detection found rows {observed_rows}; expected {expected_rows}. Manual review is required.")

    normalized = []
    for row in rows:
        top = round(float(np.median([box[1] for box in row])))
        # White product panels are consistently close to square. OCR labels can
        # merge into the threshold contour, so never trust a tall contour's
        # lower edge as the panel boundary.
        row_height = round(float(np.median([box[2] for box in row])) * 0.91)
        for x, _, panel_width, _ in row:
            normalized.append((x, top, panel_width, row_height))
    return normalized


def cleaned_product(panel: np.ndarray) -> tuple[Image.Image, dict]:
    inset = max(6, round(min(panel.shape[:2]) * 0.045))
    panel = panel[inset:-inset, inset:-inset]
    rgb = cv2.cvtColor(panel, cv2.COLOR_BGR2RGB)
    lab = cv2.cvtColor(panel, cv2.COLOR_BGR2LAB).astype(np.float32)
    border = np.concatenate((lab[:6].reshape(-1, 3), lab[-6:].reshape(-1, 3), lab[:, :6].reshape(-1, 3), lab[:, -6:].reshape(-1, 3)))
    background = np.median(border, axis=0)
    distance = np.linalg.norm(lab - background, axis=2)
    mask = (distance > 19).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    retained = np.zeros_like(mask)
    minimum_area = max(20, round(mask.size * 0.002))
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] >= minimum_area:
            retained[labels == label] = 255
    points = cv2.findNonZero(retained)
    if points is None:
        left, top, product_width, product_height = 0, 0, panel.shape[1], panel.shape[0]
        method = "panel_fallback"
    else:
        left, top, product_width, product_height = cv2.boundingRect(points)
        padding = round(max(product_width, product_height) * 0.09)
        left = max(0, left - padding)
        top = max(0, top - padding)
        right = min(panel.shape[1], left + product_width + padding * 2)
        bottom = min(panel.shape[0], top + product_height + padding * 2)
        product_width, product_height = right - left, bottom - top
        method = "border_color_distance_components"
    product = rgb[top:top + product_height, left:left + product_width]
    # Mild local contrast and unsharp masking improve a phone photo without
    # inventing detail or changing the product's identity.
    product_bgr = cv2.cvtColor(product, cv2.COLOR_RGB2BGR)
    product_lab = cv2.cvtColor(product_bgr, cv2.COLOR_BGR2LAB)
    luminance, a_channel, b_channel = cv2.split(product_lab)
    luminance = cv2.createCLAHE(clipLimit=1.35, tileGridSize=(4, 4)).apply(luminance)
    enhanced = cv2.cvtColor(cv2.merge((luminance, a_channel, b_channel)), cv2.COLOR_LAB2RGB)
    blurred = cv2.GaussianBlur(enhanced, (0, 0), 0.75)
    enhanced = cv2.addWeighted(enhanced, 1.12, blurred, -0.12, 0)
    return Image.fromarray(enhanced), {
        "method": method,
        "panel_inset_px": inset,
        "foreground_box_px": [left, top, left + product_width, top + product_height],
        "background_lab": [round(float(value), 2) for value in background],
    }


def fit_webp(image: Image.Image, size: tuple[int, int], path: Path, quality: int = 88) -> None:
    rgb = image.convert("RGB")
    fitted = ImageOps.contain(rgb, size, Image.Resampling.LANCZOS)
    samples = np.asarray(rgb.resize((24, 24), Image.Resampling.BILINEAR)).reshape(-1, 3)
    background = tuple(int(value) for value in np.median(samples, axis=0))
    canvas = Image.new("RGB", size, background)
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    canvas.save(path, "WEBP", quality=quality, method=6)


def cover_webp(image: Image.Image, size: tuple[int, int], path: Path, quality: int = 90) -> None:
    fitted = ImageOps.fit(ImageOps.exif_transpose(image).convert("RGB"), size, Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    fitted.save(path, "WEBP", quality=quality, method=6)


def remove_flat_background(image: Image.Image) -> tuple[Image.Image, dict]:
    transposed = ImageOps.exif_transpose(image)
    if "A" in transposed.getbands():
        rgba = np.asarray(transposed.convert("RGBA"))
        transparent_ratio = float(np.mean(rgba[:, :, 3] < 16))
        if transparent_ratio >= 0.05:
            return Image.fromarray(rgba, "RGBA"), {
                "applied": True,
                "method": "preserve_source_alpha",
                "transparent_ratio": round(transparent_ratio, 4),
            }
    rgb = np.asarray(transposed.convert("RGB"))
    height, width = rgb.shape[:2]
    edge = max(4, round(min(width, height) * 0.04))
    corners = np.concatenate((
        rgb[:edge, :edge].reshape(-1, 3), rgb[:edge, -edge:].reshape(-1, 3),
        rgb[-edge:, :edge].reshape(-1, 3), rgb[-edge:, -edge:].reshape(-1, 3),
    )).astype(np.float32)
    background = np.median(corners, axis=0)
    corner_spread = float(np.mean(np.std(corners, axis=0)))
    if corner_spread > 18 or float(np.mean(background)) < 175:
        return Image.fromarray(rgb), {
            "applied": False,
            "method": "flat_edge_background",
            "reason": "background_not_flat",
            "corner_spread": round(corner_spread, 2),
        }

    distance = np.linalg.norm(rgb.astype(np.float32) - background, axis=2)
    traversable = (distance < 52).astype(np.uint8)
    count, labels = cv2.connectedComponents(traversable)
    edge_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    background_region = np.isin(labels, list(edge_labels - {0}))
    alpha = np.full((height, width), 255, dtype=np.uint8)
    soft = np.clip((distance - 8) / 30 * 255, 0, 255).astype(np.uint8)
    alpha[background_region] = soft[background_region]
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.65)
    rgba = np.dstack((rgb, alpha))
    removed_ratio = float(np.mean(alpha < 16))
    if removed_ratio < 0.05:
        return Image.fromarray(rgb), {
            "applied": False,
            "method": "flat_edge_background",
            "reason": "no_meaningful_edge_background",
            "removed_ratio": round(removed_ratio, 4),
        }
    return Image.fromarray(rgba, "RGBA"), {
        "applied": True,
        "method": "flat_edge_background",
        "background_rgb": [round(float(value), 2) for value in background],
        "corner_spread": round(corner_spread, 2),
        "removed_ratio": round(removed_ratio, 4),
    }


def fit_transparent_webp(image: Image.Image, size: tuple[int, int], path: Path, quality: int = 90) -> None:
    fitted = ImageOps.contain(image.convert("RGBA"), size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    canvas.save(path, "WEBP", quality=quality, method=6)


def contact_sheet(items: list[dict], output_dir: Path) -> Path:
    tile_width, tile_height = 390, 350
    columns = 3
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#07111f")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 17)
        label_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
        label_font = font
    for index, item in enumerate(items):
        x = (index % columns) * tile_width
        y = (index // columns) * tile_height
        product = Image.open(output_dir / item["media"]["thumb"]).convert("RGBA")
        product.thumbnail((tile_width - 28, 250), Image.Resampling.LANCZOS)
        sheet.paste(product, (x + (tile_width - product.width) // 2, y + 10), product)
        lines = textwrap.wrap(item["name"], width=32)[:2]
        for line_index, line in enumerate(lines):
            draw.text((x + 14, y + 268 + line_index * 20), line, fill="#f1f5fb", font=label_font)
        draw.text((x + 14, y + 310), item.get("display_price") or "Price needs review", fill="#efc86f", font=font)
        draw.text((x + 105, y + 310), item["presentation_quality"].replace("_", " "), fill="#8ba4c3", font=font)
    path = output_dir / "contact-sheet.webp"
    sheet.save(path, "WEBP", quality=90, method=6)
    return path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--presentation-dir", type=Path)
    args = parser.parse_args()

    spec = json.loads(args.manifest.read_text(encoding="utf-8"))
    if spec.get("schema_version") != 1:
        raise ValueError("Unsupported catalog photo manifest schema")
    if not args.source.is_file():
        raise FileNotFoundError(args.source)

    args.output.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(args.source)
    originals_dir = args.output / "originals"
    originals_dir.mkdir(exist_ok=True)
    source_copy = originals_dir / f"{source_hash}{args.source.suffix.lower()}"
    if not source_copy.exists():
        shutil.copy2(args.source, source_copy)

    raw = cv2.imread(str(args.source), cv2.IMREAD_COLOR)
    if raw is None:
        raise ValueError(f"OpenCV could not decode {args.source}")
    board = rectify(raw, spec["board_polygon"], spec["rectified_size"])
    board_path = args.output / "board-corrected.webp"
    if not cv2.imwrite(str(board_path), board, [cv2.IMWRITE_WEBP_QUALITY, 92]):
        raise OSError(f"Could not write {board_path}")
    board_image = Image.open(board_path).convert("RGB")

    detected_panels = None
    if spec.get("panel_detection"):
        detected_panels = detect_product_panels(board, spec["panel_detection"]["expected_rows"])
        if len(detected_panels) != len(spec["items"]):
            raise ValueError(f"Detected {len(detected_panels)} panels for {len(spec['items'])} manifest items")

    review_items = []
    for item_index, item in enumerate(spec["items"]):
        item_dir = args.output / "items" / item["source_item_key"]
        item_dir.mkdir(parents=True, exist_ok=True)
        if detected_panels:
            panel_box = detected_panels[item_index]
            x, y, panel_width, panel_height = panel_box
            evidence_bgr = board[y:y + panel_height, x:x + panel_width]
            evidence = Image.fromarray(cv2.cvtColor(evidence_bgr, cv2.COLOR_BGR2RGB))
            product, cleanup = cleaned_product(evidence_bgr)
            evidence_crop = [x / board.shape[1], y / board.shape[0], (x + panel_width) / board.shape[1], (y + panel_height) / board.shape[0]]
            product_crop = evidence_crop
        else:
            evidence = crop_normalized(board_image, item["evidence_crop"])
            product = crop_normalized(board_image, item["product_crop"])
            cleanup = {"method": "manifest_crop"}
            evidence_crop = item["evidence_crop"]
            product_crop = item["product_crop"]
        presentation = item.get("presentation")
        presentation_asset = None
        presentation_quality = "thumbnail_only"
        if presentation and args.presentation_dir:
            candidate = args.presentation_dir / presentation["filename"]
            if not candidate.is_file():
                raise FileNotFoundError(f"Exact-match presentation asset is missing: {candidate}")
            presentation_asset = candidate
            product = Image.open(candidate)
            presentation_quality = "midsize"
            product, background_removal = remove_flat_background(product)
        else:
            background_removal = {"applied": False, "reason": "photo_crop_evidence_only"}

        evidence_path = item_dir / "evidence.webp"
        card_path = item_dir / "card.webp"
        thumb_path = item_dir / "thumb.webp"
        evidence.save(evidence_path, "WEBP", quality=92, method=6)
        if presentation_asset:
            if background_removal["applied"]:
                fit_transparent_webp(product, (640, 640), card_path)
                fit_transparent_webp(product, (240, 240), thumb_path)
            else:
                cover_webp(product, (640, 640), card_path)
                cover_webp(product, (240, 240), thumb_path)
        else:
            fit_webp(product, (640, 640), card_path)
            fit_webp(product, (240, 240), thumb_path)
        review_items.append(
            {
                **{key: value for key, value in item.items() if key not in {"evidence_crop", "product_crop"}},
                "review_status": "needs_review",
                "presentation_quality": presentation_quality,
                "presentation": ({
                    **presentation,
                    "source_sha256": sha256(presentation_asset),
                    "match_status": "exact_product",
                    "background_removal": background_removal,
                } if presentation_asset else None),
                "crop": {"evidence": evidence_crop, "product": product_crop},
                "cleanup": cleanup,
                "media": {
                    "evidence": evidence_path.relative_to(args.output).as_posix(),
                    "card": card_path.relative_to(args.output).as_posix(),
                    "thumb": thumb_path.relative_to(args.output).as_posix(),
                },
                "hashes": {
                    "evidence_sha256": sha256(evidence_path),
                    "card_sha256": sha256(card_path),
                    "thumb_sha256": sha256(thumb_path),
                },
            }
        )

    result = {
        "schema_version": 1,
        "catalog": spec["catalog"],
        "source": {
            **spec["source"],
            "original_filename": args.source.name,
            "original_path": source_copy.relative_to(args.output).as_posix(),
            "original_sha256": source_hash,
            "rectified_sha256": sha256(board_path),
        },
        "transform": {
            "tool": "catalog_photo_intake.py",
            "tool_version": "1",
            "opencv_version": cv2.__version__,
            "pillow_version": PIL.__version__,
            "board_polygon": spec["board_polygon"],
            "rectified_size": spec["rectified_size"],
            "source_size": [raw.shape[1], raw.shape[0]],
        },
        "review_gate": {
            "status": "needs_review",
            "rule": "No product, offer, availability, or media row may be promoted until every selected item is reviewed.",
        },
        "items": review_items,
    }
    sheet_path = contact_sheet(review_items, args.output)
    result["contact_sheet"] = {"path": sheet_path.name, "sha256": sha256(sheet_path)}
    review_path = args.output / "review-manifest.json"
    review_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "needs_review", "items": len(review_items), "review_manifest": str(review_path), "contact_sheet": str(sheet_path)}, indent=2))


if __name__ == "__main__":
    main()
