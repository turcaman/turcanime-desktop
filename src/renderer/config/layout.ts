export const LAYOUT_CONFIG = {
  cardGap: 12,
  sidePadding: 20,
  minCardWidth: 140,
  maxCardWidth: 200,
};

function calcAvailable(containerWidth: number): number {
  return containerWidth - LAYOUT_CONFIG.sidePadding * 2;
}

function idealColumnCount(available: number): number {
  return Math.max(2, Math.floor((available + LAYOUT_CONFIG.cardGap) / (LAYOUT_CONFIG.maxCardWidth + LAYOUT_CONFIG.cardGap)));
}

export function calcCardWidth(containerWidth: number): number {
  const available = calcAvailable(containerWidth);
  let columns = idealColumnCount(available);
  let width = Math.floor((available - LAYOUT_CONFIG.cardGap * (columns - 1)) / columns);
  while (width > LAYOUT_CONFIG.maxCardWidth) {
    columns++;
    width = Math.floor((available - LAYOUT_CONFIG.cardGap * (columns - 1)) / columns);
  }
  return Math.max(LAYOUT_CONFIG.minCardWidth, width);
}

export function calcColumns(containerWidth: number): number {
  const available = calcAvailable(containerWidth);
  let columns = idealColumnCount(available);
  let width = Math.floor((available - LAYOUT_CONFIG.cardGap * (columns - 1)) / columns);
  while (width > LAYOUT_CONFIG.maxCardWidth) {
    columns++;
    width = Math.floor((available - LAYOUT_CONFIG.cardGap * (columns - 1)) / columns);
  }
  return columns;
}
