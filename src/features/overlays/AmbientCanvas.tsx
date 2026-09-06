import { useEffect, useRef } from 'react';
import { ambientRuntime } from './ambient-engine';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
};

function seededParticle(index: number): Particle {
  const x = ((index * 37) % 101) / 100;
  const y = ((index * 61 + 17) % 103) / 102;
  const angle = ((index * 53) % 360) * Math.PI / 180;
  return {
    x,
    y,
    vx: Math.cos(angle),
    vy: Math.sin(angle),
    radius: 0.8 + ((index * 19) % 17) / 12,
    phase: ((index * 29) % 100) / 100 * Math.PI * 2
  };
}

export function AmbientCanvas({
  active,
  amount,
  intensity,
  fpsTarget,
  reducedMotion,
  themeKey
}: {
  active: boolean;
  amount: number;
  intensity: number;
  fpsTarget: 30 | 60;
  reducedMotion: boolean;
  themeKey: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const runtime = ambientRuntime(amount, intensity, fpsTarget, reducedMotion);
    const color = getComputedStyle(canvas).color || 'rgba(107,226,192,.8)';
    const particles = Array.from({ length: runtime.particleCount }, (_, index) => seededParticle(index));
    let frame = 0;
    let previous = 0;
    let stopped = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      resize();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      const motionTime = time * 0.001 * runtime.speed;

      for (const particle of particles) {
        const drift = runtime.drift;
        const x = particle.x * width + Math.sin(motionTime + particle.phase) * drift * particle.vx;
        const y = particle.y * height + Math.cos(motionTime * 0.82 + particle.phase) * drift * particle.vy;
        const pulse = reducedMotion ? 0.52 : 0.38 + Math.sin(motionTime * 1.8 + particle.phase) * 0.17;
        ctx.globalAlpha = Math.max(0.15, pulse);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (time: number) => {
      if (stopped) return;
      if (time - previous >= runtime.frameIntervalMs - 1) {
        previous = time;
        draw(time);
      }
      frame = requestAnimationFrame(tick);
    };

    draw(0);
    if (active && !reducedMotion) frame = requestAnimationFrame(tick);
    const onResize = () => draw(performance.now());
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [active, amount, fpsTarget, intensity, reducedMotion, themeKey]);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
