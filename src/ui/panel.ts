import type { BotConfig, BotState, PlacementStrategy, PanelPosition, PanelSize, MiscSettings, BrushSize, Theme } from '../types';
import { STRATEGY_LABELS } from '../types';
import { STYLES } from './styles';
import { botController } from '../bot/controller';
import { loadImageFromFile, loadImageFromUrl } from '../bot/imageProcessor';
import { loadState, saveState } from '../utils/storage';
import { Logger } from '../utils/logger';
import { getCachedMe, clearChunkCache } from '../api/pixmap';
import { setupHotkeys } from '../utils/hotkeys';

export class Panel {
  private container: HTMLDivElement | null = null;
  private config: BotConfig;
  private position: PanelPosition;
  private panelSize: PanelSize;
  private miscSettings: MiscSettings;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private minimized = false;
  private isResizing = false;
  private resizeCorner: 'tl' | 'tr' | 'bl' | 'br' | null = null;
  private resizeStart = { x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 };
  private currentTab: 'main' | 'misc' = 'main';

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
    onlineValue: HTMLSpanElement | null;
    progressBar: HTMLDivElement | null;
    content: HTMLDivElement | null;
    etaValue: HTMLSpanElement | null;
    errorsValue: HTMLSpanElement | null;
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
    onlineValue: null,
    progressBar: null,
    content: null,
    etaValue: null,
    errorsValue: null,
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
      opacity: 100,
    };
  }

  init(): void {
    this.injectStyles();
    this.createPanel();
    this.attachEventListeners();
    this.updateUIFromConfig();
    this.updateMiscUIFromSettings();
    this.restorePanelSize();
    
    setupHotkeys(
      () => this.onStart(),
      () => this.onStop(),
      () => this.onResetProgress()
    );
    
    botController.setStateChangeCallback((state) => this.onStateChange(state));
    botController.updateConfig(this.config);
    
    botController.initialize().then((success) => {
      if (success) {
        Logger.info('Bot initialized successfully');
        this.populateCanvasSelect();
      } else {
        Logger.error('Bot initialization failed');
      }
    });
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  private createPanel(): void {
    this.container = document.createElement('div');
    this.container.id = 'ppf-bot-panel';

    this.container.innerHTML = `
      <div class="ppf-resize-handle ppf-resize-tl"></div>
      <div class="ppf-resize-handle ppf-resize-tr"></div>
      <div class="ppf-resize-handle ppf-resize-bl"></div>
      <div class="ppf-resize-handle ppf-resize-br"></div>
      <div class="ppf-titlebar">
        <span class="ppf-titlebar-text">ppf-bot</span>
        <span class="ppf-minimize-btn" title="Minimize">_</span>
      </div>
      <div class="ppf-tabs">
        <div class="ppf-tab ppf-tab-active" data-tab="main">Main</div>
        <div class="ppf-tab" data-tab="misc">Misc</div>
      </div>
      <div class="ppf-content">
        <div class="ppf-tab-content ppf-tab-content-active" id="ppf-tab-main">
        
        <div class="ppf-section">
          <div class="ppf-section-header" data-section="image">
            <span class="ppf-section-arrow">▼</span> IMAGE
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
            <span class="ppf-section-arrow">▼</span> PLACEMENT
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
              <label class="ppf-label">Brush</label>
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
            <span class="ppf-section-arrow collapsed">▼</span> OPTIONS
          </div>
          <div class="ppf-section-content collapsed" id="ppf-section-options">
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
            <div class="ppf-row" id="ppf-follow-url-row" style="display:none">
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
          <button class="ppf-btn" id="ppf-reset-btn" title="Reset progress">↺</button>
        </div>
        
        </div>
        
        <div class="ppf-tab-content" id="ppf-tab-misc">
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="appearance">
              <span class="ppf-section-arrow">▼</span> APPEARANCE
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
              <span class="ppf-section-arrow">▼</span> NOTIFICATIONS
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
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="hotkeys">
              <span class="ppf-section-arrow">▼</span> HOTKEYS
            </div>
            <div class="ppf-section-content" id="ppf-section-hotkeys">
              <div class="ppf-small" style="padding: 4px 0;">
                <div style="margin-bottom: 3px;"><strong>Ctrl+S</strong> - Start/Stop bot</div>
                <div style="margin-bottom: 3px;"><strong>Ctrl+H</strong> - Toggle panel</div>
                <div style="margin-bottom: 3px;"><strong>Ctrl+M</strong> - Minimize panel</div>
              </div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="actions">
              <span class="ppf-section-arrow">▼</span> ACTIONS
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
              <span class="ppf-section-arrow">▼</span> SESSION STATS
            </div>
            <div class="ppf-section-content" id="ppf-section-stats">
              <div class="ppf-small" style="padding: 4px 0;">
                <div style="margin-bottom: 3px;"><strong>Session time:</strong> <span id="ppf-session-time">0:00:00</span></div>
                <div style="margin-bottom: 3px;"><strong>Total placed:</strong> <span id="ppf-total-placed">0</span></div>
                <div style="margin-bottom: 3px;"><strong>Pixels/hour:</strong> <span id="ppf-pixels-hour">0</span></div>
              </div>
            </div>
          </div>
          
          <div class="ppf-section">
            <div class="ppf-section-header" data-section="about">
              <span class="ppf-section-arrow">▼</span> ABOUT
            </div>
            <div class="ppf-section-content" id="ppf-section-about">
              <div class="ppf-small" style="padding: 4px 0;">
                <div style="margin-bottom: 3px;"><strong>Version:</strong> 1.0.0</div>
                <div style="margin-bottom: 3px;"><strong>Author:</strong> briocheis.cool</div>
                <div style="margin-bottom: 3px;"><strong>Site:</strong> <a href="https://briocheis.cool" target="_blank" style="color: #4a90e2;">briocheis.cool</a></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="ppf-status-section">
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
            <span class="ppf-status-label">cooldown</span>
            <span class="ppf-status-value" id="ppf-cooldown">0s</span>
          </div>
          <div class="ppf-progress-bar">
            <div class="ppf-progress-fill" id="ppf-progress-bar" style="width:0%"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.cacheElements();
  }

  private cacheElements(): void {
    this.elements.canvasSelect = document.getElementById('ppf-canvas') as HTMLSelectElement;
    this.elements.coordinatesInput = document.getElementById('ppf-coordinates') as HTMLInputElement;
    this.elements.brushSizeSelect = document.getElementById('ppf-brush-size') as HTMLSelectElement;
    this.elements.strategySelect = document.getElementById('ppf-strategy') as HTMLSelectElement;
    this.elements.textDrawInput = document.getElementById('ppf-text-draw') as HTMLInputElement;
    this.elements.textDrawRow = document.getElementById('ppf-text-draw-row') as HTMLDivElement;
    this.elements.repairModeCheckbox = document.getElementById('ppf-repair-mode') as HTMLInputElement;
    this.elements.skipColorCheckCheckbox = document.getElementById('ppf-skip-color-check') as HTMLInputElement;
    this.elements.placementDelayInput = document.getElementById('ppf-placement-delay') as HTMLInputElement;
    this.elements.debugModeCheckbox = document.getElementById('ppf-debug-mode') as HTMLInputElement;
    this.elements.stopOnCaptchaCheckbox = document.getElementById('ppf-stop-captcha') as HTMLInputElement;
    this.elements.followBotCheckbox = document.getElementById('ppf-follow-bot') as HTMLInputElement;
    this.elements.followBotUrlInput = document.getElementById('ppf-follow-url') as HTMLInputElement;
    this.elements.followBotUrlRow = document.getElementById('ppf-follow-url-row') as HTMLDivElement;
    this.elements.fileInput = document.getElementById('ppf-file-input') as HTMLInputElement;
    this.elements.fileNameSpan = document.getElementById('ppf-file-name') as HTMLSpanElement;
    this.elements.startBtn = document.getElementById('ppf-start-btn') as HTMLButtonElement;
    this.elements.stopBtn = document.getElementById('ppf-stop-btn') as HTMLButtonElement;
    this.elements.statusValue = document.getElementById('ppf-status') as HTMLSpanElement;
    this.elements.cooldownValue = document.getElementById('ppf-cooldown') as HTMLSpanElement;
    this.elements.progressValue = document.getElementById('ppf-progress') as HTMLSpanElement;
    this.elements.etaValue = document.getElementById('ppf-eta') as HTMLSpanElement;
    this.elements.errorsValue = document.getElementById('ppf-errors') as HTMLSpanElement;
    this.elements.onlineValue = document.getElementById('ppf-online') as HTMLSpanElement;
    this.elements.progressBar = document.getElementById('ppf-progress-bar') as HTMLDivElement;
    this.elements.content = this.container?.querySelector('.ppf-content') as HTMLDivElement;
    this.elements.themeSelect = document.getElementById('ppf-theme') as HTMLSelectElement;
    this.elements.mainTab = document.getElementById('ppf-tab-main') as HTMLDivElement;
    this.elements.miscTab = document.getElementById('ppf-tab-misc') as HTMLDivElement;
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
    const fileBtn = document.getElementById('ppf-file-btn') as HTMLButtonElement;
    const loadUrlBtn = document.getElementById('ppf-load-url-btn') as HTMLButtonElement;
    const imageUrlInput = document.getElementById('ppf-image-url') as HTMLInputElement;

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
    
    document.querySelectorAll('.ppf-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = (e.target as HTMLElement).getAttribute('data-tab') as 'main' | 'misc';
        if (tabName) this.switchTab(tabName);
      });
    });
    
    document.querySelectorAll('.ppf-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.getAttribute('data-section');
        const content = document.getElementById(`ppf-section-${section}`);
        const arrow = header.querySelector('.ppf-section-arrow');
        if (content && arrow) {
          content.classList.toggle('collapsed');
          arrow.classList.toggle('collapsed');
        }
      });
    });

    this.elements.canvasSelect?.addEventListener('change', () => this.onConfigChange());
    this.elements.coordinatesInput?.addEventListener('change', () => this.onConfigChange());
    this.elements.brushSizeSelect?.addEventListener('change', () => this.onConfigChange());
    this.elements.strategySelect?.addEventListener('change', () => {
      this.toggleFollowBotUrl();
      this.toggleTextDrawInput();
      this.applyTheme(this.config.theme);
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

    const clearCacheBtn = document.getElementById('ppf-clear-cache-btn') as HTMLButtonElement;
    clearCacheBtn?.addEventListener('click', () => this.onClearCache());

    const resetPositionBtn = document.getElementById('ppf-reset-position-btn') as HTMLButtonElement;
    resetPositionBtn?.addEventListener('click', () => this.onResetPosition());

    const opacitySlider = document.getElementById('ppf-opacity') as HTMLInputElement;
    opacitySlider?.addEventListener('input', () => this.onOpacityChange());

    const soundCheckbox = document.getElementById('ppf-sound-enabled') as HTMLInputElement;
    soundCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const notificationsCheckbox = document.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    notificationsCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const autoMinimizeCheckbox = document.getElementById('ppf-auto-minimize') as HTMLInputElement;
    autoMinimizeCheckbox?.addEventListener('change', () => this.onMiscSettingsChange());

    const exportBtn = document.getElementById('ppf-export-config-btn') as HTMLButtonElement;
    exportBtn?.addEventListener('click', () => this.onExportConfig());

    const importBtn = document.getElementById('ppf-import-config-btn') as HTMLButtonElement;
    const importFile = document.getElementById('ppf-import-file') as HTMLInputElement;
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => this.onImportConfig(e));

    fileBtn.addEventListener('click', () => this.elements.fileInput?.click());
    this.elements.fileInput?.addEventListener('change', (e) => this.onFileSelect(e));

    const resetBtn = document.getElementById('ppf-reset-btn') as HTMLButtonElement;
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
          botController.updateConfig(this.config);
          this.saveCurrentState();
          Logger.info(`Image loaded from URL: ${url}`);
        } catch (err) {
          Logger.error('Failed to load image from URL:', err);
          alert('Failed to load image from URL');
        }
      }
    });

    this.elements.startBtn?.addEventListener('click', () => this.onStart());
    this.elements.stopBtn?.addEventListener('click', () => this.onStop());
  }

  private onDragStart(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('ppf-close-btn') ||
        (e.target as HTMLElement).classList.contains('ppf-minimize-btn')) {
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
    
    const minWidth = window.innerWidth <= 768 ? 300 : 400;
    const minHeight = 150;
    
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

  private toggleMinimize(): void {
    this.minimized = !this.minimized;
    if (this.elements.content) {
      this.elements.content.style.display = this.minimized ? 'none' : 'block';
    }
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
    this.currentTab = tab;
    
    document.querySelectorAll('.ppf-tab').forEach(t => {
      t.classList.toggle('ppf-tab-active', t.getAttribute('data-tab') === tab);
    });
    
    document.querySelectorAll('.ppf-tab-content').forEach(content => {
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
    const slider = document.getElementById('ppf-opacity') as HTMLInputElement;
    const valueSpan = document.getElementById('ppf-opacity-value') as HTMLSpanElement;
    if (slider && this.container) {
      const value = parseInt(slider.value);
      this.container.style.opacity = (value / 100).toString();
      if (valueSpan) valueSpan.textContent = `${value}%`;
      this.miscSettings.opacity = value;
      this.saveCurrentState();
    }
  }

  private onMiscSettingsChange(): void {
    const soundCheckbox = document.getElementById('ppf-sound-enabled') as HTMLInputElement;
    const notificationsCheckbox = document.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    const autoMinimizeCheckbox = document.getElementById('ppf-auto-minimize') as HTMLInputElement;
    
    this.miscSettings.soundEnabled = soundCheckbox?.checked ?? true;
    this.miscSettings.notificationsEnabled = notificationsCheckbox?.checked ?? true;
    this.miscSettings.autoMinimize = autoMinimizeCheckbox?.checked ?? false;
    
    this.saveCurrentState();
  }

  private onExportConfig(): void {
    const exportData = {
      config: { ...this.config, imageData: null },
      miscSettings: this.miscSettings,
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
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.config) {
          this.config = { ...this.config, ...data.config, imageData: null };
          botController.updateConfig(this.config);
        }
        if (data.miscSettings) {
          this.miscSettings = { ...this.miscSettings, ...data.miscSettings };
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
    const opacitySlider = document.getElementById('ppf-opacity') as HTMLInputElement;
    const opacityValue = document.getElementById('ppf-opacity-value') as HTMLSpanElement;
    const soundCheckbox = document.getElementById('ppf-sound-enabled') as HTMLInputElement;
    const notificationsCheckbox = document.getElementById('ppf-notifications-enabled') as HTMLInputElement;
    const autoMinimizeCheckbox = document.getElementById('ppf-auto-minimize') as HTMLInputElement;
    
    if (opacitySlider) opacitySlider.value = String(this.miscSettings.opacity);
    if (opacityValue) opacityValue.textContent = `${this.miscSettings.opacity}%`;
    if (soundCheckbox) soundCheckbox.checked = this.miscSettings.soundEnabled;
    if (notificationsCheckbox) notificationsCheckbox.checked = this.miscSettings.notificationsEnabled;
    if (autoMinimizeCheckbox) autoMinimizeCheckbox.checked = this.miscSettings.autoMinimize;
    
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
      botController.updateConfig(this.config);
      this.saveCurrentState();
      Logger.info(`Image loaded: ${file.name} (${imageData.width}x${imageData.height})`);
    } catch (err) {
      Logger.error('Failed to load image:', err);
      alert('Failed to load image');
    }
  }

  private async onStart(): Promise<void> {
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
    const stored = localStorage.getItem('ppf-bot-state');
    if (stored) {
      const state = JSON.parse(stored);
      delete state.progress;
      localStorage.setItem('ppf-bot-state', JSON.stringify(state));
    }
    Logger.info('Progress reset');
  }

  private updatePreview(imageData: ImageData): void {
    const preview = document.getElementById('ppf-preview');
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
    if (this.elements.cooldownValue) {
      this.elements.cooldownValue.textContent = `${Math.round(state.cooldown)}s`;
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
      const mins = Math.floor(state.eta / 60);
      const secs = state.eta % 60;
      this.elements.etaValue.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
    if (this.elements.errorsValue) {
      this.elements.errorsValue.textContent = state.errorCount.toString();
    }
    
    const placedEl = document.getElementById('ppf-placed');
    if (placedEl) placedEl.textContent = `${state.placedPixels}/${state.totalPixels}`;
    
    const skippedEl = document.getElementById('ppf-skipped');
    if (skippedEl) skippedEl.textContent = state.skippedPixels.toString();
    
    const speedEl = document.getElementById('ppf-speed');
    if (speedEl) speedEl.textContent = `${state.pixelsPerSecond} px/s`;
    
    const etaDisplayEl = document.getElementById('ppf-eta-display');
    if (etaDisplayEl) {
      if (state.eta > 0) {
        const hours = Math.floor(state.eta / 3600);
        const mins = Math.floor((state.eta % 3600) / 60);
        const secs = state.eta % 60;
        if (hours > 0) {
          etaDisplayEl.textContent = `${hours}h ${mins}m`;
        } else if (mins > 0) {
          etaDisplayEl.textContent = `${mins}m ${secs}s`;
        } else {
          etaDisplayEl.textContent = `${secs}s`;
        }
      } else {
        etaDisplayEl.textContent = '--:--';
      }
    }

    if (state.status === 'idle' || state.status === 'stopped') {
      if (this.elements.startBtn) this.elements.startBtn.disabled = false;
      if (this.elements.stopBtn) this.elements.stopBtn.disabled = true;
    }
  }

  private formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
