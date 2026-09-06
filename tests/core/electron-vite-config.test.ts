import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = readFileSync(resolve('electron.vite.config.mts'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { type?: string };

describe('electron-vite project layout', () => {
  it('declares the custom main, preload, and renderer entries', () => {
    expect(config).toContain('electron/main/index.ts');
    expect(config).toContain('electron/preload/index.ts');
    expect(config).toContain('src/index.html');
    expect(config).toContain("root: resolve(projectRoot, 'src')");
  });

  it('keeps the sandboxed preload on the CommonJS-compatible package mode', () => {
    expect(pkg.type).not.toBe('module');
  });
});
