# Compliance Notes

Last reviewed: **2026-09-04**. This document is an engineering guardrail, not legal advice. Re-review the official provider terms before every public release.

## Authoritative Spotify references

- Design & Branding Guidelines: https://developer.spotify.com/documentation/design
- Developer Policy: https://developer.spotify.com/policy
- Developer Terms: https://developer.spotify.com/terms
- February 2026 Web API migration guidance: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

## Spotify integration boundary

Song App uses Spotify as the playback-state provider. Spotify remains the actual music player. The application does **not** stream, download, proxy, record, cache, or reproduce Spotify audio.

Requested MVP scope: `user-read-currently-playing` only.

Authentication uses Authorization Code with PKCE and a loopback callback bound to `127.0.0.1`. No Spotify client secret is shipped to the renderer or repository. Tokens are stored through Electron `safeStorage` and are never exposed through preload IPC.

## No audiovisual synchronization

This release intentionally does not synchronize Spotify sound recordings with visual media. There is no beat detection, waveform extraction, audio capture, progress-timeline animation, or playback-position-driven visual sequence.

Visual changes may react to discrete application state such as a track changing, pause/resume, or a rapid-skip event. Once selected, ambient motion is app-owned and runs independently from the recording timeline.

## Artwork

When Spotify artwork is displayed:

- use only the URL provided by Spotify;
- preserve the original image and aspect ratio;
- do not crop, distort, recolor, blur, animate, or overlay text/controls;
- use only permitted corner rounding;
- do not use artwork as a wallpaper/background transformation;
- omit artwork entirely when a layout cannot satisfy these constraints.

`SpotifyArtwork` is the centralized rendering component. Capability checks fail closed when artwork permission is unknown.

## Metadata, attribution, and links

Spotify-sourced tracks are explicitly marked `source: 'spotify'`. Simulator tracks are explicitly `source: 'simulator'` and carry no fake Spotify URL.

Every Spotify playing view must include Spotify attribution and a link back to the Spotify service. Song App never draws or recreates the Spotify logo. Live Spotify connection is disabled unless both official full-logo assets are present:

- `resources/public/spotify-full-logo-white.svg`
- `resources/public/spotify-full-logo-black.svg`

The release checker fails while either file is absent. The files must be obtained directly from Spotify's official design-resource package and must remain unmodified.

## Lyrics

Spotify is not treated as a lyrics source. The application does not scrape Spotify, Genius, Musixmatch, Google, search-result pages, or lyric websites.

The lyrics subsystem is provider-abstracted and rights-driven. The shipped `DemoLyricsProvider` contains only app-owned development text. A production provider must explicitly describe display, synchronization, caching, territory, attribution, and commercial-use rights.

Synchronized lyric display remains disabled unless both the lyrics provider and platform policy permit it. The current Spotify integration does not enable synchronized lyrics.

## AI and training

Spotify metadata, artwork, lyrics, and other protected provider content are not sent to external AI systems and are not collected for model training or fine-tuning. Chaos Mode uses a local, app-owned reaction catalog and deterministic event logic.

## Development Mode distribution

Spotify's 2026 Development Mode changes materially limit new development applications, including a small authorized-user ceiling and Premium requirements for the app owner. Treat Development Mode as a development/testing path, not proof that the product is cleared for broad commercial distribution. Re-check Spotify's current access and quota rules before launch.

## Release fail-safes

A release is blocked if:

- official Spotify attribution assets are missing;
- real client secrets or tokens are present in source/build artifacts;
- the renderer gains direct Spotify network access;
- a visual feature becomes playback-timeline/audio synchronized;
- licensed lyrics are bundled without rights metadata;
- artwork transformation rules are bypassed;
- Spotify-sourced content can render without attribution/link-back.
