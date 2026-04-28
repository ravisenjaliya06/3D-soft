// Shared typing contract for scene payload sent from rendering page to render service.
export interface ArchitecturalSceneData {
  room: {
    type: string;
    floor: {
      material: string;
      hex: string;
    };
  };
  walls: Array<{
    id: string;
    type: string;
    length: number;
    height: number;
    position: {
      x: number;
      y: number;
      z: number;
    };
  }>;
  catalogs: Array<{
    name: string;
    type: string;
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation: {
      y: number;
    };
    material: Array<{
      name: string;
      type: string;
      hex: string;
    }>;
  }>;
}

// Rendering defaults used when room metadata is missing from design state.
export const DEFAULT_ROOM = {
  type: 'kitchen',
  floor: {
    material: 'marble',
    hex: '#FFFFFF',
  },
};
