# Python imports
import logging
import math
import os
import re
import secrets
import xml.etree.ElementTree as ET  # noqa: N817
import zipfile
from typing import Any, Dict, List, Optional, Tuple
from xml.dom import minidom

# Django imports
from django.http import JsonResponse

# External imports
import pandas as pd
import svgwrite
from openpyxl.styles import Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from rectpack import SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE, newPacker

# Reportlab imports
from reportlab.graphics import renderPDF
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework.status import HTTP_200_OK
from svglib.svglib import svg2rlg

# App imports
from material.models import Material

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

    def optimize(
        self: "NestingService", files: Dict[str, Any], company_name: str = ""
    ) -> List[Dict[str, Any]]:
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

        # Determine the company prefix for barcodes
        company_prefix = "SHEET"
        if company_name and company_name.strip():
            words = [w.strip() for w in company_name.split() if w.strip()]
            if len(words) >= 2:
                if words[0].isupper() and len(words[0]) >= 2:
                    company_prefix = words[0][:2]
                else:
                    company_prefix = (words[0][0] + words[1][0]).upper()
            elif len(words) == 1:
                company_prefix = words[0][:2].upper()

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
                    safe_w = self._safe_float(w) - self.spacing
                    safe_h = self._safe_float(h) - self.spacing

                    item_details = files.get(rid, {})
                    unique_id = (
                        f"{company_prefix}{global_sheet_count:02d}{item_counter:02d}"
                    )

                    all_packed_items.append(
                        {
                            KEY_NAME: item_details.get(KEY_INPUT_NAME, "Unknown"),
                            KEY_ID: rid,
                            KEY_DIMENSIONS: f"{safe_w:.2f} x {safe_h:.2f}",
                            KEY_UNIQUE_ID: unique_id,
                            KEY_WIDTH: safe_w,  # Width of Face
                            KEY_HEIGHT: safe_h,  # Height of Face
                            # Normalized texture grain code for XLSX: 0 None, 1 Vertical, 2 Horizontal
                            "texture_grain_code": self.map_texture_grain(
                                self._extract_texture_value(item_details)
                            ),
                            "x": safe_x
                            + self.spacing
                            / 2,  # Data for SVG (Centered in padded area)
                            "y": safe_y
                            + self.spacing
                            / 2,  # Data for SVG (Centered in padded area)
                            "is_rotated": is_rotated,
                            "sheet_num": f"{company_prefix}{global_sheet_count:02d}",  # Grouping for visualization
                            "sheet_width": self.bin_width,
                            "sheet_height": self.bin_height,
                            "sheet_thickness": thickness,
                            "original_height": extras.get("original_height"),
                            "material_name": item_details.get("material_name", ""),
                            "depth": item_details.get(KEY_DEPTH, 17.0),
                            "minifix_holes": item_details.get("minifix_holes", []),
                            "panel_design": item_details.get("panel_design", {}),
                            "grooves": item_details.get("grooves", []),
                            "edge_banding": item_details.get("edge_banding", {}),
                            "parent_name": item_details.get("parent_name", ""),
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

    def auto_adjust_column_width(self: "NestingService", worksheet: Worksheet) -> None:
        for column_cells in worksheet.columns:
            max_length = 0
            column = column_cells[0].column  # Get column index
            column_letter = get_column_letter(column)

            for cell in column_cells:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))

            adjusted_width = max_length + 2  # Extra padding
            worksheet.column_dimensions[column_letter].width = adjusted_width

    @staticmethod
    def to_str_or_empty(value: object) -> str:
        """Return a stripped string representation or an empty string."""
        if value is None:
            return ""
        return str(value).strip()

    @staticmethod
    def map_texture_grain(value: object) -> int:
        """
        Map texture grain to numeric code for XLSX texture column:
        0 = None/Unknown, 1 = Vertical, 2 = Horizontal.
        Accepts numeric 0/1/2 or string labels ('None','Vertical','Horizontal').
        """
        # Prefer numeric input
        if isinstance(value, (int, float)):
            try:
                code = int(value)
            except (ValueError, TypeError):
                return 0
            return code if code in (0, 1, 2) else 0

        text = str(value).strip().lower() if value is not None else ""
        if text in ("none", ""):
            return 0
        if text == "vertical":
            return 1
        if text == "horizontal":
            return 2
        return 0

    @staticmethod
    def parse_mm_thickness(text: str) -> Optional[float]:
        """Extract thickness when the source explicitly includes `mm`."""
        match = re.search(r"(\d+(?:\.\d+)?)\s*mm", text, flags=re.IGNORECASE)
        if not match:
            return None
        try:
            value = float(match.group(1))
        except ValueError:
            return None
        if value > 0:
            return value
        return None

    @staticmethod
    def extract_plausible_thickness(
        text: str, min_mm: float = 0.2, max_mm: float = 5.0
    ) -> Optional[float]:
        """Pick the first numeric token that falls in a plausible banding range."""
        numeric_tokens = re.findall(r"\d+(?:\.\d+)?", text)
        for token in numeric_tokens:
            try:
                value = float(token)
            except ValueError:
                continue
            if min_mm <= value <= max_mm:
                return value
        return None

    @staticmethod
    def lookup_banding_thickness_by_name(
        name: str, cache: Dict[str, float]
    ) -> Optional[float]:
        """Resolve thickness from cache by exact key, contains, then reverse-contains."""
        normalized = name.lower().strip()
        if not normalized:
            return None

        exact_value = cache.get(normalized)
        if exact_value and exact_value > 0:
            return exact_value

        for cached_name, cached_value in cache.items():
            if cached_name and cached_name in normalized and cached_value > 0:
                return cached_value

        for cached_name, cached_value in cache.items():
            if normalized in cached_name and cached_value > 0:
                return cached_value

        return None

    @staticmethod
    def _extract_texture_value(details: Dict[str, object]) -> object:
        """
        Attempt to retrieve a texture grain indicator from common locations/keys in a part payload.
        Search order (first hit wins):
          - details['textureGrain'] (numeric 0/1/2 preferred)
          - details['texture_grain']
          - details['texture'] (string label)
          - details['attributes'].{textureGrain|texture_grain|texture}
          - details['options'].{textureGrain|texture_grain|texture}
        """
        direct_candidates = (
            details.get("textureGrain"),
            details.get("texture_grain"),
            details.get("texture"),
        )
        for candidate in direct_candidates:
            if candidate is not None and str(candidate) != "":
                return candidate

        for container_key in ("attributes", "options", "metadata"):
            container = details.get(container_key)
            getter = getattr(container, "get", None)
            if callable(getter):
                for key in ("textureGrain", "texture_grain", "texture"):
                    candidate = getter(key, None)
                    if candidate is not None and str(candidate) != "":
                        return candidate

        return ""

    def get_banding_display_name(self: "NestingService", value: object) -> str:
        """Extract a readable banding name from dict-like input or fallback to plain text."""
        getter = getattr(value, "get", None)
        if not callable(getter):
            return self.to_str_or_empty(value)

        for field in ("name", "material", "title", "label", "value"):
            candidate = self.to_str_or_empty(getter(field, ""))
            if candidate:
                return candidate
        return self.to_str_or_empty(value)

    def resolve_edge_thickness(
        self: "NestingService", value: object, cache: Dict[str, float]
    ) -> Optional[float]:
        """
        Resolve edge thickness in mm from dict-like values, text parsing, or cache lookup.
        Priority: explicit thickness -> '<num> mm' -> plausible numeric token -> cache name lookup.
        """
        getter = getattr(value, "get", None)
        if callable(getter):
            explicit_thickness = getter("thickness", None)
            if explicit_thickness is not None:
                numeric = self._safe_float(explicit_thickness, 0.0)
                if numeric > 0:
                    return numeric

        name_text = self.get_banding_display_name(value)
        if not name_text:
            return None

        mm_value = self.parse_mm_thickness(name_text)
        if mm_value is not None:
            return mm_value

        plausible_value = self.extract_plausible_thickness(name_text)
        if plausible_value is not None:
            return plausible_value

        return self.lookup_banding_thickness_by_name(name_text, cache)

    def generate_xmls(
        self: "NestingService",
        packed_items: List[Dict[str, Any]],
        output_path: str,
        design_name: str = "files",
        order_number: str = "",
        company_name: str = "",
    ) -> List[str]:
        """
        Generates XML files for each panel containing machining data.
        Returns a list of generated XML file paths.
        Also generates 'Cutting List.xlsx' in the same folder.
        """

        def _is_round_corner(corner_type: str | None) -> bool:
            return str(corner_type or "").strip().lower() == "round"

        def _is_chamfer_corner(corner_type: str | None) -> bool:
            return str(corner_type or "").strip().lower() == "chamfer"

        def _safe_radius(radius_value: float | None, max_radius: float) -> float:
            radius = self._safe_float(radius_value, 0.0)
            if radius <= 0:
                return 0.0
            return min(radius, max_radius)

        def _curve_center(
            corner_index: int, radius: float, panel_length: float, panel_width: float
        ) -> Tuple[float, float]:
            # Corner index order:
            # 0: Left-top, 1: Right-top, 2: Right-bottom, 3: Left-bottom
            if corner_index == 0:
                return panel_length, radius
            if corner_index == 1:
                return radius, 0.0
            if corner_index == 2:
                return 0.0, panel_width - radius
            return panel_length - radius, panel_width

        def _curve_point(
            corner_index: int,
            radius: float,
            panel_length: float,
            panel_width: float,
            theta: float,
        ) -> Tuple[float, float]:
            sin_t = math.sin(theta)
            cos_t = math.cos(theta)

            if corner_index == 0:
                # Left-top: (L, r) -> (L-r, 0)
                return (
                    panel_length - radius + radius * cos_t,
                    radius - radius * sin_t,
                )
            if corner_index == 1:
                # Right-top: (r, 0) -> (0, r)
                return radius - radius * sin_t, radius - radius * cos_t
            if corner_index == 2:
                # Right-bottom: (0, W-r) -> (r, W)
                return radius - radius * cos_t, panel_width - radius + radius * sin_t
            # Left-bottom: (L-r, W) -> (L, W-r)
            return (
                panel_length - radius + radius * sin_t,
                panel_width - radius + radius * cos_t,
            )

        generated_files = []
        base_dir = os.path.dirname(output_path)

        # Ensure base directory and xml subdirectory exist
        xml_dir = os.path.join(base_dir, "xml")
        os.makedirs(xml_dir, exist_ok=True)

        sheet1_data = []  # Cutting List
        sheet2_data = []  # Drilling Data

        # Cache format: {lowercase_banding_name: max_thickness_mm}
        material_thickness_cache: Dict[str, float] = {}
        banding_queryset = Material.objects.filter(type="Banding").prefetch_related(
            "properties"
        )
        if company_name:
            banding_queryset = banding_queryset.filter(
                company__name__iexact=company_name
            )

        for banding_material in banding_queryset:
            material_name = self.to_str_or_empty(getattr(banding_material, "name", ""))
            if not material_name:
                continue
            normalized_material_name = material_name.lower()

            max_thickness_mm = 0.0
            properties_manager = getattr(banding_material, "properties", None)
            properties = list(properties_manager.all()) if properties_manager else []
            for property_item in properties:
                thickness_value = self._safe_float(
                    getattr(property_item, "thickness", 0.0), 0.0
                )
                if thickness_value > max_thickness_mm:
                    max_thickness_mm = thickness_value

            if max_thickness_mm > 0:
                cached_value = material_thickness_cache.get(
                    normalized_material_name, 0.0
                )
                material_thickness_cache[normalized_material_name] = max(
                    cached_value, max_thickness_mm
                )

        for item in packed_items:
            # We use the unique ID for the filename
            filename = f"{item[KEY_UNIQUE_ID]}.xml"
            filepath = os.path.join(xml_dir, filename)

            # Extract edgeband info for Excel and XML
            edge_banding_data = item.get("edge_banding")
            if not isinstance(edge_banding_data, dict):
                edge_banding_data = {}
            edge_left_raw = edge_banding_data.get("left", "")
            edge_right_raw = edge_banding_data.get("right", "")
            edge_top_raw = edge_banding_data.get("top", "")
            edge_bottom_raw = edge_banding_data.get("bottom", "")

            # Resolve thickness for Cutting List (plain number or blank)
            edge_left_th = self.resolve_edge_thickness(
                edge_left_raw, material_thickness_cache
            )
            edge_right_th = self.resolve_edge_thickness(
                edge_right_raw, material_thickness_cache
            )
            edge_top_th = self.resolve_edge_thickness(
                edge_top_raw, material_thickness_cache
            )
            edge_bottom_th = self.resolve_edge_thickness(
                edge_bottom_raw, material_thickness_cache
            )

            edge_left = self.get_banding_display_name(edge_left_raw)
            edge_right = self.get_banding_display_name(edge_right_raw)
            edge_top = self.get_banding_display_name(edge_top_raw)
            edge_bottom = self.get_banding_display_name(edge_bottom_raw)

            # Sheet 1 / XML panel dimensions:
            # keep machine-compatible orientation where Length is always larger side.
            raw_width = self._safe_float(item.get(KEY_WIDTH))
            raw_length = self._safe_float(item.get(KEY_HEIGHT))
            length_val = max(raw_width, raw_length)
            width_val = min(raw_width, raw_length)
            thval = self._safe_float(item.get("depth", 17.0))

            # Texture grain is already normalized in optimize() via texture_grain_code

            sheet1_data.append(
                {
                    "Order Number": order_number,
                    "Company Name": company_name,
                    "Cabinet Name": item.get("parent_name", ""),
                    "Part Number": item.get(KEY_NAME, item.get(KEY_ID, "")),
                    "Material": item.get("material_name") or "-",
                    "length": length_val,
                    "width": width_val,
                    "thickness": thval,
                    "quantity": item.get("quantity", 1),
                    "colour": item.get("colour", ""),
                    "texture": item.get(
                        "texture_grain_code",
                        self.map_texture_grain(
                            item.get(
                                "textureGrain",
                                item.get("texture_grain", item.get("texture", "")),
                            )
                        ),
                    ),
                    "Barcode": item.get(KEY_UNIQUE_ID, ""),
                    "Edge Left": (
                        f"{edge_left_th:.1f}" if edge_left_th is not None else ""
                    ),
                    "Edge Right": (
                        f"{edge_right_th:.1f}" if edge_right_th is not None else ""
                    ),
                    "Edge Top": f"{edge_top_th:.1f}" if edge_top_th is not None else "",
                    "Edge Bottom": (
                        f"{edge_bottom_th:.1f}" if edge_bottom_th is not None else ""
                    ),
                    "grain": "L",
                }
            )

            # Root Element
            root = ET.Element("Root")
            project = ET.SubElement(root, "Project", Name="", Flag="SWJ008")
            panels = ET.SubElement(project, "Panels")

            # Panel Attributes
            width = f"{width_val:.6f}"
            length = f"{length_val:.6f}"
            th = f"{thval:.6f}"

            panel_attrs = {
                "ID": "",
                "Name": str(item.get(KEY_INPUT_NAME, item.get(KEY_ID))),
                "Width": width,
                "Length": length,
                "Material": str(item.get("material_name") or "-"),
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
                    # Frontend now provides final machining coordinates.
                    final_x = self._safe_float(hole.get("x", pos.get("x", 0)))
                    final_y = self._safe_float(hole.get("y", pos.get("y", 0)))
                    final_depth = raw_depth
                    final_diameter = raw_diameter

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

                    # Add to Sheet 2
                    sheet2_data.append(
                        {
                            "Barcode": item.get(KEY_UNIQUE_ID, ""),
                            "Part Name": item.get(KEY_NAME, item.get(KEY_ID, "")),
                            "Hole Type": hole_type,
                            "X Pos": final_x,
                            "Y Pos": final_y,
                            "Face": face_id,
                            "Diameter": final_diameter,
                            "Depth": final_depth,
                            "Qty per Part": 1,
                            "Tool": "",
                            "Total Holes": 1,
                            "Remarks": "",
                        }
                    )

                    # Face 5 / 6 must only carry X,Y in XML.
                    if xml_type == "1" and face_id not in ["5", "6"]:
                        z_val = self._safe_float(hole.get("z", thval / 2))
                        machining_attrs["Z"] = f"{z_val:.6f}"

                    ET.SubElement(machines, "Machining", **machining_attrs)

                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Error processing hole: {e}")
                    continue

            # 2. Corner Profiles (Type=3): round + chamfer
            # Uses panel_design.corner_types / corner_radius arrays in index order:
            # [left-top, right-top, right-bottom, left-bottom]
            try:
                panel_design = item.get("panel_design", {})
                if not isinstance(panel_design, dict):
                    panel_design = {}

                corner_types = panel_design.get("corner_types", [])
                corner_radii = panel_design.get("corner_radius", [])
                if not isinstance(corner_types, list):
                    corner_types = []
                if not isinstance(corner_radii, list):
                    corner_radii = []

                max_curve_radius = min(length_val, width_val)

                for corner_index in range(4):
                    corner_type = (
                        corner_types[corner_index]
                        if corner_index < len(corner_types)
                        else ""
                    )
                    radius_value = (
                        corner_radii[corner_index]
                        if corner_index < len(corner_radii)
                        else 0
                    )

                    is_round = _is_round_corner(corner_type)
                    is_chamfer = _is_chamfer_corner(corner_type)
                    if not is_round and not is_chamfer:
                        continue

                    radius = _safe_radius(radius_value, max_curve_radius)
                    if radius <= 0:
                        continue

                    center_x, center_y = _curve_center(
                        corner_index, radius, length_val, width_val
                    )

                    mac_index += 1
                    curve_attrs = {
                        "ID": "10",
                        "Type": "3",
                        "IsGenCode": "2",
                        "Face": "5",
                        "Depth": f"{thval:.6f}",
                        "X": f"{center_x:.6f}",
                        "Y": f"{center_y:.6f}",
                        "Z": "0.000000",
                        "Pocket": "0",
                        "SpatialLine": "0",
                        "ToolName": "0",
                        "MacIndex": str(mac_index),
                        "ToolOffset": "L",
                    }
                    curve_machining = ET.SubElement(
                        machines, "Machining", **curve_attrs
                    )
                    lines_el = ET.SubElement(curve_machining, "Lines")

                    if is_chamfer:
                        # Chamfer is represented as a single straight segment to the
                        # quarter-profile endpoint used by the CNC XML schema.
                        end_x, end_y = _curve_point(
                            corner_index, radius, length_val, width_val, math.pi / 2
                        )
                        ET.SubElement(
                            lines_el,
                            "Line",
                            LineID="1",
                            EndX=f"{end_x:.6f}",
                            EndY=f"{end_y:.6f}",
                            EndZ="0.000000",
                            Angle="0.000000",
                        )
                    else:
                        # Match reference density closely:
                        # R100 -> 1569, R50 -> 784, R150 -> 2355
                        line_count = max(8, int(radius * math.pi * 5) - 1)
                        for line_id in range(1, line_count + 1):
                            theta = (line_id / line_count) * (math.pi / 2)
                            end_x, end_y = _curve_point(
                                corner_index, radius, length_val, width_val, theta
                            )
                            ET.SubElement(
                                lines_el,
                                "Line",
                                LineID=str(line_id),
                                EndX=f"{end_x:.6f}",
                                EndY=f"{end_y:.6f}",
                                EndZ="0.000000",
                                Angle="0.000000",
                            )
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Error processing corner profiles: {e}")

            # 3. Grooves / Slots
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

            # EdgeGroup
            edge_group = ET.SubElement(panel, "EdgeGroup")

            edge_map = {
                "1": edge_bottom,
                "2": edge_top,
                "3": edge_left,
                "4": edge_right,
            }

            for f_id, material in edge_map.items():
                edge_attrs = {
                    "Face": f_id,
                    "Thickness": "0.000000",
                }
                if material:
                    edge_attrs["Material"] = material
                ET.SubElement(edge_group, "Edge", **edge_attrs)

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

        excel_path = os.path.join(xml_dir, "Cutting List.xlsx")

        cols1 = [
            "Order Number",
            "Company Name",
            "Cabinet Name",
            "Part Number",
            "Material",
            "length",
            "width",
            "thickness",
            "quantity",
            "colour",
            "texture",
            "Barcode",
            "Edge Left",
            "Edge Right",
            "Edge Top",
            "Edge Bottom",
            "grain",
        ]
        df1 = pd.DataFrame(sheet1_data, columns=cols1)

        cols2 = [
            "Barcode",
            "Part Name",
            "Hole Type",
            "X Pos",
            "Y Pos",
            "Face",
            "Diameter",
            "Depth",
            "Qty per Part",
            "Tool",
            "Total Holes",
            "Remarks",
        ]
        df2 = pd.DataFrame(sheet2_data, columns=cols2)

        with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
            # Write starting at row 3 (index 2) so row 1 and 2 are free
            df1.to_excel(writer, sheet_name="Cutting List", index=False, startrow=2)
            df2.to_excel(
                writer, sheet_name="Drilling Data (XML)", index=False, startrow=2
            )

            # Define styles
            header_fill = PatternFill(
                start_color="D9E1F2", end_color="D9E1F2", fill_type="solid"
            )
            bold_font = Font(bold=True)
            title_font = Font(bold=True, size=12)
            thin_border = Border(
                left=Side(style="thin"),
                right=Side(style="thin"),
                top=Side(style="thin"),
                bottom=Side(style="thin"),
            )

            # Format Sheet 1
            ws1 = writer.sheets["Cutting List"]
            ws1["A1"] = "CUTTING LIST FOR BEAM SAW"
            ws1["A1"].font = title_font

            last_col_letter = ws1.cell(row=3, column=ws1.max_column).column_letter
            ws1.merge_cells(f"A1:{last_col_letter}1")

            for row_idx, row in enumerate(
                ws1.iter_rows(
                    min_row=3,
                    max_row=ws1.max_row,
                    min_col=1,
                    max_col=ws1.max_column,
                ),
                start=3,
            ):
                for cell in row:
                    cell.border = thin_border
                    if row_idx == 3:  # Header row
                        cell.fill = header_fill
                        cell.font = bold_font

            # Format Sheet 2
            ws2 = writer.sheets["Drilling Data (XML)"]
            ws2["A1"] = "DRILLING DATA - 6-SIDED CNC MACHINE"
            ws2["A1"].font = title_font

            last_col_letter = ws2.cell(row=3, column=ws2.max_column).column_letter
            ws2.merge_cells(f"A1:{last_col_letter}1")

            for row_idx, row in enumerate(
                ws2.iter_rows(
                    min_row=3,
                    max_row=ws2.max_row,
                    min_col=1,
                    max_col=ws2.max_column,
                ),
                start=3,
            ):
                for cell in row:
                    cell.border = thin_border
                    if row_idx == 3:  # Header row
                        cell.fill = header_fill
                        cell.font = bold_font

            self.auto_adjust_column_width(ws1)
            self.auto_adjust_column_width(ws2)

        logger.info("Generated Excel file at: %s", excel_path)

        safe_design_name = re.sub(r'[\\/*?:"<>|]', "", design_name)
        zip_path = os.path.join(base_dir, f"xml_{safe_design_name}.zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root_dir, _, files in os.walk(xml_dir):
                for file in files:
                    file_path = os.path.join(root_dir, file)
                    arcname = os.path.relpath(file_path, base_dir)
                    zipf.write(file_path, arcname)
        logger.info("Generated XML zip file at: %s", zip_path)
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
    design_name: str = "files",
    order_number: str = "",
    company_name: str = "",
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

        packed_items = service.optimize(files, company_name=company_name)
        excel_path = service.generate_excel(packed_items, output)
        svg_paths = service.generate_svg(packed_items, output)
        layout_pdf_path = service.generate_layout_pdf(svg_paths, output)
        labels_pdf_path = service.generate_labels(packed_items, output)

        # New: Generate XMLs
        xml_paths = service.generate_xmls(
            packed_items, output, design_name, order_number, company_name
        )

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
                "data": packed_items,  # Return nested items data
                "message": "Nesting completed successfully.",
                "total_parts": len(packed_items),
            },
            status=HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Nesting failed")
        return JsonResponse({"error": str(e)}, status=500)
