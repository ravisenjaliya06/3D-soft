export const SKY_SETS = {
  daySky: {
    name: 'daySky',
    degreeCoordinate: {
      phi: 70,
      theta: 0,
    },
    material: {
      rayleigh: 2,
      turbidity: 2,
      mieCoefficient: 0.0001,
    },
  },
  nightSky: {
    name: 'nightSky',
    degreeCoordinate: {
      phi: 190,
      theta: 180,
    },
    material: {
      rayleigh: 0.1,
      turbidity: 0.1,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
    },
  },
};
