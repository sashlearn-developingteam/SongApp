import { create } from 'zustand';
import type { AppSettings, CurrentTrack, DisplayInfo, LyricsState, PlaybackEvent, SpotifyConnectionState } from '../types/core';
import { DEFAULT_SETTINGS } from '../lib/settings';

type AppStore = {
  settings: AppSettings;
  track: CurrentTrack | null;
  playbackEvent: PlaybackEvent | null;
  lyrics: LyricsState;
  displays: DisplayInfo[];
  spotify: SpotifyConnectionState;
  hydrated: boolean;
  setSettings: (settings: AppSettings) => void;
  setTrack: (track: CurrentTrack | null) => void;
  setPlaybackEvent: (event: PlaybackEvent | null) => void;
  setLyrics: (state: LyricsState) => void;
  setDisplays: (displays: DisplayInfo[]) => void;
  setSpotify: (state: SpotifyConnectionState) => void;
  setHydrated: (value: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  track: null,
  playbackEvent: null,
  lyrics: { status: 'idle', provider: null, trackKey: null, result: null },
  displays: [],
  spotify: { status: 'disconnected' },
  hydrated: false,
  setSettings: (settings) => set({ settings }),
  setTrack: (track) => set({ track }),
  setPlaybackEvent: (playbackEvent) => set({ playbackEvent }),
  setLyrics: (lyrics) => set({ lyrics }),
  setDisplays: (displays) => set({ displays }),
  setSpotify: (spotify) => set({ spotify }),
  setHydrated: (hydrated) => set({ hydrated })
}));
