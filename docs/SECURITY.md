# Security

Song App uses Electron's main/preload/renderer trust split.

- `nodeIntegration` is disabled.
- `contextIsolation`, renderer sandboxing, and `webSecurity` are enabled.
- Renderers receive only dedicated methods through `contextBridge`; raw `ipcRenderer` is never exposed.
- IPC inputs are schema validated and privileged handlers verify the sender belongs to a live application window.
- Renderer permission requests are denied by default.
- External navigation is restricted to exact HTTPS Spotify hosts.
- Spotify OAuth uses Authorization Code + PKCE with a `127.0.0.1` loopback redirect.
- No Spotify client secret is included in the application.
- Tokens are persisted only through Electron `safeStorage` when OS-backed encryption is available.
- Application settings are local JSON and never contain OAuth tokens.
- The CSP blocks arbitrary script execution, frames, plugins, and non-required network origins.

For production, code-sign the Windows installer and keep Electron and dependencies on supported patched releases.
