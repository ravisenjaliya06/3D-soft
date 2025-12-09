# Python imports
import os
import secrets
from typing import Dict, List, Tuple

# Django imports
from django.db import transaction
from django.http import JsonResponse

# External imports
from rectpack import SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE, newPacker
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST
from svglib.svglib import svg2rlg
from svgwrite import Drawing
from svgwrite.shapes import Circle, Rect
from svgwrite.text import Text

# App imports
from design.models import DesignSetting


def generate_gcode(
    rectangles: List[Tuple],
    output_file: str,
    files: Dict,
    feed_rate: int = 1000,
    plunge_rate: int = 100,
    cut_height: int = 3,
) -> None:
    gcode = [
        "G21 ; Set units to millimeters",
        "G90 ; Use absolute coordinates",
        "G28 ; Home all axes",
        f"F{feed_rate} ; Set feed rate",
    ]

    for rect in rectangles:
        _, x, y, w, h, rid = rect
        if files[rid]["type"] == "circle":
            radius = files[rid]["radius"]
            gcode.append(f"G0 X{x + radius} Y{y + radius} ; Move to circle center")
            gcode.append(f"G1 Z-{cut_height} F{plunge_rate} ; Plunge")
            gcode.append(f"G2 I{radius} ; Cut circle")
            gcode.append("G0 Z5 ; Lift cutter")
        else:
            gcode += [
                f"G0 X{x} Y{y} ; Move to start",
                f"G1 Z-{cut_height} F{plunge_rate} ; Plunge",
                f"G1 X{x + w} Y{y} ; Line 1",
                f"G1 X{x + w} Y{y + h} ; Line 2",
                f"G1 X{x} Y{y + h} ; Line 3",
                f"G1 X{x} Y{y} ; Line 4",
                "G0 Z5 ; Lift cutter",
            ]

    gcode += ["G28 ; Home", "M30 ; End program"]
    with open(output_file, "w") as f:
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
                packer.add_rect(details["width"], details["height"], rid=rid)
        except KeyError:
            continue

    packer.add_bin(width, height)
    packer.pack()

    rectangles = packer.rect_list()
    packed_ids = {rect[5] for rect in rectangles}
    unplaced = {
        file_id: file_data
        for file_id, file_data in remaining_files.items()
        if file_id not in packed_ids
    }
    efficiency = calculate_efficiency(rectangles, width, height)

    return rectangles, efficiency, unplaced


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
        _, x, y, w, h, rid = rect
        item = files[rid]

        grooves = item["grooves"]
        minifix_holes = item["minifix_holes"]
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
        # === Draw minifix (Cam, Dowel and Screw) ===

        for hole in minifix_holes:
            x_local_position = hole["localPosition2D"]["x"] * scale * 10
            y_local_position = hole["localPosition2D"]["y"] * scale * 10

            px = x_local_position + x_scaled + (w_scaled / 2)
            py = y_local_position + y_scaled + (h_scaled / 2)

            diameter = hole.get("diameter", 5)
            outer_radius = (diameter / 2) * scale
            inner_radius = outer_radius * 0.5
            cx = px
            cy = py

            if hole["type"] == "SCREW":
                dwg.add(
                    Circle(
                        center=(cx, cy),
                        r=outer_radius,
                        fill="blue",
                        stroke="blue",
                        stroke_width=1.5,
                    )
                )

            elif hole["type"] == "BOLT_DRILL":
                dwg.add(
                    Circle(
                        center=(cx, cy),
                        r=outer_radius,
                        fill="red",
                        stroke="red",
                        stroke_width=1.5,
                    )
                )

            elif hole["type"] == "CAM":
                dwg.add(
                    Circle(
                        center=(cx, cy),
                        r=outer_radius,
                        fill="none",
                        stroke="green",
                        stroke_width=0.5,
                    )
                )
                dwg.add(
                    Circle(
                        center=(cx, cy),
                        r=inner_radius,
                        fill="green",
                        stroke="black",
                        stroke_width=0.1,
                    )
                )

            elif hole["type"] == "DOWEL":
                dwg.add(
                    Circle(
                        center=(cx, cy),
                        r=outer_radius,
                        fill="none",
                        stroke="orange",
                        stroke_width=1.5,
                        stroke_dasharray="1,1",
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
    sort_algorithms = [SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE]
    remaining_files = dict(files)
    sheet_number = 1
    svg_files = []
    sheet_mapping = []

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
            return JsonResponse(
                {"error": "No suitable nesting found. Try increasing sheet size."},
                status=HTTP_400_BAD_REQUEST,
            )

        sheet_mapping.append(
            {f"sheet{sheet_number}": [rect[5] for rect in best_rectangles]}
        )

        svg_name = f"{os.path.splitext(output)[0]}_sheet_{sheet_number}.svg"
        draw_sheet_to_svg(
            svg_name,
            best_rectangles,
            files,
            (wbin, hbin),
            enclosing_rectangle,
            best_efficiency=best_eff,
        )
        generate_gcode(best_rectangles, f"{os.path.splitext(svg_name)[0]}.gcode", files)

        svg_files.append(svg_name)
        remaining_files = unplaced
        sheet_number += 1

    pdf_output = f"{os.path.splitext(output)[0]}.pdf"
    convert_svgs_to_pdf(svg_files, pdf_output)

    if design_setting:
        with transaction.atomic():
            design_setting.sheet_data = sheet_mapping
            design_setting.save(update_fields=["sheet_data"])

    return JsonResponse({"output_file": pdf_output}, status=HTTP_200_OK)
