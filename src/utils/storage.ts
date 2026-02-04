import type { SavedState, BotConfig, PanelPosition, PlacementStrategy } from '../types';

const STORAGE_KEY = 'ppf-bot-state';

const DEFAULT_CONFIG: BotConfig = {
  coordinates: '0_0',
  strategy: 'line-ltr' as PlacementStrategy,
  stopOnCaptcha: true,
  followBot: false,
  followBotUrl: '',
  imageData: null,
  imageName: '',
};

const DEFAULT_POSITION: PanelPosition = {
  x: 20,
  y: 20,
};

export function loadState(): SavedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SavedState;
      return {
        config: { ...DEFAULT_CONFIG, ...parsed.config, imageData: null },
        panelPosition: parsed.panelPosition || DEFAULT_POSITION,
        progress: parsed.progress,
      };
    }
  } catch {
    // ignore
  }
  return {
    config: { ...DEFAULT_CONFIG },
    panelPosition: { ...DEFAULT_POSITION },
  };
}

export function saveState(state: SavedState): void {
  try {
    const toSave: SavedState = {
      config: { ...state.config, imageData: null },
      panelPosition: state.panelPosition,
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
