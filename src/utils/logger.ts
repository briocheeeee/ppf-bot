const PREFIX = '[PPF-Bot]';

let debugMode = false;

export const Logger = {
  setDebugMode: (enabled: boolean) => {
    debugMode = enabled;
  },
  info: (...args: unknown[]) => {
    if (debugMode) console.log(`${PREFIX} [INFO]`, ...args);
  },
  warn: (...args: unknown[]) => {
    if (debugMode) console.warn(`${PREFIX} [WARN]`, ...args);
  },
  error: (...args: unknown[]) => {
    if (debugMode) console.error(`${PREFIX} [ERROR]`, ...args);
  },
  debug: (...args: unknown[]) => {
    if (debugMode) console.debug(`${PREFIX} [DEBUG]`, ...args);
  },
};
