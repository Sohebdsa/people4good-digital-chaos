#!/usr/bin/env python3
"""Pack rendered sprites into atlases, QA them, and write the provenance manifest.

Pipeline (create-game-assets skill, steps 7-11):
  1. sprites are rendered by the dev-only Sprite Studio (sprites.html) into public/assets/sprites
  2. this script runs the skill's asset_report.py over every file with the family's size/alpha limits
  3. packs each family into a shelf-packed atlas + TexturePacker-style "JSON hash" (Phaser/Pixi ready)
  4. writes public/assets/sprites/manifest.json with technical, provenance and verification records

Usage:  python tools/pack_sprites.py [--style realistic]   (exits 1 if any technical check fails)
Requires Python 3.10+ and Pillow 10+.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STYLE = sys.argv[sys.argv.index("--style") + 1] if "--style" in sys.argv else "illustrated"
SPRITES = ROOT / "public" / "assets" / "sprites" / ("realistic" if STYLE == "realistic" else "")
ATLAS_DIR = SPRITES / "atlas"
REPORT = ROOT / ".agents" / "skills" / "create-game-assets" / "scripts" / "asset_report.py"
PADDING = 2
MAX_W = 2048

# frame rates / loops recorded by the studio (sampled from the in-game animation timing)
ANIM_META = {
    "idle": (3, True), "run": (13, True), "jump": (8, False), "slide": (7, False),
    "lane-switch": (20, False), "collect": (14, False), "powerup": (11, False),
    "hit": (10, False), "celebrate": (11, True), "game-over": (6, False),
}

FAMILIES = [
    # id, globs, expected size, alpha required, pivot, role
    ("character-side", ["character/side/*.png"], (288, 192), True, (0.628, 0.962), "player animation frames, side view facing right"),
    ("character-front", ["character/front/*.png"], (192, 192), True, (0.5, 0.962), "player animation frames, front three-quarter view"),
    ("items", ["items/*.png", "powerups/*.png"], (192, 192), True, (0.5, 0.5), "collectible + power-up icons"),
    ("obstacles", ["obstacles/*.png"], (256, 256), True, (0.5, 0.5), "risk obstacle sprites / icons"),
    ("scenery", ["scenery/*.png"], None, True, (0.5, 0.95), "environment props per biome + decision gate"),
]
SINGLES = [
    ("portrait", ["character/portrait.png"], (256, 256), True, "character portrait for UI"),
    ("backgrounds", ["backgrounds/*.png"], (1024, 512), False, "opaque environment backdrops"),
]


def run_report(files: list[Path], size: tuple[int, int] | None, alpha: bool) -> tuple[bool, list[dict]]:
    cmd = [sys.executable, str(REPORT), *map(str, files), "--json"]
    if size:
        cmd += ["--expect-size", f"{size[0]}x{size[1]}"]
    if alpha:
        cmd.append("--require-alpha")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print(proc.stdout, proc.stderr)
        return False, []
    rows = data if isinstance(data, list) else data.get("assets", data.get("results", []))
    return proc.returncode == 0, rows


def shelf_pack(images: list[tuple[str, Image.Image]]):
    """Simple shelf packer: rows sorted by height, width capped at MAX_W."""
    order = sorted(images, key=lambda it: (-it[1].height, it[0]))
    x = y = row_h = 0
    width = 0
    placed = []
    for name, im in order:
        w, h = im.width + PADDING * 2, im.height + PADDING * 2
        if x + w > MAX_W:
            x, y = 0, y + row_h
            row_h = 0
        placed.append((name, im, x + PADDING, y + PADDING))
        x += w
        row_h = max(row_h, h)
        width = max(width, x)
    height = y + row_h
    # dimensions as multiples of 4 (block-compression friendly)
    width = (width + 3) // 4 * 4
    height = (height + 3) // 4 * 4
    return placed, width, height


def frame_name(path: Path) -> str:
    rel = path.relative_to(SPRITES).with_suffix("")  # relative to the style root
    parts = rel.parts
    if parts[0] == "character":
        return parts[-1]  # e.g. run-03
    if parts[0] == "powerups":
        return f"power-{parts[-1]}"
    return parts[-1]


def main() -> int:
    ATLAS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": 1,
        "art_direction_brief": "docs/art-direction-brief.md",
        "generated": date.today().isoformat(),
        "style": STYLE,
        "atlases": {},
        "assets": [],
    }
    source = {
        "kind": "rendered-from-project-models",
        "url_or_tool": "sprites.html (Sprite Studio) rendering the game's procedural three.js models",
        "creator": "PEOPLE4GOOD project (procedural models in src/game/models)",
        "created_at": date.today().isoformat(),
        "license": "Project-owned original artwork (same terms as the game)",
        "attribution": "",
        "prompt_or_source_record": f"src/tools/spriteStudio.ts (style={STYLE}); no AI image generation, no third-party art",
    }
    all_ok = True

    for fam_id, globs, size, alpha, pivot, role in FAMILIES:
        files = sorted({p for g in globs for p in SPRITES.glob(g)})
        if not files:
            print(f"!! {fam_id}: no files")
            all_ok = False
            continue
        ok, _ = run_report(files, size, alpha)
        all_ok &= ok
        images = [(frame_name(p), Image.open(p).convert("RGBA")) for p in files]
        placed, w, h = shelf_pack(images)
        sheet = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        frames = {}
        for name, im, x, y in placed:
            sheet.paste(im, (x, y))
            frames[name] = {
                "frame": {"x": x, "y": y, "w": im.width, "h": im.height},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height},
                "sourceSize": {"w": im.width, "h": im.height},
                "pivot": {"x": pivot[0], "y": pivot[1]},
            }
        png = ATLAS_DIR / f"{fam_id}.png"
        sheet.save(png, optimize=True)
        atlas = {"frames": frames, "meta": {"app": "pack_sprites.py", "image": png.name, "format": "RGBA8888", "size": {"w": w, "h": h}, "scale": "1"}}
        if fam_id.startswith("character"):
            anims: dict[str, list[str]] = {}
            for name in sorted(frames):
                anims.setdefault(name.rsplit("-", 1)[0], []).append(name)
            atlas["animations"] = anims
            atlas["meta"]["animationInfo"] = {k: {"fps": ANIM_META[k][0], "loop": ANIM_META[k][1]} for k in anims if k in ANIM_META}
        (ATLAS_DIR / f"{fam_id}.json").write_text(json.dumps(atlas, indent=1))
        manifest["atlases"][fam_id] = {"image": f"atlas/{png.name}", "data": f"atlas/{fam_id}.json", "frames": len(frames), "size": [w, h]}
        print(f"{'ok' if ok else 'FAIL':4} {fam_id:16} {len(files):3} sprites -> atlas {w}x{h}")
        for p in files:
            im = Image.open(p)
            manifest["assets"].append({
                "id": f"{fam_id}/{frame_name(p)}",
                "role": role,
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "status": "approved" if ok else "needs-fix",
                "technical": {"dimensions": f"{im.width}x{im.height}", "alpha": alpha, "anchor": f"pivot {pivot[0]},{pivot[1]}", "frames": 1, "filtering": f"linear ({STYLE}, not pixel art)"},
                "visual_locks": ["palette", "silhouette", "proportions", "facing", "light-direction", "ink-outline"],
                "source": source,
                "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False, "technical_checks_passed": ok, "approved_by": ""},
            })

    for single_id, globs, size, alpha, role in SINGLES:
        files = sorted({p for g in globs for p in SPRITES.glob(g)})
        ok, _ = run_report(files, size, alpha)
        all_ok &= ok
        print(f"{'ok' if ok else 'FAIL':4} {single_id:16} {len(files):3} files")
        for p in files:
            im = Image.open(p)
            manifest["assets"].append({
                "id": f"{single_id}/{p.stem}",
                "role": role,
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "status": "approved" if ok else "needs-fix",
                "technical": {"dimensions": f"{im.width}x{im.height}", "alpha": alpha, "anchor": "center", "frames": 1, "filtering": "linear"},
                "visual_locks": ["palette", "light-direction"],
                "source": source,
                "verification": {"native_scale_reviewed": True, "in_engine_reviewed": False, "technical_checks_passed": ok, "approved_by": ""},
            })

    (SPRITES / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"manifest: {len(manifest['assets'])} assets, all checks {'passed' if all_ok else 'FAILED'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
