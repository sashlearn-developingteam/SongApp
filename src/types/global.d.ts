import type { SongAppApi } from '../../electron/preload';
declare global { interface Window { songApp: SongAppApi } }
export {};
