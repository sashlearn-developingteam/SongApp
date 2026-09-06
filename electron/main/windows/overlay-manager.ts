import { BrowserWindow, screen } from 'electron';
import type { AppSettings, CurrentTrack } from '../../../src/types/core';
import { createOverlayWindow } from './window-factory';

export class OverlayManager {
  private windows = new Map<string, BrowserWindow>();
  private lastTrack: CurrentTrack | null = null;
  private settings: AppSettings | null = null;

  async sync(settings: AppSettings): Promise<void> {
    this.settings = settings;
    const displays = screen.getAllDisplays();
    const primaryId = String(screen.getPrimaryDisplay().id);
    const activeIds = new Set<string>();
    for (const display of displays) {
      const id = String(display.id);
      const preference = settings.monitorPreferences[id];
      const enabled = settings.overlaysVisible && (preference?.enabled ?? id === primaryId);
      if (!enabled) continue;
      activeIds.add(id);
      let window = this.windows.get(id);
      if (!window || window.isDestroyed()) {
        window = await createOverlayWindow(id, display.bounds, settings.alwaysOnTop);
        this.windows.set(id, window);
      } else {
        window.setBounds(display.bounds);
        window.setAlwaysOnTop(settings.alwaysOnTop);
        if (!window.isVisible()) window.showInactive();
      }
      window.webContents.send('settings:changed', settings);
      window.webContents.send('playback:changed', this.lastTrack);
    }
    for (const [id, window] of this.windows) {
      if (!activeIds.has(id)) { window.destroy(); this.windows.delete(id); }
    }
  }

  broadcastTrack(track: CurrentTrack | null): void {
    this.lastTrack = track;
    for (const window of this.windows.values()) if (!window.isDestroyed()) window.webContents.send('playback:changed', track);
  }

  setEditMode(enabled: boolean): void {
    for (const window of this.windows.values()) {
      window.setFocusable(enabled);
      window.setIgnoreMouseEvents(!enabled, { forward: true });
      window.webContents.send('overlay:edit-mode', enabled);
      if (enabled) window.focus();
    }
  }

  hideAll(): void { for (const window of this.windows.values()) window.hide(); }
  showAll(): void { for (const window of this.windows.values()) window.showInactive(); }
  destroy(): void { for (const window of this.windows.values()) window.destroy(); this.windows.clear(); }
}
