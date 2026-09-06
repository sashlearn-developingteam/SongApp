import { BrowserWindow, shell } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isAllowedExternalUrl, secureWebPreferences } from '../security/navigation-policy';

const preload = join(__dirname, '../preload/index.js');

function assertPreloadAvailable(): void {
  if (!existsSync(preload)) {
    throw new Error(`Song App preload bridge is missing: ${preload}. Run electron-vite through \"npm run dev\" or rebuild the app.`);
  }
}

function attachDiagnostics(window: BrowserWindow): void {
  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[Song App] Preload failed: ${preloadPath}`, error);
  });
  window.webContents.on('did-fail-load', (_event, code, description, validatedUrl) => {
    console.error(`[Song App] Renderer load failed (${code}): ${description} ${validatedUrl}`);
  });
}

function attachNavigationPolicy(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.startsWith('http://localhost:')) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
}

async function load(window: BrowserWindow, kind: 'main' | 'overlay', displayId?: string): Promise<void> {
  const dev = process.env.ELECTRON_RENDERER_URL;
  const params = new URLSearchParams({ window: kind });
  if (displayId) params.set('display', displayId);
  if (dev) await window.loadURL(`${dev}?${params.toString()}`);
  else await window.loadFile(join(__dirname, '../../renderer/index.html'), { query: Object.fromEntries(params.entries()) });
}

export async function createMainWindow(): Promise<BrowserWindow> {
  assertPreloadAvailable();
  const window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 820,
    minHeight: 620,
    show: false,
    backgroundColor: '#0d1117',
    title: 'Song App',
    autoHideMenuBar: true,
    webPreferences: secureWebPreferences(preload)
  });
  attachDiagnostics(window);
  attachNavigationPolicy(window);
  window.once('ready-to-show', () => { if (!window.isVisible()) window.show(); });
  await load(window, 'main');
  if (!window.isVisible()) window.show();
  return window;
}

export async function createOverlayWindow(displayId: string, bounds: Electron.Rectangle, alwaysOnTop: boolean): Promise<BrowserWindow> {
  assertPreloadAvailable();
  const window = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    alwaysOnTop,
    hasShadow: false,
    webPreferences: secureWebPreferences(preload)
  });
  window.setIgnoreMouseEvents(true, { forward: true });
  attachDiagnostics(window);
  attachNavigationPolicy(window);
  window.once('ready-to-show', () => { if (!window.isVisible()) window.showInactive(); });
  await load(window, 'overlay', displayId);
  if (!window.isVisible()) window.showInactive();
  return window;
}
