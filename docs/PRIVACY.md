# Privacy

Song App follows a local-first, minimum-data approach.

## Stored locally

- application theme and visual preferences;
- enabled monitors and overlay layout;
- performance, lyrics-toggle, and shortcut preferences;
- Spotify OAuth tokens encrypted with Electron `safeStorage`;
- a **memory-only** lyric result cache while Song App is running.

## Not stored by default

- no listening-history database;
- no permanent album-art cache;
- no persistent lyric database/dataset;
- no audio samples;
- no AI training dataset.

## Network traffic

The Electron main process communicates with Spotify's official authorization/token/Web API endpoints when live Spotify mode is enabled. Renderer windows do not make Spotify API requests directly.

When the **lyrics layer is enabled** and a track changes, the Electron main process sends the current title, primary artist, optional album, and rounded duration to `https://lrclib.net` to look up lyrics. LRCLIB requires no API key. Playback-position updates do not create LRCLIB requests. Disabling lyrics stops provider lookups; the memory cache disappears when the application exits.

The developer simulator is local and can exercise synchronized demo lyrics without Spotify/LRCLIB traffic.

## AI

Chaos Mode does not send track metadata, artwork, or lyrics to an AI service. Reactions are selected locally from app-owned copy.
