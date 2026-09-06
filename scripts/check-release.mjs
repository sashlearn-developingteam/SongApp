import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectPng } from './fetch-spotify-brand.mjs';

const required = [
  'public/spotify/Spotify_Full_Logo_RGB_Green.png',
  'public/spotify/Spotify_Full_Logo_RGB_White.png',
  'docs/COMPLIANCE.md',
  'docs/PRIVACY.md',
  '.env.example'
];

const missing = required.filter((file) => !existsSync(resolve(file)));
if (missing.length) {
  console.error('Release blocked. Missing required files:');
  for (const file of missing) console.error(` - ${file}`);
  console.error('\nRun `npm run setup:spotify-brand` to fetch the official Spotify logo assets.');
  process.exit(1);
}

for (const file of required.filter((name) => name.endsWith('.png'))) {
  const image = inspectPng(readFileSync(resolve(file)));
  if (!image.valid || image.width < 70) {
    console.error(`Release blocked: ${file} is not a valid full-logo PNG.`);
    process.exit(1);
  }
}

const env = readFileSync('.env.example', 'utf8');
if (/sk-|client_secret|SPOTIFY_CLIENT_SECRET\s*=\s*\S+/i.test(env)) {
  console.error('Release blocked: .env.example appears to contain a secret.');
  process.exit(1);
}

console.log('Release prerequisites passed.');
