import type { CurrentTrack } from '../types/core';
export function AlbumArtwork({ track, size = 'large' }: { track: CurrentTrack | null; size?: 'small' | 'large' }) {
  if (!track?.albumImage) return <div className={`artwork artwork-${size} artwork-empty`} aria-hidden="true"><span>♪</span></div>;
  return <img className={`artwork artwork-${size}`} src={track.albumImage} alt={`${track.album} album artwork`} />;
}
