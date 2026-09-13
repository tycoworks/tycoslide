#!/usr/bin/env python3
"""Copy the brand chrome images out of a PowerPoint template.

Every image referenced from a slide master or slide layout (pictures and
background fills alike) is copied to OUTDIR under its original media filename.
Images referenced only by slides are skipped: those are content, not chrome.

Standard library only (Python 3.9+).
"""
import argparse
import posixpath
import re
import struct
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


def open_package(path):
    """Open the template or exit with a plain-English explanation."""
    if not Path(path).is_file():
        sys.exit(f"error: {path} does not exist or is not a file.")
    if not zipfile.is_zipfile(path):
        sys.exit(f"error: {path} is not a .pptx file (it is not a zip archive).")
    pkg = zipfile.ZipFile(path)
    if "ppt/presentation.xml" not in pkg.namelist():
        sys.exit(f"error: {path} is not a .pptx file (no ppt/presentation.xml inside; "
                 "a .docx or .xlsx perhaps?).")
    return pkg


def chrome_parts(pkg):
    """Master and layout parts, masters first, each set in numeric order."""
    names = pkg.namelist()
    number = lambda n: int(re.search(r"(\d+)\.xml$", n).group(1))
    masters = sorted((n for n in names if re.fullmatch(r"ppt/slideMasters/slideMaster\d+\.xml", n)), key=number)
    layouts = sorted((n for n in names if re.fullmatch(r"ppt/slideLayouts/slideLayout\d+\.xml", n)), key=number)
    return masters + layouts


def image_targets(pkg, part):
    """Absolute media parts referenced by image relationships of `part`."""
    folder, name = posixpath.split(part)
    rels_part = posixpath.join(folder, "_rels", name + ".rels")
    if rels_part not in pkg.namelist():
        return []
    targets = []
    for rel in ET.fromstring(pkg.read(rels_part)):
        if rel.get("TargetMode") == "External" or not rel.get("Type", "").endswith("/image"):
            continue
        target = rel.get("Target", "")
        resolved = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(folder, target))
        targets.append(resolved)
    return targets


def collect_references(pkg):
    """Map media part -> [referencing part short names], in first-seen order."""
    refs = {}
    for part in chrome_parts(pkg):
        short = posixpath.basename(part)[:-4]
        for media in image_targets(pkg, part):
            users = refs.setdefault(media, [])
            if short not in users:
                users.append(short)
    return refs


def image_dimensions(data):
    """(width, height) from PNG, JPEG or GIF headers; None when unrecognised."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":
        return jpeg_dimensions(data)
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    return None


def jpeg_dimensions(data):
    pos = 2
    while pos + 4 <= len(data) and data[pos] == 0xFF:
        marker = data[pos + 1]
        if marker == 0xFF:
            pos += 1
            continue
        if marker == 0xD8 or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        length = struct.unpack(">H", data[pos + 2:pos + 4])[0]
        # SOF0..SOF15 carry the frame size; C4, C8 and CC are other segments.
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            height, width = struct.unpack(">HH", data[pos + 5:pos + 9])
            return width, height
        pos += 2 + length
    return None


def copy_image(pkg, media, outdir):
    """Write the media part into outdir unless a file of that name already exists."""
    dest = outdir / posixpath.basename(media)
    if dest.exists():
        return dest, False
    dest.write_bytes(pkg.read(media))
    return dest, True


def main():
    parser = argparse.ArgumentParser(
        description="Copy every image used by slide masters and layouts (logos, background "
                    "fills) out of a .pptx into OUTDIR, keeping original filenames.")
    parser.add_argument("template", help="path to the .pptx template")
    parser.add_argument("outdir", help="directory to copy images into (created if missing)")
    args = parser.parse_args()

    pkg = open_package(args.template)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    refs = collect_references(pkg)
    names = set(pkg.namelist())
    copied = kept = 0
    seen = {}  # image bytes -> first filename, so a re-embedded duplicate is not copied twice
    for media, users in refs.items():
        if media not in names:
            print(f"{posixpath.basename(media)}  (missing from package)  {', '.join(users)}")
            continue
        data = pkg.read(media)
        dims = image_dimensions(data)
        size = f"{dims[0]}x{dims[1]}" if dims else "?"
        if data in seen:
            print(f"{posixpath.basename(media)}  {size}  {', '.join(users)}  (identical to {seen[data]}, skipped)")
            continue
        seen[data] = posixpath.basename(media)
        dest, written = copy_image(pkg, media, outdir)
        note = "" if written else "  (already present, left untouched)"
        print(f"{dest.name}  {size}  {', '.join(users)}{note}")
        copied += written
        kept += not written

    slide_only = sum(1 for n in names if n.startswith("ppt/media/") and not n.endswith("/") and n not in refs)
    summary = f"{copied} image(s) copied to {outdir}"
    if kept:
        summary += f", {kept} already present"
    if slide_only:
        summary += f"; {slide_only} media file(s) referenced only by slides were skipped"
    print(summary)


if __name__ == "__main__":
    main()
