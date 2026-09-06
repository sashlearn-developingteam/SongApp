import { app, BrowserWindow, globalShortcut, powerMonitor, screen } from 'electron';
import { createMainWindow } from './windows/window-factory';
import { OverlayManager } from './windows/overlay-manager';
import { PreferencesStore } from './storage/preferences-store';
import { SecureTokenStore } from './storage/secure-token-store';
import { SpotifyAuth } from './spotify/auth';
import { SpotifyClient } from './spotify/client';
import { PlaybackPoller } from './spotify/playback-poller';
import { registerIpc } from './ipc/handlers';
import { createTray } from './system/tray';
import { createPlaybackMemory, detectPlaybackEvents } from '../../src/features/playback-events';
import type {
  AppSettings,
  CurrentTrack,
  PlaybackEvent,
  PlaybackSnapshot,
  SpotifyConnectionState
} from '../../src/types/core';

const clientId = import.meta.env.MAIN_VITE_SPOTIFY_CLIENT_ID ?? '';
const redirectUri = import.meta.env.MAIN_VITE_SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:43821/callback';
let mainWindow: BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let editMode = false;
let overlayVisible = true;
let isQuitting = false;
let currentTrack: CurrentTrack | null = null;
let lastPlaybackEvent: PlaybackEvent | null = null;
let activeShortcut = '';
let requestedShortcut = '';

const playbackMemory = createPlaybackMemory();
const preferences = new PreferencesStore();
const tokenStore = new SecureTokenStore();
const spotifyAuth = new SpotifyAuth(clientId, redirectUri, tokenStore);
const spotifyClient = new SpotifyClient(clientId, tokenStore);
const overlays = new OverlayManager();

function publishToAll(channel: string, value: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, value);
  }
}

function publishSettings(settings: AppSettings): void {
  publishToAll('settings:changed', settings);
}

function publishSpotifyState(state: SpotifyConnectionState): void {
  publishToAll('spotify:changed', state);
}

function publishPlayback(track: CurrentTrack | null, forcedEvent?: PlaybackEvent | null): void {
  const detected = detectPlaybackEvents(playbackMemory, track);
  currentTrack = track;
  overlays.broadcastTrack(track);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('playback:changed', track);

  const events = forcedEvent ? [forcedEvent] : detected;
  for (const event of events) {
    lastPlaybackEvent = event;
    publishToAll('playback:event', event);
  }
}

function getPlaybackSnapshot(): PlaybackSnapshot {
  return { track: currentTrack, event: lastPlaybackEvent };
}

const poller = new PlaybackPoller(spotifyClient, publishPlayback, (message) => {
  console.warn(`[Song App] Spotify polling: ${message}`);
});

const setEditMode = (enabled: boolean): void => {
  editMode = enabled;
  overlays.setEditMode(enabled);
};

async function boot(): Promise<void> {
  const settings = await preferences.load();
  mainWindow = await createMainWindow();
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  const installShortcut = (shortcut: string) => {
    if (shortcut === requestedShortcut) return;
    requestedShortcut = shortcut;
    globalShortcut.unregisterAll();
    const toggle = () => setEditMode(!editMode);
    try {
      const registered = globalShortcut.register(shortcut, toggle);
      if (registered) {
        activeShortcut = shortcut;
        return;
      }
    } catch (error) {
      console.warn(`[Song App] Invalid global shortcut "${shortcut}". Falling back to the default.`, error);
    }
    const fallback = 'CommandOrControl+Shift+L';
    try {
      if (globalShortcut.register(fallback, toggle)) activeShortcut = fallback;
    } catch (error) {
      console.error('[Song App] Failed to register the fallback edit shortcut.', error);
      activeShortcut = '';
    }
  };

  const onSettingsChanged = (next: AppSettings) => {
    overlayVisible = next.overlaysVisible;
    if (next.editShortcut !== requestedShortcut) installShortcut(next.editShortcut);
  };

  installShortcut(settings.editShortcut);
  registerIpc({
    preferences,
    spotifyAuth,
    overlays,
    getMainWindow: () => mainWindow,
    getPlaybackSnapshot,
    publishPlayback,
    publishSettings,
    publishSpotifyState,
    startPolling: () => poller.start(),
    stopPolling: () => poller.stop(),
    onSettingsChanged,
    setEditMode
  });

  await overlays.sync(settings);
  overlayVisible = settings.overlaysVisible;

  tray = createTray({
    open: () => {
      mainWindow?.show();
      mainWindow?.focus();
    },
    toggleOverlays: () => {
      overlayVisible = !overlayVisible;
      void preferences.update({ overlaysVisible: overlayVisible }).then(async (next) => {
        overlayVisible = next.overlaysVisible;
        await overlays.sync(next);
        publishSettings(next);
      });
    },
    editLayout: () => setEditMode(!editMode),
    disconnect: () => {
      poller.stop();
      void spotifyAuth.disconnect().then(() => publishSpotifyState({ status: 'disconnected' }));
      publishPlayback(null, { type: 'stopped' });
    }
  });

  screen.on('display-added', () => void overlays.sync(preferences.get()));
  screen.on('display-removed', () => void overlays.sync(preferences.get()));
  screen.on('display-metrics-changed', () => void overlays.sync(preferences.get()));

  powerMonitor.on('suspend', () => {
    poller.stop();
    overlays.hideAll();
  });
  powerMonitor.on('resume', () => {
    if (preferences.get().overlaysVisible) overlays.showAll();
    void spotifyAuth.connected().then((connected) => {
      if (connected) poller.start();
    });
  });
  powerMonitor.on('lock-screen', () => overlays.hideAll());
  powerMonitor.on('unlock-screen', () => {
    if (preferences.get().overlaysVisible) overlays.showAll();
  });

  if (await spotifyAuth.connected()) poller.start();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
  app.whenReady().then(boot).catch((error) => {
    console.error(error);
    app.quit();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  poller.stop();
  globalShortcut.unregisterAll();
  overlays.destroy();
});
app.on('window-all-closed', () => {
  /* tray-first app: keep the process alive */
});
