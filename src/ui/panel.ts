import type { BotConfig, BotState, PlacementStrategy, PanelPosition, PanelSize, MiscSettings, BrushSize, Theme } from '../types';
import { STRATEGY_LABELS } from '../types';
import { STYLES } from './styles';
import { botController } from '../bot/controller';
import { loadImageFromFile, loadImageFromUrl } from '../bot/imageProcessor';
import { loadState, saveState, restoreImageData, imageDataToDataUrl } from '../utils/storage';
import { Logger } from '../utils/logger';
import { getCachedMe, clearChunkCache, detectCanvasIdFromHash } from '../api/pixmap';
import { setupHotkeys } from '../utils/hotkeys';

export class Panel {
  private container: HTMLDivElement | null = null;
  private shadowHost: HTMLDivElement | null = null;
  private root: ShadowRoot | Document = document;
  private config: BotConfig;
  private position: PanelPosition;
  private panelSize: PanelSize;
  private miscSettings: MiscSettings;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private minimized = false;
  private completionFired = false;
  private startInProgress = false;
  private originalPageTitle = '';
  private isResizing = false;
  private resizeCorner: 'tl' | 'tr' | 'bl' | 'br' | null = null;
  private resizeStart = { x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 };
  private elements: {
    canvasSelect: HTMLSelectElement | null;
    coordinatesInput: HTMLInputElement | null;
    brushSizeSelect: HTMLSelectElement | null;
    strategySelect: HTMLSelectElement | null;
    textDrawInput: HTMLInputElement | null;
    textDrawRow: HTMLDivElement | null;
    repairModeCheckbox: HTMLInputElement | null;
    skipColorCheckCheckbox: HTMLInputElement | null;
    placementDelayInput: HTMLInputElement | null;
    debugModeCheckbox: HTMLInputElement | null;
    stopOnCaptchaCheckbox: HTMLInputElement | null;
    followBotCheckbox: HTMLInputElement | null;
    followBotUrlInput: HTMLInputElement | null;
    followBotUrlRow: HTMLDivElement | null;
    fileInput: HTMLInputElement | null;
    fileNameSpan: HTMLSpanElement | null;
    startBtn: HTMLButtonElement | null;
    stopBtn: HTMLButtonElement | null;
    statusValue: HTMLSpanElement | null;
    cooldownValue: HTMLSpanElement | null;
    progressValue: HTMLSpanElement | null;
    endInValue: HTMLSpanElement | null;
    progressBar: HTMLDivElement | null;
    content: HTMLDivElement | null;
    etaValue: HTMLSpanElement | null;
    themeSelect: HTMLSelectElement | null;
    mainTab: HTMLDivElement | null;
    miscTab: HTMLDivElement | null;
  } = {
    canvasSelect: null,
    coordinatesInput: null,
    brushSizeSelect: null,
    strategySelect: null,
    textDrawInput: null,
    textDrawRow: null,
    repairModeCheckbox: null,
    skipColorCheckCheckbox: null,
    placementDelayInput: null,
    debugModeCheckbox: null,
    stopOnCaptchaCheckbox: null,
    followBotCheckbox: null,
    followBotUrlInput: null,
    followBotUrlRow: null,
    fileInput: null,
    fileNameSpan: null,
    startBtn: null,
    stopBtn: null,
    statusValue: null,
    cooldownValue: null,
    progressValue: null,
    endInValue: null,
    progressBar: null,
    content: null,
    etaValue: null,
    themeSelect: null,
    mainTab: null,
    miscTab: null,
  };

  constructor() {
    const saved = loadState();
    this.config = saved.config;
    this.position = saved.panelPosition;
    this.panelSize = saved.panelSize || { width: 0, height: 0 };
    this.miscSettings = saved.miscSettings || {
      collapsedSections: [],
      soundEnabled: true,
      notificationsEnabled: true,
      autoMinimize: false,
      autoResume: false,
      opacity: 100,
    };
  }

  init(): void {
    this.originalPageTitle = document.title;
    this.createPanel();
    this.injectStyles();
    this.attachEventListeners();
    this.updateUIFromConfig();
    this.updateMiscUIFromSettings();
    this.restorePanelSize();
    this.restoreCollapsedSections();
    
    setupHotkeys(
      () => this.onStart(),
      () => this.onStop(),
      () => this.onResetProgress(),
      () => this.toggleMinimize()
    );
    
    botController.setStateChangeCallback((state) => this.onStateChange(state));
    botController.updateConfig(this.config);
    
    botController.initialize().then(async (success) => {
      if (success) {
        Logger.info('Bot initialized successfully');
        this.populateCanvasSelect();
        const detectedCanvasId = detectCanvasIdFromHash();
        if (detectedCanvasId !== null) {
          this.config.canvasId = String(detectedCanvasId);
          if (this.elements.canvasSelect) {
            this.elements.canvasSelect.value = String(detectedCanvasId);
          }
          botController.updateConfig(this.config);
          Logger.info(`Auto-detected canvas from URL: ${detectedCanvasId}`);
        }
        this.tryAutoFillCoordinates();
        await this.restoreSavedImage();
        this.tryAutoResume();
      } else {
        Logger.error('Bot initialization failed');
      }
    });
  }

  private async restoreSavedImage(): Promise<void> {
    if (this.config.imageData) return;
    if (!this.config.imageName) return;
    const imageData = await restoreImageData();
    if (!imageData) return;
    this.config.imageData = imageData;
    botController.updateConfig(this.config);
    if (this.elements.fileNameSpan) {
      this.elements.fileNameSpan.textContent = this.config.imageName;
    }
    this.updatePreview(imageData);
    this.showPixelCount(imageData);
    Logger.info(`Image restored from storage: ${this.config.imageName} (${imageData.width}x${imageData.height})`);
  }

  private tryAutoFillCoordinates(): void {
    if (this.config.coordinates && this.config.coordinates !== '0_0') return;
    try {
      const hash = window.location.hash;
      if (!hash) return;
      const parts = hash.replace('#', '').split(',');
      if (parts.length >= 3) {
        const x = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(x) && !isNaN(y)) {
          this.config.coordinates = `${x}_${y}`;
          if (this.elements.coordinatesInput) {
            this.elements.coordinatesInput.value = this.config.coordinates;
          }
          botController.updateConfig(this.config);
          this.saveCurrentState();
          Logger.info(`Auto-filled coordinates from URL: ${this.config.coordinates} (canvas ${this.config.canvasId})`);
        }
      }
    } catch {
      // ignore
    }
  }

  private tryAutoResume(): void {
    if (!this.miscSettings.autoResume) return;
    const saved = loadState();
    if (!saved.progress || !saved.progress.imageName || !saved.progress.coordinates) return;
    if (saved.progress.imageName !== this.config.imageName) return;
    if (saved.progress.coordinates !== this.config.coordinates) return;
    if (!this.config.imageData) return;
    Logger.info(`Auto-resuming from pixel ${saved.progress.currentPixelIndex}`);
    this.onStart();
  }

  private injectStyles(): void {
    if (this.root.getElementById('ppf-bot-styles')) return;
    const style = document.createElement('style');
    style.id = 'ppf-bot-styles';
    style.textContent = STYLES;
    if (this.root instanceof ShadowRoot) {
      this.root.appendChild(style);
    } else {
      document.head.appendChild(style);
    }
  }

  private createPanel(): void {
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'ppf-bot-shadow-host';
    this.shadowHost.style.cssText = 'position:fixed;z-index:99999;top:0;left:0;width:100vw;height:100vh;overflow:visible;pointer-events:none;';
    this.root = this.shadowHost.attachShadow({ mode: 'open' });
    document.body.appendChild(this.shadowHost);

    this.container = document.createElement('div');
    this.container.id = 'ppf-bot-panel';

    this.container.innerHTML = `
      <div class="ppf-resize-handle ppf-resize-tl"></div>
      <div class="ppf-resize-handle ppf-resize-tr"></div>
      <div class="ppf-resize-handle ppf-resize-bl"></div>
      <div class="ppf-resize-handle ppf-resize-br"></div>
      <div class="ppf-titlebar">
        <div class="ppf-titlebar-left">
          <span class="ppf-titlebar-text">ppf-bot</span>
        </div>
        <div class="ppf-status-pill">
          <div class="ppf-status-pill-icon"><svg viewBox="0 0 672 650" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 C1.13-0.03 2.26-0.07 3.43-0.1 C5.05-0.11 5.05-0.11 6.71-0.12 C7.69-0.13 8.67-0.15 9.68-0.16 C12.19 0.44 12.19 0.44 14.02 2.84 C15.25 5.57 15.46 6.78 15 9.69 C14.82 10.87 14.82 10.87 14.64 12.07 C14.22 14.27 13.72 16.44 13.19 18.63 C8.02 41.26 13.76 62.97 25.79 82.34 C33.3 93.62 43.8 102.03 56.19 107.44 C56.91 107.76 57.63 108.08 58.38 108.42 C62.87 110.05 67.54 110.94 72.21 111.94 C77.98 113.23 77.98 113.23 80.19 115.44 C80.83 117.23 81.46 119.03 82.04 120.85 C86.39 134.39 92.46 146.45 102.54 156.62 C104.19 158.44 104.19 158.44 104.19 160.44 C104.77 160.71 105.35 160.98 105.95 161.26 C108.17 162.43 110.04 163.76 112.06 165.25 C117.97 169.24 124.42 171.34 131.19 173.44 C131.96 173.69 132.73 173.94 133.52 174.19 C148.95 178.42 167.35 175.03 181.19 167.44 C184.28 165.6 184.28 165.6 187.19 163.44 C188.08 162.81 188.08 162.81 188.98 162.17 C193.02 159.24 196.56 156.11 200.13 152.63 C203.95 149.18 206.65 147.17 211.87 147.09 C215.47 147.63 218.67 148.89 222.04 150.25 C231.65 153.87 241.92 156.11 252.19 156.44 C252.83 156.47 253.47 156.5 254.13 156.53 C271 157.3 288.27 154.14 303.4 146.29 C306.36 144.88 308.09 145.48 311.19 146.44 C317.23 150.27 322.26 155.23 327.25 160.31 C327.92 160.98 328.59 161.65 329.28 162.34 C333.78 166.88 338.02 171.59 342.19 176.44 C343.15 177.53 344.11 178.63 345.07 179.72 C356.54 192.85 366.77 206.77 376.19 221.44 C376.57 222.03 376.95 222.62 377.35 223.23 C381.14 229.16 384.47 235.31 387.81 241.5 C388.38 242.55 388.96 243.6 389.55 244.68 C392.35 249.86 394.99 254.98 397.19 260.44 C397.66 261.54 398.13 262.64 398.62 263.77 C405.18 279.56 409.38 294.93 409.48 312.1 C409.5 314.1 409.54 316.1 409.59 318.1 C409.67 330.04 407.02 341.22 398.59 350.12 C390.94 357.1 382.14 360.44 371.79 360.44 C355.18 359.57 342.61 352.87 329.43 343.21 C323.56 338.92 317.43 335.16 311.19 331.44 C310.47 330.98 309.74 330.53 309 330.06 C272.51 307.41 220.06 296.18 177.66 305.38 C172.86 306.84 169.7 308.94 166.19 312.44 C163.3 314.85 160.79 316.07 157.19 317.12 C156.22 317.41 155.26 317.69 154.27 317.99 C153.25 318.28 152.23 318.57 151.19 318.88 C149.11 319.49 147.03 320.11 144.95 320.73 C143.95 321.02 142.95 321.32 141.93 321.62 C138.62 322.61 135.34 323.62 132.06 324.69 C131.21 324.96 130.37 325.23 129.49 325.52 C127.12 326.39 127.12 326.39 124.88 327.86 C122.67 329.16 120.81 329.99 118.42 330.83 C113.82 332.49 109.68 334.77 105.44 337.19 C104.65 337.63 103.87 338.07 103.06 338.53 C100.76 339.83 98.48 341.13 96.19 342.44 C95.03 343.09 93.86 343.75 92.7 344.4 C68.5 358.23 47.34 377.49 29.5 398.81 C27.01 401.73 24.34 403.86 21.25 406.13 C15.14 410.87 11.82 416.7 8.19 423.44 C7.59 424.5 7 425.56 6.38 426.65 C-1.72 441.8-6.45 458.65-9.81 475.44 C-9.96 476.13-10.1 476.83-10.25 477.55 C-16.77 509.65-13.55 542.58-5.53 574.1 C-0.99 592.16-0.19 613.89-9.94 630.44 C-16.83 640.08-25.73 647.31-37.42 650.05 C-72.08 654.04-100.89 640.1-127.68 618.98 C-132.23 615.33-136.52 611.4-140.81 607.44 C-142.44 606-144.06 604.56-145.69 603.13 C-156.18 593.63-165.35 583.77-173.81 572.44 C-174.51 571.51-175.21 570.59-175.93 569.63 C-177.93 566.93-179.88 564.19-181.81 561.44 C-182.56 560.39-183.3 559.34-184.07 558.27 C-189.51 550.47-194.21 542.35-198.75 534 C-199.31 532.98-199.86 531.96-200.43 530.91 C-203.33 525.51-205.76 520.21-207.81 514.44 C-208.78 512.79-209.75 511.15-210.72 509.5 C-214.9 501.59-217.42 492.75-220.13 484.25 C-220.39 483.41-220.66 482.57-220.93 481.71 C-221.3 480.53-221.3 480.53-221.68 479.33 C-221.9 478.63-222.11 477.93-222.34 477.2 C-222.81 475.44-222.81 475.44-222.81 473.44 C-223.55 473.17-224.28 472.9-225.04 472.63 C-233.26 469.1-238.43 463.02-242.81 455.44 C-243.53 454.31-243.53 454.31-244.27 453.16 C-254.48 436.17-257.94 415.75-260.81 396.44 C-261 395.22-261.19 393.99-261.38 392.74 C-263.08 380.82-263.15 368.91-263.13 356.88 C-263.13 353.47-263.15 350.06-263.17 346.64 C-263.24 323.69-260.54 301.66-254.81 279.44 C-254.64 278.74-254.46 278.04-254.28 277.32 C-252.15 269.02-249.27 261.27-245.81 253.44 C-245.31 252.24-244.81 251.04-244.29 249.8 C-240.68 241.23-236.6 233-232.19 224.82 C-231.05 222.7-229.93 220.57-228.81 218.44 C-228.34 217.58-227.88 216.71-227.39 215.82 C-226.54 212.33-227.75 209.84-228.81 206.44 C-230.49 194.03-228.09 183.59-222.81 172.44 C-222.5 171.78-222.19 171.11-221.87 170.43 C-219.63 165.71-217.24 161.07-214.81 156.44 C-214.13 155.12-213.45 153.8-212.77 152.48 C-206.69 140.8-199.71 129.98-191.81 119.44 C-191.05 118.42-190.29 117.4-189.5 116.35 C-185.01 110.39-180.35 104.61-175.5 98.94 C-175.01 98.36-174.52 97.79-174.01 97.19 C-171.08 93.8-168.02 90.58-164.81 87.44 C-164.24 86.85-163.67 86.27-163.07 85.66 C-159.49 82.01-155.77 78.58-151.89 75.24 C-150.5 74.04-149.12 72.81-147.76 71.57 C-138.74 63.36-129.06 56.06-118.81 49.44 C-118.13 48.97-117.45 48.5-116.75 48.02 C-110.02 43.4-102.94 39.41-95.81 35.44 C-95 34.98-94.18 34.52-93.34 34.05 C-90.69 32.57-88.03 31.1-85.38 29.63 C-84.53 29.16-83.69 28.69-82.83 28.21 C-78.24 25.67-73.66 23.44-68.81 21.44 C-67.47 20.79-66.14 20.12-64.81 19.44 C-53.55 13.61-41.39 9.21-29.38 5.19 C-28.64 4.94-27.91 4.7-27.16 4.44 C-25.05 3.75-22.93 3.09-20.81 2.44 C-19.58 2.06-18.35 1.68-17.08 1.29 C-11.46-0.06-5.75 0.03 0 0Z" fill="#768798" transform="translate(262.81,-0.44)"/><path d="M0 0 C4.33 2.13 7.26 5.69 9.23 10.09 C10.91 15.78 10.83 22 8.32 27.43 C7.85 28.29 7.85 28.29 7.37 29.16 C6.71 29.16 6.05 29.16 5.37 29.16 C5.37 29.82 5.37 30.48 5.37 31.16 C0.44 34.38-2.58 35.91-8.63 35.16 C-15.92 33.32-15.92 33.32-17.95 30.04 C-18.17 29.42-18.4 28.8-18.63 28.16 C-19.62 27.83-20.61 27.5-21.63 27.16 C-24.57 22.69-24.66 17.38-24.63 12.16 C-23.27 6.62-20.62 3.45-16.02 0.26 C-10.9-2.09-5.28-1.68 0 0Z" fill="#768798" transform="translate(511.63,64.84)"/><path d="M0 0 C0 0.66 0 1.32 0 2 C0.66 2 1.32 2 2 2 C5.21 4.41 6.08 7.17 7 11 C7.87 17.92 6.23 22.91 3 29 C2.34 29 1.68 29 1 29 C1 29.66 1 30.32 1 31 C-3.22 34.41-7.71 35.13-13 35 C-19.28 33.95-24.08 32.26-28 27 C-30.47 21.95-30.92 16.51-30 11 C-28 6.13-25.5 2.25-21.44-1.13 C-14.33-2.94-6.72-3.14 0 0Z" fill="#768798" transform="translate(433,41)"/></svg></div>
          <div class="ppf-status-pill-text">
            <span class="ppf-status-pill-title">ppf-bot</span>
            <span class="ppf-status-pill-sub"><span class="ppf-status-dot ppf-dot-idle" id="ppf-pill-dot"></span><span id="ppf-pill-status">Idle</span></span>
          </div>
        </div>
        <div class="ppf-titlebar-right">
          <span class="ppf-minimize-btn" title="Minimize"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="ppf-tabs">
        <div class="ppf-tab ppf-tab-active" data-tab="main">Main</div>
        <div class="ppf-tab" data-tab="misc">Misc</div>
      </div>
      <div class="ppf-content">
        <div class="ppf-tab-content ppf-tab-content-active" id="ppf-tab-main">
        
        <div class="ppf-section">
          <div class="ppf-section-header" data-section="image">
            <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span> IMAGE <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
          </div>
          <div class="ppf-section-content" id="ppf-section-image">
            <div class="ppf-file-row">
              <button class="ppf-file-btn" id="ppf-file-btn">Browse</button>
              <span class="ppf-file-name" id="ppf-file-name">no file</span>
              <input type="file" id="ppf-file-input" accept="image/*" style="display:none" />
            </div>
            <input type="text" class="ppf-input ppf-url-input" id="ppf-image-url" placeholder="or paste URL..." />
            <button class="ppf-file-btn" id="ppf-load-url-btn" style="margin-top:4px;width:100%">Load URL</button>
            <div id="ppf-preview" class="ppf-preview"></div>
          </div>
        </div>
        
        <div class="ppf-section">
          <div class="ppf-section-header" data-section="placement">
            <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span> PLACEMENT <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
          </div>
          <div class="ppf-section-content" id="ppf-section-placement">
            <div class="ppf-row">
              <label class="ppf-label">Position</label>
              <input type="text" class="ppf-input" id="ppf-coordinates" placeholder="x_y" />
            </div>
            <div class="ppf-row">
              <label class="ppf-label">Canvas</label>
              <select class="ppf-select" id="ppf-canvas">
                <option value="0">...</option>
              </select>
            </div>
            <div class="ppf-row">
              <label class="ppf-label">Brush (beta)</label>
              <select class="ppf-select" id="ppf-brush-size">
                <option value="1x1">1x1</option>
                <option value="3x3">3x3</option>
                <option value="5x5">5x5</option>
              </select>
            </div>
            <div class="ppf-row">
              <label class="ppf-label">Strategy</label>
              <select class="ppf-select" id="ppf-strategy">
                ${Object.entries(STRATEGY_LABELS).map(([value, label]) => 
                  `<option value="${value}">${label}</option>`
                ).join('')}
              </select>
            </div>
            <div class="ppf-row ppf-hidden" id="ppf-text-draw-row">
              <label class="ppf-label">Text</label>
              <input type="text" class="ppf-input" id="ppf-text-draw" placeholder="text to draw" />
            </div>
          </div>
        </div>
        
        <div class="ppf-section">
          <div class="ppf-section-header" data-section="options">
            <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> OPTIONS <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
          </div>
          <div class="ppf-section-content" id="ppf-section-options">
            <div class="ppf-checkbox-row">
              <input type="checkbox" class="ppf-checkbox" id="ppf-skip-color-check" />
              <label class="ppf-checkbox-label" for="ppf-skip-color-check">Skip color check</label>
            </div>
            <div class="ppf-checkbox-row">
              <input type="checkbox" class="ppf-checkbox" id="ppf-repair-mode" />
              <label class="ppf-checkbox-label" for="ppf-repair-mode">Repair mode</label>
            </div>
            <div class="ppf-checkbox-row">
              <input type="checkbox" class="ppf-checkbox" id="ppf-follow-bot" />
              <label class="ppf-checkbox-label" for="ppf-follow-bot">Follow camera</label>
            </div>
            <div class="ppf-row ppf-hidden" id="ppf-follow-url-row">
              <label class="ppf-label">URL</label>
              <input type="text" class="ppf-input" id="ppf-follow-url" placeholder="bot url" />
            </div>
            <div class="ppf-row" id="ppf-fixed-delay-row">
              <label class="ppf-label">Delay</label>
              <input type="number" class="ppf-input" id="ppf-placement-delay" min="0" max="5000" value="0" style="width:60px" />
              <span class="ppf-small" style="margin-left:4px">ms</span>
            </div>
            <div class="ppf-divider"></div>
            <div class="ppf-checkbox-row">
              <input type="checkbox" class="ppf-checkbox" id="ppf-stop-captcha" checked />
              <label class="ppf-checkbox-label" for="ppf-stop-captcha">Pause on captcha</label>
            </div>
            <div class="ppf-checkbox-row">
              <input type="checkbox" class="ppf-checkbox" id="ppf-debug-mode" />
              <label class="ppf-checkbox-label" for="ppf-debug-mode">Debug logs</label>
            </div>
          </div>
        </div>
        
        <div class="ppf-buttons">
          <button class="ppf-btn ppf-btn-start" id="ppf-start-btn">Start</button>
          <button class="ppf-btn ppf-btn-stop" id="ppf-stop-btn" disabled>Stop</button>
          <button class="ppf-btn ppf-btn-icon" id="ppf-reset-btn" title="Reset progress"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
        </div>
        
        </div>
        
        <div class="ppf-tab-content" id="ppf-tab-misc">
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="appearance">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></span> APPEARANCE <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-appearance">
              <div class="ppf-row">
                <label class="ppf-label">Theme</label>
                <select class="ppf-select" id="ppf-theme">
                  <option value="default">Default</option>
                  <option value="ppf">Windows XP</option>
                </select>
              </div>
              <div class="ppf-row">
                <label class="ppf-label">Opacity</label>
                <input type="range" class="ppf-range" id="ppf-opacity" min="30" max="100" value="100" style="flex: 1;">
                <span class="ppf-small" id="ppf-opacity-value" style="width: 30px; text-align: right;">100%</span>
              </div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="notifications">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span> NOTIFICATIONS <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-notifications">
              <div class="ppf-checkbox-row">
                <input type="checkbox" class="ppf-checkbox" id="ppf-sound-enabled" checked>
                <label class="ppf-checkbox-label" for="ppf-sound-enabled">Sound on completion</label>
              </div>
              <div class="ppf-checkbox-row">
                <input type="checkbox" class="ppf-checkbox" id="ppf-notifications-enabled" checked>
                <label class="ppf-checkbox-label" for="ppf-notifications-enabled">Browser notifications</label>
              </div>
              <div class="ppf-checkbox-row">
                <input type="checkbox" class="ppf-checkbox" id="ppf-auto-minimize">
                <label class="ppf-checkbox-label" for="ppf-auto-minimize">Auto-minimize when running</label>
              </div>
              <div class="ppf-checkbox-row">
                <input type="checkbox" class="ppf-checkbox" id="ppf-auto-resume">
                <label class="ppf-checkbox-label" for="ppf-auto-resume">Auto-resume on page reload</label>
              </div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="hotkeys">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg></span> HOTKEYS <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-hotkeys">
              <div class="ppf-info-row"><span class="ppf-info-label"><span class="ppf-kbd">Space</span></span><span class="ppf-info-value">Start / Stop</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label"><span class="ppf-kbd">R</span></span><span class="ppf-info-value">Reset progress</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label"><span class="ppf-kbd">Esc</span></span><span class="ppf-info-value">Stop bot</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label"><span class="ppf-kbd">M</span></span><span class="ppf-info-value">Minimize / Expand</span></div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="actions">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> ACTIONS <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-actions">
              <div class="ppf-row" style="gap: 4px;">
                <button class="ppf-btn" id="ppf-clear-cache-btn" style="flex: 1;">Clear Cache</button>
                <button class="ppf-btn" id="ppf-reset-position-btn" style="flex: 1;">Reset Panel</button>
              </div>
              <div class="ppf-row" style="gap: 4px;">
                <button class="ppf-btn" id="ppf-export-config-btn" style="flex: 1;">Export Config</button>
                <button class="ppf-btn" id="ppf-import-config-btn" style="flex: 1;">Import Config</button>
              </div>
              <input type="file" id="ppf-import-file" accept=".json" style="display: none;">
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="stats">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> SESSION STATS <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-stats">
              <div class="ppf-info-row"><span class="ppf-info-label">Session time</span><span class="ppf-info-value" id="ppf-session-time">0:00:00</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label">Total placed</span><span class="ppf-info-value" id="ppf-total-placed">0</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label">Pixels/hour</span><span class="ppf-info-value" id="ppf-pixels-hour">0</span></div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="about">
              <span class="ppf-section-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span> ABOUT <span class="ppf-section-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </div>
            <div class="ppf-section-content" id="ppf-section-about">
              <div class="ppf-info-row"><span class="ppf-info-label">Version</span><span class="ppf-info-value">1.1.0</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label">Author</span><span class="ppf-info-value">briocheis.cool</span></div>
              <div class="ppf-info-row"><span class="ppf-info-label">Site</span><span class="ppf-info-value"><a href="https://briocheis.cool" target="_blank">briocheis.cool</a></span></div>
            </div>
          </div>
        </div>
        
        <div class="ppf-status-section">
          <div class="ppf-status-header"><span class="ppf-section-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span> LIVE STATUS</div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">status</span>
            <span class="ppf-status-value ppf-status-idle" id="ppf-status">idle</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">progress</span>
            <span class="ppf-status-value" id="ppf-progress">0%</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">placed</span>
            <span class="ppf-status-value" id="ppf-placed">0</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">skipped</span>
            <span class="ppf-status-value" id="ppf-skipped">0</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">speed</span>
            <span class="ppf-status-value" id="ppf-speed">0 px/s</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">eta</span>
            <span class="ppf-status-value" id="ppf-eta-display">--:--</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">errors</span>
            <span class="ppf-status-value" id="ppf-errors">0</span>
          </div>
          <div class="ppf-status-row">
            <span class="ppf-status-label">cooldown</span>
            <span class="ppf-status-value" id="ppf-cooldown">0s</span>
          </div>
          <div class="ppf-progress-bar">
            <div class="ppf-progress-fill" id="ppf-progress-bar" style="width:0%"></div>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.container);
    
    if (this.position.x !== 0 || this.position.y !== 0) {
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
      this.container.style.bottom = 'auto';
      this.container.style.transform = 'none';
    }
    
    this.cacheElements();
  }

  private cacheElements(): void {
    this.elements.canvasSelect = this.root.getElementById('ppf-canvas') as HTMLSelectElement;
    this.elements.coordinatesInput = this.root.getElementById('ppf-coordinates') as HTMLInputElement;
    this.elements.brushSizeSelect = this.root.getElementById('ppf-brush-size') as HTMLSelectElement;
    this.elements.strategySelect = this.root.getElementById('ppf-strategy') as HTMLSelectElement;
    this.elements.textDrawInput = this.root.getElementById('ppf-text-draw') as HTMLInputElement;
    this.elements.textDrawRow = this.root.getElementById('ppf-text-draw-row') as HTMLDivElement;
    this.elements.repairModeCheckbox = this.root.getElementById('ppf-repair-mode') as HTMLInputElement;
    this.elements.skipColorCheckCheckbox = this.root.getElementById('ppf-skip-color-check') as HTMLInputElement;
    this.elements.placementDelayInput = this.root.getElementById('ppf-placement-delay') as HTMLInputElement;
    this.elements.debugModeCheckbox = this.root.getElementById('ppf-debug-mode') as HTMLInputElement;
    this.elements.stopOnCaptchaCheckbox = this.root.getElementById('ppf-stop-captcha') as HTMLInputElement;
    this.elements.followBotCheckbox = this.root.getElementById('ppf-follow-bot') as HTMLInputElement;
    this.elements.followBotUrlInput = this.root.getElementById('ppf-follow-url') as HTMLInputElement;
    this.elements.followBotUrlRow = this.root.getElementById('ppf-follow-url-row') as HTMLDivElement;
    this.elements.fileInput = this.root.getElementById('ppf-file-input') as HTMLInputElement;
    this.elements.fileNameSpan = this.root.getElementById('ppf-file-name') as HTMLSpanElement;
    this.elements.startBtn = this.root.getElementById('ppf-start-btn') as HTMLButtonElement;
    this.elements.stopBtn = this.root.getElementById('ppf-stop-btn') as HTMLButtonElement;
    this.elements.statusValue = this.root.getElementById('ppf-status') as HTMLSpanElement;
    this.elements.cooldownValue = this.root.getElementById('ppf-cooldown') as HTMLSpanElement;
    this.elements.progressValue = this.root.getElementById('ppf-progress') as HTMLSpanElement;
    this.elements.etaValue = this.root.getElementById('ppf-eta-display') as HTMLSpanElement;
    this.elements.progressBar = this.root.getElementById('ppf-progress-bar') as HTMLDivElement;
    this.elements.content = this.container?.querySelector('.ppf-content') as HTMLDivElement;
    this.elements.themeSelect = this.root.getElementById('ppf-theme') as HTMLSelectElement;
    this.elements.mainTab = this.root.getElementById('ppf-tab-main') as HTMLDivElement;
    this.elements.miscTab = this.root.getElementById('ppf-tab-misc') as HTMLDivElement;
  }

  private populateCanvasSelect(): void {
    if (!this.elements.canvasSelect) return;
    
    const me = getCachedMe();
    if (!me || !me.canvases) {
      this.elements.canvasSelect.innerHTML = '<option value="0">Earth</option>';
      return;
    }
    
    this.elements.canvasSelect.innerHTML = '';
    Object.entries(me.canvases).forEach(([id, canvas]: [string, any]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = canvas.title || `Canvas ${id}`;
      this.elements.canvasSelect!.appendChild(option);
    });
    
    if (this.config.canvasId) {
      this.elements.canvasSelect.value = this.config.canvasId;
    }
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    const titlebar = this.container.querySelector('.ppf-titlebar') as HTMLElement;
    const minimizeBtn = this.container.querySelector('.ppf-minimize-btn') as HTMLElement;
    const fileBtn = this.root.getElementById('ppf-file-btn') as HTMLButtonElement;
    const loadUrlBtn = this.root.getElementById('ppf-load-url-btn') as HTMLButtonElement;
    const imageUrlInput = this.root.getElementById('ppf-image-url') as HTMLInputElement;

    titlebar.addEventListener('mousedown', (e) => this.onDragStart(e));
    titlebar.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.onDragStart({ clientX: touch.clientX, clientY: touch.clientY, target: e.target } as any);
    }, { passive: false });

    const resizeHandles = this.container.querySelectorAll('.ppf-resize-handle');
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => this.onResizeStart(e as MouseEvent));
      handle.addEventListener('touchstart', (e) => {
        const touch = (e as TouchEvent).touches[0];
        this.onResizeStart({ clientX: touch.clientX, clientY: touch.clientY, target: e.target, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() } as any);
      }, { passive: false });
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) this.onDragMove(e);
      if (this.isResizing) this.onResizeMove(e);
    });
    
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging || this.isResizing) {
        e.preventDefault();
        const touch = e.touches[0];
        if (this.isDragging) this.onDragMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
        if (this.isResizing) this.onResizeMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
      }
    }, { passive: false });
    
    document.addEventListener('mouseup', () => {
      this.onDragEnd();
      this.onResizeEnd();
    });
    
    document.addEventListener('touchend', () => {
      this.onDragEnd();
      this.onResizeEnd();
    });
    
    document.addEventListener('touchcancel', () => {
      this.onDragEnd();
      this.onResizeEnd();
    });

    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    
    this.root.querySelectorAll('.ppf-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = (e.target as HTMLElement).getAttribute('data-tab') as 'main' | 'misc';
        if (tabName) this.switchTab(tabName);
      });
    });
    
    this.root.querySelectorAll('.ppf-section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const headerEl = (e.target as HTMLElement).closest('.ppf-section-header') as HTMLElement;
        if (!headerEl) return;
        const section = headerEl.getAttribute('data-section');
        const content = this.root.getElementById(`ppf-section-${section}`);
        const arrow = headerEl.querySelector('.ppf-section-arrow');
        if (content && arrow && section) {
          content.classList.toggle('collapsed');
          arrow.classList.toggle('collapsed');
          const idx = this.miscSettings.collapsedSections.indexOf(section);
          if (content.classList.contains('collapsed')) {
            if (idx === -1) this.miscSettings.collapsedSections.push(section);
          } else {
            if (idx !== -1) this.miscSettings.collapsedSections.splice(idx, 1);
          }
          this.saveCurrentState();
        }
      });
    });

    this.elements.canvasSelect?.addEventListener('change', () => this.onConfigChange());
    this.elements.coordinatesInput?.addEventListener('change', () => this.onConfigChange());
    this.elements.brushSizeSelect?.addEventListener('change', () => this.onConfigChange());
    this.elements.strategySelect?.addEventListener('change', () => {
      this.onConfigChange();
      this.toggleTextDrawInput();
    });
    this.elements.textDrawInput?.addEventListener('change', () => this.onConfigChange());
    this.elements.repairModeCheckbox?.addEventListener('change', () => this.onConfigChange());
    this.elements.skipColorCheckCheckbox?.addEventListener('change', () => this.onConfigChange());
    this.elements.placementDelayInput?.addEventListener('change', () => this.onConfigChange());
    this.elements.debugModeCheckbox?.addEventListener('change', () => this.onConfigChange());
    this.elements.stopOnCaptchaCheckbox?.addEventListener('change', () => this.onConfigChange());
    this.elements.followBotCheckbox?.addEventListener('change', () => {
      this.onConfigChange();
      this.toggleFollowBotUrl();
    });
    this.elements.followBotUrlInput?.addEventListener('change', () => this.onConfigChange());
    this.elements.themeSelect?.addEventListener('change', () => this.onThemeChange());

    const clearCacheBtn = this.root.getElementById('ppf-clear-cache-btn') as HTMLButtonElement;
    clearCacheBtn?.addEventListener('click', () => this.onClearCache());

    const resetPositionBtn = this.root.getElementById('ppf-reset-position-btn') as HTMLButtonElement;
    resetPositionBtn?.addEventListener('click', () => this.onResetPosition());

    const opacitySlider = this.root.getElementById('ppf-opacity') as HTMLInputElement;
    opacitySlider?.addEventListener('input', () => this.onOpacityChange());

    const soundCheckbox = this.root.getElementById('ppf-sound-enabled') as HTMLInputElement;
    soundCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const notificationsCheckbox = this.root.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    notificationsCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const autoMinimizeCheckbox = this.root.getElementById('ppf-auto-minimize') as HTMLInputElement;
    autoMinimizeCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const autoResumeCheckbox = this.root.getElementById('ppf-auto-resume') as HTMLInputElement;
    autoResumeCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const exportBtn = this.root.getElementById('ppf-export-config-btn') as HTMLButtonElement;
    exportBtn?.addEventListener('click', () => this.onExportConfig());

    const importBtn = this.root.getElementById('ppf-import-config-btn') as HTMLButtonElement;
    const importFile = this.root.getElementById('ppf-import-file') as HTMLInputElement;
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => this.onImportConfig(e));

    fileBtn.addEventListener('click', () => this.elements.fileInput?.click());
    this.elements.fileInput?.addEventListener('change', (e) => this.onFileSelect(e));

    const previewEl = this.root.getElementById('ppf-preview');
    if (previewEl) {
      previewEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewEl.style.borderColor = '#5a5';
      });
      previewEl.addEventListener('dragleave', () => {
        previewEl.style.borderColor = '';
      });
      previewEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewEl.style.borderColor = '';
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          try {
            const imageData = await loadImageFromFile(file);
            this.config.imageData = imageData;
            this.config.imageName = file.name;
            if (this.elements.fileNameSpan) {
              this.elements.fileNameSpan.textContent = file.name;
            }
            this.updatePreview(imageData);
            this.showPixelCount(imageData);
            botController.updateConfig(this.config);
            this.saveCurrentState();
            Logger.info(`Image loaded via drop: ${file.name} (${imageData.width}x${imageData.height})`);
          } catch (err) {
            Logger.error('Failed to load dropped image:', err);
          }
        }
      });
    }

    const resetBtn = this.root.getElementById('ppf-reset-btn') as HTMLButtonElement;
    resetBtn?.addEventListener('click', () => this.onResetProgress());
    
    loadUrlBtn.addEventListener('click', async () => {
      const url = imageUrlInput.value.trim();
      if (url) {
        try {
          const imageData = await loadImageFromUrl(url);
          this.config.imageData = imageData;
          this.config.imageName = url.split('/').pop() || 'url-image';
          if (this.elements.fileNameSpan) {
            this.elements.fileNameSpan.textContent = this.config.imageName;
          }
          this.updatePreview(imageData);
          this.showPixelCount(imageData);
          botController.updateConfig(this.config);
          this.saveCurrentState();
          Logger.info(`Image loaded from URL: ${url}`);
        } catch (err) {
          Logger.error('Failed to load image from URL:', err);
          alert('Failed to load image from URL');
        }
      }
    });

    document.addEventListener('paste', (e: ClipboardEvent) => this.onClipboardPaste(e));

    this.elements.startBtn?.addEventListener('click', () => this.onStart());
    this.elements.stopBtn?.addEventListener('click', () => this.onStop());
  }

  private onDragStart(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('.ppf-close-btn') || target.closest('.ppf-minimize-btn')) {
      return;
    }
    if (this.isResizing) return;
    this.isDragging = true;
    const rect = this.container!.getBoundingClientRect();
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.container) return;
    
    const x = Math.max(0, Math.min(window.innerWidth - this.container.offsetWidth, e.clientX - this.dragOffset.x));
    const y = Math.max(0, Math.min(window.innerHeight - this.container.offsetHeight, e.clientY - this.dragOffset.y));
    
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.bottom = 'auto';
    this.container.style.transform = 'none';
    this.position = { x, y };
  }

  private onResizeStart(e: MouseEvent): void {
    if (!this.container) return;
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target as HTMLElement;
    if (target.classList.contains('ppf-resize-tl')) this.resizeCorner = 'tl';
    else if (target.classList.contains('ppf-resize-tr')) this.resizeCorner = 'tr';
    else if (target.classList.contains('ppf-resize-bl')) this.resizeCorner = 'bl';
    else if (target.classList.contains('ppf-resize-br')) this.resizeCorner = 'br';
    
    if (!this.resizeCorner) return;
    
    this.isResizing = true;
    const rect = this.container.getBoundingClientRect();
    this.resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      posX: rect.left,
      posY: rect.top
    };
  }

  private onResizeMove(e: MouseEvent): void {
    if (!this.container || !this.resizeCorner) return;
    
    const deltaX = e.clientX - this.resizeStart.x;
    const deltaY = e.clientY - this.resizeStart.y;
    
    let newWidth = this.resizeStart.width;
    let newHeight = this.resizeStart.height;
    let newX = this.resizeStart.posX;
    let newY = this.resizeStart.posY;
    
    const minWidth = window.innerWidth <= 768 ? 280 : 320;
    const minHeight = 120;
    
    if (this.resizeCorner === 'br') {
      newWidth = Math.max(minWidth, this.resizeStart.width + deltaX);
      newHeight = Math.max(minHeight, this.resizeStart.height + deltaY);
    } else if (this.resizeCorner === 'bl') {
      const proposedWidth = this.resizeStart.width - deltaX;
      if (proposedWidth >= minWidth) {
        newWidth = proposedWidth;
        newX = this.resizeStart.posX + deltaX;
      } else {
        newWidth = minWidth;
        newX = this.resizeStart.posX + (this.resizeStart.width - minWidth);
      }
      newHeight = Math.max(minHeight, this.resizeStart.height + deltaY);
    } else if (this.resizeCorner === 'tr') {
      newWidth = Math.max(minWidth, this.resizeStart.width + deltaX);
      const proposedHeight = this.resizeStart.height - deltaY;
      if (proposedHeight >= minHeight) {
        newHeight = proposedHeight;
        newY = this.resizeStart.posY + deltaY;
      } else {
        newHeight = minHeight;
        newY = this.resizeStart.posY + (this.resizeStart.height - minHeight);
      }
    } else if (this.resizeCorner === 'tl') {
      const proposedWidth = this.resizeStart.width - deltaX;
      const proposedHeight = this.resizeStart.height - deltaY;
      if (proposedWidth >= minWidth) {
        newWidth = proposedWidth;
        newX = this.resizeStart.posX + deltaX;
      } else {
        newWidth = minWidth;
        newX = this.resizeStart.posX + (this.resizeStart.width - minWidth);
      }
      if (proposedHeight >= minHeight) {
        newHeight = proposedHeight;
        newY = this.resizeStart.posY + deltaY;
      } else {
        newHeight = minHeight;
        newY = this.resizeStart.posY + (this.resizeStart.height - minHeight);
      }
    }
    
    this.container.style.width = `${newWidth}px`;
    this.container.style.height = `${newHeight}px`;
    this.container.style.left = `${newX}px`;
    this.container.style.top = `${newY}px`;
    this.container.style.bottom = 'auto';
    this.container.style.transform = 'none';
    this.container.style.minWidth = 'unset';
    this.container.style.maxWidth = 'unset';
    
    this.position = { x: newX, y: newY };
  }

  private onResizeEnd(): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeCorner = null;
      this.saveCurrentState();
    }
  }

  private onDragEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.saveCurrentState();
    }
  }

  private preMinimizeSize: { width: string; height: string; resize: string } | null = null;

  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    if (!this.container) return;
    const tabs = this.container.querySelector('.ppf-tabs') as HTMLElement;
    const content = this.elements.content;
    const minimizeBtn = this.container.querySelector('.ppf-minimize-btn') as HTMLElement;

    if (this.minimized) {
      this.preMinimizeSize = {
        width: this.container.style.width,
        height: this.container.style.height,
        resize: this.container.style.resize,
      };
      this.container.style.height = 'auto';
      this.container.style.resize = 'none';
    } else if (this.preMinimizeSize) {
      this.container.style.width = this.preMinimizeSize.width;
      this.container.style.height = this.preMinimizeSize.height;
      this.container.style.resize = this.preMinimizeSize.resize || '';
      this.preMinimizeSize = null;
    }

    if (tabs) tabs.style.display = this.minimized ? 'none' : '';
    if (content) content.style.display = this.minimized ? 'none' : '';
    if (minimizeBtn) minimizeBtn.classList.toggle('ppf-minimized', this.minimized);
  }

  private toggleFollowBotUrl(): void {
    if (this.elements.followBotUrlRow) {
      this.elements.followBotUrlRow.classList.toggle('ppf-hidden', !this.config.followBot);
    }
  }

  private toggleTextDrawInput(): void {
    if (this.elements.textDrawRow) {
      this.elements.textDrawRow.classList.toggle('ppf-hidden', this.config.strategy !== 'text-draw');
    }
  }

  private switchTab(tab: 'main' | 'misc'): void {
    this.root.querySelectorAll('.ppf-tab').forEach(t => {
      t.classList.toggle('ppf-tab-active', t.getAttribute('data-tab') === tab);
    });
    
    this.root.querySelectorAll('.ppf-tab-content').forEach(content => {
      const contentId = content.id;
      content.classList.toggle('ppf-tab-content-active', contentId === `ppf-tab-${tab}`);
    });
  }

  private onThemeChange(): void {
    const theme = this.elements.themeSelect?.value as Theme;
    if (theme) {
      this.config.theme = theme;
      this.applyTheme(theme);
      botController.updateConfig(this.config);
      this.saveCurrentState();
    }
  }

  private applyTheme(theme: Theme): void {
    if (!this.container) return;
    this.container.setAttribute('data-theme', theme);
  }

  private onClearCache(): void {
    clearChunkCache();
    Logger.info('Chunk cache cleared');
    alert('Chunk cache cleared successfully');
  }

  private onResetPosition(): void {
    if (!this.container) return;
    this.container.style.left = '50%';
    this.container.style.top = '';
    this.container.style.bottom = '10px';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.width = '';
    this.container.style.height = '';
    this.container.style.minWidth = '';
    this.container.style.maxWidth = '';
    this.container.style.opacity = '1';
    this.position = { x: 0, y: 0 };
    this.panelSize = { width: 0, height: 0 };
    this.miscSettings.opacity = 100;
    this.saveCurrentState();
    Logger.info('Panel position reset');
  }

  private onOpacityChange(): void {
    const slider = this.root.getElementById('ppf-opacity') as HTMLInputElement;
    const valueSpan = this.root.getElementById('ppf-opacity-value') as HTMLSpanElement;
    if (slider && this.container) {
      const value = parseInt(slider.value);
      this.container.style.opacity = (value / 100).toString();
      if (valueSpan) valueSpan.textContent = `${value}%`;
      this.miscSettings.opacity = value;
      this.saveCurrentState();
    }
  }

  private onMiscSettingsChange(): void {
    const soundCheckbox = this.root.getElementById('ppf-sound-enabled') as HTMLInputElement;
    const notificationsCheckbox = this.root.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    const autoMinimizeCheckbox = this.root.getElementById('ppf-auto-minimize') as HTMLInputElement;
    const autoResumeCheckbox = this.root.getElementById('ppf-auto-resume') as HTMLInputElement;
    
    this.miscSettings.soundEnabled = soundCheckbox?.checked ?? true;
    this.miscSettings.notificationsEnabled = notificationsCheckbox?.checked ?? true;
    this.miscSettings.autoMinimize = autoMinimizeCheckbox?.checked ?? false;
    this.miscSettings.autoResume = autoResumeCheckbox?.checked ?? false;
    
    this.saveCurrentState();
  }

  private onExportConfig(): void {
    let imageUrl: string | null = null;
    if (this.config.imageData) {
      imageUrl = imageDataToDataUrl(this.config.imageData);
    }
    const exportData = {
      config: { ...this.config, imageData: null },
      miscSettings: this.miscSettings,
      imageDataUrl: imageUrl,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppf-bot-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Logger.info('Config exported');
  }

  private onImportConfig(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config) {
          this.config = { ...this.config, ...data.config, imageData: null };
          botController.updateConfig(this.config);
        }
        if (data.miscSettings) {
          this.miscSettings = { ...this.miscSettings, ...data.miscSettings };
        }
        if (data.imageDataUrl && typeof data.imageDataUrl === 'string') {
          const imageData = await restoreImageData();
          if (!imageData) {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = data.imageDataUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              this.config.imageData = ctx.getImageData(0, 0, img.width, img.height);
              botController.updateConfig(this.config);
              this.updatePreview(this.config.imageData);
              this.showPixelCount(this.config.imageData);
            }
          }
        }
        this.updateUIFromConfig();
        this.updateMiscUIFromSettings();
        this.saveCurrentState();
        Logger.info('Config imported successfully');
        alert('Config imported successfully');
      } catch (err) {
        Logger.error('Failed to import config:', err);
        alert('Failed to import config: Invalid file format');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private updateMiscUIFromSettings(): void {
    const opacitySlider = this.root.getElementById('ppf-opacity') as HTMLInputElement;
    const opacityValue = this.root.getElementById('ppf-opacity-value') as HTMLSpanElement;
    const soundCheckbox = this.root.getElementById('ppf-sound-enabled') as HTMLInputElement;
    const notificationsCheckbox = this.root.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    const autoMinimizeCheckbox = this.root.getElementById('ppf-auto-minimize') as HTMLInputElement;
    const autoResumeCheckbox = this.root.getElementById('ppf-auto-resume') as HTMLInputElement;
    
    if (opacitySlider) opacitySlider.value = String(this.miscSettings.opacity);
    if (opacityValue) opacityValue.textContent = `${this.miscSettings.opacity}%`;
    if (soundCheckbox) soundCheckbox.checked = this.miscSettings.soundEnabled;
    if (notificationsCheckbox) notificationsCheckbox.checked = this.miscSettings.notificationsEnabled;
    if (autoMinimizeCheckbox) autoMinimizeCheckbox.checked = this.miscSettings.autoMinimize;
    if (autoResumeCheckbox) autoResumeCheckbox.checked = this.miscSettings.autoResume;
    
    if (this.container) {
      this.container.style.opacity = (this.miscSettings.opacity / 100).toString();
    }
  }

  private savePanelSize(): void {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.panelSize = { width: rect.width, height: rect.height };
    }
  }

  private restorePanelSize(): void {
    if (!this.container || !this.panelSize.width || !this.panelSize.height) return;
    this.container.style.width = `${this.panelSize.width}px`;
    this.container.style.height = `${this.panelSize.height}px`;
  }

  private updateUIFromConfig(): void {
    if (this.elements.canvasSelect) {
      this.elements.canvasSelect.value = this.config.canvasId;
    }
    if (this.elements.coordinatesInput) {
      this.elements.coordinatesInput.value = this.config.coordinates;
    }
    if (this.elements.brushSizeSelect) {
      this.elements.brushSizeSelect.value = this.config.brushSize;
    }
    if (this.elements.strategySelect) {
      this.elements.strategySelect.value = this.config.strategy;
    }
    if (this.elements.textDrawInput) {
      this.elements.textDrawInput.value = this.config.textDrawText;
    }
    if (this.elements.repairModeCheckbox) {
      this.elements.repairModeCheckbox.checked = this.config.repairMode;
    }
    if (this.elements.skipColorCheckCheckbox) {
      this.elements.skipColorCheckCheckbox.checked = this.config.skipColorCheck;
    }
    if (this.elements.placementDelayInput) {
      this.elements.placementDelayInput.value = String(this.config.placementDelay);
    }
    if (this.elements.debugModeCheckbox) {
      this.elements.debugModeCheckbox.checked = this.config.debugMode;
    }
    if (this.elements.stopOnCaptchaCheckbox) {
      this.elements.stopOnCaptchaCheckbox.checked = this.config.stopOnCaptcha;
    }
    if (this.elements.followBotCheckbox) {
      this.elements.followBotCheckbox.checked = this.config.followBot;
    }
    if (this.elements.followBotUrlInput) {
      this.elements.followBotUrlInput.value = this.config.followBotUrl;
    }
    if (this.elements.fileNameSpan && this.config.imageName) {
      this.elements.fileNameSpan.textContent = this.config.imageName;
    }
    if (this.elements.themeSelect) {
      this.elements.themeSelect.value = this.config.theme;
    }
    this.applyTheme(this.config.theme);
    this.toggleFollowBotUrl();
    this.toggleTextDrawInput();
  }

  private onConfigChange(): void {
    this.config.canvasId = this.elements.canvasSelect?.value || '0';
    this.config.coordinates = this.elements.coordinatesInput?.value || '0_0';
    this.config.brushSize = (this.elements.brushSizeSelect?.value || '1x1') as BrushSize;
    this.config.strategy = (this.elements.strategySelect?.value || 'line-ltr') as PlacementStrategy;
    this.config.textDrawText = this.elements.textDrawInput?.value || '';
    this.config.repairMode = this.elements.repairModeCheckbox?.checked ?? false;
    this.config.skipColorCheck = this.elements.skipColorCheckCheckbox?.checked ?? false;
    this.config.placementDelay = parseInt(this.elements.placementDelayInput?.value || '0', 10);
    this.config.debugMode = this.elements.debugModeCheckbox?.checked ?? false;
    this.config.stopOnCaptcha = this.elements.stopOnCaptchaCheckbox?.checked ?? true;
    this.config.followBot = this.elements.followBotCheckbox?.checked ?? false;
    this.config.followBotUrl = this.elements.followBotUrlInput?.value || '';
    
    botController.updateConfig(this.config);
    this.saveCurrentState();
  }

  private async onFileSelect(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imageData = await loadImageFromFile(file);
      this.config.imageData = imageData;
      this.config.imageName = file.name;
      if (this.elements.fileNameSpan) {
        this.elements.fileNameSpan.textContent = file.name;
      }
      this.updatePreview(imageData);
      this.showPixelCount(imageData);
      botController.updateConfig(this.config);
      this.saveCurrentState();
      Logger.info(`Image loaded: ${file.name} (${imageData.width}x${imageData.height})`);
    } catch (err) {
      Logger.error('Failed to load image:', err);
      alert('Failed to load image');
    }
  }

  private async onClipboardPaste(e: ClipboardEvent): Promise<void> {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;
        try {
          const imageData = await loadImageFromFile(file);
          this.config.imageData = imageData;
          this.config.imageName = `clipboard-${Date.now()}.png`;
          if (this.elements.fileNameSpan) {
            this.elements.fileNameSpan.textContent = this.config.imageName;
          }
          this.updatePreview(imageData);
          this.showPixelCount(imageData);
          botController.updateConfig(this.config);
          this.saveCurrentState();
          Logger.info(`Image loaded from clipboard (${imageData.width}x${imageData.height})`);
        } catch (err) {
          Logger.error('Failed to load image from clipboard:', err);
        }
        return;
      }
    }
  }

  private async onStart(): Promise<void> {
    if (this.startInProgress) return;
    this.startInProgress = true;
    try {
      await this.doStart();
    } finally {
      this.startInProgress = false;
    }
  }

  private async doStart(): Promise<void> {
    if (this.config.strategy === 'text-draw') {
      if (!this.config.textDrawText.trim()) {
        alert('Please enter text to draw');
        return;
      }
      if (!this.config.imageData) {
        alert('Please load a template image first for text colors');
        return;
      }
      const { generateTextMask } = await import('../bot/textGenerator');
      const mask = generateTextMask(this.config.textDrawText);
      this.config.imageData = this.applyTextMaskToImage(this.config.imageData!, mask);
      this.config.imageName = `text: ${this.config.textDrawText}`;
      if (this.elements.fileNameSpan) {
        this.elements.fileNameSpan.textContent = this.config.imageName;
      }
      this.updatePreview(this.config.imageData);
      botController.updateConfig(this.config);
    }
    
    const savedState = loadState();
    this.completionFired = false;
    if (this.elements.startBtn) this.elements.startBtn.disabled = true;
    if (this.elements.stopBtn) this.elements.stopBtn.disabled = false;
    await botController.start(savedState.progress);
  }

  private onStop(): void {
    if (this.elements.startBtn) this.elements.startBtn.disabled = false;
    if (this.elements.stopBtn) this.elements.stopBtn.disabled = true;
    botController.stop();
  }

  private onResetProgress(): void {
    if (!confirm('Reset all placement progress? This cannot be undone.')) return;
    const state = loadState();
    saveState({
      config: state.config,
      panelPosition: state.panelPosition,
      panelSize: state.panelSize,
      miscSettings: state.miscSettings,
    });
    Logger.info('Progress reset');
  }

  private showPixelCount(imageData: ImageData): void {
    const { data, width, height } = imageData;
    let opaquePixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] >= 128) opaquePixels++;
    }
    const preview = this.root.getElementById('ppf-preview');
    if (preview) {
      let countEl = this.root.getElementById('ppf-pixel-count');
      if (!countEl) {
        countEl = document.createElement('div');
        countEl.id = 'ppf-pixel-count';
        countEl.style.cssText = 'font-size:9px;color:#888;padding:2px 4px;text-align:center;width:100%;';
        preview.parentElement?.appendChild(countEl);
      }
      countEl.textContent = `${width}x${height} — ${opaquePixels.toLocaleString()} pixels to place`;
    }
  }

  private updatePreview(imageData: ImageData): void {
    const preview = this.root.getElementById('ppf-preview');
    if (!preview) return;
    
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 100 / Math.max(imageData.width, imageData.height));
    canvas.width = imageData.width * scale;
    canvas.height = imageData.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    preview.innerHTML = '';
    preview.appendChild(canvas);
  }

  private applyTextMaskToImage(templateImage: ImageData, mask: { width: number; height: number; pixels: Array<{ x: number; y: number; order: number }> }): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, mask.width, mask.height);
    
    const scaleX = templateImage.width / mask.width;
    const scaleY = templateImage.height / mask.height;
    
    mask.pixels.forEach(p => {
      const srcX = Math.floor(p.x * scaleX);
      const srcY = Math.floor(p.y * scaleY);
      const srcIdx = (srcY * templateImage.width + srcX) * 4;
      
      const r = templateImage.data[srcIdx] || 0;
      const g = templateImage.data[srcIdx + 1] || 0;
      const b = templateImage.data[srcIdx + 2] || 0;
      const a = templateImage.data[srcIdx + 3] || 255;
      
      if (a > 0) {
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(p.x, p.y, 1, 1);
      }
    });
    
    return ctx.getImageData(0, 0, mask.width, mask.height);
  }

  private onStateChange(state: BotState): void {
    if (this.elements.statusValue) {
      this.elements.statusValue.textContent = this.formatStatus(state.status);
      this.elements.statusValue.className = `ppf-status-value ppf-status-${state.status}`;
    }
    const pillStatus = this.root.getElementById('ppf-pill-status');
    if (pillStatus) {
      pillStatus.textContent = this.formatStatus(state.status);
    }
    const pillDot = this.root.getElementById('ppf-pill-dot');
    if (pillDot) {
      pillDot.className = `ppf-status-dot ppf-dot-${state.status}`;
    }
    if (this.elements.cooldownValue) {
      this.elements.cooldownValue.textContent = `${state.cooldown.toFixed(1)}s`;
    }
    if (this.elements.progressValue) {
      this.elements.progressValue.textContent = `${state.progress}%`;
    }
    if (this.elements.progressBar) {
      this.elements.progressBar.style.width = `${state.progress}%`;
      if (state.status === 'captcha') {
        this.elements.progressBar.classList.add('captcha');
      } else {
        this.elements.progressBar.classList.remove('captcha');
      }
    }
    if (this.elements.etaValue) {
      if (state.eta > 0) {
        const hours = Math.floor(state.eta / 3600);
        const mins = Math.floor((state.eta % 3600) / 60);
        const secs = state.eta % 60;
        if (hours > 0) {
          this.elements.etaValue.textContent = `${hours}h ${mins}m`;
        } else if (mins > 0) {
          this.elements.etaValue.textContent = `${mins}m ${secs}s`;
        } else {
          this.elements.etaValue.textContent = `${secs}s`;
        }
      } else {
        this.elements.etaValue.textContent = '--:--';
      }
    }
    
    const placedEl = this.root.getElementById('ppf-placed');
    if (placedEl) placedEl.textContent = `${state.placedPixels}/${state.totalPixels}`;
    
    const skippedEl = this.root.getElementById('ppf-skipped');
    if (skippedEl) skippedEl.textContent = state.skippedPixels.toString();
    
    const speedEl = this.root.getElementById('ppf-speed');
    if (speedEl) speedEl.textContent = `${state.pixelsPerSecond} px/s`;

    const sessionTimeEl = this.root.getElementById('ppf-session-time');
    if (sessionTimeEl && state.startTime) {
      const elapsed = Date.now() - state.startTime;
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      sessionTimeEl.textContent = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    const totalPlacedEl = this.root.getElementById('ppf-total-placed');
    if (totalPlacedEl) totalPlacedEl.textContent = state.placedPixels.toString();

    const pixelsHourEl = this.root.getElementById('ppf-pixels-hour');
    if (pixelsHourEl) {
      const pph = state.lastCooldownMs > 0 ? Math.round(3600000 / state.lastCooldownMs) : 0;
      pixelsHourEl.textContent = pph.toString();
    }

    const errorsEl = this.root.getElementById('ppf-errors');
    if (errorsEl) errorsEl.textContent = state.errorCount.toString();

    if (this.miscSettings.autoMinimize && state.status === 'running' && !this.minimized) {
      this.toggleMinimize();
    }

    if ((state.status === 'idle' || state.status === 'stopped') && this.minimized && this.miscSettings.autoMinimize) {
      this.toggleMinimize();
    }

    if (state.status === 'idle' && state.progress === 100 && state.totalPixels > 0) {
      this.onBotCompleted();
    }

    if (state.status === 'idle' || state.status === 'stopped') {
      if (this.elements.startBtn) this.elements.startBtn.disabled = false;
      if (this.elements.stopBtn) this.elements.stopBtn.disabled = true;
      document.title = this.originalPageTitle;
      this.setConfigInputsLocked(false);
    } else if (state.status === 'captcha') {
      this.setConfigInputsLocked(true);
    } else if (state.status === 'running') {
      document.title = `[${state.progress}%] ${this.originalPageTitle}`;
      this.setConfigInputsLocked(true);
    }

    const isInCooldown = state.status === 'running' && state.cooldown > 0;
    const pillDotEl = this.root.getElementById('ppf-pill-dot');
    if (pillDotEl && isInCooldown) {
      pillDotEl.className = 'ppf-status-dot ppf-dot-cooldown';
    }
    const pillStatusEl = this.root.getElementById('ppf-pill-status');
    if (pillStatusEl) {
      if (isInCooldown) {
        pillStatusEl.textContent = `${state.cooldown.toFixed(0)}s`;
      } else {
        pillStatusEl.textContent = this.formatStatus(state.status);
      }
    }
  }

  private setConfigInputsLocked(locked: boolean): void {
    const inputs = [
      this.elements.coordinatesInput,
      this.elements.canvasSelect,
      this.elements.brushSizeSelect,
      this.elements.strategySelect,
      this.elements.textDrawInput,
      this.elements.repairModeCheckbox,
      this.elements.skipColorCheckCheckbox,
      this.elements.followBotCheckbox,
      this.elements.fileInput,
    ];
    for (const el of inputs) {
      if (el) el.disabled = locked;
    }
    const fileBtn = this.root.getElementById('ppf-file-btn') as HTMLButtonElement;
    if (fileBtn) fileBtn.disabled = locked;
    const loadUrlBtn = this.root.getElementById('ppf-load-url-btn') as HTMLButtonElement;
    if (loadUrlBtn) loadUrlBtn.disabled = locked;
  }

  private formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  private onBotCompleted(): void {
    if (this.completionFired) return;
    this.completionFired = true;

    if (this.miscSettings.soundEnabled) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    }

    if (this.miscSettings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification('PPF-Bot: Complete', {
          body: 'All pixels have been placed.',
          icon: 'https://pixmap.fun/favicon.ico',
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {}
    }
  }

  private restoreCollapsedSections(): void {
    this.root.querySelectorAll('.ppf-section-content').forEach(el => el.classList.remove('collapsed'));
    this.root.querySelectorAll('.ppf-section-arrow').forEach(el => el.classList.remove('collapsed'));

    for (const section of this.miscSettings.collapsedSections) {
      const content = this.root.getElementById(`ppf-section-${section}`);
      const header = this.root.querySelector(`[data-section="${section}"]`);
      const arrow = header?.querySelector('.ppf-section-arrow');
      if (content) content.classList.add('collapsed');
      if (arrow) arrow.classList.add('collapsed');
    }
  }

  private saveCurrentState(): void {
    this.savePanelSize();
    saveState({
      config: this.config,
      panelPosition: this.position,
      panelSize: this.panelSize,
      miscSettings: this.miscSettings,
    });
  }
}
