# Python imports
import logging
import os
import secrets
from typing import Any, Dict, List, Optional, Tuple

# Django imports
from django.http import JsonResponse

# External imports
import pandas as pd
import svgwrite
from rectpack import SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE, newPacker
from rest_framework.status import HTTP_200_OK

# Local imports
from .constant import (
    KEY_DEPTH,
    KEY_DIMENSIONS,
    KEY_HEIGHT,
    KEY_ID,
    KEY_INPUT_NAME,
    KEY_NAME,
    KEY_RADIUS,
    KEY_TYPE,
    KEY_UNIQUE_ID,
    KEY_WIDTH,
    TYPE_CIRCLE,
)

logger = logging.getLogger(__name__)


class NestingService:
    """
    Service class responsible for optimal nesting of parts and generating an Excel report.
    Adheres to 'One Function One Work' principle.
    """

    SORT_ALGORITHMS = [SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE]

    def __init__(
        self: "NestingService",
        width: int,
        height: int,
        target_efficiency: float = 95.0,
        allow_rotation: bool = True,
        spacing: float = 5.0,
    ) -> None:
        self.bin_width = width
        self.bin_height = height
        self.target_efficiency = target_efficiency
        self.allow_rotation = allow_rotation
        self.spacing = spacing

    @staticmethod
    def calculate_efficiency(rectangles: List[Tuple], width: int, height: int) -> float:
        """
        Calculate the efficiency of layout for a single sheet.
        """
        if not rectangles:
            return 0.0
        used_area = sum(rect[3] * rect[4] for rect in rectangles)
        return (used_area / (width * height)) * 100

    def _prepare_packer(self: "NestingService", sort_algo: int) -> object:
        """
        Initialize and configure a new Packer instance with a specific sort algorithm.
        """
        packer = newPacker(sort_algo=sort_algo, rotation=self.allow_rotation)
        packer.add_bin(self.bin_width, self.bin_height)
        return packer

    def _pack_rectangles(
        self: "NestingService", packer: object, remaining_files: Dict[str, Any]
    ) -> None:
        """
        Add rectangles to the packer instance.
        """
        for rid, details in remaining_files.items():
            try:
                if details.get(KEY_TYPE) == TYPE_CIRCLE:
                    diameter = 2 * details[KEY_RADIUS]
                    packer.add_rect(
                        diameter + self.spacing, diameter + self.spacing, rid=rid
                    )
                else:
                    # Usage: add_rect(width, height)
                    # We pack (Width, Height) to represent the Face.
                    # KEY_DEPTH is Thickness.
                    packer.add_rect(
                        details[KEY_WIDTH] + self.spacing,
                        details[KEY_HEIGHT] + self.spacing,
                        rid=rid,
                    )
            except KeyError:
                continue

    def _process_packed_results(
        self: "NestingService", packer: object, remaining_files: Dict[str, Any]
    ) -> Tuple[List[Tuple], float, Dict[str, Any]]:
        """
        Process the results from the packer, identifying nested and unplaced items.
        Returns: (packed_rectangles, efficiency, unplaced_items)
        """
        rectangles = packer.rect_list()

        processed_rectangles = []
        packed_ids = set()
        spacing = self.spacing

        for rect in rectangles:
            bin_id, x, y, w, h, rid = rect

            # Determine rotation
            original_item = remaining_files.get(rid, {})
            original_w = original_item.get(KEY_WIDTH, w)
            original_h = original_item.get(KEY_HEIGHT, h)

            is_rotated = (
                abs((w - spacing) - original_h) < 0.1
                and abs((h - spacing) - original_w) < 0.1
            )
            # Preserve original dimensions for visualization logic
            extras = {"original_width": original_w, "original_height": original_h}

            # (bin_id, x, y, w, h, rid, is_rotated, extras)
            processed_rectangles.append((bin_id, x, y, w, h, rid, is_rotated, extras))
            packed_ids.add(rid)

        # Calculate efficiency inline to be safe
        used_area = sum(w * h for _, _, _, w, h, _ in rectangles)
        if self.bin_width * self.bin_height > 0:
            efficiency = (used_area / (self.bin_width * self.bin_height)) * 100
        else:
            efficiency = 0.0

        unplaced = {
            rid: data for rid, data in remaining_files.items() if rid not in packed_ids
        }

        return processed_rectangles, efficiency, unplaced

    def _try_single_packing_pass(
        self: "NestingService", remaining_files: Dict[str, Any]
    ) -> Tuple[List[Tuple], float, Dict[str, Any]]:
        """
        Attempt to pack *once* using a random sort algorithm.
        """
        algo = secrets.choice(self.SORT_ALGORITHMS)
        packer = self._prepare_packer(algo)
        self._pack_rectangles(packer, remaining_files)
        packer.pack()
        return self._process_packed_results(packer, remaining_files)

    def optimize(self: "NestingService", files: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Main optimization loop. Processes files grouped by thickness (KEY_HEIGHT), creates multiple sheets,
        assigns Unique IDs (e.g. A1.1), and returns a flat list of nested parts.
        """
        # Pre-processing: Flatten 'dimensions' if present
        processed_files = {}
        for rid, details in files.items():
            details_copy = details.copy()
            if "dimensions" in details_copy:
                details_copy.update(details_copy["dimensions"])
                # Ensure float conversion for critical keys
                if (
                    KEY_HEIGHT in details_copy["dimensions"]
                ):  # "height" in dimensions is thickness? No, "depth"?
                    # Based on data.json: dimensions: {width, depth, height}.
                    # nest.py: KEY_HEIGHT matches 'height' (18). So yes, Thickness is height.
                    pass
            processed_files[rid] = details_copy

        files = processed_files

        # Group files by thickness (Depth in data.json)
        files_by_depth: Dict[float, Dict[str, Any]] = {}
        for rid, details in files.items():
            # KEY_DEPTH maps to "depth" which is usually Thickness
            try:
                # Dimensions from JSON: {width, height, depth}
                # User Requirement: Thickness is ~18mm. Width/Length are Panel sizes.

                dims = details.get("dimensions", {})
                raw_w = float(dims.get("width", details.get(KEY_WIDTH, 0)))
                raw_h = float(dims.get("height", details.get(KEY_HEIGHT, 0)))
                raw_d = float(dims.get("depth", details.get(KEY_DEPTH, 0)))

                # Determine which is Thickness (Smallest dimension)
                # Usually Depth (18).
                # If W=18, H=2000, D=600 -> W is Thickness.
                # If H=18, W=1000, D=600 -> H is Thickness.

                dim_list = [("width", raw_w), ("height", raw_h), ("depth", raw_d)]
                dim_list.sort(key=lambda x: x[1])  # Sort by value

                smallest_key, smallest_val = dim_list[0]

                # Assign Normalized Dimensions for Packing
                # Packing needs W x H (Face). Thickness is metadata.

                if smallest_key == "depth":
                    thickness = raw_d
                    w = raw_w
                    h = raw_h
                elif smallest_key == "width":
                    thickness = raw_w
                    w = raw_h  # Swap to maintain area
                    h = raw_d
                    # Update details for consistency
                    details[KEY_WIDTH] = w
                    details[KEY_HEIGHT] = h
                    details[KEY_DEPTH] = thickness
                else:  # height is thickness
                    thickness = raw_h
                    w = raw_w
                    h = raw_d  # Swap depth/height for face
                    # Update details
                    details[KEY_WIDTH] = w
                    details[KEY_HEIGHT] = h
                    details[KEY_DEPTH] = thickness

                # Ensure thickness matches key logic
            except (ValueError, TypeError):
                thickness = 0.0

            if thickness not in files_by_depth:
                files_by_depth[thickness] = {}
            files_by_depth[thickness][rid] = details

        # Sort thicknesses to assign codes A, B, C... deterministic
        sorted_thicknesses = sorted(files_by_depth.keys(), reverse=True)

        all_packed_items = []
        global_sheet_count = 1

        for i, thickness in enumerate(sorted_thicknesses):
            material_files = files_by_depth[thickness]

            remaining_files = dict(material_files)
            sheet_count = 1

            while remaining_files:
                best_eff = 0.0
                best_rectangles = None
                best_unplaced = {}

                # Retry mechanism
                attempts = 0
                while attempts < 6:
                    rectangles, eff, unplaced_try = self._try_single_packing_pass(
                        remaining_files
                    )
                    if eff > best_eff:
                        best_eff = eff
                        best_rectangles = rectangles
                        best_unplaced = unplaced_try
                    if best_eff >= self.target_efficiency:
                        break
                    attempts += 1

                if not best_rectangles and not best_eff:
                    logger.warning(
                        "Could not pack remaining files: %s",
                        list(remaining_files.keys()),
                    )
                    break

                # Format results and assign unique IDs
                item_counter = 1
                for rect in best_rectangles:
                    bin_id, x, y, w, h, rid, is_rotated, extras = rect

                    # Ensure numeric types to avoid formatting errors
                    safe_x = self._safe_float(x)
                    safe_y = self._safe_float(y)
                    safe_w = self._safe_float(w)
                    safe_h = self._safe_float(h)

                    item_details = files.get(rid, {})

                    unique_id = f"SHEET{global_sheet_count:02d}{item_counter:02d}"

                    all_packed_items.append(
                        {
                            KEY_NAME: item_details.get(KEY_INPUT_NAME, "Unknown"),
                            KEY_ID: rid,
                            KEY_DIMENSIONS: f"{safe_w:.2f} x {safe_h:.2f}",
                            KEY_UNIQUE_ID: unique_id,
                            KEY_WIDTH: safe_w,  # Width of Face
                            KEY_HEIGHT: safe_h,  # Height of Face
                            "x": safe_x
                            + self.spacing
                            / 2,  # Data for SVG (Centered in padded area)
                            "y": safe_y
                            + self.spacing
                            / 2,  # Data for SVG (Centered in padded area)
                            "is_rotated": is_rotated,
                            "sheet_num": f"SHEET{global_sheet_count:02d}",  # Grouping for visualization
                            "sheet_width": self.bin_width,
                            "sheet_height": self.bin_height,
                            "sheet_thickness": thickness,
                            "original_height": extras.get("original_height"),
                            "material_name": item_details.get("material_name", ""),
                            "depth": item_details.get(KEY_DEPTH, 17.0),
                            "minifix_holes": item_details.get("minifix_holes", []),
                            "grooves": item_details.get("grooves", []),
                            "edgebands": item_details.get("edgebands", []),
                        }
                    )
                    item_counter += 1

                sheet_count += 1
                global_sheet_count += 1
                remaining_files = best_unplaced

        return all_packed_items

    def generate_excel(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> str:
        """
        Generates and saves the Excel report.
        """
        excel_path = os.path.splitext(output_path)[0] + ".xlsx"
        try:
            df = pd.DataFrame(packed_items)
            if not df.empty:
                df = df[[KEY_NAME, KEY_ID, KEY_UNIQUE_ID, KEY_DIMENSIONS]]
            else:
                df = pd.DataFrame(
                    columns=[KEY_NAME, KEY_ID, KEY_UNIQUE_ID, KEY_DIMENSIONS]
                )

            df.to_excel(excel_path, index=False)
            logger.info("Excel file generated at: %s", excel_path)
            return excel_path
        except Exception as e:
            logger.error("Failed to write Excel file: %s", e)
            raise

    def generate_json(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> str:
        """
        Generates and saves the raw nesting layout data as a JSON file.
        This provides precise data about positioning, rotation, and machining for frontend visualizations.
        """
        # Python imports
        import json

        json_path = os.path.join(os.path.dirname(output_path), "nesting_data.json")
        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(packed_items, f, indent=4)
            logger.info("JSON file generated at: %s", json_path)
            return json_path
        except Exception as e:
            logger.error("Failed to write JSON file: %s", e)
            raise

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:  # noqa: ANN401
        """Helper to safely convert any value to float, handling dicts/None gracefully."""
        try:
            if isinstance(value, (dict, list, tuple, type(None))):
                return default
            return float(value)
        except (ValueError, TypeError):
            return default

    def generate_xmls(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> List[str]:
        """
        Generates XML files for each panel containing machining data.
        Returns a list of generated XML file paths.
        """
        # Python imports
        import xml.etree.ElementTree as ET  # noqa: N817
        from xml.dom import minidom

        generated_files = []
        base_dir = os.path.dirname(output_path)

        # Ensure base directory and xml subdirectory exist
        xml_dir = os.path.join(base_dir, "xml")
        os.makedirs(xml_dir, exist_ok=True)

        for item in packed_items:
            # We use the unique ID for the filename
            filename = f"{item[KEY_UNIQUE_ID]}.xml"
            filepath = os.path.join(xml_dir, filename)

            # Root Element
            root = ET.Element("Root")
            project = ET.SubElement(root, "Project", Name="", Flag="SWJ008")
            panels = ET.SubElement(project, "Panels")

            # Panel Attributes

            width = f"{self._safe_float(item.get(KEY_WIDTH)):.6f}"
            length = f"{self._safe_float(item.get(KEY_HEIGHT)):.6f}"
            thval = self._safe_float(item.get("depth", 17.0))
            th = f"{thval:.6f}"

            panel_attrs = {
                "ID": "",
                "Name": str(item.get(KEY_INPUT_NAME, item.get(KEY_ID))),
                "Width": width,
                "Length": length,
                "Material": str(item.get("material_name", "")),
                "Thickness": th,
                "IsProduce": "true",
                "MachiningPoint": "1",
                "Type": "1",
                "Face5ID": "",
                "Face6ID": "",
                "Grain": "L",
                "ExitID": "0",
                "TrimmingThreeEdges": "0",
                "TrimmingBoardHead": "0",
            }

            panel = ET.SubElement(panels, "Panel", **panel_attrs)

            # Machines / Holes
            machines = ET.SubElement(panel, "Machines")

            # 1. Minifix Holes
            minifix_holes = item.get("minifix_holes", [])
            mac_index = 0

            for hole in minifix_holes:
                try:
                    mac_index += 1

                    hole_type = str(hole.get("type", "")).upper()
                    xml_type = str(hole.get("drill_type", "1"))
                    face_id = str(hole.get("face", "0"))

                    pos = hole.get("local_position2_d", {})

                    raw_diameter = self._safe_float(hole.get("diameter", 0))
                    raw_depth = self._safe_float(
                        hole.get("length") or hole.get("depth") or 0
                    )

                    panel_l_val = self._safe_float(item.get(KEY_HEIGHT))

                    final_x = 0.0
                    final_y = 0.0
                    final_depth = raw_depth
                    final_diameter = raw_diameter

                    # ----------------------------------------
                    # COORDINATE LOGIC
                    # ----------------------------------------
                    if (
                        xml_type == "2"
                        and hole_type in ["SCREW", "DOWEL"]
                        and face_id not in ["1", "6"]
                        or xml_type == "2"
                        and hole_type in ["CAM"]
                        and face_id in ["6"]
                    ):
                        # if xml_type == "2" and hole_type in ["SCREW", "DOWEL"] and face_id not in ["1", "6"]:
                        final_x = self._safe_float(pos.get("y", 0))
                        final_y = self._safe_float(pos.get("x", 0))
                    elif (
                        xml_type == "2"
                        and hole_type in ["CAM"]
                        or xml_type == "2"
                        and hole_type in ["SCREW", "DOWEL"]
                        and face_id in ["1", "6"]
                    ):
                        final_x = self._safe_float(pos.get("x", 0))
                        final_y = self._safe_float(pos.get("y", 0))
                    else:
                        if face_id == "5":
                            final_x = 0.0
                            final_y = self._safe_float(pos.get("x", 0))
                        elif face_id == "3":
                            final_x = panel_l_val
                            final_y = self._safe_float(pos.get("x", 0))
                        elif face_id == "4":
                            final_x = self._safe_float(pos.get("x", 0))
                            final_y = 0.0
                        elif face_id == "2":
                            final_x = self._safe_float(pos.get("x", 0))
                            final_y = panel_l_val
                        elif face_id == "1":
                            final_x = self._safe_float(pos.get("x", 0))
                            final_y = 0.0
                        elif face_id == "6":
                            final_x = self._safe_float(pos.get("x", 0))
                            final_y = panel_l_val
                        else:
                            final_x = self._safe_float(pos.get("x", 0))
                            final_y = self._safe_float(pos.get("y", 0))

                    if (
                        int(xml_type) == 1
                        and hole_type in ["SCREW", "DOWEL"]
                        and face_id == "5"
                    ):
                        convert_face_id = int(face_id)
                        face_id = str(convert_face_id - 1)

                    machining_attrs = {
                        "ID": "1000",
                        "Type": xml_type,
                        "IsGenCode": "2",
                        "Face": face_id,
                        "X": f"{final_x:.6f}",
                        "Y": f"{final_y:.6f}",
                        "Depth": f"{final_depth:.6f}",
                        "Diameter": f"{final_diameter:.6f}",
                        "ToolName": "0",
                        "MacIndex": str(mac_index),
                    }

                    # If Edge Drill (XML Type 1), we need Z.
                    if xml_type == "1":
                        z_val = thval / 2
                        machining_attrs["Z"] = f"{z_val:.6f}"

                    ET.SubElement(machines, "Machining", **machining_attrs)

                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Error processing hole: {e}")
                    continue

            # 2. Grooves / Slots
            grooves = item.get("grooves", [])
            for groove in grooves:
                try:
                    mac_index += 1

                    m_attrs = {
                        "ID": str(groove.get("id", "6000")),
                        "Type": str(groove.get("type", "4")),
                        "IsGenCode": str(groove.get("is_gen_code", "2")),
                        "Face": str(groove.get("face", "5")),
                        "X": f"{self._safe_float(groove.get('x', 0)):.6f}",
                        "Y": f"{self._safe_float(groove.get('y', 0)):.6f}",
                        "EndX": f"{self._safe_float(groove.get('end_x', 0)):.6f}",
                        "EndY": f"{self._safe_float(groove.get('end_y', 0)):.6f}",
                        "Width": f"{self._safe_float(groove.get('width', 0)):.6f}",
                        "Depth": f"{self._safe_float(groove.get('depth', 0)):.6f}",
                        "ToolOffset": str(groove.get("tool_offset", "ÖÐ")),
                        "SlotType": str(groove.get("slot_type", "0")),
                        "MacIndex": str(mac_index),
                    }

                    ET.SubElement(machines, "Machining", **m_attrs)
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Error processing groove: {e}")
                    continue

            # EdgeGroup (Static as per example for now?)
            edge_group = ET.SubElement(panel, "EdgeGroup")

            # Create edges with Thickness=0 default
            for f in ["1", "2", "3", "4"]:
                ET.SubElement(edge_group, "Edge", Face=f, Thickness="0.000000")

            # Pretty print
            xml_bytes = ET.tostring(root)
            xml_str = minidom.parseString(xml_bytes).toprettyxml(  # noqa: S318
                indent="    "
            )

            # Remove empty lines caused by pretty print if any
            xml_str = os.linesep.join([s for s in xml_str.splitlines() if s.strip()])

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(xml_str)

            generated_files.append(filepath)

        logger.info("Generated %d XML files.", len(generated_files))
        return generated_files

    def generate_svg(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> List[str]:
        """
        Generates SVG visualizations (one per sheet).
        Returns a list of generated SVG file paths.
        Visualize holes based on accurate 3D global coordinate transformation.
        """

        sheets = {}
        for items in packed_items:
            s_num = items["sheet_num"]
            if s_num not in sheets:
                sheets[s_num] = []
            sheets[s_num].append(items)

        generated_files = []
        base_name = os.path.splitext(output_path)[0]

        padding = 50
        sheet_w = self.bin_width
        sheet_h = self.bin_height
        total_w = sheet_w + 2 * padding
        total_h = sheet_h + 2 * padding

        for s_num in sorted(sheets.keys()):
            svg_file = f"{base_name}_{s_num}.svg"
            dwg = svgwrite.Drawing(svg_file, size=(total_w, total_h))

            dwg.add(
                dwg.rect(
                    insert=(padding, padding),
                    size=(sheet_w, sheet_h),
                    fill="none",
                    stroke="black",
                )
            )

            for item in sheets[s_num]:
                sheet_x = item["x"] + padding
                sheet_y = item["y"] + padding
                w = item[KEY_WIDTH]
                h = item[KEY_HEIGHT]
                is_rotated = item.get("is_rotated", False)

                dwg.add(
                    dwg.rect(
                        insert=(sheet_x, sheet_y),
                        size=(w, h),
                        fill="#e0e0e0",
                        stroke="blue",
                        stroke_width="2",
                    )
                )

                name = item.get(KEY_NAME, "")
                holes = item.get("minifix_holes", [])

                for hole in holes:
                    h_pos = hole.get("local_position2_d", {})

                for hole in holes:
                    hole_type = str(hole.get("type", "")).upper()
                    h_pos = hole.get("local_position2_d", {})
                    face_id = str(hole.get("face", "0"))
                    # if hole_type in ["CAM"] and face_id != "6" or hole_type in ["SCREW", "DOWEL"] and face_id in ["1", "6"]:
                    if hole_type in ["SCREW", "DOWEL"] and face_id in ["1", "6"]:
                        raw_pos_x = self._safe_float(h_pos.get("y", 0))
                        raw_pos_y = self._safe_float(h_pos.get("x", 0))
                    else:
                        raw_pos_x = self._safe_float(h_pos.get("x", 0))
                        raw_pos_y = self._safe_float(h_pos.get("y", 0))

                    diameter = self._safe_float(hole.get("diameter", 15))
                    length = self._safe_float(hole.get("length", 10))
                    drill_type = str(hole.get("drill_type", "1"))

                    edge_map = {
                        "5": "LEFT",
                        "3": "RIGHT",
                        "4": "TOP",
                        "2": "BOTTOM",
                        "1": "TOP",
                        "6": "BOTTOM",
                    }

                    edge = edge_map.get(face_id, "UNKNOWN")
                    if is_rotated:
                        rotation_map = {
                            "TOP": "RIGHT",
                            "RIGHT": "BOTTOM",
                            "BOTTOM": "LEFT",
                            "LEFT": "TOP",
                        }
                        edge = rotation_map.get(edge, edge)

                    rect_x, rect_y = 0, 0
                    rect_w, rect_h = 0, 0

                    # Default Visuals
                    viz_w = length
                    viz_l = diameter

                    if drill_type == "1":
                        if edge == "LEFT":
                            rect_x = raw_pos_x
                            rect_y = 0
                            rect_w = viz_l
                            rect_h = viz_w
                        elif edge == "RIGHT":
                            rect_x = raw_pos_x
                            rect_y = h - viz_w
                            rect_w = viz_l
                            rect_h = viz_w
                        elif edge == "TOP":
                            rect_x = raw_pos_x
                            rect_y = 0
                            rect_w = viz_l
                            rect_h = viz_w
                        elif edge == "BOTTOM":

                            rect_x = raw_pos_x
                            rect_y = h - viz_w
                            rect_w = viz_l
                            rect_h = viz_w

                        dwg.add(
                            dwg.rect(
                                insert=(sheet_x + rect_x, sheet_y + rect_y),
                                size=(rect_w, rect_h),
                                fill="none",
                                stroke="green",
                                stroke_width="1",
                            )
                        )

                    else:
                        cx = raw_pos_x
                        cy = raw_pos_y
                        if is_rotated and (
                            name != "HORIZONTAL_PLANK" or hole_type in ["CAM"]
                        ):
                            cx, cy = raw_pos_y, raw_pos_x

                        dwg.add(
                            dwg.circle(
                                center=(sheet_x + cx, sheet_y + cy),
                                r=diameter / 2,
                                fill="red",
                                stroke="black",
                                stroke_width="0.5",
                            )
                        )

                # --- Grooves ---
                grooves = item.get("grooves", [])
                for groove in grooves:
                    g_x = self._safe_float(groove.get("x", 0))
                    g_y = self._safe_float(groove.get("y", 0))
                    g_end_x = self._safe_float(groove.get("end_x", 0))
                    g_end_y = self._safe_float(groove.get("end_y", 0))
                    g_width = self._safe_float(groove.get("width", 10))

                    if is_rotated:
                        # Swap coordinates if rotated
                        g_x, g_y = g_x, g_y
                        g_end_x, g_end_y = g_end_x, g_end_y

                    dwg.add(
                        dwg.line(
                            start=(sheet_x + g_x, sheet_y + g_y),
                            end=(sheet_x + g_end_x, sheet_y + g_end_y),
                            stroke="orange",
                            stroke_width=g_width,
                            stroke_opacity="0.6",
                        )
                    )

                # --- Label Group ---
                label_g = dwg.g()
                unique_id = item.get(KEY_UNIQUE_ID, "")

                # Simulate text size
                text_w = len(unique_id) * 8 + 10
                text_h = 20
                lbl_cx = sheet_x + w / 2 - text_w / 2
                lbl_cy = sheet_y + h / 2 - text_h / 2

                # Label Background
                label_g.add(
                    dwg.rect(
                        insert=(lbl_cx, lbl_cy),
                        size=(text_w, text_h),
                        rx=5,
                        ry=5,
                        fill="white",
                        fill_opacity=0.3,
                        stroke="none",
                    )
                )

                # Text
                label_g.add(
                    dwg.text(
                        unique_id,
                        insert=(sheet_x + w / 2, sheet_y + h / 2 + 5),
                        text_anchor="middle",
                        font_size="12",
                        fill="black",
                    )
                )
                dwg.add(label_g)

            dwg.save()
            generated_files.append(svg_file)

        logger.info("Generated %d SVG files.", len(generated_files))
        return generated_files

    def generate_layout_pdf(
        self: "NestingService", svg_paths: List[str], output_path: str
    ) -> str:
        """
        Combines generated SVGs into a single Layout PDF.
        """
        # External imports
        from reportlab.graphics import renderPDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from svglib.svglib import svg2rlg

        pdf_path = os.path.splitext(output_path)[0] + "_layout.pdf"
        c = canvas.Canvas(pdf_path, pagesize=A4)
        page_w, page_h = A4
        margin = 20

        for svg_file in svg_paths:
            drawing = svg2rlg(svg_file)
            if drawing:
                # Calculate Scale to fit page
                dw = drawing.width
                dh = drawing.height

                available_w = page_w - 2 * margin
                available_h = page_h - 2 * margin

                scale_w = available_w / dw if dw > 0 else 1
                scale_h = available_h / dh if dh > 0 else 1
                scale = min(scale_w, scale_h)

                # Apply scale
                drawing.scale(scale, scale)

                # Center on page
                scaled_w = dw * scale
                scaled_h = dh * scale
                x_off = (page_w - scaled_w) / 2
                y_off = (page_h - scaled_h) / 2

                renderPDF.draw(drawing, c, x_off, y_off)
                c.showPage()

        c.save()
        logger.info("Layout PDF generated at: %s", pdf_path)
        return pdf_path

    def generate_labels(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> str:
        """
        Generates a PDF with labels/QR codes using reportlab.
        """
        # External imports
        from reportlab.graphics.barcode import qr
        from reportlab.graphics.shapes import Drawing
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas

        pdf_path = os.path.splitext(output_path)[0] + "_labels.pdf"
        c = canvas.Canvas(pdf_path, pagesize=A4)
        w_page, h_page = A4

        x_start = 10 * mm
        y_start = h_page - 40 * mm
        x = x_start
        y = y_start

        for item in packed_items:
            # Draw Label Box
            c.rect(x, y, 90 * mm, 30 * mm)

            # QR Content
            qr_content = f"ID:{item[KEY_UNIQUE_ID]}|Name:{item[KEY_NAME]}|Dim:{item[KEY_DIMENSIONS]}"

            # Draw QR
            # Explicitly set value to be safe
            qr_code = qr.QrCodeWidget(qr_content)
            qr_code.barWidth = 0.5 * mm
            qr_code.barHeight = 0.5 * mm

            bounds = qr_code.getBounds()
            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]

            # Scale to 25x25mm area
            d = Drawing(45, 45, transform=[25 / width, 0, 0, 25 / height, 0, 0])
            d.add(qr_code)

            # External imports
            from reportlab.graphics import renderPDF

            renderPDF.draw(d, c, x + 2 * mm, y + 2 * mm)

            # Draw Text
            c.setFont("Helvetica-Bold", 12)
            c.drawString(x + 30 * mm, y + 22 * mm, f"ID: {item[KEY_UNIQUE_ID]}")
            c.setFont("Helvetica", 10)
            c.drawString(x + 30 * mm, y + 15 * mm, f"Name: {item[KEY_NAME][:20]}")
            c.drawString(x + 30 * mm, y + 8 * mm, f"Size: {item[KEY_DIMENSIONS]}")

            # Grid logic (2 cols per page)
            x += 95 * mm
            if x > w_page - 90 * mm:
                x = x_start
                y -= 35 * mm

            if y < 20 * mm:
                c.showPage()
                y = y_start
                x = x_start

        c.save()
        logger.info("Labels PDF generated at: %s", pdf_path)
        return pdf_path


# --- Module Wrapper for Backward Compatibility / View Usage ---
def nest(
    output: str,
    files: Dict[str, Any],
    wbin: int,
    hbin: int,
    enclosing_rectangle: bool = False,
    target_efficiency: float = 95.0,
    allow_rotation: bool = True,
    spacing: float = 5.0,
    design_setting: Optional[object] = None,
) -> JsonResponse:
    """
    Wrapper function to use the NestingService.
    """
    try:
        service = NestingService(
            width=wbin,
            height=hbin,
            target_efficiency=target_efficiency,
            allow_rotation=allow_rotation,
            spacing=spacing,
        )

        packed_items = service.optimize(files)
        excel_path = service.generate_excel(packed_items, output)
        svg_paths = service.generate_svg(packed_items, output)
        layout_pdf_path = service.generate_layout_pdf(svg_paths, output)
        labels_pdf_path = service.generate_labels(packed_items, output)

        # New: Generate XMLs
        xml_paths = service.generate_xmls(packed_items, output)

        # New: Generate JSON Layout Data
        json_path = service.generate_json(packed_items, output)

        return JsonResponse(
            {
                "output_file": excel_path,
                "svg_files": svg_paths,
                "layout_file": layout_pdf_path,
                "labels_file": labels_pdf_path,
                "xml_files": xml_paths,  # Return list of generated XMLs
                "json_file": json_path,  # Return JSON layout path
                "message": "Nesting completed successfully.",
                "total_parts": len(packed_items),
            },
            status=HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Nesting failed")
        return JsonResponse({"error": str(e)}, status=500)
