declare const unsafeWindow: Window & typeof globalThis;

export function randomDelay(min: number, max: number): Promise<void> {
  const base = min + Math.random() * (max - min);
  const jitter = (Math.random() - 0.5) * (max - min) * 0.2;
  const delay = Math.max(0, Math.round(base + jitter));
  return new Promise(resolve => setTimeout(resolve, delay));
}

export function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

export function humanDelay(): Promise<void> {
  const delay = Math.max(10, gaussianRandom(100, 50));
  return new Promise(resolve => setTimeout(resolve, delay));
}

export function varyTiming<T>(fn: () => Promise<T>): Promise<T> {
  const preDelay = Math.random() * 20;
  return new Promise(resolve => {
    setTimeout(async () => {
      const result = await fn();
      resolve(result);
    }, preDelay);
  });
}

let lastActionTime = 0;

export function throttleAction(minInterval: number): boolean {
  const now = Date.now();
  if (now - lastActionTime < minInterval) {
    return false;
  }
  lastActionTime = now;
  return true;
}

export function randomizeOrder<T>(arr: T[], factor: number = 0.1): T[] {
  const result = [...arr];
  const swapCount = Math.floor(result.length * factor);
  
  for (let i = 0; i < swapCount; i++) {
    const idx1 = Math.floor(Math.random() * result.length);
    const idx2 = Math.min(result.length - 1, idx1 + Math.floor(Math.random() * 5));
    [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
  }
  
  return result;
}

export function addNoise(value: number, percentage: number = 0.1): number {
  const noise = value * percentage * (Math.random() * 2 - 1);
  return value + noise;
}

const sessionId = Math.random().toString(36).substring(2, 15);
const sessionStart = Date.now();

export function getSessionInfo(): { id: string; duration: number } {
  return {
    id: sessionId,
    duration: Date.now() - sessionStart
  };
}

export function shouldTakeBreak(pixelsPlaced: number): boolean {
  if (pixelsPlaced > 0 && pixelsPlaced % 50 === 0) {
    return Math.random() < 0.3;
  }
  return false;
}

export function getBreakDuration(): number {
  return gaussianRandom(2000, 500);
}

function getTargetWindow(): Window & typeof globalThis {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}

export function maskFingerprint(): void {
  try {
    const targetWindow = getTargetWindow();
    const nav = targetWindow.navigator;
    
    const webdriverDescriptor = Object.getOwnPropertyDescriptor(nav, 'webdriver');
    if (webdriverDescriptor?.configurable !== false) {
      Object.defineProperty(nav, 'webdriver', {
        get: () => false,
        configurable: true
      });
    }
    
    try {
      const automationProps = ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', 
        '__webdriver_script_func', '__webdriver_script_fn', '__fxdriver_evaluate', '__driver_unwrapped', 
        '__webdriver_unwrapped', '__driver_evaluate', '__selenium_unwrapped', '__fxdriver_unwrapped',
        '_Selenium_IDE_Recorder', '_selenium', 'calledSelenium', '_WEBDRIVER_ELEM_CACHE',
        'ChromeDriverw', 'driver-hierarchical', 'webdriver', '$chrome_asyncScriptInfo',
        '$cdc_asdjflasutopfhvcZLmcfl_', '__$webdriverAsyncExecutor'];
      
      for (const prop of automationProps) {
        if (prop in targetWindow) {
          try {
            delete (targetWindow as any)[prop];
          } catch {}
        }
        if (prop in document) {
          try {
            delete (document as any)[prop];
          } catch {}
        }
      }
    } catch {}
    
    try {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      const parameterMap: Record<number, string> = {
        37445: 'Intel Inc.',
        37446: 'Intel Iris OpenGL Engine',
        7936: 'WebKit',
        7937: 'WebKit WebGL',
      };
      
      Object.defineProperty(WebGLRenderingContext.prototype, 'getParameter', {
        value: function(parameter: number) {
          if (parameter in parameterMap) {
            return parameterMap[parameter];
          }
          return originalGetParameter.call(this, parameter);
        },
        writable: true,
        configurable: true
      });
    } catch {}
    
    try {
      const win = targetWindow as any;
      if (win.chrome) {
        if (!win.chrome.runtime) {
          win.chrome.runtime = {};
        }
      } else {
        win.chrome = { runtime: {} };
      }
    } catch {}
    
    try {
      const originalQuery = nav.permissions?.query?.bind(nav.permissions);
      if (originalQuery) {
        Object.defineProperty(nav.permissions, 'query', {
          value: function(parameters: PermissionDescriptor) {
            if (parameters.name === 'notifications') {
              return Promise.resolve({ state: Notification.permission, onchange: null } as PermissionStatus);
            }
            return originalQuery(parameters);
          },
          writable: true,
          configurable: true
        });
      }
    } catch {}
    
    try {
      const pluginsData = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      
      Object.defineProperty(nav, 'plugins', {
        get: () => {
          const plugins = pluginsData.map(p => ({
            ...p,
            length: 1,
            item: () => null,
            namedItem: () => null,
            [Symbol.iterator]: function* () { yield this; }
          }));
          return Object.assign(plugins, {
            item: (i: number) => plugins[i] || null,
            namedItem: (name: string) => plugins.find(p => p.name === name) || null,
            refresh: () => {},
            length: plugins.length
          });
        },
        configurable: true
      });
    } catch {}
    
    try {
      Object.defineProperty(nav, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
    } catch {}
    
    hideConsoleWarnings();
    
  } catch {}
}

function hideConsoleWarnings(): void {
  try {
    const targetWindow = getTargetWindow();
    const originalConsole = { ...targetWindow.console };
    
    const filteredMethods = ['log', 'warn', 'info', 'debug'] as const;
    const blockedPatterns = [
      /extension/i,
      /hook/i,
      /inject/i,
      /tamper/i,
      /greasemonkey/i,
      /userscript/i,
      /bot/i,
      /automat/i
    ];
    
    for (const method of filteredMethods) {
      const original = originalConsole[method];
      if (typeof original === 'function') {
        (targetWindow.console as any)[method] = function(...args: any[]) {
          const str = args.map(a => String(a)).join(' ');
          for (const pattern of blockedPatterns) {
            if (pattern.test(str)) {
              return;
            }
          }
          return original.apply(targetWindow.console, args);
        };
      }
    }
  } catch {}
}

export function patchWebSocketStealthily(): void {
  try {
    const targetWindow = getTargetWindow();
    const OriginalWebSocket = targetWindow.WebSocket;
    
    const stealthSocket = function(this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const ws = new OriginalWebSocket(url, protocols);
      return ws;
    } as unknown as typeof WebSocket;
    
    stealthSocket.prototype = OriginalWebSocket.prototype;
    (stealthSocket as any).CONNECTING = OriginalWebSocket.CONNECTING;
    (stealthSocket as any).OPEN = OriginalWebSocket.OPEN;
    (stealthSocket as any).CLOSING = OriginalWebSocket.CLOSING;
    (stealthSocket as any).CLOSED = OriginalWebSocket.CLOSED;
    
    Object.defineProperty(stealthSocket, 'name', { value: 'WebSocket', writable: false });
    Object.defineProperty(stealthSocket, 'toString', { 
      value: () => 'function WebSocket() { [native code] }',
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(targetWindow, 'WebSocket', {
      value: stealthSocket,
      writable: true,
      configurable: true
    });
  } catch {}
}

export function randomUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

export function simulateMouseMovement(targetX: number, targetY: number): void {
  const steps = 5 + Math.floor(Math.random() * 5);
  const startX = targetX - 50 + Math.random() * 100;
  const startY = targetY - 50 + Math.random() * 100;
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const eased = progress * progress * (3 - 2 * progress);
    const x = startX + (targetX - startX) * eased + (Math.random() - 0.5) * 3;
    const y = startY + (targetY - startY) * eased + (Math.random() - 0.5) * 3;
    
    const event = new MouseEvent('mousemove', {
      clientX: x,
      clientY: y,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

let requestCount = 0;
let lastRequestTime = 0;

export function getSmartDelay(): number {
  requestCount++;
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  lastRequestTime = now;
  
  if (requestCount % 100 === 0) {
    return gaussianRandom(500, 100);
  }
  
  if (timeSinceLast < 50) {
    return gaussianRandom(30, 10);
  }
  
  return 0;
}

export function hideFromDetection(): void {
  try {
    const targetWindow = getTargetWindow();
    
    const propsToHide = [
      'GM', 'GM_info', 'GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest',
      'GM_addStyle', 'GM_getResourceText', 'GM_registerMenuCommand',
      'unsafeWindow', 'cloneInto', 'exportFunction', 'createObjectIn'
    ];
    
    for (const prop of propsToHide) {
      try {
        if (prop in targetWindow) {
          Object.defineProperty(targetWindow, prop, {
            get: () => undefined,
            configurable: true
          });
        }
      } catch {}
    }
    
    try {
      const originalError = Error;
      (targetWindow as any).Error = function(...args: any[]) {
        const error = new originalError(...args);
        const originalStack = error.stack || '';
        error.stack = originalStack
          .split('\n')
          .filter(line => !line.includes('userscript') && !line.includes('tampermonkey') && !line.includes('greasemonkey'))
          .join('\n');
        return error;
      };
      (targetWindow as any).Error.prototype = originalError.prototype;
    } catch {}
    
    hideScriptTags();
    preventResourceTimingDetection();
    
  } catch {}
}

function hideScriptTags(): void {
  try {
    const originalQuerySelector = Document.prototype.querySelector;
    const originalQuerySelectorAll = Document.prototype.querySelectorAll;
    const originalGetElementsByTagName = Document.prototype.getElementsByTagName;
    
    const filterScripts = (elements: any) => {
      if (!elements) return elements;
      if (elements instanceof HTMLScriptElement) {
        const src = elements.src || '';
        if (src.includes('userscript') || src.includes('tampermonkey') || src.includes('greasemonkey')) {
          return null;
        }
      }
      if (elements.length !== undefined) {
        const filtered = Array.from(elements).filter((el: any) => {
          if (el instanceof HTMLScriptElement) {
            const src = el.src || '';
            return !src.includes('userscript') && !src.includes('tampermonkey') && !src.includes('greasemonkey');
          }
          return true;
        });
        return filtered;
      }
      return elements;
    };
    
    Document.prototype.querySelector = function(selector: string) {
      const result = originalQuerySelector.call(this, selector);
      if (selector.toLowerCase().includes('script')) {
        return filterScripts(result) as any;
      }
      return result;
    };
    
    Document.prototype.querySelectorAll = function(selector: string) {
      const result = originalQuerySelectorAll.call(this, selector);
      if (selector.toLowerCase().includes('script')) {
        const filtered = filterScripts(result);
        return filtered as any;
      }
      return result;
    };
    
    Document.prototype.getElementsByTagName = function(tagName: string) {
      const result = originalGetElementsByTagName.call(this, tagName);
      if (tagName.toLowerCase() === 'script') {
        const filtered = filterScripts(result);
        return filtered as any;
      }
      return result;
    };
  } catch {}
}

function preventResourceTimingDetection(): void {
  try {
    const originalGetEntries = performance.getEntries;
    const originalGetEntriesByType = performance.getEntriesByType;
    const originalGetEntriesByName = performance.getEntriesByName;
    
    const filterEntries = (entries: PerformanceEntryList) => {
      return entries.filter(entry => {
        const name = entry.name || '';
        return !name.includes('userscript') && 
               !name.includes('tampermonkey') && 
               !name.includes('greasemonkey') &&
               !name.includes('extension');
      });
    };
    
    performance.getEntries = function() {
      return filterEntries(originalGetEntries.call(this));
    };
    
    performance.getEntriesByType = function(type: string) {
      return filterEntries(originalGetEntriesByType.call(this, type));
    };
    
    performance.getEntriesByName = function(name: string, type?: string) {
      const entries = type 
        ? originalGetEntriesByName.call(this, name, type)
        : originalGetEntriesByName.call(this, name);
      return filterEntries(entries);
    };
  } catch {}
}

export function initStealthMode(): void {
  blockExtensionDetection();
  maskFingerprint();
  hideFromDetection();
  patchWebSocketStealthily();
  preventIframeDetection();
  spoofConnectionProperties();
  hideAutomationMarkers();
}

function blockExtensionDetection(): void {
  try {
    const targetWindow = getTargetWindow();
    
    if ((targetWindow as any).chrome && (targetWindow as any).chrome.runtime) {
      delete (targetWindow as any).chrome.runtime;
    }
    
    Object.defineProperty(targetWindow, 'external', {
      get: () => ({}),
      configurable: true
    });
    
    const scriptElements = document.querySelectorAll('script');
    scriptElements.forEach(script => {
      const src = script.src || '';
      if (src.includes('tampermonkey') || src.includes('greasemonkey') || src.includes('violentmonkey')) {
        script.remove();
      }
    });
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLScriptElement) {
            const src = node.src || '';
            if (src.includes('tampermonkey') || src.includes('greasemonkey') || src.includes('violentmonkey') || src.includes('userscript')) {
              node.remove();
            }
          }
        });
      });
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    
  } catch {}
}

function preventIframeDetection(): void {
  try {
    const targetWindow = getTargetWindow();
    Object.defineProperty(targetWindow, 'top', {
      get: () => targetWindow,
      configurable: true
    });
    Object.defineProperty(targetWindow, 'parent', {
      get: () => targetWindow,
      configurable: true
    });
  } catch {}
}

function spoofConnectionProperties(): void {
  try {
    const nav = navigator as any;
    if (nav.connection || nav.mozConnection || nav.webkitConnection) {
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      Object.defineProperty(conn, 'rtt', {
        get: () => Math.floor(50 + Math.random() * 50),
        configurable: true
      });
      Object.defineProperty(conn, 'downlink', {
        get: () => Math.floor(5 + Math.random() * 5),
        configurable: true
      });
    }
  } catch {}
}

function hideAutomationMarkers(): void {
  try {
    const targetWindow = getTargetWindow();
    const nav = targetWindow.navigator as any;
    
    const automationProps = [
      'webdriver',
      '__webdriver_evaluate',
      '__selenium_evaluate', 
      '__webdriver_script_function',
      '__webdriver_script_func',
      '__webdriver_script_fn',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__driver_evaluate',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped',
      '_Selenium_IDE_Recorder',
      '_selenium',
      'calledSelenium',
      '_WEBDRIVER_ELEM_CACHE',
      'ChromeDriverw',
      'driver-hierarchical',
      '$chrome_asyncScriptInfo',
      '$cdc_asdjflasutopfhvcZLmcfl_',
      '__$webdriverAsyncExecutor',
      'domAutomation',
      'domAutomationController'
    ];
    
    for (const prop of automationProps) {
      if (prop in nav) {
        try {
          delete nav[prop];
        } catch {
          Object.defineProperty(nav, prop, {
            get: () => undefined,
            configurable: true
          });
        }
      }
      if (prop in targetWindow) {
        try {
          delete (targetWindow as any)[prop];
        } catch {
          Object.defineProperty(targetWindow, prop, {
            get: () => undefined,
            configurable: true
          });
        }
      }
      if (prop in document) {
        try {
          delete (document as any)[prop];
        } catch {
          Object.defineProperty(document, prop, {
            get: () => undefined,
            configurable: true
          });
        }
      }
    }
    
    Object.defineProperty(nav, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });
    
    if ('permissions' in nav && nav.permissions) {
      const originalQuery = nav.permissions.query;
      if (originalQuery) {
        nav.permissions.query = (parameters: any) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({
              state: Notification.permission,
              onchange: null
            });
          }
          return originalQuery.call(nav.permissions, parameters);
        };
      }
    }
  } catch {}
}
