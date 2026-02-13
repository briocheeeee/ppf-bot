import type { SavedState, BotConfig, PanelPosition, PanelSize, MiscSettings } from '../types';

export const STORAGE_KEY = 'windowsxp-bot-state';

const DEFAULT_CONFIG: BotConfig = {
  coordinates: '0_0',
  strategy: 'line-ltr',
  stopOnCaptcha: true,
  followBot: false,
  followBotUrl: '',
  imageData: null,
  imageName: '',
  theme: 'default',
  canvasId: '0',
  brushSize: '1x1',
  textDrawText: '',
  repairMode: false,
  debugMode: false,
  skipColorCheck: false,
  placementDelay: 0,
};

const DEFAULT_POSITION: PanelPosition = {
  x: 20,
  y: 20,
};

const DEFAULT_SIZE: PanelSize = {
  width: 0,
  height: 0,
};

const DEFAULT_MISC: MiscSettings = {
  collapsedSections: [],
  soundEnabled: true,
  notificationsEnabled: true,
  autoMinimize: false,
  autoResume: false,
  opacity: 100,
};

export function loadState(): SavedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      const config = parsed.config as Partial<BotConfig> | undefined;
      return {
        config: { ...DEFAULT_CONFIG, ...config, imageData: null },
        panelPosition: (parsed.panelPosition as PanelPosition) || DEFAULT_POSITION,
        panelSize: (parsed.panelSize as PanelSize) || DEFAULT_SIZE,
        miscSettings: { ...DEFAULT_MISC, ...(parsed.miscSettings as Partial<MiscSettings>) },
        progress: parsed.progress as SavedState['progress'],
        imageDataUrl: (parsed.imageDataUrl as string) || undefined,
      };
    }
  } catch {}
  return {
    config: { ...DEFAULT_CONFIG },
    panelPosition: { ...DEFAULT_POSITION },
    panelSize: { ...DEFAULT_SIZE },
    miscSettings: { ...DEFAULT_MISC },
  };
}

export function restoreImageData(): Promise<ImageData | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.imageDataUrl && typeof parsed.imageDataUrl === 'string') {
        return dataUrlToImageData(parsed.imageDataUrl);
      }
    }
  } catch {}
  return Promise.resolve(null);
}

export function imageDataToDataUrl(imageData: ImageData): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > 2 * 1024 * 1024) return null;
    return dataUrl;
  } catch {
    return null;
  }
}

function dataUrlToImageData(dataUrl: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}

export function saveState(state: SavedState): void {
  try {
    let savedImageDataUrl: string | null = null;
    if (state.config.imageData) {
      savedImageDataUrl = imageDataToDataUrl(state.config.imageData);
    }
    const toSave = {
      config: { ...state.config, imageData: null },
      panelPosition: state.panelPosition,
      panelSize: state.panelSize,
      miscSettings: state.miscSettings,
      progress: state.progress,
      imageDataUrl: savedImageDataUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export function getDefaultConfig(): BotConfig {
  return { ...DEFAULT_CONFIG };
}

export function getDefaultPosition(): PanelPosition {
  return { ...DEFAULT_POSITION };
}

export function getDefaultSize(): PanelSize {
  return { ...DEFAULT_SIZE };
}

export function getDefaultMiscSettings(): MiscSettings {
  return { ...DEFAULT_MISC };
}
