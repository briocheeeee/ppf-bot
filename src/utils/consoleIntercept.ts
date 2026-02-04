declare const unsafeWindow: Window & typeof globalThis;

function getTargetWindow(): Window & typeof globalThis {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}

export function interceptConsoleEarly(): void {
  try {
    const targetWindow = getTargetWindow();
    const originalConsole = {
      log: targetWindow.console.log,
      warn: targetWindow.console.warn,
      info: targetWindow.console.info,
      debug: targetWindow.console.debug,
      error: targetWindow.console.error,
      trace: targetWindow.console.trace
    };

    const suspiciousPatterns = [
      /userscript/i,
      /tampermonkey/i,
      /greasemonkey/i,
      /violentmonkey/i,
      /\.user\.js/i,
      /extension/i,
      /chrome-extension/i,
      /moz-extension/i
    ];

    const filterArgs = (...args: any[]): any[] | null => {
      const stringified = args.map(arg => {
        try {
          if (typeof arg === 'string') return arg;
          if (arg && typeof arg === 'object') {
            if (arg.stack) return String(arg.stack);
            return JSON.stringify(arg);
          }
          return String(arg);
        } catch {
          return '';
        }
      }).join(' ');

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(stringified)) {
          return null;
        }
      }

      return args.map(arg => {
        if (typeof arg === 'string') {
          let filtered = arg;
          for (const pattern of suspiciousPatterns) {
            filtered = filtered.replace(pattern, '[redacted]');
          }
          return filtered;
        }
        return arg;
      });
    };

    targetWindow.console.log = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.log.apply(targetWindow.console, filtered);
      }
    };

    targetWindow.console.info = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.info.apply(targetWindow.console, filtered);
      }
    };

    targetWindow.console.warn = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.warn.apply(targetWindow.console, filtered);
      }
    };

    targetWindow.console.debug = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.debug.apply(targetWindow.console, filtered);
      }
    };

    targetWindow.console.error = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.error.apply(targetWindow.console, filtered);
      }
    };

    targetWindow.console.trace = function(...args: any[]) {
      const filtered = filterArgs(...args);
      if (filtered) {
        originalConsole.trace.apply(targetWindow.console, filtered);
      }
    };

    Object.defineProperty(targetWindow.console, 'log', {
      value: targetWindow.console.log,
      writable: false,
      configurable: false
    });

  } catch {}
}

export function preventStackTraceDetection(): void {
  try {
    const targetWindow = getTargetWindow();
    const OriginalError = targetWindow.Error;

    const ErrorProxy = new Proxy(OriginalError, {
      construct(target, args) {
        const error = new target(...args);
        
        const stackDescriptor = Object.getOwnPropertyDescriptor(error, 'stack');
        if (!stackDescriptor || stackDescriptor.configurable) {
          Object.defineProperty(error, 'stack', {
            get() {
              const originalStack = stackDescriptor?.get?.call(this) || this.stack || '';
              return originalStack
                .split('\n')
                .filter((line: string) => {
                  const lower = line.toLowerCase();
                  return !lower.includes('userscript') && 
                         !lower.includes('tampermonkey') && 
                         !lower.includes('greasemonkey') &&
                         !lower.includes('extension') &&
                         !lower.includes('user.js');
                })
                .join('\n');
            },
            configurable: true
          });
        }
        
        return error;
      }
    });

    Object.setPrototypeOf(ErrorProxy, OriginalError);
    Object.setPrototypeOf(ErrorProxy.prototype, OriginalError.prototype);

    Object.defineProperty(ErrorProxy, 'name', {
      value: 'Error',
      writable: false,
      configurable: true
    });

    Object.defineProperty(ErrorProxy, 'toString', {
      value: function() { return 'function Error() { [native code] }'; },
      writable: true,
      configurable: true
    });

    (targetWindow as any).Error = ErrorProxy;

  } catch {}
}

export function blockDetectionAPIs(): void {
  try {
    const targetWindow = getTargetWindow();

    const originalFetch = targetWindow.fetch;
    targetWindow.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      
      if (url.includes('127.0.0.1') || url.includes('localhost')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      
      return originalFetch.call(this, input, init);
    };

    const OriginalWebSocket = targetWindow.WebSocket;
    const WebSocketProxy = new Proxy(OriginalWebSocket, {
      construct(target, args: any[]) {
        const url = args[0];
        const urlStr = typeof url === 'string' ? url : url.toString();
        
        if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
          throw new DOMException('Failed to construct WebSocket', 'SecurityError');
        }
        
        const protocols = args[1];
        return protocols ? new target(url, protocols) : new target(url);
      }
    });

    Object.setPrototypeOf(WebSocketProxy, OriginalWebSocket);
    Object.setPrototypeOf(WebSocketProxy.prototype, OriginalWebSocket.prototype);
    (WebSocketProxy as any).CONNECTING = OriginalWebSocket.CONNECTING;
    (WebSocketProxy as any).OPEN = OriginalWebSocket.OPEN;
    (WebSocketProxy as any).CLOSING = OriginalWebSocket.CLOSING;
    (WebSocketProxy as any).CLOSED = OriginalWebSocket.CLOSED;

    Object.defineProperty(WebSocketProxy, 'name', {
      value: 'WebSocket',
      writable: false
    });

    Object.defineProperty(WebSocketProxy, 'toString', {
      value: function() { return 'function WebSocket() { [native code] }'; },
      writable: true,
      configurable: true
    });

  } catch {}
}
