import { getTargetWindow } from './env';

export function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
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

const SUSPICIOUS_SCRIPT_SOURCES = ['userscript', 'tampermonkey', 'greasemonkey', 'violentmonkey'];

function isSuspiciousSource(src: string): boolean {
  const lower = src.toLowerCase();
  return SUSPICIOUS_SCRIPT_SOURCES.some(s => lower.includes(s));
}

const AUTOMATION_PROPS = [
  '__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function',
  '__webdriver_script_func', '__webdriver_script_fn', '__fxdriver_evaluate',
  '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate',
  '__selenium_unwrapped', '__fxdriver_unwrapped', '_Selenium_IDE_Recorder',
  '_selenium', 'calledSelenium', '_WEBDRIVER_ELEM_CACHE', 'ChromeDriverw',
  'driver-hierarchical', 'webdriver', '$chrome_asyncScriptInfo',
  '$cdc_asdjflasutopfhvcZLmcfl_', '__$webdriverAsyncExecutor',
  'domAutomation', 'domAutomationController'
];

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
  } catch {}
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
        if (isSuspiciousSource(elements.src || '')) return null;
      }
      if (elements.length !== undefined) {
        return Array.from(elements).filter((el: any) => {
          if (el instanceof HTMLScriptElement) return !isSuspiciousSource(el.src || '');
          return true;
        });
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
  preventIframeDetection();
  spoofConnectionProperties();
  hideAutomationMarkers();
}

function blockExtensionDetection(): void {
  try {
    const targetWindow = getTargetWindow();

    Object.defineProperty(targetWindow, 'external', {
      get: () => ({}),
      configurable: true
    });

    document.querySelectorAll('script').forEach(script => {
      if (isSuspiciousSource(script.src || '')) script.remove();
    });

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLScriptElement && isSuspiciousSource(node.src || '')) {
            node.remove();
          }
        }
      }
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

function removePropFromTarget(target: any, prop: string): void {
  if (!(prop in target)) return;
  try {
    delete target[prop];
  } catch {
    Object.defineProperty(target, prop, {
      get: () => undefined,
      configurable: true
    });
  }
}

function hideAutomationMarkers(): void {
  try {
    const targetWindow = getTargetWindow();
    const nav = targetWindow.navigator as any;

    for (const prop of AUTOMATION_PROPS) {
      removePropFromTarget(nav, prop);
      removePropFromTarget(targetWindow, prop);
      removePropFromTarget(document, prop);
    }

    Object.defineProperty(nav, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });

  } catch {}
}
