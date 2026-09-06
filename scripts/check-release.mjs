import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  console.error('\nSpotify logo files must be official, unmodified assets downloaded from Spotify.');
  process.exit(1);
}
const env = readFileSync('.env.example', 'utf8');
if (/sk-|client_secret|SPOTIFY_CLIENT_SECRET\s*=\s*\S+/i.test(env)) {
  console.error('Release blocked: .env.example appears to contain a secret.');
  process.exit(1);
}
console.log('Release prerequisites passed.');
