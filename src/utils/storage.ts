import type { SavedState, BotConfig, PanelPosition, PanelSize, MiscSettings, PlacementStrategy, Theme } from '../types';

const STORAGE_KEY = 'windowsxp-bot-state';

const DEFAULT_CONFIG: BotConfig = {
  coordinates: '0_0',
  strategy: 'line-ltr' as PlacementStrategy,
  stopOnCaptcha: true,
  followBot: false,
  followBotUrl: '',
  imageData: null,
  imageName: '',
  theme: 'default' as Theme,
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
  opacity: 100,
};

export function loadState(): SavedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SavedState;
      return {
        config: { ...DEFAULT_CONFIG, ...parsed.config, imageData: null },
        panelPosition: parsed.panelPosition || DEFAULT_POSITION,
        panelSize: parsed.panelSize || DEFAULT_SIZE,
        miscSettings: { ...DEFAULT_MISC, ...parsed.miscSettings },
        progress: parsed.progress,
      };
    }
  } catch {
    // ignore
  }
  return {
    config: { ...DEFAULT_CONFIG },
    panelPosition: { ...DEFAULT_POSITION },
    panelSize: { ...DEFAULT_SIZE },
    miscSettings: { ...DEFAULT_MISC },
  };
}

export function saveState(state: SavedState): void {
  try {
    const toSave: SavedState = {
      config: { ...state.config, imageData: null },
      panelPosition: state.panelPosition,
      panelSize: state.panelSize,
      miscSettings: state.miscSettings,
      progress: state.progress,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
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
