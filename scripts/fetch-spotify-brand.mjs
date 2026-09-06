import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIR = resolve(ROOT, 'public/spotify');

export const SPOTIFY_BRAND_ASSETS = [
  {
    name: 'Spotify_Full_Logo_RGB_Green.png',
    url: 'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Full_Logo_RGB_Green.png'
  },
  {
    name: 'Spotify_Full_Logo_RGB_White.png',
    url: 'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Full_Logo_RGB_White.png'
  }
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function inspectPng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    return { valid: false, width: 0, height: 0 };
  }

  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { valid: false, width: 0, height: 0 };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { valid: width > 0 && height > 0, width, height };
}

async function isValidExistingAsset(path) {
  if (!existsSync(path)) return false;
  try {
    const buffer = await readFile(path);
    const image = inspectPng(buffer);
    return image.valid && image.width >= 70 && image.height > 0;
  } catch {
    return false;
  }
}

export async function ensureSpotifyBrandAssets({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('This Node.js runtime does not provide fetch(). Use Node.js 18 or newer.');
  }

  await mkdir(TARGET_DIR, { recursive: true });
  const packageJson = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  const userAgent = `${packageJson.productName ?? 'Song App'}/${packageJson.version ?? 'dev'} (Spotify attribution asset setup)`;

  for (const asset of SPOTIFY_BRAND_ASSETS) {
    const target = resolve(TARGET_DIR, asset.name);
    if (await isValidExistingAsset(target)) {
      console.log(`[spotify-brand] Present: ${asset.name}`);
      continue;
    }

    console.log(`[spotify-brand] Downloading official asset: ${asset.name}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response;
    try {
      response = await fetchImpl(asset.url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'image/png'
        }
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`Timed out downloading ${asset.name} from Spotify.`);
      }
      throw new Error(`Unable to download ${asset.name} from Spotify: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Spotify asset download failed for ${asset.name}: HTTP ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('image/png')) {
      throw new Error(`Spotify asset download returned unexpected content type for ${asset.name}: ${contentType || 'unknown'}.`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const image = inspectPng(buffer);
    if (!image.valid || image.width < 70) {
      throw new Error(`Downloaded ${asset.name} is not a valid Spotify full-logo PNG.`);
    }

    const temp = `${target}.tmp`;
    try {
      await writeFile(temp, buffer, { flag: 'w' });
      await rename(temp, target);
    } finally {
      await rm(temp, { force: true }).catch(() => undefined);
    }

    console.log(`[spotify-brand] Installed ${asset.name} (${image.width}×${image.height}).`);
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  ensureSpotifyBrandAssets().catch((error) => {
    console.error(`[spotify-brand] ${error instanceof Error ? error.message : String(error)}`);
    console.error('[spotify-brand] Source: Spotify Press Center official logo and brand assets.');
    process.exit(1);
  });
}
