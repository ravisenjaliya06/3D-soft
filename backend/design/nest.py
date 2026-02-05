# Python imports
import secrets
import logging
import os
from typing import Dict, List, Tuple, Any, Optional

# Django imports
from django.http import JsonResponse

# External imports
import pandas as pd
from rectpack import SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE, newPacker

# App imports
from rest_framework.status import HTTP_200_OK

from .constant import KEY_NAME, KEY_ID, KEY_DIMENSIONS, KEY_WIDTH, KEY_HEIGHT, KEY_TYPE, KEY_RADIUS, TYPE_CIRCLE, KEY_INPUT_NAME

logger = logging.getLogger(__name__)

class NestingService:
    """
    Service class responsible for optimal nesting of parts and generating an Excel report.
    Adheres to 'One Function One Work' principle.
    """
    
    SORT_ALGORITHMS = [SORT_AREA, SORT_PERI, SORT_RATIO, SORT_SSIDE]

    def __init__(self, width: int, height: int, target_efficiency: float = 95.0, allow_rotation: bool = True):
        self.bin_width = width
        self.bin_height = height
        self.target_efficiency = target_efficiency
        self.allow_rotation = allow_rotation

    @staticmethod
    def calculate_efficiency(rectangles: List[Tuple], width: int, height: int) -> float:
        """
        Calculate the efficiency of layout for a single sheet.
        """
        if not rectangles:
            return 0.0
        used_area = sum(rect[3] * rect[4] for rect in rectangles)
        return (used_area / (width * height)) * 100

    def _prepare_packer(self, sort_algo: int) -> Any:
        """
        Initialize and configure a new Packer instance with a specific sort algorithm.
        """
        packer = newPacker(sort_algo=sort_algo, rotation=self.allow_rotation)
        packer.add_bin(self.bin_width, self.bin_height)
        return packer

    def _pack_rectangles(self, packer: Any, remaining_files: Dict[str, Any]) -> None:
        """
        Add rectangles to the packer instance.
        """
        for rid, details in remaining_files.items():
            try:
                if details[KEY_TYPE] == TYPE_CIRCLE:
                    diameter = 2 * details[KEY_RADIUS]
                    packer.add_rect(diameter, diameter, rid=rid)
                else:
                    packer.add_rect(details[KEY_WIDTH], details[KEY_HEIGHT], rid=rid)
            except KeyError:
                continue

    def _process_packed_results(
        self, packer: Any, remaining_files: Dict[str, Any]
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
            original_h = original_item.get(KEY_HEIGHT, h)
            
            is_rotated = abs(w - original_h) < 0.1 and abs(h - original_w) < 0.1
            
            # (bin_id, x, y, w, h, rid, is_rotated)
            processed_rectangles.append((bin_id, x, y, w, h, rid, is_rotated))
            packed_ids.add(rid)

        efficiency = self.calculate_efficiency(processed_rectangles, self.bin_width, self.bin_height)
        
        unplaced = {
            rid: data for rid, data in remaining_files.items() if rid not in packed_ids
        }

        return processed_rectangles, efficiency, unplaced

    def _try_single_packing_pass(self, remaining_files: Dict[str, Any]) -> Tuple[List[Tuple], float, Dict[str, Any]]:
        """
        Attempt to pack *once* using a random sort algorithm.
        """
        algo = secrets.choice(self.SORT_ALGORITHMS)
        packer = self._prepare_packer(algo)
        self._pack_rectangles(packer, remaining_files)
        packer.pack()
        return self._process_packed_results(packer, remaining_files)

    def optimize(self, files: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Main optimization loop. Processes all files, creating multiple sheets if necessary, 
        and returns a flat list of all nested parts.
        """
        remaining_files = dict(files)
        all_packed_items = []
        sheet_count = 0

        while remaining_files:
            best_eff = 0.0
            best_rectangles = None
            best_unplaced = {}
            
            # Retry mechanism for better efficiency per sheet
            attempts = 0
            while attempts < 6:
                rectangles, eff, unplaced_try = self._try_single_packing_pass(remaining_files)
                
                if eff > best_eff:
                    best_eff = eff
                    best_rectangles = rectangles
                    best_unplaced = unplaced_try
                
                if best_eff >= self.target_efficiency:
                    break
                attempts += 1
            
            if not best_rectangles and not best_eff:
                logger.warning("Could not pack remaining files: %s", list(remaining_files.keys()))
                break

            sheet_count += 1
            
            # Format results for this batch
            for rect in best_rectangles:
                _, _, _, w, h, rid, _ = rect
                item_details = files.get(rid, {})
                
                all_packed_items.append({
                    KEY_NAME: item_details.get(KEY_INPUT_NAME, "Unknown"),
                    KEY_ID: rid,
                    KEY_DIMENSIONS: f"{w:.2f} x {h:.2f}"
                })
            
            remaining_files = best_unplaced

        return all_packed_items

    def generate_excel(self, packed_items: List[Dict[str, Any]], output_path: str) -> str:
        """
        Generates and saves the Excel report.
        """
        excel_path = os.path.splitext(output_path)[0] + ".xlsx"
        try:
            df = pd.DataFrame(packed_items)
            if not df.empty:
               df = df[[KEY_NAME, KEY_ID, KEY_DIMENSIONS]]
            else:
               df = pd.DataFrame(columns=[KEY_NAME, KEY_ID, KEY_DIMENSIONS])
            
            df.to_excel(excel_path, index=False)
            logger.info("Excel file generated at: %s", excel_path)
            return excel_path
        except Exception as e:
            logger.error("Failed to write Excel file: %s", e)
            raise

# --- Module Wrapper for Backward Compatibility / View Usage ---
def nest(
    output: str,
    files: Dict[str, Any],
    wbin: int,
    hbin: int,
    enclosing_rectangle: bool = False,
    target_efficiency: float = 95.0,
    allow_rotation: bool = True,
    design_setting: Any = None,
) -> JsonResponse:
    """
    Wrapper function to use the NestingService.
    """
    try:
        service = NestingService(
            width=wbin,
            height=hbin,
            target_efficiency=target_efficiency,
            allow_rotation=allow_rotation
        )
        
        packed_items = service.optimize(files)
        excel_path = service.generate_excel(packed_items, output)
        
        return JsonResponse(
            {
                "output_file": excel_path,
                "message": "Nesting completed successfully.",
                "total_parts": len(packed_items)
            },
            status=HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Nesting failed")
        return JsonResponse({"error": str(e)}, status=500)
