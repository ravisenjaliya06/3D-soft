# Python imports
import contextlib
import logging
import os
import secrets
import shutil
import zipfile
from typing import Dict, List, Tuple
from xml.etree import ElementTree

# Django imports
from django.db import transaction
from django.http import JsonResponse

# External imports
from rectpack import SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE, newPacker
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
from rest_framework.status import HTTP_200_OK
from svglib.svglib import svg2rlg
from svgwrite import Drawing
from svgwrite.shapes import Rect
from svgwrite.text import Text

# App imports
from design.models import DesignSetting, NestingFile, NestingSheet

try:
    # External imports
    import ezdxf

    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False


def generate_gcode(
    rectangles: List[Tuple],
    output_file: str,
    files: Dict,
    feed_rate: int = 1000,
    plunge_rate: int = 100,
    cut_height: int = 3,
    safe_height: float = 5.0,
    material_thickness: float = 18.0,
) -> None:
    """
    Generate G-code for CNC machine with proper hole drilling and cutting.
    Handles minifix holes (CAM, DOWEL, SCREW, BOLT_DRILL) with correct depths.
    """
    gcode = [
        "G21 ; Set units to millimeters",
        "G90 ; Use absolute coordinates",
        "G17 ; Select XY plane",
        "G28 ; Home all axes",
        "M3 S1000 ; Start spindle clockwise at 1000 RPM",
        "M8 ; Turn on coolant",
        f"F{feed_rate} ; Set feed rate",
        f"G0 Z{safe_height:.3f} ; Move to safe height",
    ]

    for rect in rectangles:
        # Handle both old format (6 elements) and new format (7 elements with rotation)
        if len(rect) == 7:
            _, x, y, w, h, rid, is_rotated = rect
        else:
            _, x, y, w, h, rid = rect
            is_rotated = False

        # Ensure w and h are numeric (defensive check)
        try:
            if not isinstance(w, (int, float)):
                w = float(w)
            if not isinstance(h, (int, float)):
                h = float(h)
            # Ensure they're positive
            w = max(0.1, float(w))
            h = max(0.1, float(h))
        except (ValueError, TypeError, AttributeError):
            continue  # Skip this rectangle if dimensions are invalid

        item = files[rid]

        if item["type"] == "circle":
            radius = item["radius"]
            center_x = x + radius
            center_y = y + radius
            gcode.append(f"G0 X{center_x:.3f} Y{center_y:.3f} ; Move to circle center")
            gcode.append(f"G1 Z-{cut_height:.3f} F{plunge_rate} ; Plunge")
            gcode.append(f"G2 I{radius:.3f} ; Cut circle")
            gcode.append(f"G0 Z{safe_height:.3f} ; Lift cutter")
        else:
            # Cut outer rectangle
            gcode.append(f"G0 X{x:.3f} Y{y:.3f} ; Move to start")
            gcode.append(f"G1 Z-{cut_height:.3f} F{plunge_rate} ; Plunge")
            gcode.append(f"G1 X{x + w:.3f} Y{y:.3f} ; Line 1")
            gcode.append(f"G1 X{x + w:.3f} Y{y + h:.3f} ; Line 2")
            gcode.append(f"G1 X{x:.3f} Y{y + h:.3f} ; Line 3")
            gcode.append(f"G1 X{x:.3f} Y{y:.3f} ; Line 4")
            gcode.append(f"G0 Z{safe_height:.3f} ; Lift cutter")

            # Process grooves
            grooves = item.get("grooves", [])
            for groove in grooves:
                groove_dig = groove.get("groove_dig", 1)
                orientation = groove.get("orientation", "horizontal")
                groove_x = groove.get("x", 0)
                groove_y = groove.get("y", 0)

                if orientation == "horizontal":
                    start_x = x + groove_x if groove_x >= 0 else x
                    end_x = x + w + groove_x if groove_x < 0 else x + w
                    groove_y_pos = y + groove_y if groove_y >= 0 else y + h
                    gcode.append(
                        f"G0 X{start_x:.3f} Y{groove_y_pos:.3f} ; Move to groove start"
                    )
                    gcode.append(
                        f"G1 Z-{groove_dig:.3f} F{plunge_rate} ; Plunge for groove"
                    )
                    gcode.append(f"G1 X{end_x:.3f} Y{groove_y_pos:.3f} ; Cut groove")
                    gcode.append(f"G0 Z{safe_height:.3f} ; Lift cutter")
                else:  # vertical
                    start_y = y + groove_y if groove_y >= 0 else y
                    end_y = y + h + groove_y if groove_y < 0 else y + h
                    groove_x_pos = x + groove_x if groove_x >= 0 else x + w
                    gcode.append(
                        f"G0 X{groove_x_pos:.3f} Y{start_y:.3f} ; Move to groove start"
                    )
                    gcode.append(
                        f"G1 Z-{groove_dig:.3f} F{plunge_rate} ; Plunge for groove"
                    )
                    gcode.append(f"G1 X{groove_x_pos:.3f} Y{end_y:.3f} ; Cut groove")
                    gcode.append(f"G0 Z{safe_height:.3f} ; Lift cutter")

            # Process minifix holes
            minifix_holes = item.get("minifix_holes", [])
            if not minifix_holes:
                continue  # Skip if no holes

            # Process ALL drill holes (DOWEL, SCREW, BOLT_DRILL, CAM)
            drill_holes = []
            for hole_item in minifix_holes:
                hole_type = hole_item.get("type", "").upper()
                if hole_type in ["DOWEL", "SCREW", "BOLT_DRILL", "CAM"]:
                    drill_holes.append(hole_item)

            if not drill_holes:
                continue  # Skip if no drill holes

            # Get plank thickness from item data
            rect_width = float(w)
            rect_height = float(h)

            depth_value = item.get("depth", None)

            # Calculate fallback thickness (use preserved rectangle dimensions)
            try:
                fallback_thickness = min(rect_width, rect_height)
            except (ValueError, TypeError):
                fallback_thickness = 18.0  # Default thickness

            # Safely convert to float, handling dict, None, or invalid values
            plank_thickness = None
            try:
                if depth_value is None:
                    plank_thickness = fallback_thickness
                elif isinstance(depth_value, dict):
                    for key in ["value", "depth", "thickness", "z", "height"]:
                        if key in depth_value:
                            val = depth_value[key]
                            if isinstance(val, (int, float)):
                                plank_thickness = float(val)
                                break
                            if isinstance(val, str):
                                try:
                                    plank_thickness = float(val)
                                    break
                                except ValueError:
                                    continue
                    if plank_thickness is None:
                        plank_thickness = fallback_thickness
                elif isinstance(depth_value, (int, float, str)):
                    plank_thickness = float(depth_value)
                else:
                    plank_thickness = fallback_thickness
            except (ValueError, TypeError, AttributeError):
                plank_thickness = fallback_thickness

            # Ensure thickness is positive and valid
            try:
                if (
                    not isinstance(plank_thickness, (int, float))
                    or plank_thickness <= 0
                ):
                    plank_thickness = fallback_thickness
            except TypeError:
                plank_thickness = fallback_thickness

            drill_z_position = 0.0  # Center of thickness (Z=0)
            hole_center_z = 0.0  # Hole center is at middle of thickness (Z=0)

            for hole in drill_holes:
                hole_type = hole.get("type", "").upper()
                diameter = hole.get("diameter", 0)
                depth = hole.get("depth", 0)
                length = hole.get("length", 0)  # For dowels
                local_pos = hole.get("localPosition2D", {"x": 0, "y": 0})
                direction = hole.get("direction", {"x": 0, "y": 0, "z": 0})

                # --- 1. COORDINATE AUTO-CORRECTION (Fix for "Blue Screw" issue) ---
                local_x_raw = local_pos.get("x", 0)
                local_y_raw = local_pos.get("y", 0)
                dir_x_raw = direction.get("x", 0)
                dir_y_raw = direction.get("y", 0)

                # Determine ORIGINAL dimensions to check coordinate validity
                # If rotated on sheet, w is height, h is width on sheet
                if is_rotated:
                    orig_w = rect_height
                    orig_h = rect_width
                else:
                    orig_w = rect_width
                    orig_h = rect_height

                # Check if coordinates are defined for the wrong orientation
                # (e.g. defined for horizontal X-axis but plank is vertical)
                # We use a safety margin to avoid false positives on square-ish planks
                # Logic: If coordinate exceeds dimension/2 but fits within the OTHER dimension, swap.
                
                half_orig_w = orig_w / 2.0
                half_orig_h = orig_h / 2.0
                safety_margin = 1.0 # 1mm tolerance

                # Check X vs Original Width
                x_out_of_bounds = abs(local_x_raw) > (half_orig_w + safety_margin)
                x_fits_in_height = abs(local_x_raw) <= (half_orig_h + safety_margin)
                
                # Check Y vs Original Height
                y_out_of_bounds = abs(local_y_raw) > (half_orig_h + safety_margin)
                y_fits_in_width = abs(local_y_raw) <= (half_orig_w + safety_margin)

                if (x_out_of_bounds and x_fits_in_height) or (y_out_of_bounds and y_fits_in_width):
                    # Swap Position Coordinates
                    local_x_raw, local_y_raw = local_y_raw, local_x_raw
                    # Swap Direction Vector
                    dir_x_raw, dir_y_raw = dir_y_raw, dir_x_raw
                    # logging.info(f"Auto-corrected coordinates for hole {hole_type} on part {rid}")

                # --- Calculation of Absolute Position ---
                plank_center_x = x + (rect_width / 2)
                plank_center_y = y + (rect_height / 2)

                if is_rotated:
                    local_x_on_sheet = local_y_raw
                    local_y_on_sheet = local_x_raw
                    # Direction also rotates
                    dir_x = dir_y_raw
                    dir_y = dir_x_raw
                else:
                    local_x_on_sheet = local_x_raw
                    local_y_on_sheet = local_y_raw
                    dir_x = dir_x_raw
                    dir_y = dir_y_raw

                hole_x_center = plank_center_x + local_x_on_sheet
                hole_y_center = plank_center_y + local_y_on_sheet
                radius = diameter / 2

                # --- 2. FACE DRILLING (CAM HOLES) ---
                if hole_type == "CAM":
                    # CAM holes are drilled on the face (Top surface)
                    # Drill Depth
                    actual_depth = depth if depth > 0 else 12.0
                    
                    gcode.append(
                        f"G0 X{hole_x_center:.3f} Y{hole_y_center:.3f} ; Move to CAM hole center"
                    )
                    # Plunge
                    gcode.append(
                        f"G1 Z-{actual_depth:.3f} F{plunge_rate} ; Drill CAM hole"
                    )
                    
                    # If hole is large (like 15mm CAM), we might need to mill it as a pocket
                    # Assuming the cutter is smaller than the hole. 
                    # If cutter == hole diameter (e.g. 15mm bit), plunge is enough.
                    # As a safe default for CAMs (usually 15mm), we do a circle cut (assuming standard endmill e.g. 6mm or 3mm)
                    # If the cutter > diameter, this would be bad, but usually cutter <= 8mm.
                    
                    # We simply cut a circle contour at the bottom. 
                    # Note: Ideally we should pocket, but contour is standard fallback.
                    gcode.append(f"G2 I{radius:.3f} ; Cut CAM circle")
                    
                    gcode.append(f"G0 Z{safe_height:.3f} ; Retract")
                    continue # Done with CAM, skip edge logic

                # --- 3. EDGE DRILLING (DOWEL, SCREW, BOLT_DRILL) ---
                # Determine hole depth
                if hole_type == "DOWEL":
                    actual_depth = length if length > 0 else 24
                elif hole_type == "SCREW":
                    actual_depth = length if length > 0 else 25
                elif hole_type == "BOLT_DRILL":
                    actual_depth = depth if depth > 0 else 12.5
                else:
                    actual_depth = depth if depth > 0 else 12

                # Edge drilling logic (Using computed dir_x, dir_y)
                abs_dir_x = abs(dir_x)
                abs_dir_y = abs(dir_y)

                if (abs_dir_x >= abs_dir_y and abs_dir_x > 0.1): 
                    # Hole on left or right edge
                    hole_y = hole_y_center
                    hole_y = max(y, min(y + rect_height, hole_y))

                    if dir_x < 0: # Left edge
                        edge_x = x
                        drill_start_x = edge_x
                        drill_end_x = edge_x + actual_depth
                        gcode.append(f"G0 X{drill_start_x:.3f} Y{hole_y:.3f} Z{drill_z_position:.3f} ; Move to left edge at {hole_type}")
                        gcode.append(f"G1 X{drill_end_x:.3f} F{plunge_rate}")
                        gcode.append("G19") # YZ plane
                        gcode.append(f"G0 Y{hole_y - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 Y{hole_y + radius:.3f} Z{hole_center_z:.3f} J{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 Y{hole_y - radius:.3f} Z{hole_center_z:.3f} J-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    else: # Right edge
                        edge_x = x + rect_width
                        drill_start_x = edge_x
                        drill_end_x = edge_x - actual_depth
                        gcode.append(f"G0 X{drill_start_x:.3f} Y{hole_y:.3f} Z{drill_z_position:.3f} ; Move to right edge at {hole_type}")
                        gcode.append(f"G1 X{drill_end_x:.3f} F{plunge_rate}")
                        gcode.append("G19")
                        gcode.append(f"G0 Y{hole_y - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 Y{hole_y + radius:.3f} Z{hole_center_z:.3f} J{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 Y{hole_y - radius:.3f} Z{hole_center_z:.3f} J-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    gcode.append(f"G0 Z{safe_height:.3f}")

                elif (abs_dir_y > abs_dir_x and abs_dir_y > 0.1):
                    # Hole on top or bottom edge
                    hole_x = hole_x_center
                    hole_x = max(x, min(x + rect_width, hole_x))

                    if dir_y < 0: # Bottom edge
                        edge_y = y
                        drill_start_y = edge_y
                        drill_end_y = edge_y + actual_depth
                        gcode.append(f"G0 X{hole_x:.3f} Y{drill_start_y:.3f} Z{drill_z_position:.3f} ; Move to bottom edge at {hole_type}")
                        gcode.append(f"G1 Y{drill_end_y:.3f} F{plunge_rate}")
                        gcode.append("G18") # XZ plane
                        gcode.append(f"G0 X{hole_x - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 X{hole_x + radius:.3f} Z{hole_center_z:.3f} I{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 X{hole_x - radius:.3f} Z{hole_center_z:.3f} I-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    else: # Top edge
                        edge_y = y + rect_height
                        drill_start_y = edge_y
                        drill_end_y = edge_y - actual_depth
                        gcode.append(f"G0 X{hole_x:.3f} Y{drill_start_y:.3f} Z{drill_z_position:.3f} ; Move to top edge at {hole_type}")
                        gcode.append(f"G1 Y{drill_end_y:.3f} F{plunge_rate}")
                        gcode.append("G18") # XZ plane
                        gcode.append(f"G0 X{hole_x - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 X{hole_x + radius:.3f} Z{hole_center_z:.3f} I{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 X{hole_x - radius:.3f} Z{hole_center_z:.3f} I-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    gcode.append(f"G0 Z{safe_height:.3f}")

                else:
                    # Fallback
                    dist_to_left = abs(hole_x_center - x)
                    dist_to_right = abs(hole_x_center - (x + rect_width))
                    dist_to_bottom = abs(hole_y_center - y)
                    dist_to_top = abs(hole_y_center - (y + rect_height))

                    min_dist = min(dist_to_left, dist_to_right, dist_to_bottom, dist_to_top)

                    if min_dist == dist_to_left:
                        edge_x = x
                        drill_start_x = edge_x
                        drill_end_x = edge_x + actual_depth
                        hole_y = hole_y_center
                        hole_y = max(y, min(y + rect_height, hole_y))
                        gcode.append(f"G0 X{drill_start_x:.3f} Y{hole_y:.3f} Z{drill_z_position:.3f} ; Move to left edge at {hole_type} (auto)")
                        gcode.append(f"G1 X{drill_end_x:.3f} F{plunge_rate}")
                        gcode.append("G19")
                        gcode.append(f"G0 Y{hole_y - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 Y{hole_y + radius:.3f} Z{hole_center_z:.3f} J{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 Y{hole_y - radius:.3f} Z{hole_center_z:.3f} J-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    elif min_dist == dist_to_right:
                        edge_x = x + rect_width
                        drill_start_x = edge_x
                        drill_end_x = edge_x - actual_depth
                        hole_y = hole_y_center
                        hole_y = max(y, min(y + rect_height, hole_y))
                        gcode.append(f"G0 X{drill_start_x:.3f} Y{hole_y:.3f} Z{drill_z_position:.3f} ; Move to right edge at {hole_type} (auto)")
                        gcode.append(f"G1 X{drill_end_x:.3f} F{plunge_rate}")
                        gcode.append("G19")
                        gcode.append(f"G0 Y{hole_y - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 Y{hole_y + radius:.3f} Z{hole_center_z:.3f} J{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 Y{hole_y - radius:.3f} Z{hole_center_z:.3f} J-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    elif min_dist == dist_to_bottom:
                        edge_y = y
                        drill_start_y = edge_y
                        drill_end_y = edge_y + actual_depth
                        hole_x = hole_x_center
                        hole_x = max(x, min(x + rect_width, hole_x))
                        gcode.append(f"G0 X{hole_x:.3f} Y{drill_start_y:.3f} Z{drill_z_position:.3f} ; Move to bottom edge at {hole_type} (auto)")
                        gcode.append(f"G1 Y{drill_end_y:.3f} F{plunge_rate}")
                        gcode.append("G18")
                        gcode.append(f"G0 X{hole_x - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 X{hole_x + radius:.3f} Z{hole_center_z:.3f} I{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 X{hole_x - radius:.3f} Z{hole_center_z:.3f} I-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    else: # top
                        edge_y = y + rect_height
                        drill_start_y = edge_y
                        drill_end_y = edge_y - actual_depth
                        hole_x = hole_x_center
                        hole_x = max(x, min(x + rect_width, hole_x))
                        gcode.append(f"G0 X{hole_x:.3f} Y{drill_start_y:.3f} Z{drill_z_position:.3f} ; Move to top edge at {hole_type} (auto)")
                        gcode.append(f"G1 Y{drill_end_y:.3f} F{plunge_rate}")
                        gcode.append("G18")
                        gcode.append(f"G0 X{hole_x - radius:.3f} Z{hole_center_z:.3f}")
                        gcode.append(f"G2 X{hole_x + radius:.3f} Z{hole_center_z:.3f} I{radius:.3f} K0 F{feed_rate}")
                        gcode.append(f"G2 X{hole_x - radius:.3f} Z{hole_center_z:.3f} I-{radius:.3f} K0 F{feed_rate}")
                        gcode.append("G17")
                    gcode.append(f"G0 Z{safe_height:.3f}")

    gcode += [
        f"G0 Z{safe_height:.3f} ; Move to safe height",
        "M9 ; Turn off coolant",
        "M5 ; Stop spindle",
        "G28 ; Home all axes",
        "M30 ; End program",
    ]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(gcode))


def calculate_efficiency(rectangles: List[Tuple], width: int, height: int) -> float:
    used_area = sum(rect[3] * rect[4] for rect in rectangles)
    return (used_area / (width * height)) * 100


def convert_svgs_to_pdf(svg_files: List[str], pdf_output: str) -> None:
    if not svg_files:
        return

    canvas_pdf = canvas.Canvas(pdf_output)
    for svg_file in svg_files:
        if not os.path.exists(svg_file):
            continue

        drawing = svg2rlg(svg_file)
        if drawing:
            width, height = drawing.width, drawing.height
            canvas_pdf.setPageSize((width, height))
            renderPDF.draw(drawing, canvas_pdf, 0, 0)
            canvas_pdf.showPage()

    canvas_pdf.save()


def generate_dwg_file(
    rectangles: List[Tuple],
    files: Dict,
    output_file: str,
    sheet_dims: Tuple,
) -> None:
    """
    Generate DWG file for nesting layout.
    """
    if not EZDXF_AVAILABLE:
        return  # Skip if ezdxf not available

    try:
        doc = ezdxf.new("R2010")
        msp = doc.modelspace()

        bin_width, bin_height = sheet_dims

        # Draw sheet boundary
        msp.add_lwpolyline(
            [
                (0, 0),
                (bin_width, 0),
                (bin_width, bin_height),
                (0, bin_height),
                (0, 0),
            ],
            close=True,
        )

        # Draw rectangles
        for rect in rectangles:
            # Handle both formats
            if len(rect) == 7:
                _, x, y, w, h, rid, is_rotated = rect
            else:
                _, x, y, w, h, rid = rect
                is_rotated = False

            item = files[rid]

            # Draw rectangle
            msp.add_lwpolyline(
                [
                    (x, y),
                    (x + w, y),
                    (x + w, y + h),
                    (x, y + h),
                    (x, y),
                ],
                close=True,
            )

            # Draw minifix holes (exclude CAM)
            minifix_holes = item.get("minifix_holes", [])
            drill_holes = [h for h in minifix_holes if h.get("type") != "CAM"]

            for hole in drill_holes:
                diameter = hole.get("diameter", 0)
                local_pos = hole.get("localPosition2D", {"x": 0, "y": 0})

                # localPosition2D is relative to plank CENTER
                plank_center_x = x + (w / 2)
                plank_center_y = y + (h / 2)

                # Account for rotation
                if is_rotated:
                    local_x = local_pos.get("y", 0)
                    local_y = local_pos.get("x", 0)
                else:
                    local_x = local_pos.get("x", 0)
                    local_y = local_pos.get("y", 0)

                hole_x = plank_center_x + local_x
                hole_y = plank_center_y + local_y
                radius = diameter / 2

                # Draw as small circle on edge (for DWG, we show position)
                msp.add_circle((hole_x, hole_y), radius)

        doc.saveas(output_file)
    except (IOError, OSError, ValueError, AttributeError) as e:
        logging.warning("Failed to generate DWG file: %s", e)


def generate_xml_file(
    rectangles: List[Tuple],
    files: Dict,
    output_file: str,
    sheet_dims: Tuple,
    sheet_number: int,
) -> None:
    """
    Generate XML file for nesting data.
    """
    root = ElementTree.Element("nesting")
    root.set("sheet_number", str(sheet_number))

    sheet_elem = ElementTree.SubElement(root, "sheet")
    sheet_elem.set("width", str(sheet_dims[0]))
    sheet_elem.set("height", str(sheet_dims[1]))

    parts_elem = ElementTree.SubElement(root, "parts")

    for i, rect in enumerate(rectangles):
        # Handle both formats
        if len(rect) == 7:
            _, x, y, w, h, rid, _ = rect
        else:
            _, x, y, w, h, rid = rect

        item = files[rid]

        part_elem = ElementTree.SubElement(parts_elem, "part")
        part_elem.set("id", str(i + 1))
        part_elem.set("name", item.get("name", ""))
        part_elem.set("type", item.get("type", "rectangle"))

        position_elem = ElementTree.SubElement(part_elem, "position")
        position_elem.set("x", str(x))
        position_elem.set("y", str(y))

        dimensions_elem = ElementTree.SubElement(part_elem, "dimensions")
        dimensions_elem.set("width", str(w))
        dimensions_elem.set("height", str(h))
        dimensions_elem.set("depth", str(item.get("depth", 0)))

        # Add grooves
        grooves = item.get("grooves", [])
        if grooves:
            grooves_elem = ElementTree.SubElement(part_elem, "grooves")
            for groove in grooves:
                groove_elem = ElementTree.SubElement(grooves_elem, "groove")
                groove_elem.set("type", str(groove.get("type", "")))
                groove_elem.set("orientation", str(groove.get("orientation", "")))
                groove_elem.set("x", str(groove.get("x", 0)))
                groove_elem.set("y", str(groove.get("y", 0)))

        # Add minifix holes
        minifix_holes = item.get("minifix_holes", [])
        if minifix_holes:
            holes_elem = ElementTree.SubElement(part_elem, "minifix_holes")
            for hole in minifix_holes:
                hole_elem = ElementTree.SubElement(holes_elem, "hole")
                hole_elem.set("type", str(hole.get("type", "")))
                hole_elem.set("diameter", str(hole.get("diameter", 0)))
                hole_elem.set("depth", str(hole.get("depth", 0)))
                local_pos = hole.get("localPosition2D", {})
                hole_elem.set("local_x", str(local_pos.get("x", 0)))
                hole_elem.set("local_y", str(local_pos.get("y", 0)))

    tree = ElementTree.ElementTree(root)
    # Indent is available in Python 3.9+, use contextlib.suppress for compatibility
    with contextlib.suppress(AttributeError):
        ElementTree.indent(tree, space="  ")  # Python < 3.9 doesn't have indent
    tree.write(output_file, encoding="utf-8", xml_declaration=True)


def try_packing(
    width: int,
    height: int,
    rotation_allowed: bool,
    remaining_files: Dict,
    sort_algorithms: List,
) -> Tuple[List[Tuple], float, Dict]:
    packer = newPacker(
        sort_algo=secrets.choice(sort_algorithms), rotation=rotation_allowed
    )

    for rid, details in remaining_files.items():
        try:
            if details["type"] == "circle":
                diameter = 2 * details["radius"]
                packer.add_rect(diameter, diameter, rid=rid)
            else:
                original_w = details["width"]
                original_h = details["height"]
                packer.add_rect(original_w, original_h, rid=rid)
        except KeyError:
            continue

    packer.add_bin(width, height)
    packer.pack()

    rectangles = packer.rect_list()
    # rectpack returns: (bin, x, y, w, h, rid)
    # Check if rotation occurred by comparing w,h with original
    processed_rectangles = []
    for rect in rectangles:
        bin_id, x, y, w, h, rid = rect
        original_item = remaining_files.get(rid, {})
        original_w = original_item.get("width", w)
        original_h = original_item.get("height", h)

        # Determine if rotated (dimensions swapped)
        is_rotated = abs(w - original_h) < 0.1 and abs(h - original_w) < 0.1

        # Store rotation info in extended tuple: (bin, x, y, w, h, rid, rotated)
        processed_rectangles.append((bin_id, x, y, w, h, rid, is_rotated))

    packed_ids = {rect[5] for rect in processed_rectangles}
    unplaced = {
        file_id: file_data
        for file_id, file_data in remaining_files.items()
        if file_id not in packed_ids
    }
    efficiency = calculate_efficiency(processed_rectangles, width, height)

    return processed_rectangles, efficiency, unplaced


def draw_sheet_to_svg(
    file_path: str,
    rectangles: List[Tuple],
    files: Dict,
    sheet_dims: Tuple,
    enclosing_rectangle: Tuple,
    best_efficiency: float = None,
    scale: float = 1.0,
) -> None:

    page_width = 210  # A4 width in mm
    page_height = 297  # A4 height in mm

    # === Custom Margins ===
    margin_left = 2
    margin_right = 2
    margin_top = 3
    margin_bottom = 3

    usable_height = page_height - margin_top - margin_bottom

    # Input sheet dimensions
    bin_width, bin_height = sheet_dims
    nesting_height_mm = bin_height

    # Estimate table height
    table_rows = len(rectangles) + 4
    row_height = 6
    table_height_mm = table_rows * row_height

    total_content_height_mm = max(nesting_height_mm, table_height_mm)
    max_height_available = usable_height
    scale = max_height_available / total_content_height_mm

    nesting_width = bin_width * scale
    nesting_height = bin_height * scale

    # Create SVG
    dwg = Drawing(
        file_path,
        profile="tiny",
        size=(f"{page_width}mm", f"{page_height}mm"),
        viewBox=f"0 0 {page_width} {page_height + 20}",
    )
    # === Grid lines/ Plank Arrangement ===
    for x in range(0, int(bin_width)):
        dx = x * scale + margin_left
        dwg.add(
            dwg.line(
                start=(dx, margin_top),
                end=(dx, nesting_height + margin_top),
                stroke="#eee",
                stroke_width=0.2,
            )
        )
    for y in range(0, int(bin_height)):
        dy = y * scale + margin_top
        dwg.add(
            dwg.line(
                start=(margin_left, dy),
                end=(nesting_width + margin_left, dy),
                stroke="#eee",
                stroke_width=0.2,
            )
        )

    # === Enclosing Rectangle ===
    if enclosing_rectangle:
        dwg.add(
            Rect(
                insert=(margin_left, margin_top),
                size=(nesting_width, nesting_height),
                fill="none",
                stroke="black",
                stroke_width=0.5,
            )
        )

    # === Draw Parts ===
    total_area = 0
    for i, rect in enumerate(rectangles):
        # Handle both old format (6 elements) and new format (7 elements with rotation)
        if len(rect) == 7:
            _, x, y, w, h, rid, is_rotated = rect
        else:
            _, x, y, w, h, rid = rect
            is_rotated = False

        item = files[rid]

        grooves = item.get("grooves", [])
        minifix_holes = item.get("minifix_holes", [])
        # Process ALL drill holes (DOWEL, SCREW, BOLT_DRILL), exclude CAM
        drill_holes = (
            [
                h
                for h in minifix_holes
                if h.get("type") in ["DOWEL", "SCREW", "BOLT_DRILL"]
            ]
            if minifix_holes
            else []
        )

        color = "lightblue" if item["type"] == "rectangle" else "lightgrey"
        x_scaled = x * scale + margin_left
        y_scaled = y * scale + margin_top
        w_scaled = w * scale
        h_scaled = h * scale
        total_area += w * h

        if item["type"] == "circle":
            radius = item["radius"] * scale
            dwg.add(
                dwg.circle(
                    center=(x_scaled + radius, y_scaled + radius),
                    r=radius,
                    fill=color,
                    stroke="black",
                    stroke_width=0.3,
                )
            )
        else:
            dwg.add(
                dwg.rect(
                    insert=(x_scaled, y_scaled),
                    size=(w_scaled, h_scaled),
                    fill=color,
                    stroke="black",
                    stroke_width=0.3,
                )
            )

        dwg.add(
            Text(
                str(i + 1),
                insert=(x_scaled + w_scaled / 2, y_scaled + h_scaled / 2),
                font_size="1.8px",
                fill="black",
                text_anchor="middle",
            )
        )

        # === Draw grooves ===
        for groove in grooves:
            gap = groove.get("groove_gap", 0) * scale
            dig = groove.get("groove_dig", 0) * scale
            orientation = groove["orientation"]
            groove_type = groove["type"]

            # Determine if plank is horizontal
            is_square = w_scaled == h_scaled
            is_horizontal_plank = w_scaled > h_scaled

            actual_orientation = orientation
            if not is_square:
                if orientation == "vertical" and is_horizontal_plank:
                    actual_orientation = "horizontal"
                elif orientation == "horizontal" and not is_horizontal_plank:
                    actual_orientation = "vertical"

            # === Horizontal Groove Drawing ===
            if actual_orientation == "horizontal":
                length = w_scaled
                x1 = x_scaled
                x2 = x_scaled + length

                # Groove edge logic: top or bottom based on y
                if groove.get("y", 0) < 0:
                    y_outer = y_scaled
                    y_inner = y_outer + dig
                else:
                    y_outer = y_scaled + h_scaled
                    y_inner = y_outer - dig

                # Two red lines for gap
                y_center = y_inner
                y_line1 = y_center - gap / 2
                y_line2 = y_center + gap / 2

                if groove_type == "groove":
                    # Red edge lines
                    dwg.add(
                        dwg.line(
                            (x1, y_line1), (x2, y_line1), stroke="red", stroke_width=0.2
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (x1, y_line2), (x2, y_line2), stroke="red", stroke_width=0.2
                        )
                    )

                elif groove_type == "fitment":
                    dwg.add(
                        dwg.line(
                            (x1, (y_line1 + y_line2) / 2),
                            (x2, (y_line1 + y_line2) / 2),
                            stroke="black",
                            stroke_width=0.3,
                            stroke_dasharray="1,1",
                        )
                    )

            # === Vertical Groove Drawing ===
            elif actual_orientation == "vertical":
                length = h_scaled
                y1 = y_scaled
                y2 = y_scaled + length

                # Groove edge logic: left or right based on x
                if groove.get("x", 0) < 0:
                    x_outer = x_scaled
                    x_inner = x_outer + dig
                else:
                    x_outer = x_scaled + w_scaled
                    x_inner = x_outer - dig

                # Two red lines for gap
                x_center = x_inner
                x_line1 = x_center - gap / 5
                x_line2 = x_center + gap / 2

                if groove_type == "groove":
                    # Red edge lines
                    dwg.add(
                        dwg.line(
                            (x_line1, y1), (x_line1, y2), stroke="red", stroke_width=0.2
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (x_line2, y1), (x_line2, y2), stroke="red", stroke_width=0.2
                        )
                    )

                elif groove_type == "fitment":
                    dwg.add(
                        dwg.line(
                            ((x_line1 + x_line2) / 2, y1),
                            ((x_line1 + x_line2) / 2, y2),
                            stroke="black",
                            stroke_width=0.3,
                            stroke_dasharray="1,1",
                        )
                    )
        # === Draw minifix holes as "L L" shapes on edges ===
        # Only show drill holes (DOWEL, SCREW, BOLT_DRILL), exclude CAM

        for hole in drill_holes:
            local_pos = hole.get("localPosition2D", {"x": 0, "y": 0})
            direction = hole.get("direction", {"x": 0, "y": 0, "z": 0})

            # localPosition2D is relative to plank CENTER
            plank_center_x_scaled = x_scaled + (w_scaled / 2)
            plank_center_y_scaled = y_scaled + (h_scaled / 2)

            # Get local position (relative to center)
            local_x_raw = local_pos.get("x", 0)
            local_y_raw = local_pos.get("y", 0)

            # Account for plank rotation on sheet (same logic as G-code)
            if is_rotated:
                local_x_on_sheet = local_y_raw
                local_y_on_sheet = local_x_raw
            else:
                local_x_on_sheet = local_x_raw
                local_y_on_sheet = local_y_raw

            # Calculate absolute hole position on sheet (scaled) - relative to center
            hole_x_center_scaled = plank_center_x_scaled + (local_x_on_sheet * scale)
            hole_y_center_scaled = plank_center_y_scaled + (local_y_on_sheet * scale)

            # Determine which edge the hole is on based on direction
            dir_x_raw = direction.get("x", 0)
            dir_y_raw = direction.get("y", 0)

            # Account for rotation when determining edge (same logic as G-code)
            if is_rotated:
                dir_x = dir_y_raw
                dir_y = dir_x_raw
            else:
                dir_x = dir_x_raw
                dir_y = dir_y_raw

            abs_dir_x = abs(dir_x)
            abs_dir_y = abs(dir_y)

            # Determine edge position and draw "L" shape
            l_size = 2 * scale  # Size of L shape
            hole_color = (
                "blue"
                if hole.get("type") == "SCREW"
                else "orange" if hole.get("type") == "DOWEL" else "red"
            )

            if (
                abs_dir_x >= abs_dir_y and abs_dir_x > 0.1
            ):  # Left or right edge (X direction dominant or equal)
                # Position hole Y coordinate on the edge (use Y position from localPosition2D)
                edge_y = hole_y_center_scaled
                # Clamp Y to be within plank bounds
                edge_y = max(y_scaled, min(y_scaled + h_scaled, edge_y))

                if dir_x < 0:  # Left edge
                    edge_x = x_scaled
                else:  # Right edge
                    edge_x = x_scaled + w_scaled
                # Draw "L" shape on left/right edge
                dwg.add(
                    dwg.line(
                        (edge_x, edge_y - l_size),
                        (edge_x, edge_y + l_size),
                        stroke=hole_color,
                        stroke_width=1.0,
                    )
                )
                dwg.add(
                    dwg.line(
                        (edge_x, edge_y),
                        (edge_x - l_size if dir_x < 0 else edge_x + l_size, edge_y),
                        stroke=hole_color,
                        stroke_width=1.0,
                    )
                )
            elif (
                abs_dir_y > abs_dir_x and abs_dir_y > 0.1
            ):  # Top or bottom edge (Y direction dominant)
                # Position hole X coordinate on the edge (use X position from localPosition2D)
                edge_x = hole_x_center_scaled
                # Clamp X to be within plank bounds
                edge_x = max(x_scaled, min(x_scaled + w_scaled, edge_x))

                if dir_y < 0:  # Bottom edge
                    edge_y = y_scaled
                else:  # Top edge
                    edge_y = y_scaled + h_scaled
                # Draw "L" shape on top/bottom edge
                dwg.add(
                    dwg.line(
                        (edge_x - l_size, edge_y),
                        (edge_x + l_size, edge_y),
                        stroke=hole_color,
                        stroke_width=1.0,
                    )
                )
                dwg.add(
                    dwg.line(
                        (edge_x, edge_y),
                        (edge_x, edge_y - l_size if dir_y < 0 else edge_y + l_size),
                        stroke=hole_color,
                        stroke_width=1.0,
                    )
                )
            else:
                # Fallback: auto-detect closest edge if direction unclear
                dist_to_left = abs(hole_x_center_scaled - x_scaled)
                dist_to_right = abs(hole_x_center_scaled - (x_scaled + w_scaled))
                dist_to_bottom = abs(hole_y_center_scaled - y_scaled)
                dist_to_top = abs(hole_y_center_scaled - (y_scaled + h_scaled))

                min_dist = min(dist_to_left, dist_to_right, dist_to_bottom, dist_to_top)

                if min_dist == dist_to_left:
                    edge_x = x_scaled
                    edge_y = hole_y_center_scaled
                    edge_y = max(y_scaled, min(y_scaled + h_scaled, edge_y))
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y - l_size),
                            (edge_x, edge_y + l_size),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y),
                            (edge_x - l_size, edge_y),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                elif min_dist == dist_to_right:
                    edge_x = x_scaled + w_scaled
                    edge_y = hole_y_center_scaled
                    edge_y = max(y_scaled, min(y_scaled + h_scaled, edge_y))
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y - l_size),
                            (edge_x, edge_y + l_size),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y),
                            (edge_x + l_size, edge_y),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                elif min_dist == dist_to_bottom:
                    edge_x = hole_x_center_scaled
                    edge_x = max(x_scaled, min(x_scaled + w_scaled, edge_x))
                    edge_y = y_scaled
                    dwg.add(
                        dwg.line(
                            (edge_x - l_size, edge_y),
                            (edge_x + l_size, edge_y),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y),
                            (edge_x, edge_y - l_size),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                else:  # Top edge
                    edge_x = hole_x_center_scaled
                    edge_x = max(x_scaled, min(x_scaled + w_scaled, edge_x))
                    edge_y = y_scaled + h_scaled
                    dwg.add(
                        dwg.line(
                            (edge_x - l_size, edge_y),
                            (edge_x + l_size, edge_y),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )
                    dwg.add(
                        dwg.line(
                            (edge_x, edge_y),
                            (edge_x, edge_y + l_size),
                            stroke=hole_color,
                            stroke_width=1.0,
                        )
                    )

    # === Table (Right Column) ===
    table_x = 151 - margin_right
    table_y = margin_top + 10
    row_height = 5
    col_widths = [8, 24, 24]

    dwg.add(
        Text(
            "Best Attempt Results",
            insert=(table_x, table_y - 5),
            font_size="4px",
            font_weight="bold",
        )
    )

    headers = ["ID", "Width (mm)", "Height (mm)"]
    for i, header in enumerate(headers):
        x = table_x + sum(col_widths[:i])
        dwg.add(
            Rect(
                insert=(x, table_y),
                size=(col_widths[i], row_height),
                fill="white",
                stroke="black",
                stroke_width=0.3,
            )
        )
        dwg.add(
            Text(
                header,
                insert=(x + col_widths[i] / 2, table_y + 4),
                font_size="3px",
                text_anchor="middle",
            )
        )

    for i, rect in enumerate(rectangles):
        # Handle both formats
        if len(rect) == 7:
            _, _, _, w, h, _, _ = rect
        else:
            _, _, _, w, h, _ = rect
        y = table_y + (i + 1) * row_height
        row_data = [str(i + 1), f"{w:.2f}", f"{h:.2f}"]
        for j, val in enumerate(row_data):
            x = table_x + sum(col_widths[:j])
            dwg.add(
                Rect(
                    insert=(x, y),
                    size=(col_widths[j], row_height),
                    fill="white",
                    stroke="black",
                    stroke_width=0.3,
                )
            )
            dwg.add(
                Text(
                    val,
                    insert=(x + col_widths[j] / 2, y + 4),
                    font_size="3px",
                    text_anchor="middle",
                )
            )

    # === Summary ===
    summary_y = table_y + (len(rectangles) + 2) * row_height
    if best_efficiency is not None:
        dwg.add(
            Text(
                f"Best Efficiency: {best_efficiency:.2f}%",
                insert=(table_x, summary_y),
                font_size="5px",
                font_weight="bold",
            )
        )
    dwg.add(
        Text(
            f"Total Parts: {len(rectangles)}",
            insert=(table_x, summary_y + 5),
            font_size="3px",
        )
    )
    dwg.add(
        Text(
            f"Main Sheet Dimensions: {bin_width}mm × {bin_height}mm",
            insert=(table_x, summary_y + 10),
            font_size="3px",
        )
    )

    dwg.save()


def cleanup_output_folder(output_folder: str) -> None:
    """
    Delete all existing files in the output folder before creating new ones.
    """
    if os.path.exists(output_folder):
        try:
            # Remove all files in the folder
            for filename in os.listdir(output_folder):
                file_path = os.path.join(output_folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except (OSError, PermissionError) as e:
                    logging.warning("Failed to delete %s. Reason: %s", file_path, e)
        except (OSError, PermissionError) as e:
            logging.error("Error cleaning up output folder %s: %s", output_folder, e)


def nest(
    output: str,
    files: Dict,
    wbin: int,
    hbin: int,
    enclosing_rectangle: bool = False,
    target_efficiency: float = 95.0,
    allow_rotation: bool = True,
    design_setting: DesignSetting = None,
) -> JsonResponse:
    print(files)
    # Get output folder and clean up existing files
    output_folder = os.path.dirname(output)
    if output_folder:
        cleanup_output_folder(output_folder)

    sort_algorithms = [SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE]
    remaining_files = dict(files)
    sheet_number = 1
    svg_files = []
    gcode_files = []
    sheet_mapping = []
    sheet_efficiencies = []  # Track efficiency per sheet

    while remaining_files:
        best_eff, best_rectangles, unplaced = 0.0, None, {}
        attempts = 0

        while attempts < 6:
            rectangles, eff, unplaced_try = try_packing(
                wbin, hbin, allow_rotation, remaining_files, sort_algorithms
            )
            if eff > best_eff:
                best_eff, best_rectangles, unplaced = eff, rectangles, unplaced_try
            if best_eff >= target_efficiency:
                break
            attempts += 1

        if best_rectangles is None:
            logging.warning(
                "No suitable nesting found for remaining files on sheet %s. Stopping nesting.",
                sheet_number,
            )
            break

        # Extract rid from rectangles (handle both formats)
        rids = []
        for rect in best_rectangles:
            if len(rect) == 7:
                rids.append(rect[5])
            else:
                rids.append(rect[5])
        sheet_mapping.append({f"sheet{sheet_number}": rids})
        sheet_efficiencies.append(best_eff)  # Store efficiency for this sheet

        svg_name = f"{os.path.splitext(output)[0]}_sheet_{sheet_number}.svg"
        draw_sheet_to_svg(
            svg_name,
            best_rectangles,
            files,
            (wbin, hbin),
            enclosing_rectangle,
            best_efficiency=best_eff,
        )

        # Generate G-code
        gcode_path = f"{os.path.splitext(svg_name)[0]}.gcode"
        generate_gcode(best_rectangles, gcode_path, files)
        gcode_files.append(gcode_path)

        # Generate DWG file
        dwg_path = f"{os.path.splitext(svg_name)[0]}.dwg"
        generate_dwg_file(best_rectangles, files, dwg_path, (wbin, hbin))

        # Generate XML file
        xml_path = f"{os.path.splitext(svg_name)[0]}.xml"
        generate_xml_file(best_rectangles, files, xml_path, (wbin, hbin), sheet_number)

        svg_files.append(svg_name)
        remaining_files = unplaced
        sheet_number += 1

    pdf_output = f"{os.path.splitext(output)[0]}.pdf"
    convert_svgs_to_pdf(svg_files, pdf_output)

    # Create ZIP of GCODE files
    zip_output = f"{os.path.splitext(output)[0]}_gcodes.zip"
    with zipfile.ZipFile(zip_output, "w") as zipf:
        for gcode_file in gcode_files:
            zipf.write(gcode_file, arcname=os.path.basename(gcode_file))

    # Store sheets and files in database
    design = design_setting.design if design_setting else None
    if design_setting and design:
        with transaction.atomic():
            # Save sheet_data to design_setting
            design_setting.sheet_data = sheet_mapping
            design_setting.save(update_fields=["sheet_data"])

            # Delete existing sheets and files for this design to avoid duplicates
            NestingSheet.objects.filter(design=design).delete()

            # Create sheets and files in database
            for idx, sheet_info in enumerate(sheet_mapping):
                sheet_key = list(sheet_info.keys())[0]  # e.g., "sheet1"
                sheet_num = idx + 1
                rids = sheet_info[sheet_key]

                # Get efficiency for this sheet
                efficiency = (
                    sheet_efficiencies[idx] if idx < len(sheet_efficiencies) else None
                )

                # Create NestingSheet
                nesting_sheet = NestingSheet.objects.create(
                    design=design,
                    design_setting=design_setting,
                    sheet_number=sheet_num,
                    width=wbin,
                    height=hbin,
                    efficiency=efficiency,
                    file_ids=rids,
                )

                # Create file records for this sheet
                svg_file = svg_files[idx] if idx < len(svg_files) else None
                gcode_file = gcode_files[idx] if idx < len(gcode_files) else None
                dwg_file = f"{os.path.splitext(svg_file)[0]}.dwg" if svg_file else None
                xml_file = f"{os.path.splitext(svg_file)[0]}.xml" if svg_file else None

                # SVG file
                if svg_file and os.path.exists(svg_file):
                    NestingFile.objects.create(
                        design=design,
                        sheet=nesting_sheet,
                        file_type="svg",
                        file_path=svg_file,
                        file_name=os.path.basename(svg_file),
                        is_sheet_specific=True,
                    )

                # GCODE file
                if gcode_file and os.path.exists(gcode_file):
                    NestingFile.objects.create(
                        design=design,
                        sheet=nesting_sheet,
                        file_type="gcode",
                        file_path=gcode_file,
                        file_name=os.path.basename(gcode_file),
                        is_sheet_specific=True,
                    )

                # DWG file
                if dwg_file and os.path.exists(dwg_file):
                    NestingFile.objects.create(
                        design=design,
                        sheet=nesting_sheet,
                        file_type="dwg",
                        file_path=dwg_file,
                        file_name=os.path.basename(dwg_file),
                        is_sheet_specific=True,
                    )

                # XML file
                if xml_file and os.path.exists(xml_file):
                    NestingFile.objects.create(
                        design=design,
                        sheet=nesting_sheet,
                        file_type="xml",
                        file_path=xml_file,
                        file_name=os.path.basename(xml_file),
                        is_sheet_specific=True,
                    )

            # Create PDF and ZIP files (not sheet-specific)
            if pdf_output and os.path.exists(pdf_output):
                NestingFile.objects.create(
                    design=design,
                    sheet=None,
                    file_type="pdf",
                    file_path=pdf_output,
                    file_name=os.path.basename(pdf_output),
                    is_sheet_specific=False,
                )

            if zip_output and os.path.exists(zip_output):
                NestingFile.objects.create(
                    design=design,
                    sheet=None,
                    file_type="zip",
                    file_path=zip_output,
                    file_name=os.path.basename(zip_output),
                    is_sheet_specific=False,
                )

    return JsonResponse(
        {
            "output_file": pdf_output,
            "gcode_zip": zip_output,
            "sheets": sheet_number - 1,
        },
        status=HTTP_200_OK,
    )
