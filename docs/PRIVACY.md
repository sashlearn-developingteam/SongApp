# Privacy

Song App follows a local-first, minimum-data approach.

## Stored locally

- application theme and visual preferences;
- enabled monitors and overlay configuration;
- performance and shortcut preferences;
- Spotify OAuth tokens, encrypted using Electron `safeStorage`;
- no raw Spotify API response archive.

## Not stored by default

- no listening-history database;
- no permanent album-art cache;
- no copyrighted lyric dataset;
- no audio samples;
- no AI training dataset.

## Network traffic

The Electron main process communicates with Spotify's official authorization/token/Web API endpoints when live Spotify mode is enabled. React renderer windows do not make Spotify API requests directly. External navigation is limited to an allowlist of Spotify HTTPS hosts and is opened in the system browser.

The developer simulator is local and does not require Spotify network traffic.

## AI

Chaos Mode does not send track metadata, artwork, or lyrics to an AI service. Reactions are selected locally from app-owned copy.

## Future features

Any listening-history feature must be opt-in and separately documented. Any licensed lyrics provider must define its own transmission, retention, caching, and territory behavior before integration is enabled.
