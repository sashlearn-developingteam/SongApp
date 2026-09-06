import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

export type TokenBundle = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
};

export class SecureTokenStore {
  private readonly path = join(app.getPath('userData'), 'spotify.tokens');

  async read(): Promise<TokenBundle | null> {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const encrypted = await fs.readFile(this.path);
      return JSON.parse(safeStorage.decryptString(encrypted)) as TokenBundle;
    } catch {
      return null;
    }
  }

  async write(tokens: TokenBundle): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('OS-backed secure storage is unavailable.');
    await fs.mkdir(dirname(this.path), { recursive: true });
    await fs.writeFile(this.path, safeStorage.encryptString(JSON.stringify(tokens)));
  }

  async clear(): Promise<void> {
    await fs.rm(this.path, { force: true });
  }
}
