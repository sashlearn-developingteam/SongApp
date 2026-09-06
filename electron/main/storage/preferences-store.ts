import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AppSettings } from '../../../src/types/core';
import { DEFAULT_SETTINGS, mergeSettings } from '../../../src/lib/settings';

export class PreferencesStore {
  private readonly path = join(app.getPath('userData'), 'settings.json');
  private settings: AppSettings = DEFAULT_SETTINGS;

  async load(): Promise<AppSettings> {
    try {
      const data = JSON.parse(await fs.readFile(this.path, 'utf8')) as Partial<AppSettings>;
      this.settings = mergeSettings(data);
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
    return this.settings;
  }

  get(): AppSettings { return this.settings; }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = mergeSettings({ ...this.settings, ...patch });
    await fs.mkdir(dirname(this.path), { recursive: true });
    await fs.writeFile(this.path, JSON.stringify(this.settings, null, 2), 'utf8');
    return this.settings;
  }
}
