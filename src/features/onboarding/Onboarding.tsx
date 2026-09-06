import { useMemo, useState } from 'react';
import { Check, Monitor, Sparkles, WandSparkles } from 'lucide-react';
import type { DesktopMode } from '../../types/core';
import { useAppStore } from '../../stores/app-store';
import { updateMonitorPreference } from '../../lib/settings';

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const settings = useAppStore((s) => s.settings);
  const displays = useAppStore((s) => s.displays);
  const steps = useMemo(() => ['Welcome', 'Spotify', 'Experience', 'Monitor', 'Preview', 'Finish'], []);
  const next = () => setStep((v) => Math.min(v + 1, steps.length - 1));
  const back = () => setStep((v) => Math.max(v - 1, 0));
  const chooseMode = (mode: DesktopMode) => void window.songApp.settings.update({ desktopMode: mode });
  return (
    <main className="onboarding-shell">
      <div className="onboarding-panel">
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, i) => <span key={i} className={i <= step ? 'active' : ''} />)}</div>
        {step === 0 ? <><Sparkles size={30}/><h1>Make your desktop listen with you.</h1><p>Song App turns the track you already play on Spotify into a quiet, expressive Windows layer.</p></> : null}
        {step === 1 ? <><h1>Connect Spotify</h1><p>We request only the current-playing scope. Spotify remains your music player.</p><button className="primary" onClick={() => void window.songApp.spotify.connect()}>Connect Spotify</button></> : null}
        {step === 2 ? <><h1>Choose the starting mood</h1><div className="choice-grid">{(['minimal','typography','chaos','ambience'] as DesktopMode[]).map((mode) => <button key={mode} className={settings.desktopMode === mode ? 'choice active' : 'choice'} onClick={() => chooseMode(mode)}><WandSparkles size={20}/><strong>{mode}</strong></button>)}</div></> : null}
        {step === 3 ? <><Monitor size={30}/><h1>Choose a monitor</h1><div className="monitor-list">{displays.map((d) => <label className="monitor-row" key={d.id}><input type="checkbox" checked={settings.monitorPreferences[d.id]?.enabled ?? d.primary} onChange={(e) => void window.songApp.settings.update({ monitorPreferences: updateMonitorPreference(settings, d.id, { enabled: e.target.checked }) })}/><span><strong>{d.label}</strong><small>{d.bounds.width} × {d.bounds.height}{d.primary ? ' · Primary' : ''}</small></span></label>)}</div></> : null}
        {step === 4 ? <><h1>Preview the desktop</h1><p>Use the developer simulator any time, even without Spotify credentials.</p><button className="secondary" onClick={() => void window.songApp.simulator.run('track-start')}>Play demo track</button></> : null}
        {step === 5 ? <><Check size={30}/><h1>You’re ready.</h1><p>Song App can live in the tray and stay out of your way.</p><button className="primary" onClick={onFinish}>Open Song App</button></> : null}
        <footer>{step > 0 && step < 5 ? <button className="ghost" onClick={back}>Back</button> : <span/>}{step < 5 ? <button className="primary" onClick={next}>Continue</button> : null}</footer>
      </div>
    </main>
  );
}
