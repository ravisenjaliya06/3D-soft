import { Material } from '../interface';

/**
 * Constants for L-shape object dimensions and configuration
 */
export const L_SHAPE_CONSTANTS = {
  DEFAULT_VERTICAL_HEIGHT: 100,
  DEFAULT_VERTICAL_DEPTH: 18,
  DEFAULT_VERTICAL_WIDTH: 18,
  DEFAULT_HORIZONTAL_HEIGHT: 20,
  DEFAULT_HORIZONTAL_DEPTH: 50,
  REDUCTION_AMOUNT: 25,
  GAP_THRESHOLD: 50,
  ALIGNMENT_THRESHOLD_FACTOR: 0.15,
  DISTANCE_THRESHOLD: 200,
  POSITION_TOLERANCE: 50,
  Y_OFFSET: -50,
} as const;

/**
 * Default material configuration for L-shape objects
 */
export function getDefaultLShapeMaterial(): Material[] {
  return [
    {
      id: crypto.randomUUID(),
      name: '3/4 1s Poplar Ply',
      type: 'Panel Stock',
      description: 'Poplar',
      textures: [
        {
          id: crypto.randomUUID(),
          name: 'First',
          texture: crypto.randomUUID(),
          textureDetail: {
            id: crypto.randomUUID(),
            name: 'Art Glass',
            organization: crypto.randomUUID(),
            type: 'Texture',
            image: '/media/textures/light_wood.jpg',
            url: '',
            width: 685,
            height: 685,
            decal: 0,
            title: 1,
          },
        },
      ],
      properties: {
        id: crypto.randomUUID(),
        unitOfIssue: 'Each',
        defaultCost: 10.0,
        sellPrice: 0.0,
        defaultMarkup: 0.0,
        salesTax: false,
        defaultTaxRate: 0.0,
        waste: 15.0,
        estimate: true,
        modelFile: null,
        cncOptimize: true,
        cncGrainDependent: true,
        cncDropWidth: null,
        cncDropLength: null,
        cncFeedRatePercent: 100.0,
        cncSpindleSpeedPercent: 100.0,
        cncMinimizeFaceChip: true,
        cncMinimizeBackChip: true,
        cncClimbCut: false,
        cncMaximumDepthPerPass: null,
        width: 1219.2,
        length: 2438.4,
        thickness: 19.1,
      },
    },
  ];
}
