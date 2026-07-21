export interface LayerVisibilityConfig {
  activeLevel: number;            // 0..7
  activeOpacity: number;          // recommended 0.82
  adjacentOpacity: number;        // recommended 0.28
  distantOpacity: number;         // recommended 0.08
  hiddenOpacity: number;          // 0
  maxVisibleDistance: number;     // recommended 3
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibilityConfig = {
  activeLevel: 0,
  activeOpacity: 0.82,
  adjacentOpacity: 0.28,
  distantOpacity: 0.08,
  hiddenOpacity: 0,
  maxVisibleDistance: 3,
};

export function opacityForLevel(level: number, config: LayerVisibilityConfig): number {
  const distance = Math.abs(level - config.activeLevel);
  if (distance === 0) return config.activeOpacity;
  if (distance === 1) return config.adjacentOpacity;
  if (distance <= config.maxVisibleDistance) return config.distantOpacity;
  return config.hiddenOpacity;
}

/*
Three.js integration:
material.transparent = true;
material.opacity = opacityForLevel(level, config);
material.depthWrite = material.opacity >= 0.5;
material.needsUpdate = true;

Pieces should remain fully opaque. Only board squares, grids and level frames fade.
Selected level should receive stronger edges and move highlights.
*/
