import { getTargetWindow } from './env';

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

    for (const method of Object.keys(originalConsole) as Array<keyof typeof originalConsole>) {
      const original = originalConsole[method];
      (targetWindow.console as any)[method] = function(...args: any[]) {
        const filtered = filterArgs(...args);
        if (filtered) {
          original.apply(targetWindow.console, filtered);
        }
      };
    }

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

    const CurrentWebSocket = targetWindow.WebSocket;
    const WebSocketProxy = new Proxy(CurrentWebSocket, {
      construct(target, args) {
        const urlStr = String(args[0]);

        if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
          throw new DOMException('Failed to construct WebSocket', 'SecurityError');
        }

        return args.length > 1 ? new target(args[0], args[1]) : new target(args[0]);
      }
    });

    Object.defineProperty(targetWindow, 'WebSocket', {
      value: WebSocketProxy,
      writable: true,
      configurable: true,
    });

  } catch {}
}
