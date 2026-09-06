import type { AppSettings, MonitorPreference, OverlayLayout } from '../types/core';

export const DEFAULT_OVERLAY_LAYOUT: OverlayLayout = { x: 0, y: 0, scale: 1 };

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  visualTheme: 'editorial',
  desktopMode: 'minimal',
  overlaysVisible: true,
  alwaysOnTop: false,
  startWithWindows: false,
  reducedMotion: false,
  animationIntensity: 0.7,
  fpsTarget: 60,
  particleAmount: 0.45,
  chaosEnabled: false,
  chaosLevel: 1,
  chaosFrequency: 'normal',
  lyricsEnabled: false,
  monitorPreferences: {},
  editShortcut: 'CommandOrControl+Shift+L'
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeOverlayLayout(value?: Partial<OverlayLayout>): OverlayLayout {
  return {
    x: clamp(Number.isFinite(value?.x) ? Number(value?.x) : 0, -0.42, 0.42),
    y: clamp(Number.isFinite(value?.y) ? Number(value?.y) : 0, -0.42, 0.42),
    scale: clamp(Number.isFinite(value?.scale) ? Number(value?.scale) : 1, 0.6, 1.5)
  };
}

function normalizeMonitorPreference(value: MonitorPreference): MonitorPreference {
  return {
    ...value,
    layout: value.layout ? normalizeOverlayLayout(value.layout) : undefined
  };
}

export function mergeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  const monitorPreferences = Object.fromEntries(
    Object.entries(value?.monitorPreferences ?? {}).map(([id, preference]) => [id, normalizeMonitorPreference(preference)])
  );
  return {
    ...DEFAULT_SETTINGS,
    ...(value ?? {}),
    monitorPreferences
  };
}

export function updateMonitorPreference(
  settings: AppSettings,
  displayId: string,
  patch: Partial<MonitorPreference>
): Record<string, MonitorPreference> {
  const current = settings.monitorPreferences[displayId] ?? { enabled: true };
  const next: MonitorPreference = {
    ...current,
    ...patch,
    layout: patch.layout ? normalizeOverlayLayout({ ...current.layout, ...patch.layout }) : current.layout
  };
  return { ...settings.monitorPreferences, [displayId]: next };
}
