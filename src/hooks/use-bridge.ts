import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { createBridgeHydrationGate } from './bridge-hydration';

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
    const gate = createBridgeHydrationGate();

    const offSettings = window.songApp.settings.onChanged((settings) => {
      gate.mark('settings');
      setSettings(settings);
    });
    const offPlayback = window.songApp.playback.onChanged((track) => {
      gate.mark('track');
      setTrack(track);
    });
    const offPlaybackEvent = window.songApp.playback.onEvent((event) => {
      gate.mark('playbackEvent');
      setPlaybackEvent(event);
    });
    const offSpotify = window.songApp.spotify.onChanged((spotify) => {
      gate.mark('spotify');
      setSpotify(spotify);
    });
    const offLyrics = window.songApp.lyrics.onChanged((lyrics) => {
      gate.mark('lyrics');
      setLyrics(lyrics);
    });

    const hydrationSnapshot = gate.snapshot();
    void Promise.all([
      window.songApp.settings.get(),
      window.songApp.system.getDisplays(),
      window.songApp.spotify.getConnectionState(),
      window.songApp.playback.getSnapshot(),
      window.songApp.lyrics.getState()
    ]).then(([settings, displays, spotify, snapshot, lyrics]) => {
      if (!alive) return;
      if (gate.isFresh('settings', hydrationSnapshot)) setSettings(settings);
      setDisplays(displays);
      if (gate.isFresh('spotify', hydrationSnapshot)) setSpotify(spotify);
      if (gate.isFresh('track', hydrationSnapshot)) setTrack(snapshot.track);
      if (gate.isFresh('playbackEvent', hydrationSnapshot)) setPlaybackEvent(snapshot.event);
      if (gate.isFresh('lyrics', hydrationSnapshot)) setLyrics(lyrics);
      setHydrated(true);
    }).catch((error) => {
      console.error('[Song App] Bridge hydration failed', error);
      if (alive) setHydrated(true);
    });

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
