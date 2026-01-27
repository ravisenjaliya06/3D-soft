import { MinifixStandards } from '../minifix/types';
import { RootState } from '../store';

/**
 * Selectors for resolving design settings with three-layer fallback:
 * activeItem → activeDesign → designSettings
 */

export const selectResolvedMinifixDistance = (state: RootState): number =>
  state.activeItem.minifixDistance ??
  state.activeDesign.minifixDistance ??
  state.designSettings.minifixDistance;

export const selectResolvedMinifixDiameterHole = (state: RootState): number =>
  state.activeItem.minifixDiameterHole ??
  state.activeDesign.minifixDiameterHole ??
  state.designSettings.minifixDiameterHole;

export const selectResolvedCamDepth = (state: RootState): number =>
  state.activeItem.camDepth ?? state.activeDesign.camDepth ?? state.designSettings.camDepth;

export const selectResolvedCamDiameter = (state: RootState): number =>
  state.activeItem.camDiameter ??
  state.activeDesign.camDiameter ??
  state.designSettings.camDiameter;

export const selectResolvedCamHeight = (state: RootState): number =>
  state.activeItem.camHeight ?? state.activeDesign.camHeight ?? state.designSettings.camHeight;

export const selectResolvedEdgeBandingDistance = (state: RootState): number =>
  state.designSettings.edgeBandingDistance;

// Selector for header to show design-level values with fallback to defaults
export const selectHeaderMinifixDistance = (state: RootState): number =>
  state.activeDesign.minifixDistance ?? state.designSettings.minifixDistance;

export const selectHeaderMinifixDiameterHole = (state: RootState): number =>
  state.activeDesign.minifixDiameterHole ?? state.designSettings.minifixDiameterHole;

export const selectHeaderCamDepth = (state: RootState): number =>
  state.activeDesign.camDepth ?? state.designSettings.camDepth;

export const selectHeaderCamDiameter = (state: RootState): number =>
  state.activeDesign.camDiameter ?? state.designSettings.camDiameter;

export const selectHeaderCamHeight = (state: RootState): number =>
  state.activeDesign.camHeight ?? state.designSettings.camHeight;

export const selectMinifixStandards = (state: RootState): MinifixStandards => ({
  minifixDistance: selectResolvedMinifixDistance(state),
  minifixDiameterHole: selectResolvedMinifixDiameterHole(state),
  camDepth: selectResolvedCamDepth(state),
  camHeight: state.designSettings.camHeight,
  edgeBandingDistance: state.designSettings.edgeBandingDistance,
  screwDiameter: state.designSettings.screwDiameter,
  screwLength: state.designSettings.screwLength,
  camDiameter: state.designSettings.camDiameter,
  dowelDiameter: state.designSettings.dowelDiameter,
  dowelLength: state.designSettings.dowelLength,
  dowelDistance: state.designSettings.dowelDistance,
});
