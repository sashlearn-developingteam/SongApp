export type ProviderSource = 'spotify' | 'simulator';
export type DesktopMode = 'minimal' | 'typography' | 'chaos' | 'ambience';
export type ThemeId = 'editorial' | 'terminal' | 'cinematic' | 'y2k' | 'brutalist' | 'cyber';
export type ThemePreference = 'system' | 'dark' | 'light';

export type CurrentTrack = {
  source: ProviderSource;
  spotifyId?: string;
  title: string;
  artists: string[];
  album: string;
  albumImage?: string;
  spotifyUrl?: string;
  durationMs: number;
  progressMs?: number;
  playing: boolean;
};

export type PlaybackEvent =
  | { type: 'track-changed'; track: CurrentTrack }
  | { type: 'paused'; track: CurrentTrack }
  | { type: 'resumed'; track: CurrentTrack }
  | { type: 'stopped' }
  | { type: 'rapid-skip'; count: number }
  | { type: 'replay'; track: CurrentTrack };

export type PlaybackSnapshot = {
  track: CurrentTrack | null;
  event: PlaybackEvent | null;
};

export type DisplayInfo = {
  id: string;
  label: string;
  primary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
};

export type LyricsRights = {
  canDisplay: boolean;
  canSynchronize: boolean;
  canCache: boolean;
  cacheDurationMs?: number;
  attribution?: string;
  territories?: string[];
  commercialUse: boolean;
};

export type LyricLine = { text: string; startMs?: number; endMs?: number };
export type LyricsResult = { provider: string; lines: LyricLine[]; rights: LyricsRights };

export type OverlayLayout = {
  x: number;
  y: number;
  scale: number;
};

export type MonitorPreference = {
  enabled: boolean;
  mode?: DesktopMode;
  layout?: OverlayLayout;
};

export type AppSettings = {
  theme: ThemePreference;
  visualTheme: ThemeId;
  desktopMode: DesktopMode;
  overlaysVisible: boolean;
  alwaysOnTop: boolean;
  startWithWindows: boolean;
  reducedMotion: boolean;
  animationIntensity: number;
  fpsTarget: 30 | 60;
  particleAmount: number;
  chaosEnabled: boolean;
  chaosLevel: 0 | 1 | 2 | 3;
  chaosFrequency: 'low' | 'normal' | 'high';
  lyricsEnabled: boolean;
  monitorPreferences: Record<string, MonitorPreference>;
  editShortcut: string;
};

export type SpotifyConnectionState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; displayName?: string }
  | { status: 'error'; message: string };

export type SimulatorScenario =
  | 'track-start'
  | 'track-change'
  | 'pause'
  | 'resume'
  | 'rapid-skip'
  | 'replay'
  | 'missing-artwork'
  | 'long-track'
  | 'offline'
  | 'rate-limit'
  | 'expired-token';

export type SimulatorResult = {
  ok: boolean;
  message: string;
};
