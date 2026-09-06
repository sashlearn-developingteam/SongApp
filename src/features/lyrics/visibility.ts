import type { AppSettings, DisplayInfo } from '../../types/core';

type LyricsVisibilitySettings = Pick<AppSettings, 'overlaysVisible' | 'monitorPreferences'>;
type LyricsDisplay = Pick<DisplayInfo, 'id' | 'primary'>;

export function ensureLyricsVisibility(
  settings: LyricsVisibilitySettings,
  displays: LyricsDisplay[],
  patch: Partial<AppSettings>
): Partial<AppSettings> {
  if (patch.lyricsEnabled !== true) return patch;

  const primary = displays.find((display) => display.primary);
  if (!primary) {
    return { ...patch, overlaysVisible: true };
  }

  const mergedPreferences = {
    ...settings.monitorPreferences,
    ...(patch.monitorPreferences ?? {})
  };

  mergedPreferences[primary.id] = {
    ...(mergedPreferences[primary.id] ?? {}),
    enabled: true
  };

  return {
    ...patch,
    overlaysVisible: true,
    monitorPreferences: mergedPreferences
  };
}
