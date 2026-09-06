import { useState } from 'react';
import {
  Activity,
  Eye,
  Gauge,
  Laugh,
  Link2,
  Monitor,
  Music2,
  Palette,
  Play,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import type {
  AppSettings,
  CurrentTrack,
  DesktopMode,
  DisplayInfo,
  LyricsState,
  SimulatorScenario,
  SpotifyConnectionState,
  ThemeId
} from '../../types/core';
import { updateMonitorPreference } from '../../lib/settings';
import { VISUAL_THEMES } from '../themes/themes';
import { AlbumArtwork } from '../../components/AlbumArtwork';
import { SpotifyAttribution } from '../../components/SpotifyAttribution';

const sections = [
  ['now', Music2, 'Now Playing'],
  ['spotify', Link2, 'Spotify'],
  ['appearance', Palette, 'Appearance'],
  ['desktop', Monitor, 'Desktop'],
  ['funny', Laugh, 'Funny Mode'],
  ['lyrics', Activity, 'Lyrics'],
  ['performance', Gauge, 'Performance'],
  ['privacy', ShieldCheck, 'Privacy'],
  ['developer', Settings2, 'Developer']
] as const;

type SectionId = typeof sections[number][0];
type UpdateSettings = (patch: Partial<AppSettings>) => Promise<AppSettings>;

export function ControlCenter() {
  const [section, setSection] = useState<SectionId>('now');
  const settings = useAppStore((s) => s.settings);
  const track = useAppStore((s) => s.track);
  const spotify = useAppStore((s) => s.spotify);
  const displays = useAppStore((s) => s.displays);
  const lyrics = useAppStore((s) => s.lyrics);
  const setSpotify = useAppStore((s) => s.setSpotify);
  const update: UpdateSettings = (patch) => window.songApp.settings.update(patch);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Music2 size={18}/></div>
          <div><strong>Song App</strong><small>Your music, everywhere.</small></div>
        </div>
        <nav aria-label="Settings sections">
          {sections.map(([id, Icon, label]) => (
            <button
              key={id}
              className={section === id ? 'nav-item active' : 'nav-item'}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={18}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={`dot ${spotify.status}`}/>
          <span>{spotify.status === 'connected' ? 'Spotify connected' : spotify.status === 'connecting' ? 'Connecting…' : spotify.status === 'error' ? 'Spotify needs attention' : 'Spotify offline'}</span>
        </div>
      </aside>

      <main className="content">
        {section === 'now' ? <NowPlaying track={track} settings={settings} update={update}/> : null}
        {section === 'spotify' ? <Spotify spotify={spotify} setSpotify={setSpotify}/> : null}
        {section === 'appearance' ? <Appearance settings={settings} update={update}/> : null}
        {section === 'desktop' ? <Desktop settings={settings} update={update} displays={displays}/> : null}
        {section === 'funny' ? <Funny settings={settings} update={update}/> : null}
        {section === 'lyrics' ? <Lyrics track={track} state={lyrics} settings={settings} update={update}/> : null}
        {section === 'performance' ? <Performance settings={settings} update={update}/> : null}
        {section === 'privacy' ? <Privacy/> : null}
        {section === 'developer' ? <Developer/> : null}
      </main>
    </div>
  );
}

function Header({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="section-header"><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></header>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-row">
      <span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>
      <input className="switch" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
    </label>
  );
}

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="range-row">
      <span><strong>{label}</strong><b>{Math.round(value * 100)}%</b></span>
      <input type="range" min="0" max="1" step="0.05" value={value} onChange={(e) => onChange(Number(e.target.value))}/>
    </label>
  );
}

function NowPlaying({ track, settings, update }: { track: CurrentTrack | null; settings: AppSettings; update: UpdateSettings }) {
  const editLayout = async () => {
    if (!settings.overlaysVisible) await update({ overlaysVisible: true });
    await window.songApp.overlay.setEditMode(true);
  };

  return (
    <>
      <Header eyebrow="CONTROL CENTER" title="Let the desktop do the listening." copy="One place for the track, the mood, and how much personality Song App should bring."/>
      <div className="hero-grid">
        <section className="now-card">
          <AlbumArtwork track={track}/>
          <div className="now-copy">
            <p className="eyebrow">NOW PLAYING</p>
            <h2>{track?.title ?? 'Nothing playing yet'}</h2>
            <p>{track ? track.artists.join(', ') : 'Start Spotify or run the developer simulator.'}</p>
            {track ? <SpotifyAttribution track={track}/> : null}
          </div>
        </section>
        <section className="quick-panel">
          <h3>Quick controls</h3>
          <Toggle label="Show desktop overlay" checked={settings.overlaysVisible} onChange={(value) => void update({ overlaysVisible: value })}/>
          <Toggle label="Chaos reactions" checked={settings.chaosEnabled} onChange={(value) => void update({ chaosEnabled: value })}/>
          <button className="secondary full" onClick={() => void editLayout()}><SlidersHorizontal size={17}/> Edit layout</button>
        </section>
      </div>
      <ModeStrip settings={settings} update={update}/>
    </>
  );
}

function ModeStrip({ settings, update }: { settings: AppSettings; update: UpdateSettings }) {
  const modes: Array<[DesktopMode, string]> = [['minimal','Minimal'],['typography','Typography'],['chaos','Chaos'],['ambience','Ambience']];
  return (
    <section className="mode-strip" aria-label="Desktop mode">
      {modes.map(([id,label]) => (
        <button key={id} className={settings.desktopMode === id ? 'mode-tile active' : 'mode-tile'} onClick={() => void update({ desktopMode: id })}>
          <span>{label}</span>
          <small>{id === 'minimal' ? 'Clean & elegant' : id === 'typography' ? 'Type becomes scenery' : id === 'chaos' ? 'Playful reactions' : 'Living background'}</small>
        </button>
      ))}
    </section>
  );
}

function Spotify({ spotify, setSpotify }: { spotify: SpotifyConnectionState; setSpotify: (state: SpotifyConnectionState) => void }) {
  const connect = async () => {
    setSpotify({ status: 'connecting' });
    try {
      setSpotify(await window.songApp.spotify.connect());
    } catch (error) {
      setSpotify({ status: 'error', message: error instanceof Error ? error.message : 'Spotify connection failed.' });
    }
  };
  const disconnect = async () => setSpotify(await window.songApp.spotify.disconnect());
  return (
    <>
      <Header eyebrow="SPOTIFY" title="Spotify stays the player. Song App stays the layer." copy="Authorization uses PKCE and the minimum current-playing scope. Tokens stay encrypted in OS-backed storage."/>
      <section className="settings-group">
        <div className="connection-row">
          <div>
            <strong>Connection</strong>
            <small>{spotify.status === 'connected' ? 'Connected and ready to read Now Playing.' : spotify.status === 'connecting' ? 'Waiting for Spotify authorization…' : spotify.status === 'error' ? spotify.message : 'Not connected.'}</small>
          </div>
          {spotify.status === 'connected'
            ? <button className="secondary" onClick={() => void disconnect()}>Disconnect</button>
            : <button className="primary" disabled={spotify.status === 'connecting'} onClick={() => void connect()}>{spotify.status === 'connecting' ? 'Connecting…' : 'Connect Spotify'}</button>}
        </div>
        <div className="rights-box"><ShieldCheck size={20}/><div><strong>Minimum access</strong><p>Song App does not stream audio, download tracks, scrape lyrics, or control playback.</p></div></div>
      </section>
    </>
  );
}

function Appearance({ settings, update }: { settings: AppSettings; update: UpdateSettings }) {
  return (
    <>
      <Header eyebrow="APPEARANCE" title="Give the desktop a visual voice." copy="Themes are token-driven, so every mode feels related without becoming a clone of itself."/>
      <section className="settings-group">
        <h3>App appearance</h3>
        <div className="segmented">{(['system','dark','light'] as const).map((value) => <button className={settings.theme === value ? 'active' : ''} onClick={() => void update({theme:value})} key={value}>{value}</button>)}</div>
      </section>
      <section className="theme-grid">
        {VISUAL_THEMES.map((theme) => (
          <button key={theme.id} className={settings.visualTheme === theme.id ? 'theme-card active' : 'theme-card'} onClick={() => void update({visualTheme: theme.id as ThemeId})}>
            <div className={`theme-swatch visual-${theme.id}`}>Aa</div><strong>{theme.name}</strong><span>{theme.description}</span>
          </button>
        ))}
      </section>
    </>
  );
}

function Desktop({ settings, update, displays }: { settings: AppSettings; update: UpdateSettings; displays: DisplayInfo[] }) {
  return (
    <>
      <Header eyebrow="DESKTOP" title="Choose where Song App lives." copy="Each display gets its own overlay window, with independent mode and layout preferences when you want them."/>
      <section className="settings-group">
        <Toggle label="Always on top" description="Keep overlays above normal windows." checked={settings.alwaysOnTop} onChange={(value) => void update({alwaysOnTop:value})}/>
        <Toggle label="Start with Windows" description="Launch quietly into the system tray." checked={settings.startWithWindows} onChange={(value) => void update({startWithWindows:value})}/>
        <label className="shortcut-row">
          <span><strong>Edit-layout shortcut</strong><small>Electron accelerator format. Press Enter or leave the field to save.</small></span>
          <input
            defaultValue={settings.editShortcut}
            aria-label="Edit layout shortcut"
            onBlur={(event) => { const value = event.currentTarget.value.trim(); if (value) void update({ editShortcut: value }); }}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          />
        </label>
      </section>

      <section className="settings-group display-list">
        <h3>Displays</h3>
        {displays.map((display) => {
          const preference = settings.monitorPreferences[display.id];
          const enabled = preference?.enabled ?? display.primary;
          return (
            <div className="display-setting" key={display.id}>
              <Toggle
                label={`${display.label}${display.primary ? ' · Primary' : ''}`}
                description={`${display.bounds.width} × ${display.bounds.height} at ${display.scaleFactor}×`}
                checked={enabled}
                onChange={(value) => void update({ monitorPreferences: updateMonitorPreference(settings, display.id, { enabled: value }) })}
              />
              <label className="monitor-mode-row">
                <span><strong>Monitor mode</strong><small>Use the global mode or override this display.</small></span>
                <select
                  value={preference?.mode ?? 'global'}
                  disabled={!enabled}
                  onChange={(event) => {
                    const value = event.target.value;
                    void update({ monitorPreferences: updateMonitorPreference(settings, display.id, { mode: value === 'global' ? undefined : value as DesktopMode }) });
                  }}
                >
                  <option value="global">Global · {settings.desktopMode}</option>
                  <option value="minimal">Minimal</option>
                  <option value="typography">Typography</option>
                  <option value="chaos">Chaos</option>
                  <option value="ambience">Ambience</option>
                </select>
              </label>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Funny({ settings, update }: { settings: AppSettings; update: UpdateSettings }) {
  return (
    <>
      <Header eyebrow="FUNNY MODE" title="A little personality, never a heckler." copy="Original reactions are generated locally from semantic playback events. Spotify content is not sent to an AI service."/>
      <section className="settings-group">
        <Toggle label="Enable Chaos reactions" checked={settings.chaosEnabled} onChange={(value) => void update({chaosEnabled:value})}/>
        <label className="select-row"><span><strong>Chaos level</strong><small>0 is silent. 3 is ridiculous.</small></span><select value={settings.chaosLevel} onChange={(event) => void update({chaosLevel:Number(event.target.value) as 0|1|2|3})}><option value="0">0 · Minimal</option><option value="1">1 · Subtle</option><option value="2">2 · Playful</option><option value="3">3 · Ridiculous</option></select></label>
        <label className="select-row"><span><strong>Reaction frequency</strong><small>Controls which playback events are allowed to create callouts.</small></span><select value={settings.chaosFrequency} onChange={(event) => void update({ chaosFrequency: event.target.value as AppSettings['chaosFrequency'] })}><option value="low">Low · notable moments</option><option value="normal">Normal · track changes</option><option value="high">High · include pause/resume</option></select></label>
      </section>
    </>
  );
}

function Lyrics({ track, state, settings, update }: { track: CurrentTrack | null; state: LyricsState; settings: AppSettings; update: UpdateSettings }) {
  const simulator = state.provider === 'simulator';
  const status = simulator && state.status === 'synced' ? ['Simulator lyrics ready', 'App-owned synchronized demo text is available for full timing and visual-reactivity testing.']
    : simulator && state.status === 'plain' ? ['Simulator lyrics ready', 'App-owned plain demo text is available.']
    : state.status === 'loading' ? ['Contacting LRCLIB', 'Looking up this track from the LRCLIB community service.']
    : state.status === 'synced' ? ['LRCLIB connected · synced lyrics available', track?.source === 'spotify' ? 'Synced timestamps are available, but playback-timed highlighting stays disabled for Spotify content.' : 'Timed lines are available for this source.']
    : state.status === 'plain' ? ['LRCLIB connected · plain lyrics available', 'Plain lyrics are available for this track.']
    : state.status === 'instrumental' ? ['Instrumental track', simulator ? 'The simulator marks this demo as instrumental.' : 'LRCLIB marks this track as instrumental.']
    : state.status === 'not-found' ? ['Lyrics unavailable', 'LRCLIB did not return a conservative metadata match for this track.']
    : state.status === 'offline' ? ['Unable to reach LRCLIB', state.message ?? 'Check your connection and try again.']
    : state.status === 'rate-limited' ? ['LRCLIB rate limited', state.retryAfterMs ? `Song App will respect the provider cooldown for about ${Math.ceil(state.retryAfterMs / 1000)} seconds.` : 'Song App is backing off before another request.']
    : state.status === 'error' ? ['LRCLIB provider error', state.message ?? 'The provider returned an unexpected response.']
    : ['LRCLIB ready', settings.lyricsEnabled ? 'Waiting for a track before requesting lyrics.' : 'Enable the lyrics layer to query LRCLIB for the current track.'];

  return (
    <>
      <Header eyebrow="LYRICS" title="LRCLIB, behind the same rights gate." copy="Lyrics requests stay in the Electron main process. LRCLIB is a community source, requires no API key, and Song App does not claim that it grants commercial lyric-display rights."/>
      <section className="settings-group">
        <Toggle label="Enable lyrics layer" description="Fetch on track change, cache lightweight results, and render only normalized provider data." checked={settings.lyricsEnabled} onChange={(value) => void update({lyricsEnabled:value})}/>
        <div className="rights-box"><ShieldCheck size={20}/><div><strong>{status[0]}</strong><p>{status[1]}</p></div></div>
        <div className="connection-row">
          <div><strong>Lyrics provider</strong><small>{simulator ? 'Song App Simulator · app-owned test lyrics' : 'LRCLIB · community lyrics source · no scraping · no LRCLIB environment variables.'}</small></div>
          <button className="secondary" disabled={!settings.lyricsEnabled || !track || state.status === 'loading'} onClick={() => void window.songApp.lyrics.refresh()}>Refresh lyrics</button>
        </div>
      </section>
    </>
  );
}

function Performance({ settings, update }: { settings: AppSettings; update: UpdateSettings }) {
  return (
    <>
      <Header eyebrow="PERFORMANCE" title="Built to stay open all day." copy="The ambience renderer now obeys the frame target, particle amount, motion intensity, and reduced-motion setting directly."/>
      <section className="settings-group">
        <Toggle label="Reduced motion" description="Preserve the atmosphere while greatly reducing parallax, pulses, particles, and frame rate." checked={settings.reducedMotion} onChange={(value) => void update({reducedMotion:value})}/>
        <Range label="Background intensity" value={settings.animationIntensity} onChange={(value) => void update({animationIntensity:value})}/>
        <Range label="Particle amount" value={settings.particleAmount} onChange={(value) => void update({particleAmount:value})}/>
        <label className="select-row"><span><strong>Animation target</strong><small>30 FPS reduces ambient work; 60 FPS favors smoothness.</small></span><select value={settings.fpsTarget} onChange={(event) => void update({fpsTarget:Number(event.target.value) as 30|60})}><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
      </section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Header eyebrow="PRIVACY" title="The quiet kind of software." copy="No listening-history database by default. No audio capture. No Spotify data used for model training."/>
      <section className="privacy-list">
        <article><Eye size={20}/><div><strong>Accessed</strong><p>Current track metadata, album artwork URL, playback state, and the minimum Spotify identity needed for authorization. When lyrics are enabled, title, primary artist, album, and duration are sent to LRCLIB for lookup.</p></div></article>
        <article><ShieldCheck size={20}/><div><strong>Stored locally</strong><p>Encrypted Spotify tokens and your preferences. Demo simulator data is ephemeral.</p></div></article>
        <article><Sparkles size={20}/><div><strong>Never used for training</strong><p>Spotify metadata, artwork, lyrics, and listening state are never collected into an AI training dataset.</p></div></article>
      </section>
    </>
  );
}

function Developer() {
  const [result, setResult] = useState('Choose a scenario to send it through the same overlay event channel used by live playback.');
  const scenarios: SimulatorScenario[] = ['track-start','track-change','pause','resume','rapid-skip','replay','missing-artwork','long-track','offline','rate-limit','expired-token'];
  const run = async (scenario: SimulatorScenario) => {
    const next = await window.songApp.simulator.run(scenario);
    setResult(next.message);
  };
  return (
    <>
      <Header eyebrow="DEVELOPER" title="Test the experience without hammering Spotify." copy="Scenarios now emit real semantic events, so pause, replay, and rapid-skip reactions can be verified on the desktop."/>
      <div className="sim-grid">{scenarios.map((scenario) => <button className="sim-card" key={scenario} onClick={() => void run(scenario)}><Play size={16}/><span>{scenario.replaceAll('-',' ')}</span></button>)}</div>
      <p className="developer-result" role="status" aria-live="polite">{result}</p>
    </>
  );
}
