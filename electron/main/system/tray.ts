import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';

export type TrayActions = { open: () => void; toggleOverlays: () => void; editLayout: () => void; disconnect: () => void };

export function createTray(actions: TrayActions): Tray {
  let image = nativeImage.createFromPath(join(process.resourcesPath, 'resources', 'tray-icon.png'));
  if (image.isEmpty()) image = nativeImage.createEmpty();
  const tray = new Tray(image);
  tray.setToolTip('Song App');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Song App', click: actions.open },
    { type: 'separator' },
    { label: 'Show / hide overlays', click: actions.toggleOverlays },
    { label: 'Edit layout', accelerator: 'CommandOrControl+Shift+L', click: actions.editLayout },
    { type: 'separator' },
    { label: 'Disconnect Spotify', click: actions.disconnect },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('double-click', actions.open);
  return tray;
}
