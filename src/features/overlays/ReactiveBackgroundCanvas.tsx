import { useEffect, useRef } from 'react';
import type { CurrentTrack, PlaybackEvent } from '../../types/core';
import {
  adaptQuality,
  createVisualIdentity,
  deriveReactiveTarget,
  particleBudget,
  lyricAnticipation,
  shouldRenderFrame,
  smoothVisualState,
  type QualityTier,
  type ReactiveVisualState,
  type VisualIdentity
} from './reactive-background-engine';

type Particle = {
  x: number;
  y: number;
  depth: number;
  radius: number;
  phase: number;
  drift: number;
};

type Props = {
  track: CurrentTrack;
  playbackEvent: PlaybackEvent | null;
  activeLyricIndex: number;
  lyricCadence: number;
  nextLyricStartMs?: number;
  lyricsVisible: boolean;
  amount: number;
  intensity: number;
  fpsTarget: 30 | 60;
  reducedMotion: boolean;
  themeKey: string;
  allowSynchronizedSignals: boolean;
  modeStrength: number;
};

const ZERO_STATE: ReactiveVisualState = {
  intensity: 0,
  pulse: 0,
  energy: 0,
  progressEnvelope: 0,
  lyricImpulse: 0,
  transitionProgress: 0
};

function trackIdentity(track: CurrentTrack): string {
  return `${track.source}|${track.spotifyId ?? ''}|${track.title}|${track.artists.join(',')}`;
}

function seededUnit(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 0x45d9f3b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b) >>> 0;
  value ^= value >>> 16;
  return value / 0xffffffff;
}

function makeParticles(identity: VisualIdentity, count = 82): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    x: seededUnit(identity.seed, index * 5 + 1),
    y: seededUnit(identity.seed, index * 5 + 2),
    depth: 0.25 + seededUnit(identity.seed, index * 5 + 3) * 0.75,
    radius: 0.5 + seededUnit(identity.seed, index * 5 + 4) * 1.65,
    phase: seededUnit(identity.seed, index * 5 + 5) * Math.PI * 2,
    drift: 0.65 + seededUnit(identity.seed, index * 5 + 6) * 1.35
  }));
}

function hueMix(a: number, b: number, amount: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta * amount + 360) % 360;
}

function hsla(hue: number, saturation: number, lightness: number, alpha: number): string {
  return `hsla(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}% / ${alpha.toFixed(3)})`;
}

export function ReactiveBackgroundCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const currentIdentityRef = useRef(createVisualIdentity(props.track, props.themeKey));
  const previousIdentityRef = useRef(currentIdentityRef.current);
  const particlesRef = useRef(makeParticles(currentIdentityRef.current));
  const previousParticlesRef = useRef(particlesRef.current);
  const lyricImpulseRef = useRef(0);
  const transitionRef = useRef(1);
  const playbackBaseRef = useRef({ progressMs: props.track.progressMs ?? 0, capturedAt: performance.now(), playing: props.track.playing });
  const pausedSinceRef = useRef<number | null>(props.track.playing ? null : performance.now());
  const hiddenRef = useRef(typeof document !== 'undefined' ? document.hidden : false);

  useEffect(() => { propsRef.current = props; }, [props]);

  useEffect(() => {
    playbackBaseRef.current = {
      progressMs: props.track.progressMs ?? 0,
      capturedAt: performance.now(),
      playing: props.track.playing
    };
    if (props.track.playing) pausedSinceRef.current = null;
    else if (pausedSinceRef.current === null) pausedSinceRef.current = performance.now();
  }, [props.track.playing, props.track.progressMs]);

  useEffect(() => {
    const next = createVisualIdentity(props.track, props.themeKey);
    previousIdentityRef.current = currentIdentityRef.current;
    previousParticlesRef.current = particlesRef.current;
    currentIdentityRef.current = next;
    particlesRef.current = makeParticles(next);
    transitionRef.current = 1;
  }, [trackIdentity(props.track), props.themeKey]);

  useEffect(() => {
    if (props.allowSynchronizedSignals && props.activeLyricIndex >= 0) lyricImpulseRef.current = 1;
  }, [props.activeLyricIndex, props.allowSynchronizedSignals]);

  useEffect(() => {
    if (props.playbackEvent?.type === 'track-changed' || props.playbackEvent?.type === 'rapid-skip' || props.playbackEvent?.type === 'replay') {
      transitionRef.current = 1;
    }
  }, [props.playbackEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let stopped = false;
    let previousFrame = performance.now();
    let lastDraw = 0;
    let sceneTime = 0;
    let state = { ...ZERO_STATE };
    let quality: QualityTier = 'high';
    let averageDrawMs = 10;
    let qualitySamples = 0;
    let cssWidth = 1;
    let cssHeight = 1;

    const resize = () => {
      const tierScale = quality === 'high' ? 1.6 : quality === 'balanced' ? 1.4 : 1.2;
      const ratio = Math.min(window.devicePixelRatio || 1, tierScale);
      const width = Math.max(1, Math.round(canvas.clientWidth));
      const height = Math.max(1, Math.round(canvas.clientHeight));
      cssWidth = width;
      cssHeight = height;
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number, deltaSeconds: number) => {
      const started = performance.now();
      const latest = propsRef.current;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const base = playbackBaseRef.current;
      const extrapolatedProgress = latest.allowSynchronizedSignals && base.playing
        ? Math.min(latest.track.durationMs, base.progressMs + Math.max(0, time - base.capturedAt))
        : base.progressMs;
      const progress = latest.track.durationMs > 0 ? extrapolatedProgress / latest.track.durationMs : 0;
      const anticipation = latest.allowSynchronizedSignals ? lyricAnticipation(extrapolatedProgress, latest.nextLyricStartMs) : 0;
      const target = deriveReactiveTarget({
        playing: latest.track.playing,
        progress,
        lyricCadence: latest.lyricCadence,
        lyricImpulse: Math.max(lyricImpulseRef.current, anticipation * 0.48),
        trackTransition: transitionRef.current,
        userIntensity: latest.intensity * latest.modeStrength,
        allowSynchronizedSignals: latest.allowSynchronizedSignals,
        reducedMotion: latest.reducedMotion
      });
      state = smoothVisualState(state, target, deltaSeconds);

      const motionScale = latest.reducedMotion ? 0.12 : 0.42 + state.energy * 1.2;
      sceneTime += deltaSeconds * motionScale * (latest.track.playing ? 1 : 0.22);
      transitionRef.current = Math.max(0, transitionRef.current - deltaSeconds / 1.55);
      lyricImpulseRef.current = Math.max(0, lyricImpulseRef.current - deltaSeconds / 0.9);

      const transitionMix = 1 - Math.min(1, transitionRef.current);
      const previous = previousIdentityRef.current;
      const identity = currentIdentityRef.current;
      const hueA = hueMix(previous.hueA, identity.hueA, transitionMix);
      const hueB = hueMix(previous.hueB, identity.hueB, transitionMix);
      const hueC = hueMix(previous.hueC, identity.hueC, transitionMix);
      const alpha = Math.min(0.62, 0.12 + state.intensity * 0.42);

      const baseGradient = ctx.createLinearGradient(0, 0, cssWidth, cssHeight);
      baseGradient.addColorStop(0, hsla(hueA, 70, 18, alpha * 0.88));
      baseGradient.addColorStop(0.48, hsla(hueB, 74, 14, alpha * 0.68));
      baseGradient.addColorStop(1, hsla(hueC, 68, 11, alpha * 0.82));
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const pulse = state.pulse * (latest.reducedMotion ? 0.18 : 1);
      const directionDelta = ((identity.direction - previous.direction + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const mixedDirection = previous.direction + directionDelta * transitionMix;
      const orbit = sceneTime + mixedDirection;
      const forms = [
        { x: 0.22 + Math.sin(orbit * 0.54) * 0.11, y: 0.25 + Math.cos(orbit * 0.42) * 0.1, r: 0.48, hue: hueA },
        { x: 0.76 + Math.cos(orbit * 0.37) * 0.1, y: 0.34 + Math.sin(orbit * 0.31) * 0.12, r: 0.42, hue: hueB },
        { x: 0.48 + Math.sin(orbit * 0.24 + 2.2) * 0.15, y: 0.82 + Math.cos(orbit * 0.28) * 0.08, r: 0.5, hue: hueC }
      ];
      ctx.globalCompositeOperation = 'screen';
      for (let index = 0; index < forms.length; index += 1) {
        const form = forms[index];
        const radius = Math.max(cssWidth, cssHeight) * form.r * (1 + pulse * (0.08 + index * 0.025));
        const gradient = ctx.createRadialGradient(form.x * cssWidth, form.y * cssHeight, 0, form.x * cssWidth, form.y * cssHeight, radius);
        gradient.addColorStop(0, hsla(form.hue, 82, 63, 0.11 + state.intensity * 0.12));
        gradient.addColorStop(0.42, hsla(form.hue, 74, 40, 0.05 + state.energy * 0.07));
        gradient.addColorStop(1, hsla(form.hue, 70, 20, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = hsla(hueB, 78, 70, 0.08 + state.energy * 0.12);
      ctx.beginPath();
      const ribbonY = cssHeight * (0.58 + Math.sin(sceneTime * 0.36) * 0.08);
      ctx.moveTo(-40, ribbonY);
      ctx.bezierCurveTo(
        cssWidth * 0.28,
        ribbonY - cssHeight * (0.12 + state.energy * 0.07),
        cssWidth * 0.68,
        ribbonY + cssHeight * (0.1 + state.energy * 0.04),
        cssWidth + 40,
        ribbonY - cssHeight * 0.03
      );
      ctx.stroke();

      const drawParticles = (particles: Particle[], fieldAlpha: number) => {
        const budget = Math.min(particles.length, particleBudget(quality, latest.amount, latest.reducedMotion));
        for (let index = 0; index < budget; index += 1) {
          const particle = particles[index];
          const parallax = 8 + particle.depth * (16 + state.energy * 22);
          const x = particle.x * cssWidth + Math.sin(sceneTime * particle.drift + particle.phase) * parallax;
          const y = particle.y * cssHeight + Math.cos(sceneTime * particle.drift * 0.82 + particle.phase) * parallax * 0.7;
          const textSafe = latest.lyricsVisible && x > cssWidth * 0.55 && y > cssHeight * 0.46;
          const particleAlpha = (0.07 + particle.depth * 0.16 + state.energy * 0.12) * (textSafe ? 0.18 : 1) * fieldAlpha;
          ctx.fillStyle = hsla(index % 3 === 0 ? hueA : index % 3 === 1 ? hueB : hueC, 70, 78, particleAlpha);
          ctx.beginPath();
          ctx.arc(x, y, particle.radius * (0.75 + state.pulse * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }
      };
      if (transitionMix < 0.995) drawParticles(previousParticlesRef.current, 1 - transitionMix);
      drawParticles(particlesRef.current, Math.max(0.18, transitionMix));

      if (latest.lyricsVisible) {
        const shield = ctx.createRadialGradient(cssWidth * 0.82, cssHeight * 0.72, 0, cssWidth * 0.82, cssHeight * 0.72, Math.max(cssWidth, cssHeight) * 0.55);
        shield.addColorStop(0, 'rgba(3,6,10,.34)');
        shield.addColorStop(0.5, 'rgba(3,6,10,.18)');
        shield.addColorStop(1, 'rgba(3,6,10,0)');
        ctx.fillStyle = shield;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      }

      const vignette = ctx.createRadialGradient(cssWidth * 0.5, cssHeight * 0.46, Math.min(cssWidth, cssHeight) * 0.15, cssWidth * 0.5, cssHeight * 0.46, Math.max(cssWidth, cssHeight) * 0.72);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(0,0,0,.08)');
      vignette.addColorStop(1, 'rgba(0,0,0,.34)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      averageDrawMs = averageDrawMs * 0.92 + (performance.now() - started) * 0.08;
      qualitySamples += 1;
      if (qualitySamples >= 120) {
        const nextQuality = adaptQuality(quality, averageDrawMs);
        if (nextQuality !== quality) {
          quality = nextQuality;
          resize();
        }
        qualitySamples = 0;
      }
    };

    const tick = (time: number) => {
      if (stopped) return;
      const latest = propsRef.current;
      const pausedForMs = latest.track.playing || pausedSinceRef.current === null ? 0 : time - pausedSinceRef.current;
      const context = { hidden: hiddenRef.current, playing: latest.track.playing, pausedForMs, reducedMotion: latest.reducedMotion };
      if (shouldRenderFrame(context, time - lastDraw, latest.fpsTarget)) {
        const deltaSeconds = Math.min(0.1, Math.max(0, (time - previousFrame) / 1000));
        previousFrame = time;
        lastDraw = time;
        draw(time, deltaSeconds);
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (stopped || raf || hiddenRef.current) return;
      previousFrame = performance.now();
      raf = requestAnimationFrame((time) => {
        raf = 0;
        tick(time);
      });
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) stopLoop();
      else start();
    };
    const onResize = () => resize();
    const observer = new ResizeObserver(onResize);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize, { passive: true });
    observer.observe(canvas);
    resize();
    draw(performance.now(), 0.016);
    start();

    return () => {
      stopped = true;
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      ctx.clearRect(0, 0, cssWidth, cssHeight);
    };
  }, []);

  return <canvas ref={canvasRef} className="reactive-background-canvas" aria-hidden="true" />;
}
