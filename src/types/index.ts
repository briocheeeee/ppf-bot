export interface CanvasInfo {
  id: number;
  ident: string;
  title: string;
  colors: number[][];
  size: number;
  maxTiledZoom: number;
  cli: number;
  bcd: number;
  cds: number;
}

export interface MeResponse {
  name: string | null;
  canvases: Record<string, CanvasInfo>;
  globalCoolDown: number;
  wait: number | null;
}

export interface PixelCoord {
  x: number;
  y: number;
}

export interface PixelData extends PixelCoord {
  color: number;
}

export interface ChunkCoord {
  cx: number;
  cy: number;
}

export type BrushSize = '1x1' | '3x3' | '5x5';

export type PlacementStrategy =
  | 'line-rtl'
  | 'line-ltr'
  | 'line-utb'
  | 'line-btu'
  | 'circle-in'
  | 'circle-out'
  | 'diagonal-tl'
  | 'diagonal-tr'
  | 'diagonal-bl'
  | 'diagonal-br'
  | 'spiral-in'
  | 'spiral-out'
  | 'random'
  | 'edges-first'
  | 'center-out'
  | 'checkerboard'
  | 'scatter'
  | 'human'
  | 'wave'
  | 'cluster'
  | 'organic'
  | 'snake'
  | 'zigzag'
  | 'text-draw';

export type BotStatus = 'idle' | 'running' | 'stopped' | 'paused' | 'captcha';

export type Theme = 'default' | 'ppf';

export interface BotConfig {
  coordinates: string;
  canvasId: string;
  strategy: PlacementStrategy;
  brushSize: BrushSize;
  textDrawText: string;
  repairMode: boolean;
  debugMode: boolean;
  skipColorCheck: boolean;
  placementDelay: number;
  stopOnCaptcha: boolean;
  followBot: boolean;
  followBotUrl: string;
  imageData: ImageData | null;
  imageName: string;
  theme: Theme;
}

export interface BotState {
  status: BotStatus;
  cooldown: number;
  progress: number;
  totalPixels: number;
  placedPixels: number;
  skippedPixels: number;
  errorCount: number;
  currentPixelIndex: number;
  onlineCount: number;
  startTime: number | null;
  pixelsPerSecond: number;
  eta: number;
  lastCooldownMs: number;
  pixelStock: number;
  maxPixelStock: number;
}

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelSize {
  width: number;
  height: number;
}

export interface MiscSettings {
  collapsedSections: string[];
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoMinimize: boolean;
  autoResume: boolean;
  opacity: number;
}

export interface SavedState {
  config: BotConfig;
  panelPosition: PanelPosition;
  panelSize?: PanelSize;
  miscSettings?: MiscSettings;
  progress?: {
    currentPixelIndex: number;
    imageName: string;
    coordinates: string;
  };
  imageDataUrl?: string;
}

export interface PixelPlaceResult {
  success: boolean;
  waitMs: number;
  cooldownMs: number;
  pixelsAvailable: number;
  maxPixels: number;
  error?: string;
  captcha?: boolean;
}

export const CHUNK_SIZE = 256;

export const STRATEGY_LABELS: Record<PlacementStrategy, string> = {
  'line-rtl': 'Line (right to left)',
  'line-ltr': 'Line (left to right)',
  'line-utb': 'Line (up to bottom)',
  'line-btu': 'Line (bottom to up)',
  'circle-in': 'Circle (inside to outside)',
  'circle-out': 'Circle (outside to inside)',
  'diagonal-tl': 'Diagonal (top-left corner)',
  'diagonal-tr': 'Diagonal (top-right corner)',
  'diagonal-bl': 'Diagonal (bottom-left corner)',
  'diagonal-br': 'Diagonal (bottom-right corner)',
  'spiral-in': 'Spiral (clockwise inward)',
  'spiral-out': 'Spiral (clockwise outward)',
  'random': 'Random',
  'edges-first': 'Edges first',
  'center-out': 'Center outward',
  'checkerboard': 'Checkerboard pattern',
  'scatter': 'Scatter (anti-pattern)',
  'human': 'Human (mouse strokes)',
  'wave': 'Wave (sine pattern)',
  'cluster': 'Cluster (grouped areas)',
  'organic': 'Organic (natural flow)',
  'snake': 'Snake (continuous path)',
  'zigzag': 'Zigzag (alternating)',
  'text-draw': 'Text Draw (human-like)',
};

export const BRUSH_LABELS: Record<BrushSize, string> = {
  '1x1': '1x1 (single)',
  '3x3': '3x3 (9 pixels)',
  '5x5': '5x5 (25 pixels)',
};
