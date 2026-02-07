import type { BotConfig, BotState, CanvasInfo } from '../types';

declare const unsafeWindow: Window & typeof globalThis;
import { 
  fetchMe, 
  getMainCanvas, 
  getCanvasId,
  setCanvasId,
  getPixelColorSync,
  getFreshPixelColor,
  prefetchChunksForPixels,
  placePixelViaWebSocket,
  clearChunkCache 
} from '../api/pixmap';
import { processImage, ProcessedImage } from './imageProcessor';
import { Logger } from '../utils/logger';
import { isCaptchaActive } from '../utils/captchaSolver';
import { gaussianRandom, shouldTakeBreak, getBreakDuration } from '../utils/antidetect';

type StateChangeCallback = (state: BotState) => void;

export class BotController {
  private config: BotConfig;
  private state: BotState;
  private processedImage: ProcessedImage | null = null;
  private running = false;
  private cooldownIntervals: Set<number> = new Set();
  private cooldownTimeouts: Set<number> = new Set();
  private onStateChange: StateChangeCallback | null = null;
  private canvas: CanvasInfo | null = null;

  constructor() {
    this.config = {
      coordinates: '0_0',
      canvasId: '0',
      strategy: 'line-ltr',
      brushSize: '1x1',
      textDrawText: '',
      repairMode: false,
      debugMode: false,
      skipColorCheck: false,
      placementDelay: 0,
      stopOnCaptcha: true,
      followBot: false,
      followBotUrl: '',
      imageData: null,
      imageName: '',
      theme: 'default',
    };

    this.state = {
      status: 'idle',
      cooldown: 0,
      progress: 0,
      totalPixels: 0,
      placedPixels: 0,
      skippedPixels: 0,
      errorCount: 0,
      currentPixelIndex: 0,
      onlineCount: 0,
      startTime: null,
      pixelsPerSecond: 0,
      eta: 0,
      lastCooldownMs: 0,
    };
  }

  setStateChangeCallback(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  private updateState(partial: Partial<BotState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyStateChange();
  }

  getState(): BotState {
    return { ...this.state };
  }

  getConfig(): BotConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<BotConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.debugMode !== undefined) {
      Logger.setDebugMode(partial.debugMode);
    }
  }

  async initialize(): Promise<boolean> {
    try {
      Logger.info('Initializing bot...');
      await fetchMe();
      this.canvas = getMainCanvas();
      if (!this.canvas) {
        Logger.error('Failed to get canvas info');
        return false;
      }
      Logger.info(`Canvas loaded: ${this.canvas.title}, size: ${this.canvas.size}`);
      return true;
    } catch (err) {
      Logger.error('Failed to initialize:', err);
      return false;
    }
  }

  parseCoordinates(): { x: number; y: number } | null {
    const match = this.config.coordinates.match(/^(-?\d+)[_,](-?\d+)$/);
    if (!match) {
      return null;
    }
    return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
  }

  async start(savedProgress?: { currentPixelIndex: number; imageName: string; coordinates: string }): Promise<void> {
    if (this.running) {
      return;
    }

    if (!this.config.imageData) {
      alert('Please load an image first');
      return;
    }

    const coords = this.parseCoordinates();
    if (!coords) {
      alert('Invalid coordinates format. Use x_y or x,y (example: 100_200)');
      return;
    }

    setCanvasId(parseInt(this.config.canvasId, 10) || 0);

    if (!this.canvas) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    clearChunkCache();

    this.processedImage = processImage(
      this.config.imageData,
      coords.x,
      coords.y,
      this.config.strategy,
      this.config.brushSize
    );

    if (this.processedImage.pixels.length === 0) {
      Logger.error('No pixels to place');
      return;
    }

    let startIndex = 0;
    if (savedProgress && 
        savedProgress.imageName === this.config.imageName && 
        savedProgress.coordinates === this.config.coordinates &&
        savedProgress.currentPixelIndex < this.processedImage.pixels.length) {
      startIndex = savedProgress.currentPixelIndex;
      Logger.info(`Resuming from pixel ${startIndex}`);
    }

    this.running = true;
    this.updateState({
      status: 'running',
      totalPixels: this.processedImage.pixels.length,
      placedPixels: startIndex,
      skippedPixels: 0,
      errorCount: 0,
      currentPixelIndex: startIndex,
      progress: Math.round((startIndex / this.processedImage.pixels.length) * 100),
      startTime: Date.now(),
      pixelsPerSecond: 0,
      eta: 0,
      lastCooldownMs: 0,
    });

    Logger.info(`Bot started. ${this.processedImage.pixels.length - startIndex} pixels to place`);
    this.runLoop();
  }

  stop(): void {
    this.running = false;
    
    this.cooldownIntervals.forEach(id => clearInterval(id));
    this.cooldownIntervals.clear();
    this.cooldownTimeouts.forEach(id => clearTimeout(id));
    this.cooldownTimeouts.clear();
    
    this.updateState({ status: 'stopped', cooldown: 0 });
    this.saveProgress();
    Logger.info('Bot stopped');
  }

  private saveProgress(): void {
    if (!this.processedImage || !this.config.imageName) return;
    
    const progress = {
      currentPixelIndex: this.state.currentPixelIndex,
      imageName: this.config.imageName,
      coordinates: this.config.coordinates,
    };

    try {
      const stored = localStorage.getItem('windowsxp-bot-state');
      if (stored) {
        const state = JSON.parse(stored);
        state.progress = progress;
        localStorage.setItem('windowsxp-bot-state', JSON.stringify(state));
      }
    } catch {
      // ignore
    }
  }

  private async runLoop(): Promise<void> {
    Logger.info(`[LOOP] Starting runLoop - running=${this.running}`);
    
    if (!this.running || !this.processedImage || !this.canvas) {
      Logger.warn(`[LOOP] Early exit - running=${this.running}, hasImage=${!!this.processedImage}, hasCanvas=${!!this.canvas}`);
      return;
    }

    const pixels = this.processedImage.pixels;
    let currentIndex = this.state.currentPixelIndex;
    const canvasId = getCanvasId();

    if (!this.config.skipColorCheck) {
      Logger.info(`[LOOP] Prefetching chunks for ${pixels.length} pixels...`);
      await prefetchChunksForPixels(canvasId, pixels, this.canvas.size);
    }

    while (currentIndex < pixels.length && this.running) {
      if (isCaptchaActive()) {
        if (this.config.stopOnCaptcha) {
          Logger.warn('[LOOP] Captcha active - pausing until solved');
          this.updateState({ status: 'captcha' });
          await this.waitForCaptchaResolution();
          this.updateState({ status: 'running' });
          Logger.info('[LOOP] Captcha resolved - resuming');
        } else {
          Logger.warn('[LOOP] Captcha active - stopping bot');
          this.updateState({ status: 'stopped' });
          this.running = false;
          break;
        }
      }

      const pixel = pixels[currentIndex];

      if (!this.config.skipColorCheck) {
        let currentColor: number | null;

        if (this.config.repairMode) {
          currentColor = await getFreshPixelColor(canvasId, pixel.x, pixel.y, this.canvas.size);
        } else {
          currentColor = getPixelColorSync(canvasId, pixel.x, pixel.y, this.canvas.size);
        }

        if (currentColor !== null && currentColor === pixel.color) {
          currentIndex++;
          this.updateState({
            currentPixelIndex: currentIndex,
            skippedPixels: this.state.skippedPixels + 1,
            progress: Math.round((currentIndex / pixels.length) * 100),
          });
          continue;
        }
      }

      const delay = this.getPlacementDelay();
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }

      const brushNum = this.config.brushSize === '3x3' ? 3 : this.config.brushSize === '5x5' ? 5 : 1;
      const result = await placePixelViaWebSocket(
        pixel.x,
        pixel.y,
        pixel.color,
        canvasId,
        brushNum as 1 | 3 | 5
      );

      if (result.success) {
        currentIndex++;
        const effectiveCooldownMs = result.waitMs > 0 ? result.waitMs : this.state.lastCooldownMs;
        const cooldownSec = effectiveCooldownMs / 1000;
        const pps = cooldownSec > 0 ? Math.round((1 / cooldownSec) * 100) / 100 : 0;
        const remaining = pixels.length - currentIndex;
        const eta = cooldownSec > 0 ? Math.round(remaining * cooldownSec) : 0;
        
        this.updateState({
          currentPixelIndex: currentIndex,
          placedPixels: this.state.placedPixels + 1,
          progress: Math.round((currentIndex / pixels.length) * 100),
          pixelsPerSecond: pps,
          eta,
          lastCooldownMs: effectiveCooldownMs,
          errorCount: 0,
        });

        if (currentIndex % 10 === 0) {
          this.saveProgress();
        }

        if (this.config.followBot) {
          this.moveCamera(pixel.x, pixel.y);
        }

        await this.maybeHumanBreak(this.state.placedPixels);

      } else if (result.captcha || result.error?.includes('Captcha')) {
        if (this.config.stopOnCaptcha) {
          Logger.warn('[LOOP] Captcha required - pausing until solved');
          this.updateState({ status: 'captcha' });
          await this.waitForCaptchaResolution();
          this.updateState({ status: 'running' });
          Logger.info('[LOOP] Captcha resolved - resuming');
        } else {
          Logger.warn('[LOOP] Captcha required - stopping bot');
          this.updateState({ status: 'stopped' });
          this.running = false;
          break;
        }
      } else if (result.error?.includes('Cooldown')) {
        const waitTime = result.waitMs || 120000;
        Logger.info(`[LOOP] Cooldown ${Math.round(waitTime/1000)}s - will retry pixel`);
        await this.waitCooldown(waitTime);
        Logger.info(`[LOOP] Cooldown done, running=${this.running}`);
      } else if (result.error?.includes('already correct color')) {
        Logger.info(`[LOOP] Pixel already correct, skipping`);
        currentIndex++;
        this.updateState({ 
          skippedPixels: this.state.skippedPixels + 1,
          currentPixelIndex: currentIndex,
          progress: Math.round((currentIndex / pixels.length) * 100),
        });
      } else if (result.error?.includes('Protected pixel')) {
        Logger.info(`[LOOP] Protected pixel at ${pixel.x},${pixel.y}, skipping`);
        currentIndex++;
        this.updateState({
          skippedPixels: this.state.skippedPixels + 1,
          currentPixelIndex: currentIndex,
          progress: Math.round((currentIndex / pixels.length) * 100),
        });
      } else {
        Logger.error(`[LOOP] Failed: ${result.error}`);
        const errorCount = this.state.errorCount + 1;
        this.updateState({ errorCount });
        const backoffMs = Math.min(500 * Math.pow(2, Math.min(errorCount - 1, 5)), 16000);
        Logger.debug(`[LOOP] Backoff ${backoffMs}ms (error #${errorCount})`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      if (!this.running) {
        Logger.warn(`[LOOP] Loop exiting - running became false at index ${currentIndex}`);
        break;
      }
    }

    Logger.info(`[LOOP] Loop ended - running=${this.running}, currentIndex=${currentIndex}, totalPixels=${pixels.length}`);

    if (this.running && currentIndex >= pixels.length) {
      Logger.info('[LOOP] All pixels placed - marking idle');
      this.updateState({ status: 'idle', progress: 100 });
      this.running = false;
    }
  }

  private waitCooldown(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const endTime = Date.now() + ms;
      
      const intervalId = window.setInterval(() => {
        if (!this.running) {
          clearInterval(intervalId);
          this.cooldownIntervals.delete(intervalId);
          this.updateState({ cooldown: 0 });
          resolve();
          return;
        }
        const remaining = Math.max(0, endTime - Date.now());
        this.updateState({ cooldown: remaining / 1000 });
      }, 500);
      
      this.cooldownIntervals.add(intervalId);

      const timeoutId = window.setTimeout(() => {
        clearInterval(intervalId);
        this.cooldownIntervals.delete(intervalId);
        this.cooldownTimeouts.delete(timeoutId);
        this.updateState({ cooldown: 0 });
        resolve();
      }, ms);
      
      this.cooldownTimeouts.add(timeoutId);
    });
  }

  private waitForCaptchaResolution(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = window.setInterval(() => {
        if (!this.running || !isCaptchaActive()) {
          clearInterval(checkInterval);
          this.cooldownIntervals.delete(checkInterval);
          resolve();
        }
      }, 1000);
      this.cooldownIntervals.add(checkInterval);
    });
  }

  private moveCamera(x: number, y: number): void {
    try {
      const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      const win = targetWindow as unknown as Record<string, unknown>;
      if (win.store && typeof win.store === 'object') {
        const store = win.store as { dispatch?: (action: unknown) => void; getState?: () => unknown };
        if (store.dispatch) {
          store.dispatch({
            type: 'SET_VIEW_COORDINATES',
            view: [x, y],
          });
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  getEstimatedTimeRemaining(): string {
    if (this.state.lastCooldownMs <= 0) {
      return '--:--';
    }

    const remaining = this.state.totalPixels - this.state.currentPixelIndex;
    const cooldownSec = this.state.lastCooldownMs / 1000;
    const estimatedSec = remaining * cooldownSec;

    const hours = Math.floor(estimatedSec / 3600);
    const minutes = Math.floor((estimatedSec % 3600) / 60);

    return `${hours}h${minutes.toString().padStart(2, '0')}m`;
  }

  private getPlacementDelay(): number {
    const baseDelay = this.config.placementDelay;
    if (baseDelay <= 0) {
      return Math.max(0, gaussianRandom(50, 20));
    }
    return Math.max(0, gaussianRandom(baseDelay, baseDelay * 0.2));
  }

  private async maybeHumanBreak(pixelsPlaced: number): Promise<void> {
    if (shouldTakeBreak(pixelsPlaced)) {
      const breakDuration = getBreakDuration();
      Logger.debug(`Taking human-like break for ${Math.round(breakDuration)}ms`);
      await new Promise(resolve => setTimeout(resolve, breakDuration));
    }
  }
}

export const botController = new BotController();
