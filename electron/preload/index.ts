import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  CurrentTrack,
  DisplayInfo,
  PlaybackEvent,
  PlaybackSnapshot,
  SimulatorResult,
  SimulatorScenario,
  SpotifyConnectionState
} from '../../src/types/core';

type Unsubscribe = () => void;
function subscribe<T>(channel: string, callback: (value: T) => void): Unsubscribe {
  const handler = (_event: Electron.IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:update', patch),
    onChanged: (callback: (settings: AppSettings) => void) => subscribe('settings:changed', callback)
  },
  spotify: {
    connect: (): Promise<SpotifyConnectionState> => ipcRenderer.invoke('spotify:connect'),
    disconnect: (): Promise<SpotifyConnectionState> => ipcRenderer.invoke('spotify:disconnect'),
    getConnectionState: (): Promise<SpotifyConnectionState> => ipcRenderer.invoke('spotify:state'),
    onChanged: (callback: (state: SpotifyConnectionState) => void) => subscribe('spotify:changed', callback)
  },
  playback: {
    getSnapshot: (): Promise<PlaybackSnapshot> => ipcRenderer.invoke('playback:snapshot'),
    onChanged: (callback: (track: CurrentTrack | null) => void) => subscribe('playback:changed', callback),
    onEvent: (callback: (event: PlaybackEvent) => void) => subscribe('playback:event', callback)
  },
  overlay: {
    setEditMode: (enabled: boolean): Promise<void> => ipcRenderer.invoke('overlay:edit', enabled),
    setVisible: (enabled: boolean): Promise<AppSettings> => ipcRenderer.invoke('overlay:visible', enabled),
    onEditMode: (callback: (enabled: boolean) => void) => subscribe('overlay:edit-mode', callback)
  },
  system: {
    getDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke('system:displays'),
    getStartupEnabled: (): Promise<boolean> => ipcRenderer.invoke('system:startup:get')
  },
  simulator: {
    run: (scenario: SimulatorScenario): Promise<SimulatorResult> => ipcRenderer.invoke('simulator:run', scenario)
  },
  external: {
    open: (url: string): Promise<boolean> => ipcRenderer.invoke('external:open', url)
  }
};

contextBridge.exposeInMainWorld('songApp', api);
export type SongAppApi = typeof api;
