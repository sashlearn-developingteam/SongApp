export function DesktopRuntimeRequired() {
  const isElectron = navigator.userAgent.includes('Electron/');

  return (
    <main className="desktop-runtime-required" role="main">
      <section className="desktop-runtime-card" aria-labelledby="desktop-runtime-title">
        <div className="desktop-runtime-mark" aria-hidden="true">♫</div>
        <p className="eyebrow">WINDOWS DESKTOP APP</p>
        <h1 id="desktop-runtime-title">
          {isElectron ? 'The desktop bridge did not load.' : 'Open Song App, not the renderer URL.'}
        </h1>
        <p>
          {isElectron
            ? 'Electron started, but its preload bridge is unavailable. Check the PowerShell window that launched Song App for a preload error.'
            : 'localhost:5173 is only Song App’s private development renderer. Close this browser tab and launch the Electron desktop window with npm run dev.'}
        </p>
        <div className="desktop-runtime-command" aria-label="PowerShell command">
          <code>npm run dev</code>
        </div>
        <p className="desktop-runtime-note">
          The finished application runs as a normal Windows desktop app and does not require a browser window.
        </p>
      </section>
    </main>
  );
}
