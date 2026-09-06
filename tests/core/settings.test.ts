import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERLAY_LAYOUT, DEFAULT_SETTINGS, mergeSettings, normalizeOverlayLayout, updateMonitorPreference } from '../../src/lib/settings';

describe('settings', () => {
  it('returns defaults for empty state', () => expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS));
  it('keeps unspecified defaults', () => expect(mergeSettings({theme:'light'}).desktopMode).toBe('minimal'));
  it('merges monitor preferences', () => expect(mergeSettings({monitorPreferences:{a:{enabled:true}}}).monitorPreferences.a.enabled).toBe(true));
  it('clamps persisted overlay layouts to safe bounds', () => expect(normalizeOverlayLayout({ x: 9, y: -9, scale: 4 })).toEqual({ x: .42, y: -.42, scale: 1.5 }));
  it('keeps an active display enabled when the first saved preference is layout-only', () => {
    const next = updateMonitorPreference(DEFAULT_SETTINGS, 'a', { mode:'chaos' });
    expect(next.a.enabled).toBe(true);
  });
  it('preserves monitor mode and layout while toggling the display', () => {
    const settings = mergeSettings({ monitorPreferences: { a: { enabled:true, mode:'chaos', layout: DEFAULT_OVERLAY_LAYOUT } } });
    const next = updateMonitorPreference(settings, 'a', { enabled:false });
    expect(next.a.mode).toBe('chaos');
    expect(next.a.layout).toEqual(DEFAULT_OVERLAY_LAYOUT);
  });
});
