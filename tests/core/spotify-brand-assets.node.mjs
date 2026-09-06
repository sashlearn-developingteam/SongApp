import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPng, SPOTIFY_BRAND_ASSETS } from '../../scripts/fetch-spotify-brand.mjs';

test('Spotify brand assets point only to the official Spotify Press Center files', () => {
  assert.deepEqual(
    SPOTIFY_BRAND_ASSETS.map((asset) => asset.url),
    [
      'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Full_Logo_RGB_Green.png',
      'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Full_Logo_RGB_White.png'
    ]
  );
});

test('PNG inspection rejects non-PNG content and reads valid dimensions', () => {
  assert.equal(inspectPng(Buffer.from('not a png')).valid, false);

  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(1000, 16);
  png.writeUInt32BE(278, 20);
  assert.deepEqual(inspectPng(png), { valid: true, width: 1000, height: 278 });
});
