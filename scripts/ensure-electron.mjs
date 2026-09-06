import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

function fail(message) {
  console.error(`[electron-runtime] ${message}`);
  process.exitCode = 1;
}

function resolveElectronDir() {
  try {
    return dirname(require.resolve('electron/package.json'));
  } catch {
    return null;
  }
}

function runtimeStatus(electronDir) {
  const pathFile = join(electronDir, 'path.txt');
  if (!existsSync(pathFile)) {
    return { ready: false, reason: 'path.txt is missing' };
  }

  const relativeExecutable = readFileSync(pathFile, 'utf8').trim();
  if (!relativeExecutable) {
    return { ready: false, reason: 'path.txt is empty' };
  }

  const executable = join(electronDir, 'dist', relativeExecutable);
  if (!existsSync(executable)) {
    return { ready: false, reason: `runtime executable is missing (${relativeExecutable})` };
  }

  return { ready: true, executable };
}

const electronDir = resolveElectronDir();
if (!electronDir) {
  fail('The Electron npm package is not installed. Run npm install first.');
} else {
  const before = runtimeStatus(electronDir);
  if (before.ready) {
    console.log(`[electron-runtime] Ready: ${before.executable}`);
  } else {
    const installer = join(electronDir, 'install.js');
    if (!existsSync(installer)) {
      fail(`Electron is incomplete (${before.reason}) and install.js is missing. Delete node_modules/electron and run npm install again.`);
    } else {
      console.log(`[electron-runtime] Electron package exists but the runtime is incomplete: ${before.reason}.`);
      console.log('[electron-runtime] Running Electron\'s official installer to repair the local runtime...');

      const result = spawnSync(process.execPath, [installer], {
        cwd: electronDir,
        env: process.env,
        stdio: 'inherit',
      });

      if (result.error) {
        fail(`Could not launch Electron installer: ${result.error.message}`);
      } else if (result.status !== 0) {
        fail(`Electron installer exited with code ${result.status ?? 'unknown'}. Check network/proxy/antivirus settings and retry npm run setup:electron.`);
      } else {
        const after = runtimeStatus(electronDir);
        if (!after.ready) {
          fail(`Electron installer finished but the runtime is still incomplete: ${after.reason}.`);
        } else {
          console.log(`[electron-runtime] Repaired successfully: ${after.executable}`);
        }
      }
    }
  }
}
