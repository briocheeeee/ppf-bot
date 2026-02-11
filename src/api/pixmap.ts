import type { MeResponse, CanvasInfo, ChunkCoord, PixelPlaceResult } from '../types';
import { CHUNK_SIZE } from '../types';
import { Logger } from '../utils/logger';

declare const unsafeWindow: Window & typeof globalThis;

function getBaseUrl(): string {
  try {
    if (typeof unsafeWindow !== 'undefined') return unsafeWindow.location.origin;
  } catch {}
  return window.location.origin;
}

const BASE_URL = getBaseUrl();

const nativeFetch: typeof fetch = (() => {
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.fetch) {
      return unsafeWindow.fetch.bind(unsafeWindow);
    }
  } catch {}
  return window.fetch.bind(window);
})();

function isPixelyaSite(): boolean {
  return BASE_URL.includes('pixelya.fun');
}

function isPixmapSite(): boolean {
  return BASE_URL.includes('pixmap.fun');
}

export { isPixelyaSite, isPixmapSite };

const PIXMAP_PALETTE: number[][] = [
  [202, 227, 255],
  [255, 255, 255],
  [255, 255, 255],
  [228, 228, 228],
  [196, 196, 196],
  [136, 136, 136],
  [78, 78, 78],
  [0, 0, 0],
  [244, 179, 174],
  [255, 167, 209],
  [255, 84, 178],
  [255, 101, 101],
  [229, 0, 0],
  [154, 0, 0],
  [254, 164, 96],
  [229, 149, 0],
  [160, 106, 66],
  [96, 64, 40],
  [245, 223, 176],
  [255, 248, 137],
  [229, 217, 0],
  [148, 224, 68],
  [2, 190, 1],
  [104, 131, 56],
  [0, 101, 19],
  [202, 227, 255],
  [0, 211, 221],
  [0, 131, 199],
  [0, 0, 234],
  [25, 25, 115],
  [207, 110, 228],
  [130, 0, 128],
  [83, 39, 68],
  [125, 46, 78],
  [193, 55, 71],
  [214, 113, 55],
  [252, 154, 41],
  [68, 33, 57],
  [131, 51, 33],
  [163, 61, 24],
  [223, 96, 22],
  [31, 37, 127],
  [10, 79, 175],
  [10, 126, 230],
  [88, 237, 240],
  [37, 20, 51],
  [53, 33, 67],
  [66, 21, 100],
  [74, 27, 144],
  [110, 75, 237],
  [16, 58, 47],
  [16, 74, 31],
  [16, 142, 47],
  [16, 180, 47],
  [117, 215, 87],
];


let cachedMe: MeResponse | null = null;
let cachedCanvas: CanvasInfo | null = null;
let cachedCanvasId: number = 0;
const CHUNK_CACHE_MAX_SIZE = 512;
let chunkCache: Map<string, Uint8Array> = new Map();
const localPixelOverlay: Map<string, number> = new Map();

function getOverlayKey(canvasId: number, x: number, y: number): string {
  return `${canvasId}_${x}_${y}`;
}

export function setLocalPixel(canvasId: number, x: number, y: number, color: number): void {
  localPixelOverlay.set(getOverlayKey(canvasId, x, y), color);
  updateChunkPixel(canvasId, x, y, color);
}

export function getLocalPixel(canvasId: number, x: number, y: number): number | null {
  const val = localPixelOverlay.get(getOverlayKey(canvasId, x, y));
  return val !== undefined ? val : null;
}

export function clearLocalPixelOverlay(): void {
  localPixelOverlay.clear();
}

function touchChunkCache(key: string, data: Uint8Array): void {
  if (chunkCache.has(key)) {
    chunkCache.delete(key);
  } else if (chunkCache.size >= CHUNK_CACHE_MAX_SIZE) {
    const oldest = chunkCache.keys().next().value;
    if (oldest !== undefined) chunkCache.delete(oldest);
  }
  chunkCache.set(key, data);
}
let pixelWebSocket: WebSocket | null = null;
let pendingPixelResolvers: Map<string, (result: PixelPlaceResult) => void> = new Map();

export async function fetchMe(): Promise<MeResponse> {
  const [meResponse, canvasesResponse] = await Promise.all([
    nativeFetch(`${BASE_URL}/api/me`, { credentials: 'include' }),
    nativeFetch(`${BASE_URL}/api/canvases`, { credentials: 'include' }),
  ]);
  if (!meResponse.ok) {
    throw new Error(`Failed to fetch /api/me: ${meResponse.status}`);
  }
  if (!canvasesResponse.ok) {
    throw new Error(`Failed to fetch /api/canvases: ${canvasesResponse.status}`);
  }
  const meData = await meResponse.json();
  const canvasesData = await canvasesResponse.json();
  meData.canvases = canvasesData.canvases || {};
  cachedMe = meData;
  if (meData.canvases) {
    for (const [id, canvas] of Object.entries(meData.canvases)) {
      const c = canvas as CanvasInfo;
      Logger.info(`Canvas ${id}: "${c.title}" size=${c.size} cli=${c.cli} bcd=${c.bcd} cds=${c.cds}`);
    }
  }
  return meData;
}

export function getCachedMe(): MeResponse | null {
  return cachedMe;
}

export function getMainCanvas(): CanvasInfo | null {
  if (cachedCanvas) return cachedCanvas;
  if (!cachedMe || !cachedMe.canvases) return null;
  const idStr = String(cachedCanvasId);
  if (cachedMe.canvases[idStr]) {
    cachedCanvas = cachedMe.canvases[idStr];
    Logger.info(`Selected canvas ID: ${cachedCanvasId}`);
    return cachedCanvas;
  }
  const fallbackId = Object.keys(cachedMe.canvases)[0];
  if (fallbackId) {
    cachedCanvasId = parseInt(fallbackId, 10);
    cachedCanvas = cachedMe.canvases[fallbackId];
    Logger.info(`Fallback canvas ID: ${cachedCanvasId}`);
    return cachedCanvas;
  }
  return null;
}

export function getCanvasId(): number {
  return cachedCanvasId;
}

export function detectCanvasIdFromHash(): number | null {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return null;
  const hashIdent = hash.split(',')[0];
  if (!hashIdent || !/^[a-zA-Z]+$/.test(hashIdent)) return null;
  if (!cachedMe || !cachedMe.canvases) return null;
  const identLower = hashIdent.toLowerCase();
  Logger.info(`Detecting canvas from hash ident: "${identLower}"`);
  for (const [id, canvas] of Object.entries(cachedMe.canvases)) {
    const canvasIdent = (canvas.ident || '').toLowerCase();
    Logger.info(`  Canvas ${id}: ident="${canvasIdent}" title="${canvas.title}"`);
    if (canvasIdent === identLower) {
      Logger.info(`  MATCH: hash ident "${identLower}" -> canvas ID ${id}`);
      return parseInt(id, 10);
    }
  }
  Logger.warn(`No canvas found for hash ident "${identLower}"`);
  return null;
}

export function setCanvasId(id: number): void {
  if (cachedCanvasId !== id) {
    cachedCanvasId = id;
    cachedCanvas = null;
  }
}

export function getCanvasColors(): number[][] {
  if (isPixmapSite()) return PIXMAP_PALETTE;
  const canvas = getMainCanvas();
  if (!canvas) return [];
  return canvas.colors;
}

export function pixelToChunk(x: number, y: number, canvasSize: number): ChunkCoord {
  const offset = canvasSize / 2;
  const cx = Math.floor((x + offset) / CHUNK_SIZE);
  const cy = Math.floor((y + offset) / CHUNK_SIZE);
  return { cx, cy };
}

export function getChunkKey(cx: number, cy: number): string {
  return `${cx}_${cy}`;
}

export async function fetchChunk(canvasId: number, cx: number, cy: number): Promise<Uint8Array | null> {
  const key = `${canvasId}_${cx}_${cy}`;
  if (chunkCache.has(key)) {
    return chunkCache.get(key)!;
  }

  const url = `${BASE_URL}/chunks/${canvasId}/${cx}/${cy}.bmp`;
  try {
    const response = await nativeFetch(url, { credentials: 'include' });
    if (response.status === 404) {
      const emptyChunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
      touchChunkCache(key, emptyChunk);
      return emptyChunk;
    }
    if (!response.ok) {
      Logger.error(`Failed to fetch chunk ${cx},${cy}: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    touchChunkCache(key, data);
    return data;
  } catch (err) {
    Logger.error(`Error fetching chunk ${cx},${cy}:`, err);
    return null;
  }
}

export function getPixelFromChunk(
  chunkData: Uint8Array,
  x: number,
  y: number,
  canvasSize: number
): number {
  const offset = canvasSize / 2;
  const localX = ((x + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const localY = ((y + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const index = localY * CHUNK_SIZE + localX;
  return chunkData[index] || 0;
}

export async function getPixelColor(canvasId: number, x: number, y: number, canvasSize: number): Promise<number | null> {
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const chunkData = await fetchChunk(canvasId, cx, cy);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

export async function getFreshPixelColor(canvasId: number, x: number, y: number, canvasSize: number): Promise<number | null> {
  const local = getLocalPixel(canvasId, x, y);
  if (local !== null) return local;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  invalidateChunkCache(cx, cy, canvasId);
  const chunkData = await fetchChunk(canvasId, cx, cy);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

export async function prefetchChunksForPixels(
  canvasId: number,
  pixels: { x: number; y: number }[],
  canvasSize: number
): Promise<void> {
  const chunksToFetch = new Set<string>();
  
  for (const pixel of pixels) {
    const { cx, cy } = pixelToChunk(pixel.x, pixel.y, canvasSize);
    const key = `${canvasId}_${cx}_${cy}`;
    if (!chunkCache.has(key)) {
      chunksToFetch.add(`${cx},${cy}`);
    }
  }
  
  const chunkList = Array.from(chunksToFetch).map(k => {
    const [cx, cy] = k.split(',').map(Number);
    return { cx, cy };
  });
  
  if (chunkList.length === 0) return;
  
  Logger.info(`Prefetching ${chunkList.length} chunks...`);
  const startTime = Date.now();
  
  const CONCURRENCY = 6;
  for (let i = 0; i < chunkList.length; i += CONCURRENCY) {
    const batch = chunkList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(({ cx, cy }) => fetchChunk(canvasId, cx, cy)));
  }
  
  const elapsed = Date.now() - startTime;
  Logger.info(`Prefetch complete in ${elapsed}ms`);
}

export function getPixelColorSync(
  canvasId: number,
  x: number,
  y: number,
  canvasSize: number
): number | null {
  const local = getLocalPixel(canvasId, x, y);
  if (local !== null) return local;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const key = `${canvasId}_${cx}_${cy}`;
  const chunkData = chunkCache.get(key);
  if (!chunkData) return null;
  return getPixelFromChunk(chunkData, x, y, canvasSize);
}

export async function batchCheckPixelColors(
  canvasId: number,
  pixels: { x: number; y: number; color: number }[],
  canvasSize: number
): Promise<{ index: number; needsUpdate: boolean }[]> {
  await prefetchChunksForPixels(canvasId, pixels, canvasSize);
  
  const results: { index: number; needsUpdate: boolean }[] = [];
  
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const currentColor = getPixelColorSync(canvasId, pixel.x, pixel.y, canvasSize);
    results.push({
      index: i,
      needsUpdate: currentColor !== pixel.color
    });
  }
  
  return results;
}

export function updateChunkPixel(canvasId: number, x: number, y: number, color: number): void {
  const canvas = getMainCanvas();
  if (!canvas) return;
  const canvasSize = canvas.size;
  const { cx, cy } = pixelToChunk(x, y, canvasSize);
  const key = `${canvasId}_${cx}_${cy}`;
  const chunkData = chunkCache.get(key);
  if (!chunkData) return;
  const offset = canvasSize / 2;
  const localX = ((x + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const localY = ((y + offset) % CHUNK_SIZE + CHUNK_SIZE) % CHUNK_SIZE;
  const index = localY * CHUNK_SIZE + localX;
  chunkData[index] = color;
}

export function invalidateChunkCache(cx: number, cy: number, canvasId: number): void {
  const key = `${canvasId}_${cx}_${cy}`;
  chunkCache.delete(key);
}

export function clearChunkCache(): void {
  chunkCache.clear();
}

export function findClosestColorIndex(r: number, g: number, b: number, colors: number[][]): number {
  let minDist = Infinity;
  let closestIndex = 1;
  const startIndex = colors.length > 1 ? 1 : 0;

  for (let i = startIndex; i < colors.length; i++) {
    const [cr, cg, cb] = colors[i];
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function findSiteWebSocket(): WebSocket | null {
  if (pixelWebSocket && pixelWebSocket.readyState === WebSocket.OPEN) {
    return pixelWebSocket;
  }

  const win = window as unknown as Record<string, unknown>;

  const possibleNames = [
    'pixelPlanetWebSocket', 'socket', 'ws', 'webSocket',
    'ppfunSocket', 'pixelSocket', 'socketClient', '__SOCKET__'
  ];

  for (const name of possibleNames) {
    const val = win[name];
    if (val instanceof WebSocket && val.readyState === WebSocket.OPEN) {
      pixelWebSocket = val;
      setupWebSocketListener(val);
      return val;
    }
    if (val && typeof val === 'object' && 'ws' in (val as Record<string, unknown>)) {
      const ws = (val as Record<string, unknown>).ws;
      if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
        pixelWebSocket = ws;
        setupWebSocketListener(ws);
        return ws;
      }
    }
  }

  const allWebSockets = findAllWebSockets();
  if (allWebSockets.length > 0) {
    const ws = allWebSockets[0];
    pixelWebSocket = ws;
    setupWebSocketListener(ws);
    return ws;
  }

  return null;
}

function findAllWebSockets(): WebSocket[] {
  const sockets: WebSocket[] = [];
  const seen = new Set<WebSocket>();

  function checkValue(val: unknown, depth: number): void {
    if (depth > 3) return;
    if (!val || typeof val !== 'object') return;

    if (val instanceof WebSocket) {
      if (!seen.has(val) && val.readyState === WebSocket.OPEN) {
        seen.add(val);
        const url = val.url || '';
        if (url.includes('/ws')) {
          sockets.push(val);
        }
      }
      return;
    }

    const obj = val as Record<string, unknown>;
    if (obj.ws instanceof WebSocket && !seen.has(obj.ws)) {
      if (obj.ws.readyState === WebSocket.OPEN) {
        seen.add(obj.ws);
        sockets.push(obj.ws);
      }
    }
  }

  const windows: Record<string, unknown>[] = [window as unknown as Record<string, unknown>];
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
      windows.push(unsafeWindow as unknown as Record<string, unknown>);
    }
  } catch {}

  for (const win of windows) {
    for (const key of Object.keys(win)) {
      try {
        checkValue(win[key], 0);
      } catch {}
    }
  }

  return sockets;
}

let listenerAttached = false;

function sendRegisterCanvas(ws: WebSocket): void {
  try {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setInt8(0, 0xA0);
    view.setInt8(1, cachedCanvasId);
    ws.send(buffer);
    Logger.debug(`Sent RegisterCanvas for canvas ${cachedCanvasId}`);
  } catch {}
}

function setupWebSocketListener(ws: WebSocket): void {
  if (listenerAttached) return;
  listenerAttached = true;

  sendRegisterCanvas(ws);

  ws.addEventListener('message', (event: MessageEvent) => {
    handleWebSocketMessage(event);
  });

  ws.addEventListener('close', () => {
    pixelWebSocket = null;
    listenerAttached = false;
    setTimeout(() => retryFindWebSocket(), 2000 + Math.random() * 1000);
  });

  ws.addEventListener('error', () => {
    pixelWebSocket = null;
    listenerAttached = false;
    setTimeout(() => retryFindWebSocket(), 3000 + Math.random() * 1000);
  });
}

function hookWebSocketCreation(): void {
  const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const OriginalWebSocket = targetWindow.WebSocket;

  const originalSend = OriginalWebSocket.prototype.send;
  OriginalWebSocket.prototype.send = function(this: WebSocket, data: any) {
    if (!pixelWebSocket && this.url && this.url.includes('/ws') && this.readyState === WebSocket.OPEN) {
      pixelWebSocket = this;
      listenerAttached = false;
      setupWebSocketListener(this);
    }
    return originalSend.call(this, data);
  };

  if (isPixelyaSite()) {
    const WebSocketProxy = new Proxy(OriginalWebSocket, {
      construct(target, args) {
        const urlStr = String(args[0]);

        if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
          throw new DOMException('Failed to construct \'WebSocket\': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.', 'SecurityError');
        }

        const ws: WebSocket = args.length > 1
          ? new target(args[0], args[1])
          : new target(args[0]);

        if (urlStr.includes('/ws')) {
          ws.addEventListener('open', () => {
            pixelWebSocket = ws;
            listenerAttached = false;
            setupWebSocketListener(ws);
          });

          ws.addEventListener('close', () => {
            if (pixelWebSocket === ws) {
              pixelWebSocket = null;
              listenerAttached = false;
            }
          });
        }

        return ws;
      },
    });

    Object.defineProperty(targetWindow, 'WebSocket', {
      value: WebSocketProxy,
      writable: true,
      configurable: true,
    });
  } else {
    const stealthyWebSocket = function(this: WebSocket, url: string | URL, protocols?: string | string[]) {
      const ws = protocols
        ? new OriginalWebSocket(url, protocols)
        : new OriginalWebSocket(url);

      const urlStr = url.toString();

      if (urlStr.includes('/ws')) {
        ws.addEventListener('open', () => {
          pixelWebSocket = ws;
          listenerAttached = false;
          setupWebSocketListener(ws);
        });

        ws.addEventListener('close', () => {
          if (pixelWebSocket === ws) {
            pixelWebSocket = null;
            listenerAttached = false;
          }
        });
      }

      return ws;
    } as unknown as typeof WebSocket;

    stealthyWebSocket.prototype = OriginalWebSocket.prototype;
    (stealthyWebSocket as any).CONNECTING = OriginalWebSocket.CONNECTING;
    (stealthyWebSocket as any).OPEN = OriginalWebSocket.OPEN;
    (stealthyWebSocket as any).CLOSING = OriginalWebSocket.CLOSING;
    (stealthyWebSocket as any).CLOSED = OriginalWebSocket.CLOSED;

    Object.defineProperty(stealthyWebSocket, 'name', { value: 'WebSocket', writable: false, configurable: true });
    Object.defineProperty(stealthyWebSocket, 'toString', {
      value: function() { return 'function WebSocket() { [native code] }'; },
      writable: true,
      configurable: true
    });
    Object.defineProperty(stealthyWebSocket.prototype, 'constructor', {
      value: stealthyWebSocket,
      writable: true,
      configurable: true
    });

    Object.defineProperty(targetWindow, 'WebSocket', {
      value: stealthyWebSocket,
      writable: true,
      configurable: true,
    });
  }
}

export function tryConnectWebSocket(): void {
  const existing = findSiteWebSocket();
  if (existing) {
    return;
  }
  retryFindWebSocket();
}

function retryFindWebSocket(): void {
  let attempts = 0;
  const maxAttempts = 30;
  
  const interval = setInterval(() => {
    attempts++;
    const ws = findSiteWebSocket();
    if (ws) {
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500 + Math.random() * 200);
}

function handleWebSocketMessage(event: MessageEvent): void {
  if (!(event.data instanceof ArrayBuffer)) return;
  
  const data = new DataView(event.data);
  const opcode = data.getUint8(0);

  if (opcode === 0x91 && data.byteLength >= 7) {
    const ci = data.getUint8(1);
    const cj = data.getUint8(2);
    const cId = cachedCanvasId;
    const key = `${cId}_${ci}_${cj}`;
    const chunkData = chunkCache.get(key);
    const canvas = getMainCanvas();
    let off = data.byteLength;
    while (off > 3) {
      const color = data.getUint8(off -= 1);
      const offsetL = data.getUint16(off -= 2);
      const offsetH = data.getUint8(off -= 1) << 16;
      const offset = offsetH | offsetL;
      if (chunkData && offset < chunkData.length) {
        chunkData[offset] = color;
      }
      if (canvas) {
        const canvasSize = canvas.size;
        const halfSize = canvasSize / 2;
        const localX = offset % CHUNK_SIZE;
        const localY = Math.floor(offset / CHUNK_SIZE);
        const worldX = ci * CHUNK_SIZE + localX - halfSize;
        const worldY = cj * CHUNK_SIZE + localY - halfSize;
        const overlayKey = getOverlayKey(cId, worldX, worldY);
        if (localPixelOverlay.has(overlayKey)) {
          localPixelOverlay.set(overlayKey, color);
        }
      }
    }
  }
  
  if (opcode === 0xC3 && data.byteLength >= 10 && pendingPixelResolvers.size > 0) {
    const retCode = data.getUint8(1);
    const rawWait = data.getUint32(2);
    const coolDownSeconds = data.getInt16(6);
    const pxlCnt = data.getUint8(8);
    
    const resolver = pendingPixelResolvers.values().next().value;
    if (resolver) {
      const key = pendingPixelResolvers.keys().next().value as string;
      if (key) pendingPixelResolvers.delete(key);
      
      const waitMs = rawWait;
      const cooldownMs = coolDownSeconds * 1000;

      Logger.debug(`WS: retCode=${retCode} waitMs=${waitMs} cooldownMs=${cooldownMs} pxlCnt=${pxlCnt}`);
      
      const base = { waitMs, cooldownMs, pixelsAvailable: pxlCnt, maxPixels: 0 };

      if (retCode === 0) {
        resolver({ success: true, ...base });
      } else if (retCode === 8) {
        resolver({ success: false, ...base, error: 'Protected pixel' });
      } else if (retCode === 9) {
        resolver({ success: false, ...base, error: 'Cooldown not expired' });
      } else if (retCode === 10) {
        resolver({ success: false, ...base, error: 'Captcha required', captcha: true });
      } else if (retCode === 1) {
        resolver({ success: false, ...base, error: 'Invalid canvas' });
      } else if (retCode === 2 || retCode === 3 || retCode === 4) {
        resolver({ success: false, ...base, error: 'Invalid coordinates' });
      } else if (retCode === 5) {
        resolver({ success: false, ...base, error: 'Invalid color' });
      } else if (retCode === 6) {
        resolver({ success: false, ...base, error: 'Not logged in' });
      } else if (retCode === 7) {
        resolver({ success: false, ...base, error: 'Pixel score too low' });
      } else if (retCode === 11) {
        resolver({ success: false, ...base, error: 'Proxy detected' });
      } else if (retCode === 14) {
        resolver({ success: false, ...base, error: 'Banned' });
      } else {
        resolver({ success: false, ...base, error: `Unknown error code: ${retCode}` });
      }
    }
  }
}

export function hookWebSocketEarly(): void {
  hookWebSocketCreation();
}

export function initWebSocketHook(): void {
  setTimeout(() => {
    tryConnectWebSocket();
  }, 1500 + Math.random() * 500);
}

export function placePixelViaWebSocket(
  x: number,
  y: number,
  colorIndex: number,
  canvasId: number
): Promise<PixelPlaceResult> {
  return new Promise((resolve) => {
    const canvas = getMainCanvas();
    if (!canvas) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'No canvas info' });
      return;
    }

    const ws = findSiteWebSocket();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'WebSocket not connected. Please refresh the page.' });
      return;
    }

    const canvasSize = canvas.size;
    const halfSize = canvasSize / 2;
    const absX = x + halfSize;
    const absY = y + halfSize;
    const i = Math.floor(absX / CHUNK_SIZE);
    const j = Math.floor(absY / CHUNK_SIZE);
    const localX = absX % CHUNK_SIZE;
    const localY = absY % CHUNK_SIZE;
    const offset = localX + localY * CHUNK_SIZE;

    Logger.debug(`Place: world(${x},${y}) canvas=${canvasId} chunk(${i},${j}) offset=${offset} color=${colorIndex}`);

    const buffer = new ArrayBuffer(1 + 1 + 1 + 4);
    const view = new DataView(buffer);
    view.setUint8(0, 0x91);
    view.setUint8(1, i);
    view.setUint8(2, j);
    view.setUint8(3, offset >>> 16);
    view.setUint16(4, offset & 0x00FFFF);
    view.setUint8(6, colorIndex);

    const requestId = `${Date.now()}_${Math.random()}`;
    
    const timeout = setTimeout(() => {
      if (pendingPixelResolvers.has(requestId)) {
        pendingPixelResolvers.delete(requestId);
        resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: 'Timeout waiting for response' });
      }
    }, 20000);

    pendingPixelResolvers.set(requestId, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    try {
      ws.send(buffer);
    } catch (err) {
      pendingPixelResolvers.delete(requestId);
      clearTimeout(timeout);
      resolve({ success: false, waitMs: 0, cooldownMs: 0, pixelsAvailable: 0, maxPixels: 0, error: `Send error: ${err}` });
    }
  });
}

export function connectToWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const existing = findSiteWebSocket();
    if (existing) {
      resolve(existing);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 20;
    
    const interval = setInterval(() => {
      attempts++;
      const ws = findSiteWebSocket();
      if (ws) {
        clearInterval(interval);
        resolve(ws);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('Could not find site WebSocket'));
      }
    }, 500);
  });
}

export function getExistingWebSocket(): WebSocket | null {
  return findSiteWebSocket();
}

export function getCurrentCooldown(): number {
  if (cachedMe && cachedMe.wait !== null && cachedMe.wait !== undefined) {
    return cachedMe.wait;
  }
  return 0;
}
