import { screen } from 'electron';
import type { DisplayInfo } from '../../../src/types/core';

export function getDisplays(): DisplayInfo[] {
  const primaryId = String(screen.getPrimaryDisplay().id);
  return screen.getAllDisplays().map((display, index) => ({
    id: String(display.id),
    label: `Display ${index + 1}`,
    primary: String(display.id) === primaryId,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor
  }));
}
