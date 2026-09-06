import { useEffect, useMemo, useState } from 'react';
import { useBridge } from '../hooks/use-bridge';
import { useAppStore } from '../stores/app-store';
import { ControlCenter } from '../features/settings/ControlCenter';
import { Onboarding } from '../features/onboarding/Onboarding';
import { OverlayView } from '../features/overlays/OverlayView';

export function App() {
  useBridge();
  const hydrated = useAppStore((s) => s.hydrated);
  const settings = useAppStore((s) => s.settings);
  const windowType = useMemo(() => new URLSearchParams(window.location.search).get('window') ?? 'main', []);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('songapp:onboarded') === '1');

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  if (!hydrated) return <div className="boot-screen"><div className="boot-mark">♪</div><p>Loading Song App…</p></div>;
  if (windowType === 'overlay') return <OverlayView />;
  if (!onboarded) return <Onboarding onFinish={() => { localStorage.setItem('songapp:onboarded', '1'); setOnboarded(true); }} />;
  return <ControlCenter />;
}
