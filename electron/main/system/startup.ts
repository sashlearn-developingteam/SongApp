import { app } from 'electron';

export function getStartupEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

export function setStartupEnabled(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled });
}
