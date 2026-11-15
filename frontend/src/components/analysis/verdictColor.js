import { VERDICT_RING, ringColor } from '../three/stage';

// One verdict colour language: the dark-theme colour is the 3D ring colour from stage.js;
// analysis.css supplies a darker twin for the paper theme (--v-light on each .an-v-* class).
export const vClass = (classification) => `an-v an-v-${VERDICT_RING[classification] ? classification : 'none'}`;
export const vStyle = (classification) => ({ '--v-dark': ringColor(classification) });
