# Compliance Notes

Last reviewed: **2026-09-06**. This is an engineering guardrail, not legal advice. Re-review provider terms before public release.

## Spotify integration boundary

Song App uses Spotify only as a playback-state and metadata provider. Spotify remains the music player. Song App does not stream, download, proxy, record, cache, or reproduce Spotify audio. Authentication uses Authorization Code with PKCE. Tokens remain in Electron main-process storage backed by `safeStorage` and are never exposed to the renderer.

## No Spotify audiovisual synchronization

Spotify's current Developer Policy prohibits synchronizing Spotify sound recordings with visual media. Song App therefore keeps `canSynchronizeLyrics` and `canSynchronizeVisualsToPlayback` **false for Spotify-sourced tracks**, even when LRCLIB supplies timestamps.

For Spotify tracks, the background may react to discrete application state such as a track changing or playback pausing/resuming, but it does not use playback position, lyric timestamps, beat timing, waveform data, or captured audio to drive a synchronized visual timeline. Full timing-reactive behavior is available only for the app-owned developer simulator or another future source whose platform policy permits it.

Official references:

- https://developer.spotify.com/policy
- https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback

## LRCLIB lyrics provider

Spotify is not treated as a lyrics source. Song App does not scrape Spotify, Genius, Musixmatch, Google, search-result pages, or lyric websites. Lyrics are requested from LRCLIB's documented API through the Electron main process.

Flow:

```text
CurrentTrack -> LyricsManager -> LrclibProvider -> normalized LyricsState -> preload bridge -> renderer
```

- exact lookup uses `/api/get` with title, primary artist, optional album, and rounded duration;
- a conservative `/api/search` fallback is used only when the exact result is missing or does not match;
- candidate title, artist, album, and duration are validated before display;
- synchronized LRC is parsed once after download;
- successful, instrumental, and short-lived not-found results use a lightweight in-memory cache;
- playback-position updates never trigger LRCLIB requests;
- 429/503 responses honor `Retry-After` when present and otherwise use bounded exponential backoff;
- provider failures resolve to finite UI states and never crash the renderer/main process;
- lyrics lookup is disabled when the user turns the lyrics layer off.

LRCLIB is presented factually as a community lyrics source. Song App does **not** claim that LRCLIB grants commercial lyric-display, publishing, territory, or synchronization rights. `commercialUse` therefore remains false for LRCLIB results. Availability through the API is not treated as legal clearance.

## Artwork and attribution

Spotify artwork is rendered only from the URL Spotify provides and is not cropped, distorted, recolored, blurred, animated, or used as wallpaper. Spotify playing views retain official attribution and link-back behavior.

The Green and White Spotify full-logo PNGs are provisioned from Spotify's official Press Center URLs by `scripts/fetch-spotify-brand.mjs` before development and production builds. The downloader validates PNG content before writing the files to `public/spotify`; Song App never recreates, recolors, crops, or otherwise edits these trademark assets.

## AI and training

Spotify metadata, artwork, LRCLIB lyrics, and other provider content are not sent to external AI systems and are not collected for model training or fine-tuning. Chaos Mode uses app-owned deterministic copy.

## Release fail-safes

A release is blocked if:

- official Spotify attribution assets are missing;
- secrets/tokens are present in source/build artifacts;
- the renderer gains direct Spotify/LRCLIB provider network access;
- Spotify playback position or audio is used to synchronize visuals;
- LRCLIB availability is presented as proof of commercial lyric rights;
- artwork transformation rules are bypassed;
- Spotify-sourced content renders without required attribution/link-back.
