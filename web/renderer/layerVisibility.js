import { DEFAULT_LAYER_VISIBILITY, opacityForLevel } from "../../src/rendering/visibility.ts";

/** Browser adapter: visible distant levels remain faint rather than disappearing. */
export function visibleLayerOpacity(levelIndex, activeLevel) {
  return opacityForLevel(levelIndex, { ...DEFAULT_LAYER_VISIBILITY, activeLevel, maxVisibleDistance: Number.MAX_SAFE_INTEGER });
}
