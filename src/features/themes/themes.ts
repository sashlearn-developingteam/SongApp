import type { ThemeId } from '../../types/core';

export const VISUAL_THEMES: Array<{ id: ThemeId; name: string; description: string }> = [
  { id: 'editorial', name: 'Editorial', description: 'Quiet confidence, serif display type.' },
  { id: 'terminal', name: 'Terminal', description: 'Monospace metadata and restrained grid.' },
  { id: 'cinematic', name: 'Cinematic', description: 'Large subtitles and soft depth.' },
  { id: 'y2k', name: 'Y2K', description: 'Glossy, optimistic digital nostalgia.' },
  { id: 'brutalist', name: 'Brutalist', description: 'Oversized type and hard geometry.' },
  { id: 'cyber', name: 'Cyber', description: 'Technical labels and electric accents.' }
];
