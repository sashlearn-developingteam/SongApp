import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Minus, Plus, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { AlbumArtwork } from '../../components/AlbumArtwork';
import { SpotifyAttribution } from '../../components/SpotifyAttribution';
import { capabilitiesFor, canRenderLyrics } from '../compliance/capabilities';
import { reactionFor, shouldShowReaction } from '../reactions/reaction-engine';
import { useSyncedLyrics } from '../lyrics/use-synced-lyrics';
import { ReactiveBackgroundCanvas } from './ReactiveBackgroundCanvas';
import { DEFAULT_OVERLAY_LAYOUT, normalizeOverlayLayout, updateMonitorPreference } from '../../lib/settings';
import type { CurrentTrack, LyricsState, OverlayLayout } from '../../types/core';

const MODE_BACKGROUND_STRENGTH = {
  minimal: 0.42,
  typography: 0.56,
  chaos: 0.8,
  ambience: 1
} as const;

export function OverlayView() {
  const settings = useAppStore((s) => s.settings);
  const track = useAppStore((s) => s.track);
  const playbackEvent = useAppStore((s) => s.playbackEvent);
  const lyricsState = useAppStore((s) => s.lyrics);
  const [editMode, setEditMode] = useState(false);
  const [reactionVisible, setReactionVisible] = useState(false);
  const displayId = useMemo(() => new URLSearchParams(window.location.search).get('display') ?? '', []);
  const monitorPreference = settings.monitorPreferences[displayId];
  const mode = monitorPreference?.mode ?? settings.desktopMode;
  const savedLayout = monitorPreference?.layout ?? DEFAULT_OVERLAY_LAYOUT;
  const [draftLayout, setDraftLayout] = useState<OverlayLayout>(savedLayout);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLayout: OverlayLayout;
    latest: OverlayLayout;
  } | null>(null);

  useEffect(() => window.songApp.overlay.onEditMode(setEditMode), []);
  useEffect(() => {
    if (!dragRef.current) setDraftLayout(savedLayout);
  }, [savedLayout.x, savedLayout.y, savedLayout.scale]);

  const capabilities = capabilitiesFor(track, lyricsState.result?.rights);
  const allowLyricSynchronization = Boolean(
    lyricsState.result?.kind === 'synced' && capabilities.canSynchronizeLyrics
  );
  const { activeIndex: activeLyricIndex, cadence: lyricCadence } = useSyncedLyrics(
    track,
    lyricsState.result,
    allowLyricSynchronization
  );
  const nextLyricStartMs = allowLyricSynchronization && lyricsState.result?.kind === 'synced'
    ? lyricsState.result.lines[activeLyricIndex + 1]?.startMs ?? lyricsState.result.lines[0]?.startMs
    : undefined;

  const reaction = useMemo(() => {
    if (!settings.chaosEnabled || !shouldShowReaction(playbackEvent, settings.chaosFrequency) || !playbackEvent) return null;
    return reactionFor(playbackEvent, settings.chaosLevel);
  }, [playbackEvent, settings.chaosEnabled, settings.chaosFrequency, settings.chaosLevel]);

  useEffect(() => {
    if (!reaction) {
      setReactionVisible(false);
      return;
    }
    setReactionVisible(true);
    const timeout = window.setTimeout(() => setReactionVisible(false), settings.chaosFrequency === 'high' ? 4_000 : 5_500);
    return () => window.clearTimeout(timeout);
  }, [playbackEvent?.type, reaction, settings.chaosFrequency]);

  const showLyricsResult = settings.lyricsEnabled && canRenderLyrics(lyricsState.result?.rights, true);
  const showLyricsPanel = settings.lyricsEnabled && (showLyricsResult || lyricsState.status !== 'idle');
  const motionEnabled = !settings.reducedMotion;
  const travel = motionEnabled ? Math.round(6 + settings.animationIntensity * 22) : 0;
  const transitionDuration = motionEnabled ? 0.16 + settings.animationIntensity * 0.36 : 0.08;

  const persistLayout = async (next: OverlayLayout) => {
    const normalized = normalizeOverlayLayout(next);
    setDraftLayout(normalized);
    await window.songApp.settings.update({
      monitorPreferences: updateMonitorPreference(settings, displayId, { layout: normalized })
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode || (event.target as HTMLElement).closest('.edit-toolbar, button, a, input, select, [data-no-drag]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLayout: draftLayout,
      latest: draftLayout
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!editMode || !drag || drag.pointerId !== event.pointerId) return;
    const next = normalizeOverlayLayout({
      ...drag.startLayout,
      x: drag.startLayout.x + (event.clientX - drag.startX) / Math.max(window.innerWidth, 1),
      y: drag.startLayout.y + (event.clientY - drag.startY) / Math.max(window.innerHeight, 1)
    });
    drag.latest = next;
    setDraftLayout(next);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    void persistLayout(drag.latest);
  };

  const layoutStyle = {
    '--layout-x': draftLayout.x,
    '--layout-y': draftLayout.y,
    '--layout-scale': draftLayout.scale,
    '--motion-intensity': settings.animationIntensity
  } as CSSProperties;

  return (
    <main
      className={`overlay overlay-${mode} visual-${settings.visualTheme}`}
      data-fps={settings.fpsTarget}
      data-editing={editMode || undefined}
      data-reduced-motion={settings.reducedMotion || undefined}
      style={{ '--motion-intensity': settings.animationIntensity } as CSSProperties}
    >
      {track ? (
        <ReactiveBackgroundCanvas
          track={track}
          playbackEvent={playbackEvent}
          activeLyricIndex={activeLyricIndex}
          lyricCadence={lyricCadence}
          nextLyricStartMs={nextLyricStartMs}
          lyricsVisible={showLyricsPanel}
          amount={settings.particleAmount}
          intensity={settings.animationIntensity}
          fpsTarget={settings.fpsTarget}
          reducedMotion={settings.reducedMotion}
          themeKey={settings.visualTheme}
          allowSynchronizedSignals={capabilities.canSynchronizeVisualsToPlayback}
          modeStrength={MODE_BACKGROUND_STRENGTH[mode]}
        />
      ) : null}
      <div className="overlay-theme-field" aria-hidden="true" />

      <div
        className="overlay-layout"
        style={layoutStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <AnimatePresence mode="wait">
          {track ? (
            <motion.section
              key={`${track.source}-${track.spotifyId ?? `${track.title}-${track.album}`}`}
              className="overlay-composition"
              initial={motionEnabled ? { opacity: 0, y: travel } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={motionEnabled ? { opacity: 0, y: -Math.max(6, travel * 0.6) } : { opacity: 0 }}
              transition={{ duration: transitionDuration, ease: 'easeOut' }}
            >
              {mode === 'minimal' ? <Minimal track={track} artwork={capabilities.canDisplayArtwork} /> : null}
              {mode === 'typography' ? <Typography track={track} /> : null}
              {mode === 'chaos' ? <Chaos track={track} reaction={reaction} /> : null}
              {mode === 'ambience' ? <Ambience track={track} /> : null}
              <SpotifyAttribution track={track} />
            </motion.section>
          ) : (
            <motion.div key="idle" className="overlay-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Song App is listening for your next track.</motion.div>
          )}
        </AnimatePresence>
      </div>

      {mode !== 'chaos' ? (
        <AnimatePresence>
          {reaction && reactionVisible ? <ReactionToast key={`${playbackEvent?.type}-${reaction}`} text={reaction} reducedMotion={settings.reducedMotion}/> : null}
        </AnimatePresence>
      ) : null}

      {showLyricsPanel ? (
        <LyricsLayer
          state={lyricsState}
          activeIndex={activeLyricIndex}
          synchronized={allowLyricSynchronization}
        />
      ) : null}

      {editMode ? (
        <div className="edit-toolbar" role="toolbar" aria-label="Overlay layout editor">
          <span>Drag the overlay content to reposition it.</span>
          <button aria-label="Make overlay smaller" onClick={() => void persistLayout({ ...draftLayout, scale: draftLayout.scale - 0.1 })}><Minus size={16}/></button>
          <output aria-label="Overlay scale">{Math.round(draftLayout.scale * 100)}%</output>
          <button aria-label="Make overlay larger" onClick={() => void persistLayout({ ...draftLayout, scale: draftLayout.scale + 0.1 })}><Plus size={16}/></button>
          <button className="edit-reset" onClick={() => void persistLayout(DEFAULT_OVERLAY_LAYOUT)}><RotateCcw size={15}/> Reset layout</button>
          <button className="edit-done" onClick={() => void window.songApp.overlay.setEditMode(false)}><Check size={15}/> Done</button>
        </div>
      ) : null}
    </main>
  );
}

function Minimal({ track, artwork }: { track: CurrentTrack; artwork: boolean }) {
  return (
    <div className="minimal-card">
      {artwork ? <AlbumArtwork track={track} /> : null}
      <div className="minimal-copy"><p className="eyebrow">NOW PLAYING</p><h1>{track.title}</h1><p className="artist">{track.artists.join(', ')}</p><p className="album">{track.album}</p></div>
    </div>
  );
}

function Typography({ track }: { track: CurrentTrack }) {
  return <div className="type-layout"><p className="type-artist">{track.artists.join(' · ')}</p><h1>{track.title}</h1><p className="type-meta">{track.album} / {Math.round(track.durationMs / 1000)} sec</p></div>;
}

function Chaos({ track, reaction }: { track: CurrentTrack; reaction: string | null }) {
  return <div className="chaos-layout"><p className="chaos-reaction">{reaction ?? 'soundtrack operational'}</p><h1>{track.title}</h1><p>{track.artists.join(', ')}</p></div>;
}

function Ambience({ track }: { track: CurrentTrack }) {
  return <div className="ambience-copy"><p>{track.artists.join(', ')}</p><h1>{track.title}</h1></div>;
}

function ReactionToast({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  return (
    <motion.div
      className="reaction-toast"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.22 }}
    >
      {text}
    </motion.div>
  );
}

function LyricsLayer({ state, activeIndex, synchronized }: { state: LyricsState; activeIndex: number; synchronized: boolean }) {
  const result = state.result;
  if (!result) {
    const label = state.status === 'loading' ? 'LRCLIB · LOADING'
      : state.status === 'rate-limited' ? 'LRCLIB · RATE LIMITED'
      : state.status === 'offline' ? 'LRCLIB · OFFLINE'
      : state.status === 'error' ? 'LRCLIB · ERROR'
      : state.status === 'not-found' ? 'LYRICS UNAVAILABLE'
      : 'LYRICS';
    return (
      <aside className="lyrics-layer lyrics-state" aria-label="Lyrics status">
        <p className="lyrics-label">{label}</p>
        <p className="lyrics-message">{state.message ?? 'Waiting for lyrics.'}</p>
      </aside>
    );
  }

  const providerLabel = result.provider === 'simulator' ? 'Song App Simulator' : 'LRCLIB';

  if (result.kind === 'instrumental') {
    return (
      <aside className="lyrics-layer lyrics-state" aria-label="Instrumental track">
        <p className="lyrics-label">{providerLabel} · INSTRUMENTAL</p>
        <p className="lyrics-message">Instrumental track</p>
        <small>{result.attribution}</small>
      </aside>
    );
  }

  if (result.kind === 'plain') {
    return (
      <aside className="lyrics-layer" aria-label="Plain lyrics">
        <p className="lyrics-label">{providerLabel} · PLAIN LYRICS</p>
        <div className="lyrics-plain">{result.text}</div>
        <small>{result.attribution}</small>
      </aside>
    );
  }

  const start = synchronized && activeIndex >= 0 ? Math.max(0, activeIndex - 1) : 0;
  const visibleLines = result.lines.slice(start, start + (synchronized ? 4 : 7));
  return (
    <aside className="lyrics-layer" aria-label="Synced lyrics">
      <p className="lyrics-label">{synchronized ? `${providerLabel} · SYNCED LYRICS` : `${providerLabel} · SYNCED SOURCE · STATIC DISPLAY`}</p>
      <div className="lyrics-synced">
        {visibleLines.map((line, index) => {
          const absoluteIndex = start + index;
          return <p className={synchronized && absoluteIndex === activeIndex ? 'active' : ''} key={`${line.startMs}-${absoluteIndex}`}>{line.text || ' '}</p>;
        })}
      </div>
      {!synchronized && result.provider === 'lrclib' ? <small>Playback-timed highlighting is disabled for Spotify content. {result.attribution}</small> : <small>{result.attribution}</small>}
    </aside>
  );
}
