import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, RotateCcw, Plus, Check } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { AlbumArtwork } from '../../components/AlbumArtwork';
import { SpotifyAttribution } from '../../components/SpotifyAttribution';
import { capabilitiesFor, canRenderLyrics } from '../compliance/capabilities';
import { reactionFor, shouldShowReaction } from '../reactions/reaction-engine';
import { demoLyricsForTrack } from '../lyrics/demo-provider';
import { AmbientCanvas } from './AmbientCanvas';
import { DEFAULT_OVERLAY_LAYOUT, normalizeOverlayLayout, updateMonitorPreference } from '../../lib/settings';
import type { CurrentTrack, OverlayLayout } from '../../types/core';

export function OverlayView() {
  const settings = useAppStore((s) => s.settings);
  const track = useAppStore((s) => s.track);
  const playbackEvent = useAppStore((s) => s.playbackEvent);
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

  const capabilities = capabilitiesFor(track);
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

  const lyrics = demoLyricsForTrack(track);
  const showLyrics = settings.lyricsEnabled && canRenderLyrics(lyrics?.rights, true);
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
      <div className="overlay-theme-field" aria-hidden="true" />
      {mode === 'ambience' && track ? (
        <AmbientCanvas
          active={Boolean(track?.playing)}
          amount={settings.particleAmount}
          intensity={settings.animationIntensity}
          fpsTarget={settings.fpsTarget}
          reducedMotion={settings.reducedMotion}
          themeKey={settings.visualTheme}
        />
      ) : null}

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

      {showLyrics && lyrics ? <LyricsLayer lyrics={lyrics} /> : null}

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

function LyricsLayer({ lyrics }: { lyrics: NonNullable<ReturnType<typeof demoLyricsForTrack>> }) {
  return (
    <aside className="lyrics-layer" aria-label="Demo lyrics">
      <p className="lyrics-label">DEMO LYRICS · UNSYNCED</p>
      <div>{lyrics.lines.map((line, index) => <p key={`${line.text}-${index}`}>{line.text}</p>)}</div>
      {lyrics.rights.attribution ? <small>{lyrics.rights.attribution}</small> : null}
    </aside>
  );
}
