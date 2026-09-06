import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export function useBridge(): void {
  const setSettings = useAppStore((s) => s.setSettings);
  const setTrack = useAppStore((s) => s.setTrack);
  const setPlaybackEvent = useAppStore((s) => s.setPlaybackEvent);
  const setLyrics = useAppStore((s) => s.setLyrics);
  const setDisplays = useAppStore((s) => s.setDisplays);
  const setSpotify = useAppStore((s) => s.setSpotify);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      window.songApp.settings.get(),
      window.songApp.system.getDisplays(),
      window.songApp.spotify.getConnectionState(),
      window.songApp.playback.getSnapshot(),
      window.songApp.lyrics.getState()
    ]).then(([settings, displays, spotify, snapshot, lyrics]) => {
      if (!alive) return;
      setSettings(settings);
      setDisplays(displays);
      setSpotify(spotify);
      setTrack(snapshot.track);
      setPlaybackEvent(snapshot.event);
      setLyrics(lyrics);
      setHydrated(true);
    }).catch((error) => {
      console.error('[Song App] Bridge hydration failed', error);
      if (alive) setHydrated(true);
    });

    const offSettings = window.songApp.settings.onChanged(setSettings);
    const offPlayback = window.songApp.playback.onChanged(setTrack);
    const offPlaybackEvent = window.songApp.playback.onEvent(setPlaybackEvent);
    const offSpotify = window.songApp.spotify.onChanged(setSpotify);
    const offLyrics = window.songApp.lyrics.onChanged(setLyrics);
    return () => {
      alive = false;
      offSettings();
      offPlayback();
      offPlaybackEvent();
      offSpotify();
      offLyrics();
    };
  }, [setDisplays, setHydrated, setLyrics, setPlaybackEvent, setSettings, setSpotify, setTrack]);
}
