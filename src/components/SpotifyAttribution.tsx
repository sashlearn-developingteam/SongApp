import type { CurrentTrack } from '../types/core';

export function SpotifyAttribution({ track }: { track: CurrentTrack | null }) {
  if (track?.source !== 'spotify' || !track.spotifyUrl) return null;
  return (
    <button className="spotify-attribution" onClick={() => void window.songApp.external.open(track.spotifyUrl!)} aria-label="Open this track on Spotify">
      <img src="/spotify/Spotify_Full_Logo_RGB_Green.png" alt="Spotify" />
      <span>Open track</span>
    </button>
  );
}
