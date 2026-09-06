import { BrowserWindow, ipcMain, shell } from 'electron';
import type { PreferencesStore } from '../storage/preferences-store';
import type { SpotifyAuth } from '../spotify/auth';
import type { OverlayManager } from '../windows/overlay-manager';
import { getDisplays } from '../system/monitors';
import { getStartupEnabled, setStartupEnabled } from '../system/startup';
import { settingsPatchSchema } from './schemas';
import type {
  AppSettings,
  CurrentTrack,
  PlaybackEvent,
  PlaybackSnapshot,
  LyricsState,
  SimulatorScenario,
  SpotifyConnectionState
} from '../../../src/types/core';
import { isAllowedExternalUrl } from '../security/navigation-policy';
import { buildSimulatorScenario } from '../simulator/scenarios';
import { ensureLyricsVisibility } from '../../../src/features/lyrics/visibility';

function assertSender(event: Electron.IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) throw new Error('Unauthorized IPC sender.');
}

export type IpcDeps = {
  preferences: PreferencesStore;
  spotifyAuth: SpotifyAuth;
  overlays: OverlayManager;
  getMainWindow: () => BrowserWindow | null;
  getPlaybackSnapshot: () => PlaybackSnapshot;
  getLyricsState: () => LyricsState;
  refreshLyrics: () => Promise<LyricsState>;
  publishPlayback: (track: CurrentTrack | null, event?: PlaybackEvent | null) => void;
  publishSettings: (settings: AppSettings) => void;
  publishSpotifyState: (state: SpotifyConnectionState) => void;
  startPolling: () => void;
  stopPolling: () => void;
  onSettingsChanged: (settings: AppSettings) => void;
  setEditMode: (enabled: boolean) => void;
};

export function registerIpc(deps: IpcDeps): void {
  ipcMain.handle('settings:get', (event) => {
    assertSender(event);
    return deps.preferences.get();
  });

  ipcMain.handle('settings:update', async (event, patch) => {
    assertSender(event);
    const parsed = settingsPatchSchema.parse(patch);
    const effectivePatch = ensureLyricsVisibility(deps.preferences.get(), getDisplays(), parsed);
    const settings = await deps.preferences.update(effectivePatch);
    if (effectivePatch.startWithWindows !== undefined) setStartupEnabled(effectivePatch.startWithWindows);
    await deps.overlays.sync(settings);
    deps.onSettingsChanged(settings);
    deps.publishSettings(settings);
    return settings;
  });

  ipcMain.handle('system:displays', (event) => {
    assertSender(event);
    return getDisplays();
  });

  ipcMain.handle('system:startup:get', (event) => {
    assertSender(event);
    return getStartupEnabled();
  });

  ipcMain.handle('spotify:connect', async (event) => {
    assertSender(event);
    deps.publishSpotifyState({ status: 'connecting' });
    try {
      await deps.spotifyAuth.connect();
      const state: SpotifyConnectionState = { status: 'connected' };
      deps.publishSpotifyState(state);
      deps.startPolling();
      return state;
    } catch (error) {
      const state: SpotifyConnectionState = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Spotify connection failed.'
      };
      deps.publishSpotifyState(state);
      throw error;
    }
  });

  ipcMain.handle('spotify:disconnect', async (event) => {
    assertSender(event);
    deps.stopPolling();
    await deps.spotifyAuth.disconnect();
    deps.publishPlayback(null, { type: 'stopped' });
    const state: SpotifyConnectionState = { status: 'disconnected' };
    deps.publishSpotifyState(state);
    return state;
  });

  ipcMain.handle('spotify:state', async (event) => {
    assertSender(event);
    return { status: (await deps.spotifyAuth.connected()) ? 'connected' : 'disconnected' } satisfies SpotifyConnectionState;
  });

  ipcMain.handle('playback:snapshot', (event) => {
    assertSender(event);
    return deps.getPlaybackSnapshot();
  });

  ipcMain.handle('lyrics:state', (event) => {
    assertSender(event);
    return deps.getLyricsState();
  });

  ipcMain.handle('lyrics:refresh', async (event) => {
    assertSender(event);
    return deps.refreshLyrics();
  });

  ipcMain.handle('overlay:edit', (event, enabled: boolean) => {
    assertSender(event);
    deps.setEditMode(Boolean(enabled));
  });

  ipcMain.handle('overlay:visible', async (event, enabled: boolean) => {
    assertSender(event);
    const settings = await deps.preferences.update({ overlaysVisible: Boolean(enabled) });
    await deps.overlays.sync(settings);
    deps.onSettingsChanged(settings);
    deps.publishSettings(settings);
    return settings;
  });

  ipcMain.handle('simulator:run', (event, scenario: SimulatorScenario) => {
    assertSender(event);
    const output = buildSimulatorScenario(scenario, deps.getPlaybackSnapshot().track);
    deps.publishPlayback(output.track, output.event);
    return { ok: output.ok, message: output.message };
  });

  ipcMain.handle('external:open', async (event, url: string) => {
    assertSender(event);
    if (!isAllowedExternalUrl(url)) throw new Error('External URL is not allowed.');
    await shell.openExternal(url);
    return true;
  });
}
