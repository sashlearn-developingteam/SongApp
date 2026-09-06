import { z } from 'zod';

const overlayLayoutSchema = z.object({
  x: z.number().min(-0.42).max(0.42),
  y: z.number().min(-0.42).max(0.42),
  scale: z.number().min(0.6).max(1.5)
}).strict();

export const settingsPatchSchema = z.object({
  theme: z.enum(['system', 'dark', 'light']).optional(),
  visualTheme: z.enum(['editorial', 'terminal', 'cinematic', 'y2k', 'brutalist', 'cyber']).optional(),
  desktopMode: z.enum(['minimal', 'typography', 'chaos', 'ambience']).optional(),
  overlaysVisible: z.boolean().optional(),
  alwaysOnTop: z.boolean().optional(),
  startWithWindows: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  animationIntensity: z.number().min(0).max(1).optional(),
  fpsTarget: z.union([z.literal(30), z.literal(60)]).optional(),
  particleAmount: z.number().min(0).max(1).optional(),
  chaosEnabled: z.boolean().optional(),
  chaosLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  chaosFrequency: z.enum(['low', 'normal', 'high']).optional(),
  lyricsEnabled: z.boolean().optional(),
  monitorPreferences: z.record(z.string(), z.object({
    enabled: z.boolean(),
    mode: z.enum(['minimal', 'typography', 'chaos', 'ambience']).optional(),
    layout: overlayLayoutSchema.optional()
  }).strict()).optional(),
  editShortcut: z.string().min(1).max(64).optional()
}).strict();
