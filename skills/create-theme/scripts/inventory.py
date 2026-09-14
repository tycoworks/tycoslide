#!/usr/bin/env python3
"""Inventory a PowerPoint template for writing a tycoslide theme.json.

Prints the slide size, the color and font scheme, embedded fonts, then every
shape on every slide (name, kind, frame) and which slides share geometry.

Slides are keyed by the number in the part name ppt/slides/slideN.xml, which
is what theme.json's `slideNumber` means.  The 1-based position in
presentation order is shown next to it because rendered previews (LibreOffice
PNGs) are numbered by position, and the two can differ.

Standard library only (Python 3.9+).
"""
import argparse
import colorsys
import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
A, P, R = ("{%s}" % NS[k] for k in ("a", "p", "r"))
RELS_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"

EMU_PER_INCH = 914400
GEOMETRY_TOLERANCE = 12700  # EMU (one point): frames closer than this count as equal
SCHEME_SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3",
                "accent4", "accent5", "accent6", "hlink", "folHlink"]
TEXT_PREVIEW_CHARS = 80


# --------------------------------------------------------------------------
# Package access
# --------------------------------------------------------------------------

class Package:
    """A .pptx opened for reading, with part and relationship lookups."""

    def __init__(self, path):
        self.zip = zipfile.ZipFile(path)
        self.names = set(self.zip.namelist())
        self._xml = {}

    def xml(self, part):
        if part not in self._xml:
            self._xml[part] = ET.fromstring(self.zip.read(part))
        return self._xml[part]

    def rels(self, part):
        """Map rId -> (relationship type suffix, absolute target part)."""
        folder, name = posixpath.split(part)
        rels_part = posixpath.join(folder, "_rels", name + ".rels")
        if rels_part not in self.names:
            return {}
        out = {}
        for rel in ET.fromstring(self.zip.read(rels_part)):
            if rel.get("TargetMode") == "External":
                continue
            kind = rel.get("Type", "").rsplit("/", 1)[-1]
            target = rel.get("Target", "")
            if target.startswith("/"):
                resolved = target.lstrip("/")
            else:
                resolved = posixpath.normpath(posixpath.join(folder, target))
            out[rel.get("Id")] = (kind, resolved)
        return out

    def related(self, part, kind):
        return [target for k, target in self.rels(part).values() if k == kind]

    def first_related(self, part, kind):
        targets = self.related(part, kind)
        return targets[0] if targets else None


def open_package(path):
    """Open the template or exit with a plain-English explanation."""
    if not Path(path).is_file():
        sys.exit(f"error: {path} does not exist or is not a file.")
    if not zipfile.is_zipfile(path):
        sys.exit(f"error: {path} is not a .pptx file (it is not a zip archive).")
    pkg = Package(path)
    if "ppt/presentation.xml" not in pkg.names:
        sys.exit(f"error: {path} is not a .pptx file (no ppt/presentation.xml inside; "
                 "a .docx or .xlsx perhaps?).")
    return pkg


def part_number(part):
    """ppt/slides/slide12.xml -> 12"""
    return int(re.search(r"(\d+)\.xml$", part).group(1))


# --------------------------------------------------------------------------
# Presentation-level facts
# --------------------------------------------------------------------------

def slide_parts(pkg):
    parts = [n for n in pkg.names if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)]
    return sorted(parts, key=part_number)


def presentation_order(pkg):
    """Map slide part -> 1-based position in the sldIdLst."""
    rels = pkg.rels("ppt/presentation.xml")
    order = {}
    for pos, sld in enumerate(pkg.xml("ppt/presentation.xml").iterfind("p:sldIdLst/p:sldId", NS), 1):
        rel = rels.get(sld.get(R + "id"))
        if rel:
            order[rel[1]] = pos
    return order


def slide_size(pkg):
    sz = pkg.xml("ppt/presentation.xml").find("p:sldSz", NS)
    return int(sz.get("cx")), int(sz.get("cy"))


def first_master(pkg):
    pres = pkg.xml("ppt/presentation.xml")
    rels = pkg.rels("ppt/presentation.xml")
    for mid in pres.iterfind("p:sldMasterIdLst/p:sldMasterId", NS):
        rel = rels.get(mid.get(R + "id"))
        if rel:
            return rel[1]
    masters = sorted(n for n in pkg.names if re.fullmatch(r"ppt/slideMasters/slideMaster\d+\.xml", n))
    return masters[0] if masters else None


def color_scheme(theme):
    scheme = theme.find("a:themeElements/a:clrScheme", NS)
    colors = {"name": scheme.get("name", "")}
    for slot in SCHEME_SLOTS:
        el = scheme.find("a:" + slot, NS)
        rgb = resolve_color(el[0], {}, {}) if el is not None and len(el) else None
        colors[slot] = hex_color(rgb) if rgb else None
    return colors


def font_scheme(theme):
    fs = theme.find("a:themeElements/a:fontScheme", NS)
    major = fs.find("a:majorFont/a:latin", NS)
    minor = fs.find("a:minorFont/a:latin", NS)
    return {"name": fs.get("name", ""),
            "major": major.get("typeface") if major is not None else None,
            "minor": minor.get("typeface") if minor is not None else None}


def embedded_fonts(pkg):
    pres = pkg.xml("ppt/presentation.xml")
    typefaces = [f.get("typeface") for f in pres.iterfind("p:embeddedFontLst/p:embeddedFont/p:font", NS)]
    files = sum(1 for n in pkg.names if re.fullmatch(r"ppt/fonts/.+\.fntdata", n))
    return {"typefaces": typefaces, "fntdataFiles": files}


# --------------------------------------------------------------------------
# Colors
# --------------------------------------------------------------------------

PRESET_COLORS = {"white": (255, 255, 255), "black": (0, 0, 0)}


def hex_color(rgb):
    return "#%02X%02X%02X" % tuple(int(round(c)) for c in rgb)


def clr_map(pkg, master, layout=None, slide=None):
    """bg1/tx1/bg2/tx2 -> scheme slot, honouring layout and slide overrides."""
    mapping = dict(pkg.xml(master).find("p:clrMap", NS).attrib)
    for part in (layout, slide):
        if part is None:
            continue
        override = pkg.xml(part).find("p:clrMapOvr/a:overrideClrMapping", NS)
        if override is not None:
            mapping.update(override.attrib)
    return mapping


def resolve_color(el, scheme, mapping, placeholder=None):
    """Return (r, g, b) for an a:srgbClr / a:schemeClr / a:sysClr / a:prstClr, or None.

    Scheme slots are looked up as named (schemes can be deliberately inverted);
    only bg1/tx1/bg2/tx2 go through the color map because they are not slots.
    """
    tag = el.tag
    if tag == A + "srgbClr":
        rgb = tuple(int(el.get("val")[i:i + 2], 16) for i in (0, 2, 4))
    elif tag == A + "sysClr":
        last = el.get("lastClr", "808080")
        rgb = tuple(int(last[i:i + 2], 16) for i in (0, 2, 4))
    elif tag == A + "prstClr":
        rgb = PRESET_COLORS.get(el.get("val"))
    elif tag == A + "schemeClr":
        slot = el.get("val")
        if slot == "phClr":
            return placeholder
        slot = mapping.get(slot, slot)
        hexval = scheme.get(slot)
        rgb = tuple(int(hexval[i:i + 2], 16) for i in (1, 3, 5)) if hexval else None
    else:
        return None
    return apply_modifiers(rgb, el) if rgb else None


def apply_modifiers(rgb, el):
    """Approximate lumMod/lumOff/tint/shade so 'accent1 at 20%' reads correctly."""
    r, g, b = (c / 255 for c in rgb)
    for mod in el:
        val = int(mod.get("val", "0")) / 100000
        if mod.tag == A + "lumMod" or mod.tag == A + "lumOff":
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            l = l * val if mod.tag == A + "lumMod" else l + val
            r, g, b = colorsys.hls_to_rgb(h, min(max(l, 0), 1), s)
        elif mod.tag == A + "tint":
            r, g, b = (1 - (1 - c) * val for c in (r, g, b))
        elif mod.tag == A + "shade":
            r, g, b = (c * val for c in (r, g, b))
    return (r * 255, g * 255, b * 255)


def relative_luminance(rgb):
    def linear(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def tone(rgb):
    return "light" if relative_luminance(rgb) > 0.5 else "dark"


# --------------------------------------------------------------------------
# Backgrounds
# --------------------------------------------------------------------------

class BackgroundResolver:
    def __init__(self, pkg, master, theme):
        self.pkg = pkg
        self.master = master
        self.theme = pkg.xml(theme)
        self.scheme = color_scheme(self.theme)

    def classify(self, slide, layout):
        """Classify the background as light, dark, image or unknown."""
        bg, part = self._background_element(slide, layout)
        if bg is None:
            return "unknown"
        mapping = clr_map(self.pkg, self.master, layout, slide)
        fill, placeholder = self._fill_of(bg, mapping)
        if fill is None:
            return "unknown"
        if fill.tag == A + "blipFill":
            return "image"
        rgb = self._fill_color(fill, mapping, placeholder)
        return tone(rgb) if rgb else "unknown"

    def _background_element(self, slide, layout):
        for part in (slide, layout, self.master):
            if part is None:
                continue
            bg = self.pkg.xml(part).find("p:cSld/p:bg", NS)
            if bg is not None:
                return bg, part
        return None, None

    def _fill_of(self, bg, mapping):
        """The fill element (solidFill/gradFill/blipFill) and the phClr it uses."""
        props = bg.find("p:bgPr", NS)
        if props is not None:
            return (props[0] if len(props) else None), None
        ref = bg.find("p:bgRef", NS)
        if ref is None:
            return None, None
        # A bgRef points into the theme's fill style lists; 1001+ means the
        # bgFillStyleLst, 1..999 the ordinary fillStyleLst.
        idx = int(ref.get("idx", "0"))
        list_name, offset = ("a:bgFillStyleLst", 1001) if idx >= 1001 else ("a:fillStyleLst", 1)
        styles = self.theme.find("a:themeElements/a:fmtScheme/" + list_name, NS)
        if styles is None or not (0 <= idx - offset < len(styles)):
            return None, None
        placeholder = resolve_color(ref[0], self.scheme, mapping) if len(ref) else None
        return styles[idx - offset], placeholder

    def _fill_color(self, fill, mapping, placeholder):
        if fill.tag == A + "solidFill" and len(fill):
            return resolve_color(fill[0], self.scheme, mapping, placeholder)
        if fill.tag == A + "gradFill":
            stops = [resolve_color(gs[0], self.scheme, mapping, placeholder)
                     for gs in fill.iterfind("a:gsLst/a:gs", NS) if len(gs)]
            stops = [s for s in stops if s]
            if stops:
                return tuple(sum(c[i] for c in stops) / len(stops) for i in range(3))
        return None



# --------------------------------------------------------------------------
# Shapes
# --------------------------------------------------------------------------

SHAPE_TAGS = (P + "sp", P + "pic", P + "graphicFrame", P + "grpSp", P + "cxnSp")


def walk_shapes(container, prefix=""):
    """Yield shape descriptions in document order, descending into groups."""
    for el in container:
        if el.tag not in SHAPE_TAGS:
            continue
        shape = describe_shape(el, prefix)
        yield shape
        if el.tag == P + "grpSp":
            yield from walk_shapes(el, shape["name"] + "/")


def describe_shape(el, prefix):
    frame = shape_frame(el)
    shape = {
        "name": prefix + shape_name(el),
        "kind": shape_kind(el),
        "frame": frame,
        "rows": None,
        "cols": None,
        "text": "" if el.tag == P + "grpSp" else shape_text(el),
    }
    tbl = el.find(".//a:tbl", NS)
    if tbl is not None:
        shape["rows"] = len(tbl.findall("a:tr", NS))
        shape["cols"] = len(tbl.findall("a:tblGrid/a:gridCol", NS))
    return shape


def nv_props(el):
    """The p:nv*Pr child (non-visual properties) of any shape element."""
    for child in el:
        if child.tag.startswith(P + "nv"):
            return child
    return None


def shape_name(el):
    nv = nv_props(el)
    cnv = nv.find("p:cNvPr", NS) if nv is not None else None
    return cnv.get("name", "") if cnv is not None else ""


def placeholder_of(el):
    nv = nv_props(el)
    return nv.find("p:nvPr/p:ph", NS) if nv is not None else None


def shape_kind(el):
    if el.tag == P + "pic":
        return "picture"
    if el.tag == P + "grpSp":
        return "group"
    if el.tag == P + "graphicFrame":
        return "table" if el.find(".//a:tbl", NS) is not None else "other"
    if el.tag == P + "sp":
        cnv = el.find("p:nvSpPr/p:cNvSpPr", NS)
        is_textbox = cnv is not None and cnv.get("txBox") == "1"
        if placeholder_of(el) is not None or is_textbox or shape_text(el):
            return "text"
    return "other"


def shape_text(el):
    """The shape's text with paragraph breaks shown as ¶ and line breaks as ↵.

    A parameter template puts `\\n` where the shape breaks, so the preview has
    to show where the breaks are rather than flatten them away.
    """
    paragraphs = []
    for para in el.iter(A + "p"):
        pieces = []
        for child in para:
            if child.tag == A + "br":
                pieces.append("↵")
            else:
                pieces.extend(t.text for t in child.iter(A + "t") if t.text)
        text = " ".join(" ".join(pieces).split())
        if text:
            paragraphs.append(text)
    return " ¶ ".join(paragraphs)


def shape_frame(el):
    xfrm = (el.find("p:spPr/a:xfrm", NS) if el.tag != P + "graphicFrame" else el.find("p:xfrm", NS))
    if xfrm is None:
        xfrm = el.find("p:grpSpPr/a:xfrm", NS)
    if xfrm is None:
        return None
    off, ext = xfrm.find("a:off", NS), xfrm.find("a:ext", NS)
    if off is None or ext is None:
        return None
    return {"x": int(off.get("x")), "y": int(off.get("y")),
            "cx": int(ext.get("cx")), "cy": int(ext.get("cy"))}


def inherit_placeholder_frames(pkg, shapes, layout, master):
    """Fill in frames for placeholders that leave their position to the layout/master.

    `shapes` pairs each shape description with its XML element.
    """
    layout_phs = placeholder_index(pkg.xml(layout)) if layout else []
    master_phs = placeholder_index(pkg.xml(master)) if master else []
    for shape, el in shapes:
        if shape["frame"] is not None or el.tag != P + "sp":
            continue
        ph = placeholder_of(el)
        if ph is None:
            continue
        for source, index in (("layout", layout_phs), ("master", master_phs)):
            frame = matching_placeholder_frame(ph, index)
            if frame:
                shape["frame"] = frame
                shape["inheritedFrame"] = source
                break


def placeholder_index(root):
    """[(type, idx, frame)] for every placeholder in a layout or master."""
    out = []
    for el in root.iter(P + "sp"):
        ph = placeholder_of(el)
        if ph is not None:
            out.append((ph.get("type", "body"), ph.get("idx"), shape_frame(el)))
    return out


def matching_placeholder_frame(ph, index):
    ptype, idx = ph.get("type", "body"), ph.get("idx")
    equivalent = {"ctrTitle": "title", "subTitle": "body", "obj": "body"}
    if idx is not None:
        for t, i, frame in index:
            if i == idx and frame:
                return frame
    for t, i, frame in index:
        if equivalent.get(t, t) == equivalent.get(ptype, ptype) and frame:
            return frame
    return None


# --------------------------------------------------------------------------
# Per-slide assembly
# --------------------------------------------------------------------------

def inventory_slide(pkg, part, order, backgrounds, master):
    root = pkg.xml(part)
    layout = pkg.first_related(part, "slideLayout")
    layout_name = None
    if layout:
        csld = pkg.xml(layout).find("p:cSld", NS)
        layout_name = csld.get("name") if csld is not None else None
    tree = root.find("p:cSld/p:spTree", NS)
    shapes = list(walk_shapes(tree))
    inherit_placeholder_frames(pkg, list(zip(shapes, iter_shape_elements(tree))), layout, master)
    background = backgrounds.classify(part, layout)
    return {
        "slide": part_number(part),
        "position": order.get(part),
        "layout": layout_name,
        "background": background,
        "shapes": shapes,
    }


def iter_shape_elements(container):
    """Same order as walk_shapes, but the raw elements."""
    for el in container:
        if el.tag not in SHAPE_TAGS:
            continue
        yield el
        if el.tag == P + "grpSp":
            yield from iter_shape_elements(el)


# --------------------------------------------------------------------------
# Duplicate geometry
# --------------------------------------------------------------------------

def geometry_signature(slide):
    return [(s["kind"], s["frame"]) for s in slide["shapes"] if s["frame"]]


def same_geometry(a, b):
    """True when the two multisets of (kind, frame) match within tolerance."""
    if len(a) != len(b):
        return False
    remaining = list(b)
    for kind, frame in a:
        for i, (other_kind, other) in enumerate(remaining):
            if kind == other_kind and all(abs(frame[k] - other[k]) <= GEOMETRY_TOLERANCE for k in frame):
                del remaining[i]
                break
        else:
            return False
    return True


def find_duplicates(slides):
    """Groups of slide numbers whose shapes have the same kinds and frames."""
    sigs = [(s["slide"], geometry_signature(s)) for s in slides if s["shapes"]]
    groups = []
    for number, sig in sigs:
        for group in groups:
            if same_geometry(sig, group["sig"]):
                group["slides"].append(number)
                break
        else:
            groups.append({"sig": sig, "slides": [number]})
    return [g["slides"] for g in groups if len(g["slides"]) > 1]




# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------

def inches(emu):
    value = round(emu / EMU_PER_INCH, 2) or 0.0  # avoid printing "-0.00"
    return f"{value:.2f}"


def print_header(result):
    cx, cy = result["slideSize"]["cx"], result["slideSize"]["cy"]
    print(f"Slide size: {inches(cx)} x {inches(cy)} in  ({cx} x {cy} EMU)")
    cs = result["colorScheme"]
    print(f"Color scheme \"{cs['name']}\" ({result['themePart']}, via {result['masterPart']}):")
    print("  " + "  ".join(f"{slot}={cs[slot] or '?'}" for slot in SCHEME_SLOTS[:4]))
    print("  " + "  ".join(f"{slot}={cs[slot] or '?'}" for slot in SCHEME_SLOTS[4:10]))
    print("  " + "  ".join(f"{slot}={cs[slot] or '?'}" for slot in SCHEME_SLOTS[10:]))
    fs = result["fontScheme"]
    print(f"Font scheme \"{fs['name']}\": major={fs['major'] or '?'}  minor={fs['minor'] or '?'}")
    ef = result["embeddedFonts"]
    names = ", ".join(ef["typefaces"]) if ef["typefaces"] else "none"
    print(f"Embedded fonts: {names}  ({ef['fntdataFiles']} .fntdata files)")


def print_slide(slide):
    position = f"position {slide['position']}" if slide["position"] else "not in presentation order"
    background = slide["background"]
    print()
    print(f"== slide {slide['slide']}  ({position})   layout: \"{slide['layout'] or '?'}\"   background: {background}")
    for shape in slide["shapes"]:
        print(format_shape(shape))


def format_shape(shape):
    frame = shape["frame"]
    if frame:
        geom = "  ".join(f"{k}={inches(frame[k])}" for k in ("x", "y", "cx", "cy"))
        if shape.get("inheritedFrame"):
            geom += f"  (from {shape['inheritedFrame']})"
    else:
        geom = "x=?  y=?  cx=?  cy=?"
    extra = ""
    if shape["kind"] == "table":
        extra = f"  rows={shape['rows']} cols={shape['cols']}"
    text = shape["text"][:TEXT_PREVIEW_CHARS]
    return f"   {shape['name']:<32}  {shape['kind']:<7}  {geom}{extra}  {text}".rstrip()


def print_duplicates(groups):
    print()
    print("Duplicates (same shape kinds and frames within 1pt):")
    if not groups:
        print("  none")
    for group in groups:
        print(f"  slides {', '.join(str(n) for n in group)} share the same geometry")


def build_inventory(pkg):
    master = first_master(pkg)
    theme = pkg.first_related(master, "theme") if master else None
    if theme is None:
        sys.exit("error: could not find a theme part for the first slide master.")
    backgrounds = BackgroundResolver(pkg, master, theme)
    order = presentation_order(pkg)
    slides = [inventory_slide(pkg, part, order, backgrounds, master) for part in slide_parts(pkg)]
    cx, cy = slide_size(pkg)
    return {
        "slideSize": {"cx": cx, "cy": cy, "widthIn": round(cx / EMU_PER_INCH, 3), "heightIn": round(cy / EMU_PER_INCH, 3)},
        "masterPart": posixpath.basename(master),
        "themePart": posixpath.basename(theme),
        "colorScheme": backgrounds.scheme,
        "fontScheme": font_scheme(pkg.xml(theme)),
        "embeddedFonts": embedded_fonts(pkg),
        "slides": slides,
        "duplicates": find_duplicates(slides),
    }


def main():
    parser = argparse.ArgumentParser(
        description="List slide size, theme colors/fonts, and every shape (name, kind, frame) "
                    "in a PowerPoint template, keyed by slideN.xml number for theme.json.")
    parser.add_argument("template", help="path to the .pptx template")
    parser.add_argument("--json", action="store_true", help="emit JSON (frames in EMU) instead of text")
    args = parser.parse_args()

    result = build_inventory(open_package(args.template))
    if args.json:
        for slide in result["slides"]:
            for shape in slide["shapes"]:
                shape["text"] = shape["text"][:TEXT_PREVIEW_CHARS]
        json.dump(result, sys.stdout, indent=2)
        print()
        return
    print_header(result)
    for slide in result["slides"]:
        print_slide(slide)
    print_duplicates(result["duplicates"])


if __name__ == "__main__":
    main()
