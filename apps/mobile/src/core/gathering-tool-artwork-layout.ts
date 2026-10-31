/**
 * Safe viewport for the 4 × 3 gathering-tool atlas.
 *
 * The previous renderer enlarged the middle 88% of each tile to fill the
 * entire square. That removed 6% from every edge, clipping long rods and
 * handles. Keep a small sampling guard against neighbouring atlas cells,
 * then render the tile inside a padded square instead.
 *
 * Geometry lives outside React Native so small and large thumbnails can
 * share one framing rule and be regression tested.
 */
export const GATHERING_TOOL_CELL = 362;
export const GATHERING_TOOL_SHEET_WIDTH = GATHERING_TOOL_CELL * 4;
export const GATHERING_TOOL_SHEET_HEIGHT = GATHERING_TOOL_CELL * 3;

const ATLAS_EDGE_GUARD = 0.025;
const ICON_OUTER_PADDING = 0.03;

export interface GatheringToolArtworkLayout {
  viewportSize: number;
  viewportInset: number;
  atlasWidth: number;
  atlasHeight: number;
  left: number;
  top: number;
}

export function gatheringToolArtworkLayout(
  column: number,
  row: number,
  size: number,
): GatheringToolArtworkLayout | null {
  if (!Number.isFinite(size) || size <= 0 ||
      !Number.isInteger(column) || column < 0 || column >= 4 ||
      !Number.isInteger(row) || row < 0 || row >= 3) return null;

  const viewportInset = size * ICON_OUTER_PADDING;
  const viewportSize = size - viewportInset * 2;
  const usableSourceCell = GATHERING_TOOL_CELL * (1 - ATLAS_EDGE_GUARD * 2);
  const scale = viewportSize / usableSourceCell;

  return {
    viewportSize,
    viewportInset,
    atlasWidth: GATHERING_TOOL_SHEET_WIDTH * scale,
    atlasHeight: GATHERING_TOOL_SHEET_HEIGHT * scale,
    left: -(column + ATLAS_EDGE_GUARD) * GATHERING_TOOL_CELL * scale,
    top: -(row + ATLAS_EDGE_GUARD) * GATHERING_TOOL_CELL * scale,
  };
}
