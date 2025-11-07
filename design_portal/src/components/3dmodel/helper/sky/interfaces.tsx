export interface SkySet {
  name: string;
  degreeCoordinate: {
    phi: number; // Polar angle (0 to 180 degrees)
    theta: number; // Azimuthal angle (0 to 360 degrees)
  };
  material: {
    rayleigh: number;
    turbidity: number;
    mieCoefficient: number;
    mieDirectionalG?: number | null;
  };
}
