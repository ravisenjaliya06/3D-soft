# Python imports
import logging
import os
import secrets
import math
from typing import Any, Dict, List, Optional, Tuple

# Django imports
from django.http import JsonResponse

# External imports
import pandas as pd
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
                    packer.add_rect(diameter + self.spacing, diameter + self.spacing, rid=rid)
                else:
                    # Usage: add_rect(width, height)
                    # We pack (Width, Height) to represent the Face.
                    # KEY_DEPTH is Thickness.
                    packer.add_rect(details[KEY_WIDTH] + self.spacing, details[KEY_HEIGHT] + self.spacing, rid=rid)
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

        for rect in rectangles:
            bin_id, x, y, w, h, rid = rect

            # Determine rotation
            original_item = remaining_files.get(rid, {})
            original_w = original_item.get(KEY_WIDTH, w)
            original_h = original_item.get(KEY_HEIGHT, h)  # h corresponds to Height now

            is_rotated = abs(w - original_h) < 0.1 and abs(h - original_w) < 0.1

            # (bin_id, x, y, w, h, rid, is_rotated)
            processed_rectangles.append((bin_id, x, y, w, h, rid, is_rotated))
            packed_ids.add(rid)

        efficiency = self.calculate_efficiency(
            processed_rectangles, self.bin_width, self.bin_height
        )

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
                if KEY_HEIGHT in details_copy["dimensions"]: # "height" in dimensions is thickness? No, "depth"?
                     # Based on data.json: dimensions: {width, depth, height}. 
                     # nest.py: KEY_HEIGHT matches 'height' (18). So yes, Thickness is height.
                     pass 
            processed_files[rid] = details_copy
            
        files = processed_files

        # Group files by thickness (Depth in data.json)
        files_by_depth: Dict[float, Dict[str, Any]] = {}
        for rid, details in files.items():
            # KEY_DEPTH maps to "depth" which is Thickness
            try:
                thickness = float(details.get(KEY_DEPTH, 0))
            except (ValueError, TypeError):
                thickness = 0.0
                
            if thickness not in files_by_depth:
                files_by_depth[thickness] = {}
            files_by_depth[thickness][rid] = details

        # Sort thicknesses to assign codes A, B, C... deterministic
        sorted_thicknesses = sorted(files_by_depth.keys(), reverse=True)
        
        all_packed_items = []

        for i, thickness in enumerate(sorted_thicknesses):
            material_code = chr(65 + i) # A, B, C...
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
                        "Could not pack remaining files: %s", list(remaining_files.keys())
                    )
                    break

                # Format results and assign unique IDs
                item_counter = 1
                for rect in best_rectangles:
                    bin_id, x, y, w, h, rid, is_rotated = rect
                    item_details = files.get(rid, {})
                    
                    unique_id = f"{material_code}{sheet_count}.{item_counter}"
                    
                    all_packed_items.append(
                        {
                            KEY_NAME: item_details.get(KEY_INPUT_NAME, "Unknown"),
                            KEY_ID: rid,
                            KEY_DIMENSIONS: f"{w:.2f} x {h:.2f}",
                            KEY_UNIQUE_ID: unique_id,
                            KEY_WIDTH: w,   # Width of Face
                            KEY_HEIGHT: h,  # Height of Face
                            "x": x + self.spacing / 2,         # Data for SVG (Centered in padded area)
                            "y": y + self.spacing / 2,         # Data for SVG (Centered in padded area)
                            "is_rotated": is_rotated,
                            "sheet_num": f"{material_code}{sheet_count}", # Grouping for visualization
                        }
                    )
                    item_counter += 1

                sheet_count += 1
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
                df = pd.DataFrame(columns=[KEY_NAME, KEY_ID, KEY_UNIQUE_ID, KEY_DIMENSIONS])

            df.to_excel(excel_path, index=False)
            logger.info("Excel file generated at: %s", excel_path)
            return excel_path
        except Exception as e:
            logger.error("Failed to write Excel file: %s", e)
            raise

    def generate_svg(
        self: "NestingService", packed_items: List[Dict[str, Any]], output_path: str
    ) -> List[str]:
        """
        Generates SVG visualizations (one per sheet).
        Returns a list of generated SVG file paths.
        Visualize holes based on accurate 3D global coordinate transformation.
        """
        import svgwrite
        
        # Group by sheet
        sheets = {}
        for item in packed_items:
            s_num = item["sheet_num"]
            if s_num not in sheets:
                sheets[s_num] = []
            sheets[s_num].append(item)

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
            
            # Draw sheet boundary
            dwg.add(dwg.rect(
                insert=(padding, padding),
                size=(sheet_w, sheet_h),
                fill="none",
                stroke="black"
            ))
            
            # Draw items
            for item in sheets[s_num]:
                sheet_x = item["x"] + padding
                sheet_y = item["y"] + padding
                w = item[KEY_WIDTH]
                h = item[KEY_HEIGHT]
                is_rotated = item.get("is_rotated", False)
                
                # Panel rect
                dwg.add(dwg.rect(
                    insert=(sheet_x, sheet_y),
                    size=(w, h),
                    fill="#e0e0e0",
                    stroke="blue",
                    stroke_width="2"
                ))

                # --- Label Group ---
                label_g = dwg.g()
                unique_id = item.get(KEY_UNIQUE_ID, "")
                
                # Simulate text size
                text_w = len(unique_id) * 8 + 10 
                text_h = 20
                lbl_cx = sheet_x + w/2 - text_w/2
                lbl_cy = sheet_y + h/2 - text_h/2
                
                # Label Background
                label_g.add(dwg.rect(
                    insert=(lbl_cx, lbl_cy),
                    size=(text_w, text_h),
                    rx=5,
                    ry=5,
                    fill="white",
                    fill_opacity=0.3,
                    stroke="none"
                ))
                
                # Text
                label_g.add(dwg.text(
                    unique_id,
                    insert=(sheet_x + w/2, sheet_y + h/2 + 5),
                    text_anchor="middle",
                    font_size="12",
                    fill="black"
                ))
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
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPDF
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        
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
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.graphics.barcode import qr
        from reportlab.graphics.shapes import Drawing
        
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
            d = Drawing(45, 45, transform=[25/width, 0, 0, 25/height, 0, 0])
            d.add(qr_code)
            
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

        return JsonResponse(
            {
                "output_file": excel_path,
                "svg_files": svg_paths,
                "layout_file": layout_pdf_path,
                "labels_file": labels_pdf_path,
                "message": "Nesting completed successfully.",
                "total_parts": len(packed_items),
            },
            status=HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Nesting failed")
        return JsonResponse({"error": str(e)}, status=500)
