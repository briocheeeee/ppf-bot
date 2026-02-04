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

export function maskFingerprint(): void {
  try {
    const targetWindow = (window as any).unsafeWindow || window;
    
    Object.defineProperty(targetWindow.navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });
    
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return originalGetParameter.call(this, parameter);
    };
    
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      (window.navigator.permissions as any).query = function(parameters: any) {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission });
        }
        return originalQuery.call(this, parameters);
      };
    }
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
