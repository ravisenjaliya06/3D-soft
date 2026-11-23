# Bravento Design Portal - AI Assistant Rules

These rules establish the strict architectural boundaries and required patterns for AI agents working on the Bravento 3D engine. Include these rules in your `.cursorrules` file or AI prompt instructions to ensure future AI instances have full context.

## 1. General Working Rules
- **TypeScript & React**: Write modern React code using hooks and functional components. Avoid `any` types where possible. Always check for nullable properties before accessing deep properties.
- **Redux State Management**: The absolute source of truth for the 3D scene is the Redux store (`data.objects`). Do not manually mutate Three.js meshes as a primary data source; instead, calculate the required payload and update Redux, then let the synchronizer handle the rendering.
- **UI Responsiveness**: 3D operations (especially geometry generation and grouping) are computationally heavy. Always use `showFullScreenLoader('Message')` and `hideFullScreenLoader()` around complex mesh builds to prevent the UI from freezing without visual feedback.
- **Hierarchy Deep Search**: When looking for existing child objects (like checking if a cupboard already has a door), **always use `mesh.traverse()`** instead of `mesh.children.find()`. Planks add nested hierarchies, meaning target objects are often deeper than 1 level.

## 2. 3D Spatial & Mathematical Logic (Three.js)
- **Coordinate Systems**: The system frequently converts between nested parent spaces. When calculating placement for doors, drawers, or planks:
  - **CRITICAL**: Always explicitly call `mesh.updateMatrixWorld(true)` and `parent.updateMatrixWorld(true)` right before performing `localToWorld` or `worldToLocal` calculations. Failure to do this will result in items floating outside the cupboard because of stale matrices.
- **Bounding Boxes over Parameters**: Always establish the width and height of a space by doing `geometry.computeBoundingBox()` and measuring `max - min`, rather than relying on `geometry.parameters`, because grouped items and dynamic compartments alter the real bounds.
- **Root Resolution in Array Payload**: When sending an array of `MeshObjectData` to `SyncManager` or `DesignBuilder`, the system determines the root object by finding the one object whose parent ID does not exist within the current payload array.

## 3. Core System Taxonomy
Ensure the correct `type` flags are set to trigger specific physics and collision rules:
- **Main Cupboards (`OBJECT_TYPES.CUPBOARD` / `isMain: true`)**: The absolute root container for a piece of furniture.
- **Compartments (`INVISIBLE_BOXES.INVISIBLE_BOX`)**: When a cupboard is divided by physical planks, the engine instantly calculates the empty living space and generates invisible compartment boxes. These are the target nodes when users click to add interior drawers or doors.
- **The `isMain` Flag**: Dictates hierarchy extraction. 
  - `isMain: true`: Tells the system "I am a standalone, independent piece of furniture."
  - `isMain: false`: Tells the system "I am an attached part." (e.g. Left/Right doors of a Double Door group MUST be `false`, or the engine will detach them and throw them to world origin).

## 4. Architectural Boundaries
- **`SyncManager` (`syncState.tsx`)**: The bridge between Redux and Three.js. It diffs the old and new JSON states, creating atomic patches. If you need to manipulate how data enters the scene globally, it happens here.
- **`MeshBuilder` (`meshBuilder.tsx`)**: Responsible strictly for raw mesh generation from JSON. It handles building `THREE.BoxGeometry`, mapping textures, and painting specific edges with edge banding. 
- **Scene Assembly (`design/scene.tsx` / `handler/items.tsx`)**: This is where mathematical positioning is done. UI interactions trigger these functions, which calculate exact 3D coordinates based on the selected target, generate the JSON `MeshObjectData`, and pass it to the builders.
- **Banding & Grooving**: Planks dynamically inherit edge banding materials from their parent cupboards. Never forcefully clear a plank's material array without checking the parent's `MATERIAL_TYPES.BANDING` fallback.

## 5. Nesting System

### Backend (`backend/design/`)

- **Entry Point**: `nest.py` → `NestingService` class. The main flow is:
  1. `optimize(files)` — packs all parts, returns a flat `all_packed_items` list.
  2. `generate_excel(packed_items, output_path)` — writes `nesting.xlsx`.
  3. `generate_svg(packed_items, output_path)` — writes per-sheet SVGs.
  4. `generate_layout_pdf(svg_paths, output_path)` — writes `nesting_layout.pdf`.
  5. `generate_json(packed_items, output_path)` — writes `nesting_data.json` for the frontend visualizer.

- **`packed_items` structure** (each item in the list):
  ```json
  {
    "name": "VERTICAL_PLANK",
    "id": "catalog-uuid",
    "unique_id": "A1.3",
    "sheet_num": "A1",
    "dimensions": "600.00 x 1000.00",
    "width": 600.0,
    "height": 1000.0,
    "x": 12.5,
    "y": 305.0,
    "is_rotated": false,
    "depth": 18.0,
    "material_name": "White Board",
    "minifix_holes": [ /* list of hole objects with type, face, local_position2_d, diameter */ ],
    "grooves": [ /* list of groove objects with x, y, end_x, end_y, width */ ]
  }
  ```

- **Download Endpoint**: `PUT design/<design_id>/nesting/download/` with body `{"format": "json"}`.
  - If `nesting_data.json` doesn't exist on disk, the endpoint **automatically re-runs nesting** first, then returns the data.
  - For other formats (pdf, xlsx, gcode, etc.) it returns a `{"file": "path"}` response pointing to a static media file.

- **Output files** are stored at: `umaboy/media/output/<design_id>/`
  - `nesting_layout.pdf`, `nesting.xlsx`, `nesting_gcodes.zip`, `nesting_data.json`

### Frontend (`design_portal/src/`)

- **Pages**: `src/pages/design/[designid]/nesting-details.tsx` — Next.js page wrapper.
- **Component**: `src/components/mes/nestingDetails.tsx` — Main interactive viewer.
  - Fetches `nesting_data.json` via `PUT /design/<id>/nesting/download/` with `{ format: "json" }`.
  - Groups `packed_items` by `sheet_num` and renders a sheet selector sidebar.
  - Draws each sheet as an SVG with `<rect>` per plank, `<circle>` for face holes, `<rect>` for edge holes, and `<line>` for grooves.
  - SVG `viewBox` is `"0 0 2540 1320"` (default sheet + 50px margin each side for `2440x1220` sheet).
- **Nesting page**: `src/components/mes/nesting.tsx`
  - Removed PDF download option; only XLSX and G-Codes remain.
  - "View Details" button navigates to `/design/[id]/nesting-details`.
  - Uses `router.query.designid` to get the current design ID.

## 6. UI Redesign
- Any visual/UI change must follow `design_portal/DESIGN_RULES.md` (style-only changes, `--bv-*` tokens, one page at a time, no functional changes).
