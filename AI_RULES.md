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
